import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { adminContext } from './http-context';

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  orden: number;
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/menu`;

  /** Menú visible (público, para la tienda). */
  list() {
    return this.http.get<MenuItem[]>(this.base);
  }

  // --- Gestión (panel) ---
  all() {
    return this.http.get<MenuItem[]>(`${this.base}/all`, { context: adminContext() });
  }
  crear(dto: Partial<MenuItem>) {
    return this.http.post<MenuItem>(this.base, dto, { context: adminContext() });
  }
  actualizar(id: string, dto: Partial<MenuItem>) {
    return this.http.patch<MenuItem>(`${this.base}/${id}`, dto, { context: adminContext() });
  }
  eliminar(id: string) {
    return this.http.delete(`${this.base}/${id}`, { context: adminContext() });
  }
}
