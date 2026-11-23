import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CartService } from '@core/cart.service';
import { Producto } from '@core/models';
import { ProductosService } from '@core/productos.service';
import { NotificationService } from '@core/notification.service';
import { IconComponent } from '@shared/icon.component';
import { MoneyPipe } from '@shared/money.pipe';
import { PageHeadComponent } from '@shared/page-head.component';
import { RevealDirective } from '@shared/reveal.directive';
import { ProductCardComponent } from '@shared/product-card.component';

@Component({
  selector: 'ek-destacados',
  imports: [RouterLink, ProductCardComponent, MoneyPipe, IconComponent, PageHeadComponent, RevealDirective],
  template: `
    <ek-page-head titulo="Destacados y ofertas" subtitulo="Productos elegidos por nuestros técnicos, ofertas y novedades."
                  [migas]="[{ label: 'Destacados' }]" />

    @if (loading()) {
      <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Cargando productos">
        @for (i of [1, 2, 3, 4]; track i) { <div class="ek-skeleton aspect-[3/5]"></div> }
      </div>
    } @else {
      @if (estrella(); as p) {
        <section class="ek-corte grid items-center gap-6 overflow-hidden rounded-ek-lg bg-navy-950 p-6 text-white sm:p-10 md:grid-cols-2">
          <div>
            <span class="ek-badge -skew-x-6 rounded-none bg-voltaje uppercase text-navy-900">Producto estrella</span>
            <h2 class="ek-titular mt-4 text-4xl sm:text-5xl">{{ p.nombre }}</h2>
            @if (p.descripcion) { <p class="mt-2 max-w-prose text-white/75">{{ p.descripcion }}</p> }
            <div class="mt-4 flex items-baseline gap-3">
              <span class="ek-num text-3xl font-bold">{{ p.precio | money }}</span>
              @if (p.precioComparativo) { <span class="ek-num text-white/50 line-through">{{ p.precioComparativo | money }}</span> }
            </div>
            <div class="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" class="btn-voltaje btn-lg uppercase tracking-wide" (click)="agregar(p)"><ek-icon name="cart" class="h-5 w-5" /> Agregar al carrito</button>
              <a [routerLink]="['/producto', p.id]" class="btn btn-lg border-2 border-white/40 text-white hover:border-voltaje hover:text-voltaje">Ver producto</a>
            </div>
          </div>
          <a [routerLink]="['/producto', p.id]" class="block aspect-[4/3] overflow-hidden rounded-ek border border-white/15 bg-white/5" [attr.aria-label]="p.nombre">
            @if (p.imagenes.length) {
              <img [src]="p.imagenes[0]" [alt]="p.nombre" class="h-full w-full object-cover" />
            } @else {
              <span class="grid h-full place-items-center text-white/40"><ek-icon name="box" class="h-16 w-16" /></span>
            }
          </a>
        </section>
      }

      <section class="mt-8 sm:mt-12" ekReveal>
        <div class="ek-seccion"><h2>Más destacados</h2></div>
        @if (resto().length === 0) {
          <p class="card text-texto-suave">Por ahora no hay más productos destacados.</p>
        } @else {
          <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            @for (p of resto(); track p.id) { <ek-product-card [producto]="p" /> }
          </div>
        }
      </section>
    }
  `,
})
export class DestacadosComponent {
  private readonly productos = inject(ProductosService);
  protected readonly cart = inject(CartService);
  private readonly notifications = inject(NotificationService);

  protected agregar(p: Producto) {
    this.cart.add(p);
    this.notifications.success('Agregado al carrito');
  }

  readonly todos = signal<Producto[]>([]);
  readonly loading = signal(true);

  readonly estrella = computed(() => this.todos()[0] ?? null);
  readonly resto = computed(() => this.todos().slice(1));

  constructor() {
    this.productos
      .list({ limit: 12 })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (r) => { this.todos.set(r.data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }
}
