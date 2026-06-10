import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '@core/favorites.service';
import { ProductCardComponent } from '@shared/product-card.component';

@Component({
  selector: 'ek-favoritos',
  imports: [RouterLink, ProductCardComponent],
  template: `
    <h1 class="text-2xl font-bold">Mis favoritos</h1>
    <p class="mt-1 text-sm text-black/60 dark:text-white/60">{{ favs.count() }} producto(s) guardado(s).</p>

    @if (favs.count() === 0) {
      <div class="card mt-6 text-center">
        <div class="text-4xl">🤍</div>
        <p class="mt-2 text-black/60 dark:text-white/60">Aún no tienes favoritos. Toca el corazón en un producto para guardarlo.</p>
        <a routerLink="/tienda" class="btn-primary mt-4">Explorar la tienda</a>
      </div>
    } @else {
      <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        @for (p of favs.items(); track p.id) {
          <ek-product-card [producto]="p" />
        }
      </div>
    }
  `,
})
export class FavoritosComponent {
  protected readonly favs = inject(FavoritesService);
}
