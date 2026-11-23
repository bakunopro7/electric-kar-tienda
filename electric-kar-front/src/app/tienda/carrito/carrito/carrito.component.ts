import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '@core/cart.service';
import { IconComponent } from '@shared/icon.component';
import { MoneyPipe } from '@shared/money.pipe';
import { PageHeadComponent } from '@shared/page-head.component';
import { QtyStepperComponent } from '@shared/qty-stepper.component';

@Component({
  selector: 'ek-carrito',
  imports: [RouterLink, MoneyPipe, IconComponent, QtyStepperComponent, PageHeadComponent],
  template: `
    <ek-page-head titulo="Tu carrito" [migas]="[{ label: 'Carrito' }]" />

    @if (cart.items().length === 0) {
      <div class="card py-10 text-center">
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-superficie-2 text-texto-tenue"><ek-icon name="cart" class="h-7 w-7" /></span>
        <p class="mt-3 font-display font-semibold">Tu carrito está vacío</p>
        <p class="mt-1 text-sm text-texto-suave">Agrega productos del catálogo para comprarlos aquí.</p>
        <a routerLink="/tienda" class="btn-primary btn-lg mt-5">Ver catálogo</a>
      </div>
    } @else {
      <div class="grid gap-6 lg:grid-cols-3">
        <ul class="divide-y divide-borde rounded-ek border border-borde bg-superficie lg:col-span-2">
          @for (item of cart.items(); track item.producto.id) {
            <li class="grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 p-3 sm:grid-cols-[80px_1fr_auto_auto] sm:items-center sm:gap-x-4 sm:p-4">
              <a [routerLink]="['/producto', item.producto.id]" class="row-span-2 grid aspect-square place-items-center overflow-hidden rounded-ek-sm bg-superficie-2 text-texto-tenue sm:row-span-1">
                @if (item.producto.imagenes.length) {
                  <img [src]="item.producto.imagenes[0]" [alt]="item.producto.nombre" class="h-full w-full object-cover" />
                } @else {
                  <ek-icon name="box" class="h-7 w-7" />
                }
              </a>
              <div class="min-w-0">
                <a [routerLink]="['/producto', item.producto.id]" class="line-clamp-2 text-sm font-semibold hover:text-marca sm:text-base">{{ item.producto.nombre }}</a>
                <p class="ek-num text-sm text-texto-suave">{{ item.producto.precio | money }} c/u</p>
              </div>
              <div class="flex items-center justify-between gap-3 sm:contents">
                <ek-qty [value]="item.cantidad" (valueChange)="cart.setQty(item.producto.id, $event)" />
                <div class="flex items-center gap-1">
                  <span class="ek-num min-w-20 text-right font-bold">{{ +item.producto.precio * item.cantidad | money }}</span>
                  <button type="button" class="ek-icon-btn text-texto-suave hover:text-peligro" (click)="cart.remove(item.producto.id)"
                          [attr.aria-label]="'Quitar ' + item.producto.nombre + ' del carrito'">
                    <ek-icon name="trash" class="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          }
        </ul>

        <aside class="card h-fit lg:sticky lg:top-24">
          <h2 class="text-lg font-bold">Resumen</h2>
          <div class="mt-3 flex justify-between text-sm">
            <span class="text-texto-suave">Subtotal ({{ cart.count() }} {{ cart.count() === 1 ? 'producto' : 'productos' }})</span>
            <span class="ek-num font-bold">{{ cart.total() | money }}</span>
          </div>
          <p class="mt-1 text-xs text-texto-suave">El envío se calcula al pagar. Los precios incluyen IVA.</p>
          <a routerLink="/checkout" class="btn-voltaje btn-lg mt-4 hidden w-full md:inline-flex">Proceder al pago</a>
          <a routerLink="/tienda" class="btn-outline mt-2 w-full text-sm">Seguir comprando</a>
          <button type="button" class="ek-enlace mt-3 block min-h-11 w-full text-center !text-texto-suave" (click)="cart.clear()">Vaciar carrito</button>
        </aside>
      </div>

      <!-- Barra de pago fija (solo móvil) -->
      <div class="ek-barra-accion">
        <div class="min-w-0">
          <span class="block text-xs text-texto-suave">Subtotal</span>
          <b class="ek-num text-lg leading-none">{{ cart.total() | money }}</b>
        </div>
        <a routerLink="/checkout" class="btn-voltaje btn-lg flex-1">Proceder al pago</a>
      </div>
      <div class="h-20 md:hidden" aria-hidden="true"></div>
    }
  `,
})
export class CarritoComponent {
  protected readonly cart = inject(CartService);
}
