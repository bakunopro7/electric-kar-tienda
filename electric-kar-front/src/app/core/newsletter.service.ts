import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Captación de correos del newsletter. Pega a `POST /newsletter`, que es
 * idempotente del lado del backend (si el correo ya está, responde ok igual).
 */
@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/newsletter`;

  suscribir(correo: string) {
    return this.http.post<{ ok: boolean; nuevo: boolean }>(this.base, { correo });
  }
}
