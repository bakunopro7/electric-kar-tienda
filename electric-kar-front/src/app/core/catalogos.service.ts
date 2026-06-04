import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

export interface CatalogoItem {
  id: string;
  tipo: string;
  clave: string;
  etiqueta: string;
  color?: string | null;
  orden: number;
}

export interface CatalogoSatItem {
  id: string;
  tipo: string;
  clave: string;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/catalogos`;

  /** Catálogo genérico por tipo (p.ej. ESTADO_PEDIDO). */
  listar(tipo: string) {
    return this.http.get<CatalogoItem[]>(this.base, {
      params: new HttpParams().set('tipo', tipo),
    });
  }

  /** Catálogo SAT por tipo (p.ej. USO_CFDI). */
  sat(tipo: string) {
    return this.http.get<CatalogoSatItem[]>(`${this.base}/sat`, {
      params: new HttpParams().set('tipo', tipo),
    });
  }
}
