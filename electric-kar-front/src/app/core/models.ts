// Modelos del frontend, alineados con las respuestas de la API NestJS.
// Nota: los campos Decimal de Prisma se serializan como `string` en JSON.

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string | null;
}

export interface Marca {
  id: string;
  nombre: string;
  slug: string;
}

export interface Producto {
  id: string;
  nombre: string;
  sku: string;
  descripcion?: string | null;
  descripcionCorta?: string | null;
  precio: string;
  precioComparativo?: string | null;
  existencias: number;
  imagenes: string[];
  estado: string;
  categoriaId?: string | null;
  marcaId?: string | null;
  categoria?: Categoria | null;
  marca?: Marca | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

/** Un bucket de facetas devuelto por el endpoint de búsqueda. */
export interface FacetCount {
  value: string;
  count: number;
}

/** Facetas por campo (categoriaId, marcaId, etiquetas, marcaNombre, …). */
export type SearchFacets = Record<string, FacetCount[]>;

/**
 * Documento plano y desnormalizado tal como lo almacena/devuelve Typesense.
 * OJO: `precio` es number (no string), la marca/categoría vienen como nombres
 * planos (`marcaNombre`/`categoriaNombre`) y NO trae `precioComparativo`.
 * El front lo adapta a `Producto` antes de renderizar (ver ProductosService).
 */
export interface ProductSearchDocument {
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
  imagenes: string[];
  precio: number;
  existencias: number;
  creadoEn: number;
}

/** Respuesta CRUDA del endpoint `GET /products/search`: docs planos + facetas. */
export interface RawSearchResult {
  data: ProductSearchDocument[];
  meta: { total: number; page: number; limit: number; pages: number };
  facets: SearchFacets;
}

/** Respuesta ADAPTADA al modelo de dominio del front (`Producto`) + facetas. */
export interface SearchResult {
  data: Producto[];
  meta: { total: number; page: number; limit: number; pages: number };
  facets: SearchFacets;
}

/** Parámetros aceptados por el endpoint de búsqueda. */
export interface SearchQuery {
  q?: string;
  categoriaId?: string;
  marcaId?: string;
  etiquetas?: string[];
  sort?: 'relevancia' | 'precio_asc' | 'precio_desc' | 'recientes';
  page?: number;
  perPage?: number;
}

export interface CartItem {
  producto: Producto;
  cantidad: number;
}

export interface ClienteAuth {
  id: string;
  correo: string;
}

export interface AuthResponse {
  accessToken: string;
  cliente: ClienteAuth;
}
