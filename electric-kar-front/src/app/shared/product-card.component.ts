import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../core/cart.service';
import { FavoritesService } from '../core/favorites.service';
import { Producto } from '../core/models';
import { IconComponent } from './icon.component';
import { MoneyPipe } from './money.pipe';

@Component({
  selector: 'ek-product-card',
  imports: [RouterLink, MoneyPipe, IconComponent],
  template: `
    <div class="card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div class="relative">
        <button type="button" (click)="favs.toggle(producto())" aria-label="Favorito"
                class="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow transition-transform hover:scale-110 dark:bg-navy-900/90"
                [class.text-peligro]="favs.has(producto().id)" [class.text-black]="!favs.has(producto().id)">
          <ek-icon name="heart" class="h-4 w-4" />
        </button>
        <a [routerLink]="['/producto', producto().id]" class="block">
          <div class="aspect-square w-full overflow-hidden rounded-ek-sm bg-black/5 dark:bg-white/5">
            @if (producto().imagenes.length) {
              <img [src]="producto().imagenes[0]" [alt]="producto().nombre"
                   class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            } @else {
              <div class="grid h-full place-items-center text-4xl transition-transform duration-500 group-hover:scale-110">🔋</div>
            }
          </div>
        </a>
      </div>

      <div class="mt-3 flex flex-1 flex-col">
        @if (producto().marca?.nombre) {
          <span class="text-xs font-semibold uppercase tracking-wide text-azul-500">{{ producto().marca?.nombre }}</span>
        }
        <a [routerLink]="['/producto', producto().id]" class="font-display font-semibold hover:text-azul-700">
          {{ producto().nombre }}
        </a>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="font-mono text-lg font-bold">{{ producto().precio | money }}</span>
          @if (producto().precioComparativo) {
            <span class="text-sm text-black/40 line-through dark:text-white/40">{{ producto().precioComparativo | money }}</span>
          }
        </div>
        <button type="button" (click)="cart.add(producto())" class="btn-primary mt-3 w-full text-sm">
          Añadir al carrito
        </button>
      </div>
    </div>
  `,
})
export class ProductCardComponent {
  readonly producto = input.required<Producto>();
  protected readonly cart = inject(CartService);
  protected readonly favs = inject(FavoritesService);
}
