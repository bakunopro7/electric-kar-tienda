import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CartService } from '@core/cart.service';
import { FavoritesService } from '@core/favorites.service';
import { NotificationService } from '@core/notification.service';
import { Producto } from '@core/models';
import { ProductosService } from '@core/productos.service';
import { IconComponent, IconName } from '@shared/icon.component';
import { MoneyPipe } from '@shared/money.pipe';
import { QtyStepperComponent } from '@shared/qty-stepper.component';

type Tab = 'desc' | 'specs' | 'ship';

@Component({
  selector: 'ek-producto',
  imports: [RouterLink, MoneyPipe, IconComponent, QtyStepperComponent],
  template: `
    @if (loading()) {
      <div class="grid gap-6 lg:grid-cols-2" aria-busy="true" aria-label="Cargando producto">
        <div class="ek-skeleton aspect-square"></div>
        <div class="space-y-3"><div class="ek-skeleton h-8 w-3/4"></div><div class="ek-skeleton h-10 w-1/3"></div><div class="ek-skeleton h-24"></div></div>
      </div>
    } @else if (producto(); as p) {
      <nav aria-label="Ruta" class="flex items-center gap-1.5 text-sm text-texto-suave">
        <a routerLink="/" class="hover:text-marca">Inicio</a>
        <ek-icon name="chevron" class="h-3 w-3 shrink-0" />
        <a routerLink="/tienda" [queryParams]="p.categoriaId ? { categoriaId: p.categoriaId } : {}" class="whitespace-nowrap hover:text-marca">{{ p.categoria?.nombre || 'Catálogo' }}</a>
        <span class="hidden min-w-0 items-center gap-1.5 sm:flex">
          <ek-icon name="chevron" class="h-3 w-3 shrink-0" />
          <span class="truncate" aria-current="page">{{ p.nombre }}</span>
        </span>
      </nav>

      <div class="mt-4 grid gap-6 lg:grid-cols-2 lg:gap-10">
        <!-- Galería -->
        <div>
          <div class="relative -mx-4 overflow-hidden bg-superficie-2 sm:mx-0 sm:rounded-ek sm:border sm:border-borde"
               [class]="imagenActual() ? 'aspect-square' : 'aspect-[16/9] lg:aspect-square'">
            @if (ahorro() > 0) {
              <span class="ek-badge absolute left-4 top-4 z-10 bg-voltaje text-sm text-navy-900">-{{ descuentoPct() }}%</span>
            }
            @if (imagenActual()) {
              <img [src]="imagenActual()" [alt]="p.nombre" class="h-full w-full object-cover" />
            } @else {
              <span class="grid h-full place-items-center text-texto-tenue"><ek-icon name="box" class="h-20 w-20" /></span>
            }
          </div>
          @if (p.imagenes.length > 1) {
            <div class="ek-scroll-x mt-3 sm:mx-0 sm:px-0">
              @for (img of p.imagenes; track img; let i = $index) {
                <button type="button" (click)="imagenIdx.set(i)" [attr.aria-label]="'Ver imagen ' + (i + 1)" [attr.aria-pressed]="i === imagenIdx()"
                        class="aspect-square w-16 shrink-0 overflow-hidden rounded-ek-md border-2 sm:w-20"
                        [class]="i === imagenIdx() ? 'border-azul-700' : 'border-transparent'">
                  <img [src]="img" alt="" class="h-full w-full object-cover" />
                </button>
              }
            </div>
          }
        </div>

        <!-- Información y compra -->
        <div>
          @if (p.marca?.nombre) {
            <span class="text-sm font-bold uppercase tracking-wide text-marca">{{ p.marca?.nombre }}</span>
          }
          <h1 class="ek-titular mt-1 text-4xl sm:text-5xl">{{ p.nombre }}</h1>

          <div class="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span class="ek-num text-3xl font-bold">{{ p.precio | money }}</span>
            @if (p.precioComparativo) {
              <span class="ek-num text-texto-tenue line-through">{{ p.precioComparativo | money }}</span>
            }
            @if (ahorro() > 0) {
              <span class="ek-badge bg-exito/15 text-exito">Ahorras {{ ahorro() | money }}</span>
            }
          </div>
          <p class="mt-1 text-xs text-texto-suave">IVA incluido</p>

          <p class="mt-3 flex items-center gap-1.5 text-sm font-semibold" [class.text-exito]="p.existencias > 0" [class.text-peligro]="p.existencias <= 0">
            @if (p.existencias > 0) { <span class="ek-vivo mr-1"></span> } @else { <ek-icon name="x" class="h-4 w-4" /> }
            {{ p.existencias > 0 ? 'Disponible (' + p.existencias + ' en existencia)' : 'Agotado' }}
          </p>

          @if (p.descripcionCorta || p.descripcion) {
            <p class="mt-4 max-w-prose text-texto-suave">{{ p.descripcionCorta || p.descripcion }}</p>
          }

          <!-- Compra (en móvil la acción principal vive en la barra fija inferior) -->
          <div class="mt-6 flex items-center gap-3">
            <ek-qty [value]="cantidad()" [max]="maxCantidad()" (valueChange)="cantidad.set($event)" />
            <button type="button" class="btn-voltaje btn-lg hidden flex-1 md:inline-flex" [disabled]="p.existencias <= 0" (click)="agregar(p)">
              <ek-icon name="cart" class="h-5 w-5" /> Agregar al carrito
            </button>
            <button type="button" class="ek-icon-btn ml-auto rounded-ek-md border border-borde md:ml-0" (click)="favs.toggle(p)"
                    [class.text-peligro]="favs.has(p.id)" [attr.aria-pressed]="favs.has(p.id)"
                    [attr.aria-label]="favs.has(p.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'">
              <ek-icon name="heart" class="h-5 w-5" />
            </button>
          </div>
          <button type="button" class="btn-outline btn-lg mt-3 hidden w-full md:inline-flex" [disabled]="p.existencias <= 0" (click)="comprarAhora(p)">Comprar ahora</button>

          <ul class="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-borde pt-5">
            @for (a of garantias; track a.titulo) {
              <li class="flex items-start gap-2.5">
                <ek-icon [name]="a.icon" class="mt-0.5 h-5 w-5 shrink-0 text-marca" />
                <div><b class="block text-sm">{{ a.titulo }}</b><span class="text-xs text-texto-suave">{{ a.sub }}</span></div>
              </li>
            }
          </ul>
        </div>
      </div>

      <!-- Detalle -->
      <div class="mt-8 sm:mt-12">
        <div role="tablist" class="-mx-4 flex overflow-x-auto border-b border-borde px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          @for (t of tabs; track t.id) {
            <button type="button" role="tab" [attr.aria-selected]="tab() === t.id" (click)="tab.set(t.id)"
                    class="-mb-px min-h-11 whitespace-nowrap border-b-2 px-4 text-sm font-semibold"
                    [class]="tab() === t.id ? 'border-azul-500 text-marca' : 'border-transparent text-texto-suave'">
              {{ t.label }}
            </button>
          }
        </div>

        <div class="py-5" role="tabpanel">
          @switch (tab()) {
            @case ('desc') {
              <p class="max-w-prose leading-relaxed text-texto-suave">
                {{ p.descripcion || 'Este producto aún no tiene una descripción detallada.' }}
              </p>
            }
            @case ('specs') {
              <dl class="max-w-xl divide-y divide-borde text-sm">
                <div class="flex justify-between gap-4 py-2.5"><dt class="text-texto-suave">SKU</dt><dd class="ek-num font-semibold">{{ p.sku }}</dd></div>
                <div class="flex justify-between gap-4 py-2.5"><dt class="text-texto-suave">Categoría</dt><dd class="font-semibold">{{ p.categoria?.nombre || '—' }}</dd></div>
                <div class="flex justify-between gap-4 py-2.5"><dt class="text-texto-suave">Marca</dt><dd class="font-semibold">{{ p.marca?.nombre || '—' }}</dd></div>
              </dl>
            }
            @case ('ship') {
              <ul class="max-w-prose space-y-3 text-texto-suave">
                <li class="flex gap-2.5"><ek-icon name="truck" class="h-5 w-5 shrink-0 text-marca" /> Envío en 24 a 48 horas. Gratis en compras desde $999.</li>
                <li class="flex gap-2.5"><ek-icon name="shield" class="h-5 w-5 shrink-0 text-marca" /> Garantía de fábrica en productos originales.</li>
                <li class="flex gap-2.5"><ek-icon name="undo" class="h-5 w-5 shrink-0 text-marca" /> 30 días para devoluciones.</li>
              </ul>
            }
          }
        </div>
      </div>

      <!-- Barra de compra fija (solo móvil) -->
      <div class="ek-barra-accion">
        <div class="min-w-0">
          <span class="block text-xs text-texto-suave">Total</span>
          <b class="ek-num text-lg leading-none">{{ +p.precio * cantidad() | money }}</b>
        </div>
        <button type="button" class="btn-voltaje btn-lg flex-1" [disabled]="p.existencias <= 0" (click)="agregar(p)">
          <ek-icon name="cart" class="h-5 w-5" /> {{ p.existencias > 0 ? 'Agregar al carrito' : 'Agotado' }}
        </button>
      </div>
      <div class="h-20 md:hidden" aria-hidden="true"></div>
    } @else {
      <div class="card py-10 text-center">
        <p class="font-display font-semibold">No encontramos este producto</p>
        <a routerLink="/tienda" class="btn-primary mt-4">Ver catálogo</a>
      </div>
    }
  `,
})
export class ProductoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly productos = inject(ProductosService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  protected readonly favs = inject(FavoritesService);

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

  /** No se puede pedir más de lo que hay en existencia. */
  readonly maxCantidad = computed(() => Math.max(1, this.producto()?.existencias ?? 1));

  agregar(p: Producto) {
    this.cart.add(p, this.cantidad());
    this.notifications.success('Agregado al carrito');
  }

  /** Agrega el producto y lleva directo al carrito. */
  comprarAhora(p: Producto) {
    this.cart.add(p, this.cantidad());
    void this.router.navigate(['/carrito']);
  }
}

