import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Feature, Promo } from './models';

/** Contenido editorial de la tienda (features, promo) servido desde la API. */
@Injectable({ providedIn: 'root' })
export class ContenidoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/contenido`;

  features() {
    return this.http.get<Feature[]>(`${this.base}/features`);
  }

  /** Devuelve la promo activa, o `null` si no hay ninguna. */
  promo() {
    return this.http.get<Promo | null>(`${this.base}/promo`);
  }
}
