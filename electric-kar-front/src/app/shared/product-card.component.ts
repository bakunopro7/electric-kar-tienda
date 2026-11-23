import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../core/cart.service';
import { FavoritesService } from '../core/favorites.service';
import { Producto } from '../core/models';
import { NotificationService } from '../core/notification.service';
import { IconComponent } from './icon.component';
import { MoneyPipe } from './money.pipe';

/** Tarjeta de producto. Pensada para rejillas de 2 columnas en móvil. */
@Component({
  selector: 'ek-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MoneyPipe, IconComponent],
  host: { class: 'block h-full' },
  template: `
    <article class="ek-tarjeta flex h-full flex-col overflow-hidden rounded-ek border border-borde bg-superficie">
      <div class="relative">
        <a [routerLink]="['/producto', producto().id]" class="block aspect-square overflow-hidden bg-superficie-2" [attr.aria-label]="producto().nombre">
          @if (producto().imagenes.length) {
            <img [src]="producto().imagenes[0]" [alt]="producto().nombre" loading="lazy" class="h-full w-full object-cover" />
          } @else {
            <span class="grid h-full place-items-center text-texto-tenue"><ek-icon name="box" class="h-10 w-10" /></span>
          }
        </a>
        @if (descuento() > 0) {
          <span class="ek-badge absolute left-0 top-2 -skew-x-6 rounded-none bg-voltaje px-3 text-sm text-navy-900">-{{ descuento() }}%</span>
        }
        <button type="button" (click)="favs.toggle(producto())"
                [attr.aria-label]="esFavorito() ? 'Quitar de favoritos' : 'Guardar en favoritos'"
                [attr.aria-pressed]="esFavorito()"
                class="ek-icon-btn absolute right-1 top-1 bg-superficie/90"
                [class.text-peligro]="esFavorito()">
          <ek-icon name="heart" class="h-5 w-5" />
        </button>
      </div>

      <div class="flex flex-1 flex-col p-3">
        @if (producto().marca?.nombre) {
          <span class="text-xs font-bold uppercase tracking-wide text-marca">{{ producto().marca?.nombre }}</span>
        }
        <a [routerLink]="['/producto', producto().id]" class="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug hover:text-marca sm:text-base">
          {{ producto().nombre }}
        </a>
        <div class="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2">
          <span class="ek-num text-xl font-bold">{{ producto().precio | money }}</span>
          @if (producto().precioComparativo) {
            <span class="ek-num text-xs text-texto-tenue line-through">{{ producto().precioComparativo | money }}</span>
          }
        </div>
        @if (producto().existencias > 0) {
          <button type="button" (click)="agregar()" class="btn-primary mt-3 w-full px-2 text-sm">
            <ek-icon name="cart" class="h-4 w-4" />
            <span>Añadir<span class="sr-only sm:not-sr-only"> al carrito</span></span>
          </button>
        } @else {
          <span class="mt-3 grid min-h-11 place-items-center rounded-ek bg-superficie-2 text-sm font-semibold text-texto-suave">Agotado</span>
        }
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  readonly producto = input.required<Producto>();
  protected readonly cart = inject(CartService);
  protected readonly favs = inject(FavoritesService);
  private readonly notifications = inject(NotificationService);

  protected readonly esFavorito = computed(() => this.favs.has(this.producto().id));

  protected readonly descuento = computed(() => {
    const p = this.producto();
    const antes = Number(p.precioComparativo);
    const ahora = Number(p.precio);
    return antes > ahora ? Math.round(((antes - ahora) / antes) * 100) : 0;
  });

  protected agregar() {
    this.cart.add(this.producto());
    this.notifications.success('Agregado al carrito');
  }
}
