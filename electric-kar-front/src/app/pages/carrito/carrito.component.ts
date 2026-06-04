import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'ek-carrito',
  imports: [RouterLink, MoneyPipe],
  template: `
    <h1 class="text-2xl font-bold">Tu carrito</h1>

    @if (cart.items().length === 0) {
      <div class="card mt-4 text-center">
        <p class="text-black/60 dark:text-white/60">Tu carrito está vacío.</p>
        <a routerLink="/tienda" class="btn-primary mt-4">Ir a la tienda</a>
      </div>
    } @else {
      <div class="mt-4 grid gap-6 lg:grid-cols-3">
        <div class="space-y-3 lg:col-span-2">
          @for (item of cart.items(); track item.producto.id) {
            <div class="card flex items-center gap-4">
              <div class="grid h-16 w-16 shrink-0 place-items-center rounded-[8px] bg-black/5 text-2xl dark:bg-white/5">
                @if (item.producto.imagenes.length) {
                  <img [src]="item.producto.imagenes[0]" [alt]="item.producto.nombre" class="h-full w-full rounded-[8px] object-cover" />
                } @else { 🔋 }
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate font-semibold">{{ item.producto.nombre }}</p>
                <p class="font-mono text-sm text-black/50 dark:text-white/50">{{ item.producto.precio | money }}</p>
              </div>
              <div class="flex items-center rounded-[8px] border border-black/15 dark:border-white/15">
                <button type="button" class="px-2 py-1" (click)="cart.setQty(item.producto.id, item.cantidad - 1)">−</button>
                <span class="w-8 text-center font-mono text-sm">{{ item.cantidad }}</span>
                <button type="button" class="px-2 py-1" (click)="cart.setQty(item.producto.id, item.cantidad + 1)">+</button>
              </div>
              <span class="w-24 text-right font-mono font-bold">{{ +item.producto.precio * item.cantidad | money }}</span>
              <button type="button" class="text-peligro hover:opacity-70" (click)="cart.remove(item.producto.id)" aria-label="Eliminar">✕</button>
            </div>
          }
        </div>

        <aside class="card h-fit">
          <h2 class="text-lg font-bold">Resumen</h2>
          <div class="mt-4 flex justify-between text-sm">
            <span>Subtotal</span>
            <span class="font-mono font-bold">{{ cart.total() | money }}</span>
          </div>
          <p class="mt-1 text-xs text-black/50 dark:text-white/50">Envío e impuestos se calculan en el checkout.</p>
          <a routerLink="/checkout" class="btn-voltaje mt-4 w-full">Proceder al pago</a>
          <button type="button" class="btn-outline mt-2 w-full text-sm" (click)="cart.clear()">Vaciar carrito</button>
        </aside>
      </div>
    }
  `,
})
export class CarritoComponent {
  protected readonly cart = inject(CartService);
}
