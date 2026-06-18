/**
 * Integration test — Task 9.5: `reindexAll()` against a LIVE Typesense + Postgres.
 *
 * INFRA-GATED: this suite requires a reachable Typesense (port 8108) AND a
 * Postgres reachable via DATABASE_URL. Neither is guaranteed in CI, so the whole
 * suite is SKIPPED unless `RUN_SEARCH_INTEGRATION=1` is set in the environment.
 * Run locally with:
 *   docker compose up -d db typesense
 *   RUN_SEARCH_INTEGRATION=1 pnpm test:e2e search-reindex
 *
 * It is intentionally NOT run in the authoring environment (no Typesense/Postgres).
 */
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  PRODUCTS_ALIAS,
  PRODUCTS_COLLECTION,
} from '../src/products/search/product-document';
import { ProductIndexService } from '../src/products/search/product-index.service';
import { TypesenseService } from '../src/products/search/typesense.service';

const RUN = process.env.RUN_SEARCH_INTEGRATION === '1';
const describeIntegration = RUN ? describe : describe.skip;

describeIntegration('search:reindex (integration, live Typesense)', () => {
  let prisma: PrismaService;
  let typesense: TypesenseService;
  let index: ProductIndexService;
  const seededIds: string[] = [];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [PrismaService, TypesenseService, ProductIndexService],
    }).compile();

    prisma = module.get(PrismaService);
    typesense = module.get(TypesenseService);
    index = module.get(ProductIndexService);

    await prisma.onModuleInit?.();
    // .compile() no dispara los lifecycle hooks: hay que bootstrappear Typesense
    // a mano para que `ready=true` y `index.delete()` (gateado por isHealthy())
    // no sea un no-op en el cleanup del afterAll.
    await typesense.onModuleInit();
    // Force a fresh physical collection + alias so the count assertion is exact.
    await typesense.createCollection({
      ...require('../src/products/search/product-document').productsCollectionSchema,
    });
    await typesense.upsertAlias(PRODUCTS_ALIAS, PRODUCTS_COLLECTION);

    // Seed N rows. We use distinct SKUs and clean them up afterwards.
    const N = 5;
    for (let i = 0; i < N; i++) {
      const row = await prisma.producto.create({
        data: {
          nombre: `Reindex Fixture ${i}`,
          sku: `REIDX-${Date.now()}-${i}`,
          precio: '100.00',
          estado: 'PUBLICADO',
          etiquetas: ['fixture'],
        },
      });
      seededIds.push(row.id);
    }
  });

  afterAll(async () => {
    if (seededIds.length) {
      await prisma.producto.deleteMany({ where: { id: { in: seededIds } } });
      // Limpiar también el índice: sin esto, los docs quedan huérfanos en la
      // colección viva y el `search:reindex` (upsert) ya no converge.
      await Promise.all(seededIds.map((id) => index.delete(id)));
    }
    await prisma.onModuleDestroy?.();
  });

  async function indexedCount(): Promise<number> {
    const res = await typesense.search(PRODUCTS_ALIAS, {
      q: '*',
      query_by: 'nombre',
      filter_by: 'etiquetas:=[`fixture`]',
      per_page: 250,
    });
    return res.found ?? 0;
  }

  it('reindexAll() imports a document per seeded row (count == row count)', async () => {
    const imported = await index.reindexAll();
    expect(imported).toBeGreaterThanOrEqual(seededIds.length);

    const count = await indexedCount();
    expect(count).toBe(seededIds.length);
  });

  it('is idempotent — a second run produces no duplicates', async () => {
    await index.reindexAll();
    const count = await indexedCount();
    expect(count).toBe(seededIds.length);
  });
});
