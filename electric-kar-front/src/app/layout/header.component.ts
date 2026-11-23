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
  host: { '(document:keydown.escape)': 'menuAbierto.set(false)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <!-- Cinta de avisos en movimiento (se pausa al pasar el cursor) -->
    <div class="ek-cinta bg-voltaje py-1.5 text-xs font-bold uppercase tracking-wide text-navy-950" aria-label="Avisos de la tienda">
      @for (copia of [0, 1]; track copia) {
        <ul [attr.aria-hidden]="copia === 1 ? 'true' : null">
          @for (a of avisos; track a) {
            <li class="flex items-center gap-2 whitespace-nowrap px-5"><ek-icon name="bolt" class="h-3.5 w-3.5" /> {{ a }}</li>
          }
        </ul>
      }
    </div>

    <header class="sticky top-0 z-30 bg-navy-950 text-white">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 md:flex-nowrap md:py-3">
        <a routerLink="/" class="flex items-center gap-2.5" aria-label="electrick-Kar, inicio">
          <span class="grid h-9 w-9 -skew-x-6 place-items-center rounded-ek-md bg-voltaje text-navy-900 md:h-10 md:w-10">
            <ek-icon name="bolt" class="h-5 w-5 md:h-6 md:w-6" />
          </span>
          <span class="ek-titular text-2xl">electrick<span class="text-voltaje">-Kar</span></span>
        </a>

        <!-- Buscador: fila propia en móvil, en línea desde md -->
        <form role="search"
              class="order-last flex w-full items-center gap-2 rounded-ek border border-white/15 bg-white/10 pl-4 pr-1 transition-colors focus-within:border-voltaje focus-within:bg-white/15 md:order-none md:w-auto md:flex-1"
              (submit)="$event.preventDefault(); buscarAhora()">
          <ek-icon name="search" class="h-5 w-5 shrink-0 text-white/50" />
          <input [ngModel]="q()" (ngModelChange)="q.set($event)" name="q" type="search" enterkeyhint="search"
                 aria-label="Buscar productos" placeholder="Busca baterías, luces LED, alternadores…"
                 class="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50" />
          <button type="submit" class="btn-voltaje hidden px-4 py-1.5 text-sm md:inline-flex">Buscar</button>
        </form>

        <div class="ml-auto flex items-center">
          <button type="button" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Modo claro' : 'Modo oscuro'" class="ek-icon-btn text-white hover:bg-white/10">
            <ek-icon [name]="theme.isDark() ? 'sun' : 'moon'" class="h-5 w-5" />
          </button>

          <!-- En móvil, cuenta y favoritos viven en la barra inferior -->
          <a [routerLink]="auth.isAuthenticated() ? '/cuenta' : '/acceso'" aria-label="Cuenta" class="ek-icon-btn hidden text-white hover:bg-white/10 md:grid">
            <ek-icon name="user" class="h-5 w-5" />
          </a>
          <a routerLink="/favoritos" aria-label="Favoritos" class="ek-icon-btn hidden text-white hover:bg-white/10 md:grid">
            <ek-icon name="heart" class="h-5 w-5" />
            @if (favs.count() > 0) {
              <b class="ek-num absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-peligro px-1 text-xs text-white">{{ favs.count() }}</b>
            }
          </a>

          <a routerLink="/carrito" aria-label="Carrito" class="ek-icon-btn text-white hover:bg-white/10">
            <ek-icon name="cart" class="h-5 w-5" />
            <!-- El @for recrea el contador cada vez que cambia: así rebota al agregar -->
            @for (n of [cart.count()]; track n) {
              @if (n > 0) {
                <span class="ek-num ek-salto absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-voltaje px-1 text-xs font-bold text-navy-900">{{ n }}</span>
              }
            }
          </a>

          <!-- Menú en móvil: botón circular que despliega las opciones -->
          @if (menu().length) {
            <button type="button" (click)="menuAbierto.set(!menuAbierto())" aria-controls="ek-menu"
                    [attr.aria-expanded]="menuAbierto()" [attr.aria-label]="menuAbierto() ? 'Cerrar menú' : 'Abrir menú'"
                    class="ek-icon-btn ml-1 border transition-colors md:hidden"
                    [class]="menuAbierto() ? 'border-voltaje bg-voltaje text-navy-950 hover:bg-voltaje' : 'border-white/25 text-white hover:bg-white/10'">
              <ek-icon [name]="menuAbierto() ? 'x' : 'menu'" class="h-5 w-5" />
            </button>
          }

          @if (auth.isAuthenticated()) {
            <button type="button" (click)="auth.logout()" class="ml-1 hidden min-h-11 rounded-ek-sm px-3 text-sm font-semibold hover:text-voltaje sm:block">Salir</button>
          }
        </div>
      </div>
    </header>

    <!-- Menú gestionable desde el panel -->
    @if (menu().length) {
      <!-- Móvil: panel desplegable bajo el header. Escritorio: fila fija. -->
      <nav id="ek-menu" aria-label="Secciones"
           class="sticky top-[108px] z-20 border-t border-white/10 bg-navy-950 text-white shadow-lg md:static md:block md:shadow-none"
           [class.hidden]="!menuAbierto()">
        <div class="ek-entra mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 md:py-2">
          @for (m of menu(); track m.id) {
            <a [routerLink]="m.url" routerLinkActive="ek-pildora-activa" [routerLinkActiveOptions]="{ exact: m.url === '/' }"
               class="ek-pildora" (click)="menuAbierto.set(false)">{{ m.label }}</a>
          }
        </div>
      </nav>
    }
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

  /** Avisos de la cinta superior. */
  protected readonly avisos = [
    'Envío gratis desde $999',
    'Asesoría técnica gratuita',
    'Garantía de fábrica',
    'Paga con tarjeta u OXXO',
  ];

  /** Menú desplegable en móvil (en escritorio siempre está visible). */
  protected readonly menuAbierto = signal(false);

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
