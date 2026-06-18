import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Client as TypesenseClient } from 'typesense';
import type { ConfigurationOptions } from 'typesense/lib/Typesense/Configuration';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  flatten,
  PRODUCTS_ALIAS,
  PRODUCTS_COLLECTION,
  productsCollectionSchema,
  type ProductDocument,
  type ProductoWithRelations,
} from '../src/products/search/product-document';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// --- Cliente Typesense (mismo origen de config que TypesenseService) ---------
const typesense = new TypesenseClient({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST ?? 'localhost',
      port: Number(process.env.TYPESENSE_PORT ?? '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY ?? 'dev_local_key',
  connectionTimeoutSeconds: 10,
} satisfies ConfigurationOptions);

const BATCH_SIZE = 500;

/**
 * Permite forzar la rama de migración de esquema (recrear `productos_vN` +
 * swap de alias) en lugar del upsert sobre la colección viva.
 *
 *   pnpm search:reindex --rebuild                 // recrea PRODUCTS_COLLECTION
 *   pnpm search:reindex --rebuild --target=productos_v2
 */
function parseFlags(argv: string[]) {
  const rebuild = argv.includes('--rebuild');
  const targetArg = argv.find((a) => a.startsWith('--target='));
  const target = targetArg ? targetArg.split('=')[1] : PRODUCTS_COLLECTION;
  return { rebuild, target };
}

/** Crea la colección física si no existe (bootstrap idempotente). */
async function ensureCollection(name: string): Promise<void> {
  const exists = await typesense.collections(name).exists();
  if (!exists) {
    await typesense.collections().create({ ...productsCollectionSchema, name });
  }
}

/** Recrea la colección desde cero (drop + create) para una migración limpia. */
async function recreateCollection(name: string): Promise<void> {
  try {
    await typesense.collections(name).delete();
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }
  await typesense.collections().create({ ...productsCollectionSchema, name });
}

/** Apunta el alias público a la colección destino (semántica upsert). */
async function pointAlias(alias: string, target: string): Promise<void> {
  await typesense.aliases().upsert(alias, { collection_name: target });
}

/**
 * Stream de TODOS los `Producto` (con relaciones) en lotes con cursor, aplana
 * cada uno con el MISMO mapper compartido y hace bulk import (`action: upsert`)
 * en la colección destino. Devuelve los conteos importado/fallido.
 */
async function importAll(target: string): Promise<{
  imported: number;
  failed: number;
}> {
  let cursor: string | undefined;
  let imported = 0;
  let failed = 0;

  for (;;) {
    const batch: ProductoWithRelations[] = await prisma.producto.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      include: { marca: true, categoria: true },
    });

    if (batch.length === 0) {
      break;
    }

    const docs: ProductDocument[] = batch.map((p) => flatten(p));
    const results = await typesense
      .collections<ProductDocument>(target)
      .documents()
      .import(docs, { action: 'upsert' });

    for (const r of results) {
      if (r.success) {
        imported += 1;
      } else {
        failed += 1;
        console.error(`  fallo import doc: ${r.error ?? 'desconocido'}`);
      }
    }

    cursor = batch[batch.length - 1].id;
    if (batch.length < BATCH_SIZE) {
      break;
    }
  }

  return { imported, failed };
}

async function main() {
  const { rebuild, target } = parseFlags(process.argv.slice(2));

  if (rebuild) {
    // --- Rama de migración de esquema: recrear -> importar -> swap atómico ---
    const previous = await currentAliasTarget(PRODUCTS_ALIAS);
    console.log(`Reindex (rebuild): recreando colección '${target}'...`);
    await recreateCollection(target);

    const { imported, failed } = await importAll(target);
    console.log(`  importados: ${imported}, fallidos: ${failed}`);

    // Swap atómico del alias público a la nueva colección.
    await pointAlias(PRODUCTS_ALIAS, target);
    console.log(`  alias '${PRODUCTS_ALIAS}' -> '${target}'`);

    // Drop de la colección anterior (si difería y existía).
    if (previous && previous !== target) {
      try {
        await typesense.collections(previous).delete();
        console.log(`  colección anterior eliminada: '${previous}'`);
      } catch (error) {
        if (!isNotFound(error)) {
          throw error;
        }
      }
    }

    await assertConverged(target);
    return;
  }

  // --- Rama por defecto: upsert idempotente sobre la colección viva ---------
  console.log(`Reindex: asegurando colección '${target}' y alias...`);
  await ensureCollection(target);
  await pointAlias(PRODUCTS_ALIAS, target);

  const { imported, failed } = await importAll(target);
  console.log(`  importados: ${imported}, fallidos: ${failed}`);

  await assertConverged(target);
}

/** Devuelve la colección física a la que apunta el alias, o undefined. */
async function currentAliasTarget(alias: string): Promise<string | undefined> {
  try {
    const res = await typesense.aliases(alias).retrieve();
    return res.collection_name;
  } catch (error) {
    if (isNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Verifica la convergencia (idempotencia): el número de documentos en la
 * colección destino debe igualar el conteo de `Producto` en Postgres.
 */
async function assertConverged(target: string): Promise<void> {
  const pgCount = await prisma.producto.count();
  const collection = await typesense.collections(target).retrieve();
  const docCount = collection.num_documents ?? 0;

  console.log(`Convergencia: Postgres=${pgCount} | Typesense=${docCount}`);
  if (docCount !== pgCount) {
    throw new Error(
      `Índice no convergente: Typesense=${docCount} != Postgres=${pgCount}`,
    );
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'httpStatus' in error &&
    (error as { httpStatus?: number }).httpStatus === 404
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
