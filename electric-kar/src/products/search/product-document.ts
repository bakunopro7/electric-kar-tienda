import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import { Prisma } from '../../generated/prisma/client';

/** A `Producto` row loaded with its `marca` and `categoria` relations. */
export type ProductoWithRelations = Prisma.ProductoGetPayload<{
  include: { marca: true; categoria: true };
}>;

/**
 * Physical Typesense collection name. Public queries and write-through ops
 * resolve through the alias {@link PRODUCTS_ALIAS} so the physical collection
 * can be rebuilt (productos_v2, ...) and atomically swapped without downtime.
 */
export const PRODUCTS_COLLECTION = 'productos_v1';

/** Alias all reads/writes go through. Points at the live physical collection. */
export const PRODUCTS_ALIAS = 'productos';

/**
 * Flattened, denormalized representation of a `Producto` as stored in Typesense.
 * `precio` is a JS number (Decimal -> float), `creadoEn` is epoch millis (int64),
 * and the nullable category/brand fields are OMITTED (undefined) when absent.
 */
export interface ProductDocument {
  id: string;
  nombre: string;
  sku: string;
  codigoBarras?: string;
  descripcionCorta?: string;
  descripcion?: string;
  etiquetas: string[];
  marcaNombre?: string;
  categoriaNombre?: string;
  marcaId?: string;
  categoriaId?: string;
  estado: string;
  imagenes: string[]; // URLs, stored-only (not indexed) so cards show photos
  precio: number; // Decimal -> float
  existencias: number; // int32
  creadoEn: number; // epoch millis -> int64
}

/**
 * Typesense schema for the products collection. `default_sorting_field` is the
 * numeric `creadoEn` so the default ordering is most-recent-first. Nullable and
 * denormalized fields are `optional` so a product without a marca/categoria still
 * indexes cleanly.
 */
export const productsCollectionSchema: CollectionCreateSchema = {
  name: PRODUCTS_COLLECTION,
  default_sorting_field: 'creadoEn',
  enable_nested_fields: false,
  fields: [
    { name: 'id', type: 'string' },
    { name: 'nombre', type: 'string' },
    { name: 'sku', type: 'string' },
    { name: 'codigoBarras', type: 'string', optional: true },
    { name: 'descripcionCorta', type: 'string', optional: true },
    { name: 'descripcion', type: 'string', optional: true },
    { name: 'etiquetas', type: 'string[]', facet: true },
    { name: 'marcaNombre', type: 'string', optional: true, facet: true },
    { name: 'categoriaNombre', type: 'string', optional: true, facet: true },
    { name: 'marcaId', type: 'string', optional: true, facet: true },
    { name: 'categoriaId', type: 'string', optional: true, facet: true },
    { name: 'estado', type: 'string', facet: true },
    // Stored-only (index: false): returned in hits so the storefront can render
    // product photos, but never searched/faceted — no index overhead.
    { name: 'imagenes', type: 'string[]', index: false, optional: true },
    { name: 'precio', type: 'float' },
    { name: 'existencias', type: 'int32' },
    { name: 'creadoEn', type: 'int64' },
  ],
};

/**
 * Flatten a `Producto` (+ relations) into the Typesense document shape.
 * `precio` Decimal -> JS number (float); `creadoEn` -> epoch millis (int64);
 * nullable `marcaId`/`categoriaId` and denormalized names -> omitted when absent.
 *
 * Pure mapping with no instance dependencies: shared as the SINGLE source of
 * truth between the write-through path ({@link ProductIndexService}) and the
 * standalone `search:reindex` command (`prisma/reindex.ts`).
 */
export function flatten(p: ProductoWithRelations): ProductDocument {
  return {
    id: p.id,
    nombre: p.nombre,
    sku: p.sku,
    codigoBarras: p.codigoBarras ?? undefined,
    descripcionCorta: p.descripcionCorta ?? undefined,
    descripcion: p.descripcion ?? undefined,
    etiquetas: p.etiquetas ?? [],
    marcaNombre: p.marca?.nombre ?? undefined,
    categoriaNombre: p.categoria?.nombre ?? undefined,
    marcaId: p.marcaId ?? undefined,
    categoriaId: p.categoriaId ?? undefined,
    estado: p.estado,
    imagenes: p.imagenes ?? [],
    precio: Number(p.precio), // Prisma Decimal -> JS number (float)
    existencias: p.existencias, // int32
    creadoEn: p.creadoEn.getTime(), // epoch millis -> int64
  };
}
