import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { FavoritesService } from '../core/favorites.service';
import { IconComponent } from '../shared/icon.component';

/**
 * Navegación principal en móvil: barra fija inferior, al alcance del pulgar.
 * En escritorio (md+) no se muestra; ahí navega el header.
 */
@Component({
  selector: 'ek-tab-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <nav aria-label="Navegación principal"
         class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden">
      <a routerLink="/" routerLinkActive="text-marca" [routerLinkActiveOptions]="{ exact: true }" class="ek-tab">
        <ek-icon name="home" class="h-6 w-6" /> Inicio
      </a>
      <a routerLink="/tienda" routerLinkActive="text-marca" class="ek-tab">
        <ek-icon name="grid" class="h-6 w-6" /> Catálogo
      </a>
      <a routerLink="/carrito" routerLinkActive="text-marca" class="ek-tab" aria-label="Ir al carrito">
        <span class="relative grid">
          <ek-icon name="cart" class="h-6 w-6" />
          @for (n of [cart.count()]; track n) {
            @if (n > 0) {
              <b class="ek-num ek-salto absolute -right-2.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-voltaje px-1 text-[11px] text-navy-900">{{ n }}</b>
            }
          }
        </span>
        Carrito
      </a>
      <a routerLink="/favoritos" routerLinkActive="text-marca" class="ek-tab">
        <span class="relative grid">
          <ek-icon name="heart" class="h-6 w-6" />
          @if (favs.count() > 0) {
            <b class="ek-num absolute -right-2.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-peligro px-1 text-[11px] text-white">{{ favs.count() }}</b>
          }
        </span>
        Favoritos
      </a>
      <a [routerLink]="auth.isAuthenticated() ? '/cuenta' : '/acceso'" routerLinkActive="text-marca" class="ek-tab">
        <ek-icon name="user" class="h-6 w-6" /> Cuenta
      </a>
    </nav>
  `,
  styles: `
    .ek-tab {
      display: flex;
      min-height: 60px;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      font-size: 11px;
      font-weight: 600;
      color: var(--ek-texto-suave);
    }
    .ek-tab.text-marca {
      color: var(--ek-marca);
    }
  `,
})
export class TabBarComponent {
  protected readonly cart = inject(CartService);
  protected readonly favs = inject(FavoritesService);
  protected readonly auth = inject(AuthService);
}
