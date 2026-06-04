import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ResultadoPago {
  pedidoId: string;
  folio?: string | null;
  /** URL de Stripe Checkout (null en modo demo / sin llaves). */
  url: string | null;
  stripe: boolean;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /**
   * Vacía el carrito del servidor, sincroniza los ítems locales y crea el
   * pedido. Requiere sesión de cliente (el interceptor adjunta su token).
   */
  realizarPedido(
    items: { productoId: string; cantidad: number }[],
    codigoCupon?: string,
  ) {
    return this.http.delete(`${this.api}/cart`).pipe(
      switchMap(() =>
        items.length
          ? forkJoin(
              items.map((i) => this.http.post(`${this.api}/cart/items`, i)),
            )
          : of([]),
      ),
      switchMap(() =>
        this.http.post<ResultadoPago>(`${this.api}/payments/checkout`, {
          codigoCupon: codigoCupon || undefined,
        }),
      ),
    );
  }

  /** Valida un cupón y devuelve el descuento para el subtotal indicado. */
  validarCupon(codigo: string, subtotal: number) {
    return this.http.post<{
      codigo: string;
      tipo: string;
      descuento: string;
      envioGratis: boolean;
    }>(`${this.api}/cupones/validate`, { codigo, subtotal });
  }
}
