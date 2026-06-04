import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { Producto } from '../../core/models';
import { ProductosService } from '../../core/productos.service';
import { IconComponent, IconName } from '../../shared/icon.component';
import { MoneyPipe } from '../../shared/money.pipe';

type Tab = 'desc' | 'specs' | 'ship';

@Component({
  selector: 'ek-producto',
  imports: [RouterLink, MoneyPipe, IconComponent],
  template: `
    @if (loading()) {
      <p class="text-black/50 dark:text-white/50">Cargando…</p>
    } @else if (producto(); as p) {
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
        <a routerLink="/" class="hover:text-azul-700">Inicio</a>
        <ek-icon name="chevron" class="h-3 w-3" />
        <a routerLink="/tienda" class="hover:text-azul-700">{{ p.categoria?.nombre || 'Catálogo' }}</a>
        <ek-icon name="chevron" class="h-3 w-3" />
        <span class="truncate text-black/70 dark:text-white/70">{{ p.nombre }}</span>
      </nav>

      <div class="mt-5 grid gap-8 lg:grid-cols-2">
        <!-- GALERÍA -->
        <div>
          <div class="relative aspect-square overflow-hidden rounded-[14px] border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
            @if (ahorro() > 0) {
              <span class="absolute left-4 top-4 z-10 rounded-full bg-voltaje px-3 py-1 text-sm font-bold text-navy-900">-{{ descuentoPct() }}%</span>
            }
            @if (imagenActual()) {
              <img [src]="imagenActual()" [alt]="p.nombre" class="h-full w-full object-cover" />
            } @else {
              <div class="grid h-full place-items-center text-7xl">🔋</div>
            }
          </div>
          @if (p.imagenes.length > 1) {
            <div class="mt-3 flex gap-3">
              @for (img of p.imagenes; track img; let i = $index) {
                <button type="button" (click)="imagenIdx.set(i)"
                        class="aspect-square w-20 overflow-hidden rounded-[10px] border-2"
                        [class]="i === imagenIdx() ? 'border-azul-700' : 'border-transparent'">
                  <img [src]="img" [alt]="p.nombre" class="h-full w-full object-cover" />
                </button>
              }
            </div>
          }
        </div>

        <!-- INFO -->
        <div>
          <span class="text-sm font-semibold uppercase tracking-wide text-azul-500">
            {{ p.categoria?.nombre }}@if (p.marca?.nombre) { · {{ p.marca?.nombre }} }
          </span>
          <h1 class="mt-1 text-3xl font-bold">{{ p.nombre }}</h1>

          <div class="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span class="font-mono text-black/50 dark:text-white/50">SKU: {{ p.sku }}</span>
            <span class="text-black/20">|</span>
            <span class="flex items-center gap-1 font-semibold" [class.text-exito]="p.existencias > 0" [class.text-peligro]="p.existencias <= 0">
              <ek-icon name="check" class="h-4 w-4" />
              {{ p.existencias > 0 ? 'En stock (' + p.existencias + ')' : 'Agotado' }}
            </span>
          </div>

          <div class="mt-5 flex items-center gap-3">
            <span class="font-mono text-3xl font-bold">{{ p.precio | money }}</span>
            @if (p.precioComparativo) {
              <span class="text-black/40 line-through dark:text-white/40">{{ p.precioComparativo | money }}</span>
            }
            @if (ahorro() > 0) {
              <span class="rounded-full bg-exito/15 px-3 py-1 text-sm font-semibold text-exito">Ahorras {{ ahorro() | money }}</span>
            }
          </div>

          @if (p.descripcion) {
            <p class="mt-4 text-black/70 dark:text-white/70">{{ p.descripcion }}</p>
          }

          <!-- Compra -->
          <div class="mt-6 flex flex-wrap items-center gap-3">
            <div class="flex items-center rounded-[10px] border border-black/15 dark:border-white/15">
              <button type="button" class="px-4 py-3" (click)="cantidad.set(Math.max(1, cantidad() - 1))">−</button>
              <span class="w-10 text-center font-mono">{{ cantidad() }}</span>
              <button type="button" class="px-4 py-3" (click)="cantidad.set(cantidad() + 1)">+</button>
            </div>
            <button type="button" class="btn-primary flex-1" [disabled]="p.existencias <= 0" (click)="agregar(p)">
              <ek-icon name="cart" class="h-5 w-5" /> Agregar al carrito
            </button>
            <button type="button" class="grid h-[50px] w-[50px] place-items-center rounded-[10px] border border-black/15 dark:border-white/15" aria-label="Favorito">
              <ek-icon name="heart" class="h-5 w-5" />
            </button>
          </div>
          <a routerLink="/carrito" class="btn-voltaje mt-3 w-full">Comprar ahora</a>

          <!-- Garantías -->
          <div class="mt-6 grid grid-cols-2 gap-3">
            @for (a of garantias; track a.titulo) {
              <div class="flex items-center gap-3 rounded-[12px] border border-black/10 p-3 dark:border-white/10">
                <ek-icon [name]="a.icon" class="h-6 w-6 shrink-0 text-azul-700" />
                <div><b class="block text-sm">{{ a.titulo }}</b><small class="text-xs text-black/50 dark:text-white/50">{{ a.sub }}</small></div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- TABS -->
      <div class="mt-12">
        <div class="flex flex-wrap gap-1 border-b border-black/10 dark:border-white/10">
          @for (t of tabs; track t.id) {
            <button type="button" (click)="tab.set(t.id)"
                    class="-mb-px border-b-2 px-4 py-3 text-sm font-semibold"
                    [class]="tab() === t.id ? 'border-azul-700 text-azul-700' : 'border-transparent text-black/50 dark:text-white/50'">
              {{ t.label }}
            </button>
          }
        </div>

        <div class="py-6">
          @switch (tab()) {
            @case ('desc') {
              <p class="max-w-3xl leading-relaxed text-black/70 dark:text-white/70">
                {{ p.descripcion || 'Sin descripción detallada para este producto.' }}
              </p>
            }
            @case ('specs') {
              <table class="w-full max-w-2xl text-sm">
                <tbody>
                  <tr class="border-b border-black/10 dark:border-white/10"><td class="py-2 text-black/50 dark:text-white/50">SKU</td><td class="py-2 font-mono">{{ p.sku }}</td></tr>
                  <tr class="border-b border-black/10 dark:border-white/10"><td class="py-2 text-black/50 dark:text-white/50">Categoría</td><td class="py-2">{{ p.categoria?.nombre || '—' }}</td></tr>
                  <tr class="border-b border-black/10 dark:border-white/10"><td class="py-2 text-black/50 dark:text-white/50">Marca</td><td class="py-2">{{ p.marca?.nombre || '—' }}</td></tr>
                  <tr class="border-b border-black/10 dark:border-white/10"><td class="py-2 text-black/50 dark:text-white/50">Precio</td><td class="py-2 font-mono">{{ p.precio | money }}</td></tr>
                  <tr><td class="py-2 text-black/50 dark:text-white/50">Existencias</td><td class="py-2">{{ p.existencias }}</td></tr>
                </tbody>
              </table>
            }
            @case ('ship') {
              <ul class="max-w-2xl space-y-2 text-black/70 dark:text-white/70">
                <li>🚚 Envío exprés en 24-48 h. Gratis en compras desde $999.</li>
                <li>🛡️ Garantía de fábrica. Productos 100% originales.</li>
                <li>↩️ 30 días para devoluciones sin complicaciones.</li>
              </ul>
            }
          }
        </div>
      </div>
    } @else {
      <p class="text-peligro">Producto no encontrado.</p>
    }
  `,
})
export class ProductoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly productos = inject(ProductosService);
  private readonly cart = inject(CartService);

  protected readonly Math = Math;
  readonly producto = signal<Producto | null>(null);
  readonly loading = signal(true);
  readonly cantidad = signal(1);
  readonly imagenIdx = signal(0);
  readonly tab = signal<Tab>('desc');

  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'desc', label: 'Descripción' },
    { id: 'specs', label: 'Especificaciones' },
    { id: 'ship', label: 'Envío y garantía' },
  ];

  readonly garantias: { icon: IconName; titulo: string; sub: string }[] = [
    { icon: 'shield', titulo: 'Garantía', sub: 'Respaldo de fábrica' },
    { icon: 'truck', titulo: 'Envío exprés', sub: 'Recíbelo en 24-48 h' },
    { icon: 'check', titulo: '30 días', sub: 'Devolución sin riesgo' },
    { icon: 'card', titulo: 'Pago seguro', sub: 'Datos protegidos' },
  ];

  readonly imagenActual = computed(() => {
    const p = this.producto();
    return p?.imagenes?.[this.imagenIdx()] ?? null;
  });

  readonly ahorro = computed(() => {
    const p = this.producto();
    if (!p?.precioComparativo) return 0;
    return Math.max(0, Number(p.precioComparativo) - Number(p.precio));
  });

  readonly descuentoPct = computed(() => {
    const p = this.producto();
    if (!p?.precioComparativo) return 0;
    return Math.round((this.ahorro() / Number(p.precioComparativo)) * 100);
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.productos.get(id).subscribe({
      next: (p) => {
        this.producto.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  agregar(p: Producto) {
    this.cart.add(p, this.cantidad());
  }
}
