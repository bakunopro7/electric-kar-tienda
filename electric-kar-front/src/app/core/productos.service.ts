import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Paginated,
  Producto,
  ProductSearchDocument,
  RawSearchResult,
  SearchQuery,
  SearchResult,
} from './models';

export interface ProductoQuery {
  search?: string;
  categoriaId?: string;
  marcaId?: string;
  page?: number;
  limit?: number;
}

/**
 * Adapta un documento plano de Typesense al modelo de dominio `Producto` que
 * consumen las cards y el resto del front. Reconstruye los objetos anidados
 * `marca`/`categoria` a partir de los nombres denormalizados y normaliza
 * `precio` (number -> string, como serializa Prisma). El índice no almacena
 * `precioComparativo`, así que queda en `null`.
 */
function adaptarDocumento(doc: ProductSearchDocument): Producto {
  return {
    id: doc.id,
    nombre: doc.nombre,
    sku: doc.sku,
    descripcion: doc.descripcion ?? null,
    descripcionCorta: doc.descripcionCorta ?? null,
    precio: String(doc.precio),
    precioComparativo: null,
    existencias: doc.existencias,
    imagenes: doc.imagenes ?? [],
    estado: doc.estado,
    categoriaId: doc.categoriaId ?? null,
    marcaId: doc.marcaId ?? null,
    categoria: doc.categoriaNombre
      ? { id: doc.categoriaId ?? '', nombre: doc.categoriaNombre, slug: '' }
      : null,
    marca: doc.marcaNombre
      ? { id: doc.marcaId ?? '', nombre: doc.marcaNombre, slug: '' }
      : null,
  };
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/products`;

  list(query: ProductoQuery = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<Paginated<Producto>>(this.base, { params });
  }

  get(id: string) {
    return this.http.get<Producto>(`${this.base}/${id}`);
  }

  /**
   * Búsqueda pública vía Typesense (`GET /products/search`). Serializa los
   * filtros (las `etiquetas[]` van como CSV, que es lo que acepta el DTO) y
   * adapta los documentos planos del índice al modelo `Producto`. El backend
   * cae a Prisma de forma transparente si Typesense no está disponible, así que
   * el front no necesita saber qué path respondió (las facetas vendrán vacías).
   */
  search(query: SearchQuery = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      params = params.set(
        key,
        Array.isArray(value) ? value.join(',') : String(value),
      );
    }
    return this.http
      .get<RawSearchResult>(`${this.base}/search`, { params })
      .pipe(
        map(
          (raw): SearchResult => ({
            data: raw.data.map(adaptarDocumento),
            meta: raw.meta,
            facets: raw.facets ?? {},
          }),
        ),
      );
  }
}
