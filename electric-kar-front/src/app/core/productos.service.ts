import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Paginated, Producto } from './models';

export interface ProductoQuery {
  search?: string;
  categoriaId?: string;
  marcaId?: string;
  page?: number;
  limit?: number;
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
}
