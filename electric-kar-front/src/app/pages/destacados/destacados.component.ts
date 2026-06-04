import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { Producto } from '../../core/models';
import { ProductosService } from '../../core/productos.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { ProductCardComponent } from '../../shared/product-card.component';

@Component({
  selector: 'ek-destacados',
  imports: [RouterLink, ProductCardComponent, MoneyPipe],
  template: `
    <section class="relative -mx-4 overflow-hidden bg-navy-900 px-4 text-white">
      <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>
      <div class="relative mx-auto max-w-7xl py-10">
        <nav class="flex items-center gap-2 text-sm text-white/50">
          <a routerLink="/" class="hover:text-white">Inicio</a> <span>›</span> <span>Destacados &amp; Ofertas</span>
        </nav>
        <h1 class="mt-3 text-3xl font-bold sm:text-4xl">Lo mejor de electrick-Kar</h1>
        <p class="mt-2 text-white/70">Productos seleccionados por nuestros técnicos, ofertas y novedades.</p>
      </div>
    </section>

    @if (loading()) {
      <p class="mt-8 text-black/50 dark:text-white/50">Cargando…</p>
    } @else {
      @if (estrella(); as p) {
        <section class="mt-8 grid items-center gap-6 overflow-hidden rounded-[22px] bg-gradient-to-br from-azul-700 to-navy-900 p-8 text-white md:grid-cols-2">
          <div>
            <span class="inline-block rounded-full bg-voltaje px-3 py-1 text-xs font-bold text-navy-900">⚡ Producto estrella</span>
            <h2 class="mt-4 text-2xl font-bold">{{ p.nombre }}</h2>
            @if (p.descripcion) { <p class="mt-2 text-white/70">{{ p.descripcion }}</p> }
            <div class="mt-4 flex items-baseline gap-3">
              <span class="font-mono text-3xl font-bold">{{ p.precio | money }}</span>
              @if (p.precioComparativo) { <span class="text-white/50 line-through">{{ p.precioComparativo | money }}</span> }
            </div>
            <div class="mt-5 flex flex-wrap gap-3">
              <a [routerLink]="['/producto', p.id]" class="btn-voltaje">Ver producto →</a>
              <button type="button" class="btn-outline border-white text-white hover:bg-white hover:text-navy-900" (click)="cart.add(p)">Agregar al carrito</button>
            </div>
          </div>
          <div class="aspect-[4/3] overflow-hidden rounded-[14px] border border-white/15 bg-white/5">
            @if (p.imagenes.length) { <img [src]="p.imagenes[0]" [alt]="p.nombre" class="h-full w-full object-cover" /> }
            @else { <div class="grid h-full place-items-center text-7xl">🔋</div> }
          </div>
        </section>
      }

      <section class="mt-12">
        <h2 class="mb-6 text-2xl font-bold">Más destacados</h2>
        @if (resto().length === 0) {
          <p class="text-black/50 dark:text-white/50">No hay productos para mostrar.</p>
        } @else {
          <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
