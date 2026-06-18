import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { FavoritesService } from '../core/favorites.service';
import { MenuItem, MenuService } from '../core/menu.service';
import { ThemeService } from '../core/theme.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'ek-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <!-- ===== TOPBAR ===== -->
    <div class="hidden bg-navy-900 text-white/70 sm:block">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs">
        <div class="flex items-center gap-5">
          <span class="flex items-center gap-1.5"><ek-icon name="truck" class="h-4 w-4 text-azul-500" /> Envío gratis desde $999</span>
          <span class="flex items-center gap-1.5"><ek-icon name="chat" class="h-4 w-4 text-azul-500" /> Asesoría técnica gratuita</span>
        </div>
        <div class="flex items-center gap-4">
          <a routerLink="/cuenta" class="hover:text-voltaje">Rastrear pedido</a>
          <span class="cursor-default hover:text-voltaje">Mayoreo</span>
          <span class="cursor-default hover:text-voltaje">Ayuda</span>
        </div>
      </div>
    </div>

    <!-- ===== HEADER ===== -->
    <header class="sticky top-0 z-30 border-b border-black/10 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-navy-900/95">
      <div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <a routerLink="/" class="flex items-center gap-2.5">
          <span class="grid h-10 w-10 place-items-center rounded-ek-md bg-voltaje text-navy-900">
            <ek-icon name="bolt" class="h-6 w-6" />
          </span>
          <span class="leading-none">
            <span class="font-display text-lg font-bold">electrick<span class="text-azul-700 dark:text-azul-500">-Kar</span></span>
            <small class="block text-[10px] uppercase tracking-[0.18em] text-black/40 dark:text-white/40">Auto · Electric · Parts</small>
          </span>
        </a>

        <!-- Buscador -->
        <form class="ml-2 hidden flex-1 items-center gap-2 rounded-full border border-black/15 px-4 py-2 focus-within:border-azul-500 md:flex dark:border-white/15"
              (submit)="$event.preventDefault(); buscarAhora()">
          <ek-icon name="search" class="h-5 w-5 text-black/40 dark:text-white/40" />
          <input [ngModel]="q()" (ngModelChange)="q.set($event)" name="q" type="text"
                 aria-label="Buscar productos"
                 placeholder="Busca baterías, luces LED, alternadores…"
                 class="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          <button type="submit" class="btn-primary px-4 py-1.5 text-sm">Buscar</button>
        </form>

        <!-- Acciones -->
        <div class="ml-auto flex items-center gap-1">
          <button type="button" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Modo claro' : 'Modo oscuro'"
                  class="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
            <ek-icon [name]="theme.isDark() ? 'sun' : 'moon'" class="h-5 w-5" />
          </button>

          <a [routerLink]="auth.isAuthenticated() ? '/cuenta' : '/acceso'" aria-label="Cuenta"
             class="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
            <ek-icon name="user" class="h-5 w-5" />
          </a>

          <a routerLink="/favoritos" aria-label="Favoritos"
             class="relative grid h-10 w-10 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
            <ek-icon name="heart" class="h-5 w-5" />
            @if (favs.count() > 0) {
              <span class="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-peligro px-1 text-xs font-bold text-white">{{ favs.count() }}</span>
            }
          </a>

          <a routerLink="/carrito" aria-label="Carrito"
             class="relative grid h-10 w-10 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
            <ek-icon name="cart" class="h-5 w-5" />
            @if (cart.count() > 0) {
              <span class="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-voltaje px-1 text-xs font-bold text-navy-900">{{ cart.count() }}</span>
            }
          </a>

          @if (auth.isAuthenticated()) {
            <button type="button" (click)="auth.logout()" class="ml-1 hidden rounded-ek-sm px-3 py-2 text-sm font-semibold hover:text-azul-700 sm:block">Salir</button>
          }
        </div>
      </div>
    </header>

    <!-- ===== NAV CATEGORÍAS ===== -->
    <nav class="border-b border-black/10 bg-white dark:border-white/10 dark:bg-navy-800">
      <div class="mx-auto flex max-w-7xl items-center gap-2 px-4">
        <a routerLink="/tienda" class="flex items-center gap-2 bg-azul-700 px-4 py-3 text-sm font-semibold text-white">
          <ek-icon name="menu" class="h-4 w-4" /> Categorías
        </a>
        <div class="flex flex-1 items-center gap-1 overflow-x-auto py-1">
          @for (m of menu(); track m.id) {
            <a [routerLink]="m.url" routerLinkActive="text-azul-700" [routerLinkActiveOptions]="{ exact: m.url === '/' }"
               class="whitespace-nowrap rounded-ek-sm px-3 py-2 text-sm font-medium text-black/70 hover:text-azul-700 dark:text-white/70 dark:hover:text-azul-500">{{ m.label }}</a>
          }
        </div>
        <span class="hidden items-center gap-1.5 whitespace-nowrap pl-3 text-sm font-semibold text-azul-700 lg:flex dark:text-azul-500">
          <ek-icon name="bolt" class="h-4 w-4" /> Ofertas de temporada
        </span>
      </div>
    </nav>
  `,
})
export class HeaderComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly cart = inject(CartService);
  protected readonly favs = inject(FavoritesService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly menuSvc = inject(MenuService);

  // Menú de navegación gestionable desde el panel. `toSignal` gestiona y
  // limpia la suscripción; `catchError` evita romper el header si la API falla.
  readonly menu = toSignal(
    this.menuSvc.list().pipe(catchError(() => of([] as MenuItem[]))),
    { initialValue: [] as MenuItem[] },
  );

  readonly q = signal('');

  constructor() {
    // As-you-type con ~250 ms de debounce: navega a /busqueda mientras se
    // escribe. `replaceUrl` evita ensuciar el historial con cada tecla.
    toObservable(this.q)
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        const t = term.trim();
        if (t) {
          this.router.navigate(['/busqueda'], {
            queryParams: { q: t },
            replaceUrl: true,
          });
        }
      });
  }

  /** Envío inmediato (Enter) sin esperar al debounce. */
  buscarAhora() {
    const t = this.q().trim();
    this.router.navigate(['/busqueda'], {
      queryParams: t ? { q: t } : {},
    });
  }
}
