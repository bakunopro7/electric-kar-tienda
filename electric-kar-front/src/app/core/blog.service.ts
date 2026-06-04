import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { adminContext } from './http-context';

export interface Articulo {
  id: string;
  slug: string;
  titulo: string;
  categoria: string;
  resumen: string;
  contenido: string[];
  imagen?: string | null;
  autorNombre: string;
  autorRol?: string | null;
  lectura?: string | null;
  etiqueta?: string | null;
  destacado: boolean;
  publicado: boolean;
  publicadoEn: string;
}

@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/blog`;

  // Público
  list(categoria?: string) {
    let params = new HttpParams();
    if (categoria && categoria !== 'Todos') params = params.set('categoria', categoria);
    return this.http.get<Articulo[]>(this.base, { params });
  }
  destacado() {
    return this.http.get<Articulo | null>(`${this.base}/destacado`);
  }
  porSlug(slug: string) {
    return this.http.get<Articulo>(`${this.base}/${slug}`);
  }

  // Gestión (panel)
  all() {
    return this.http.get<Articulo[]>(`${this.base}/all`, { context: adminContext() });
  }
  crear(dto: Partial<Articulo>) {
    return this.http.post<Articulo>(this.base, dto, { context: adminContext() });
  }
  actualizar(id: string, dto: Partial<Articulo>) {
    return this.http.patch<Articulo>(`${this.base}/${id}`, dto, { context: adminContext() });
  }
  eliminar(id: string) {
    return this.http.delete(`${this.base}/${id}`, { context: adminContext() });
  }
}

/** Iniciales a partir del nombre del autor. */
export const iniciales = (nombre: string) =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
