import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '@core/favorites.service';
import { IconComponent } from '@shared/icon.component';
import { PageHeadComponent } from '@shared/page-head.component';
import { ProductCardComponent } from '@shared/product-card.component';

@Component({
  selector: 'ek-favoritos',
  imports: [RouterLink, ProductCardComponent, IconComponent, PageHeadComponent],
  template: `
    <ek-page-head titulo="Mis favoritos" [migas]="[{ label: 'Favoritos' }]" />

    @if (favs.count() === 0) {
      <div class="card py-10 text-center">
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-superficie-2 text-texto-tenue"><ek-icon name="heart" class="h-7 w-7" /></span>
        <p class="mt-3 font-display font-semibold">Aún no tienes favoritos</p>
        <p class="mt-1 text-sm text-texto-suave">Toca el corazón de un producto para guardarlo aquí.</p>
        <a routerLink="/tienda" class="btn-primary btn-lg mt-5">Ver catálogo</a>
      </div>
    } @else {
      <p class="mb-4 text-sm text-texto-suave"><b class="ek-num text-texto">{{ favs.count() }}</b> {{ favs.count() === 1 ? 'producto guardado' : 'productos guardados' }}</p>
      <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
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
