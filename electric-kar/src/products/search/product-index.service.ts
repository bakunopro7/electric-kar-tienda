import { Injectable, Logger } from '@nestjs/common';
import type {
  SearchParams,
  SearchResponseFacetCountSchema,
} from 'typesense/lib/Typesense/Documents';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchProductDto } from '../dto/search-product.dto';
import {
  flatten,
  PRODUCTS_ALIAS,
  ProductDocument,
  ProductoWithRelations,
} from './product-document';
import { TypesenseService } from './typesense.service';

export type { ProductoWithRelations } from './product-document';

/** Shape of a single facet bucket returned to the caller. */
export interface FacetCount {
  value: string;
  count: number;
}

/** Reshaped search result: same `{ data, meta }` shape as `findAll` + facets. */
export interface ProductSearchResult {
  data: ProductDocument[];
  meta: { total: number; page: number; limit: number; pages: number };
  facets: Record<string, FacetCount[]>;
}

const QUERY_BY =
  'nombre,etiquetas,marcaNombre,categoriaNombre,sku,descripcionCorta,descripcion';
const QUERY_BY_WEIGHTS = '6,4,3,3,5,2,1';
// 0 typos for `sku` (5th field) so part numbers match exactly.
const NUM_TYPOS = '1,1,1,1,0,1,1';
const FACET_BY = 'categoriaId,marcaId,etiquetas,marcaNombre,categoriaNombre';

/**
 * Domain-aware indexing service. Owns the `Producto` -> Typesense flatten
 * mapping (Decimal -> float, date -> epoch, null handling, denormalization) and
 * the mandatory public `estado = PUBLICADO` filter. Delegates all transport to
 * {@link TypesenseService}. Index writes are best-effort no-ops when Typesense
 * is not ready.
 */
@Injectable()
export class ProductIndexService {
  private readonly logger = new Logger(ProductIndexService.name);

  constructor(
    private readonly typesense: TypesenseService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Flatten a `Producto` (+ relations) into the Typesense document shape.
   * Delegates to the shared {@link flatten} pure function in `product-document.ts`
   * so the write-through path and `prisma/reindex.ts` share ONE mapper.
   */
  flatten(p: ProductoWithRelations): ProductDocument {
    return flatten(p);
  }

  /** Best-effort upsert of a single product (no-op when Typesense not ready). */
  async upsert(producto: ProductoWithRelations): Promise<void> {
    if (!this.typesense.isHealthy()) {
      return;
    }
    await this.typesense.upsertDocument(this.flatten(producto));
  }

  /**
   * Best-effort delete of a single product by id. Idempotent: a missing
   * document is a no-op. No-op when Typesense not ready.
   */
  async delete(id: string): Promise<void> {
    if (!this.typesense.isHealthy()) {
      return;
    }
    await this.typesense.deleteDocument(id);
  }

  /**
   * Public product search. ALWAYS injects `estado:=PUBLICADO` into `filter_by`
   * (the client can never supply an `estado`). Appends category/brand/tag
   * filters from the DTO, applies query/typo/facet/sort overrides, and maps the
   * Typesense response to `{ data, meta, facets }`.
   */
  async search(dto: SearchProductDto): Promise<ProductSearchResult> {
    const page = dto.page ?? 1;
    const perPage = dto.perPage ?? 20;

    const params: SearchParams<ProductDocument> = {
      q: dto.q ?? '*',
      query_by: QUERY_BY,
      query_by_weights: QUERY_BY_WEIGHTS,
      num_typos: NUM_TYPOS,
      filter_by: this.buildFilterBy(dto),
      facet_by: FACET_BY,
      sort_by: this.buildSortBy(dto),
      page,
      per_page: perPage,
    };

    const res = await this.typesense.search(PRODUCTS_ALIAS, params);

    const total = res.found ?? 0;
    const data = (res.hits ?? []).map((hit) => hit.document);

    return {
      data,
      meta: {
        total,
        page: res.page ?? page,
        limit: perPage,
        pages: Math.ceil(total / perPage),
      },
      facets: this.mapFacets(res.facet_counts),
    };
  }

  /**
   * Stream every `Producto` (with relations) from Postgres in batches and bulk
   * upsert into the live collection. Idempotent (upsert keyed by `id`). Returns
   * the imported count. Used by the standalone `search:reindex` command.
   */
  async reindexAll(batchSize = 500): Promise<number> {
    let cursor: string | undefined;
    let imported = 0;

    for (;;) {
      const batch: ProductoWithRelations[] =
        await this.prisma.producto.findMany({
          take: batchSize,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: 'asc' },
          include: { marca: true, categoria: true },
        });

      if (batch.length === 0) {
        break;
      }

      const docs = batch.map((p) => this.flatten(p));
      await this.typesense.import(PRODUCTS_ALIAS, docs, 'upsert');
      imported += docs.length;
      cursor = batch[batch.length - 1].id;

      if (batch.length < batchSize) {
        break;
      }
    }

    return imported;
  }

  /**
   * Build `filter_by`, ALWAYS starting with the mandatory public filter
   * `estado:=PUBLICADO`. There is no code path that omits it for public callers.
   */
  private buildFilterBy(dto: SearchProductDto): string {
    const clauses = ['estado:=PUBLICADO'];

    if (dto.categoriaId) {
      clauses.push(`categoriaId:=${dto.categoriaId}`);
    }
    if (dto.marcaId) {
      clauses.push(`marcaId:=${dto.marcaId}`);
    }
    if (dto.etiquetas?.length) {
      const tags = dto.etiquetas.map((t) => `\`${t}\``).join(',');
      clauses.push(`etiquetas:=[${tags}]`);
    }

    return clauses.join(' && ');
  }

  private buildSortBy(dto: SearchProductDto): string {
    switch (dto.sort) {
      case 'precio_asc':
        return 'precio:asc';
      case 'precio_desc':
        return 'precio:desc';
      case 'recientes':
        return 'creadoEn:desc';
      default:
        return '_text_match:desc,creadoEn:desc';
    }
  }

  private mapFacets(
    facetCounts?: SearchResponseFacetCountSchema<ProductDocument>[],
  ): Record<string, FacetCount[]> {
    const facets: Record<string, FacetCount[]> = {};
    for (const facet of facetCounts ?? []) {
      facets[facet.field_name] = (facet.counts ?? []).map((c) => ({
        value: c.value,
        count: c.count,
      }));
    }
    return facets;
  }
}
