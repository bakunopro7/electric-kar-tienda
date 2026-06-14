import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CategoriasService } from '@core/categorias.service';
import { MarcasService } from '@core/marcas.service';
import { Categoria, Marca, Paginated, Producto } from '@core/models';
import { ProductosService } from '@core/productos.service';
import { IconComponent } from '@shared/icon.component';
import { ProductCardComponent } from '@shared/product-card.component';

@Component({
  selector: 'ek-tienda',
  imports: [FormsModule, RouterLink, ProductCardComponent, IconComponent],
  template: `
    <!-- ===== PAGE HEAD ===== -->
    <section class="relative -mx-4 overflow-hidden bg-navy-900 px-4 text-white">
      <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>
      <div class="relative mx-auto max-w-7xl py-10">
        <nav class="flex items-center gap-2 text-sm text-white/50">
          <a routerLink="/" class="hover:text-white">Inicio</a>
          <ek-icon name="chevron" class="h-3 w-3" />
          <span>Catálogo</span>
        </nav>
        <h1 class="mt-3 text-3xl font-bold sm:text-4xl">Catálogo de productos</h1>
        <p class="mt-2 text-white/70">Encuentra la pieza eléctrica exacta para tu vehículo.</p>
      </div>
    </section>

    <div class="mt-8 grid gap-8 lg:grid-cols-[268px_1fr]">
      <!-- ===== SIDEBAR ===== -->
      <aside class="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <div class="card">
          <h4 class="mb-3 font-display text-sm font-semibold">Categorías</h4>
          <div class="flex flex-col gap-1">
            <button type="button" (click)="seleccionarCategoria('')"
                    class="flex items-center justify-between rounded-ek-sm px-2 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                    [class.text-azul-700]="categoriaId() === ''" [class.font-semibold]="categoriaId() === ''">
              Todas
            </button>
            @for (c of categorias(); track c.id) {
              <button type="button" (click)="seleccionarCategoria(c.id)"
                      class="flex items-center justify-between rounded-ek-sm px-2 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                      [class.text-azul-700]="categoriaId() === c.id" [class.font-semibold]="categoriaId() === c.id">
                {{ c.nombre }}
              </button>
            }
          </div>
        </div>

        @if (marcas().length) {
          <div class="card">
            <h4 class="mb-3 font-display text-sm font-semibold">Marca</h4>
            <div class="flex flex-wrap gap-2">
              @for (m of marcas(); track m.id) {
                <button type="button" (click)="toggleMarca(m.id)"
                        class="rounded-full border px-3 py-1.5 text-sm transition-colors"
                        [class]="marcaId() === m.id
                          ? 'border-azul-700 bg-azul-700 text-white'
                          : 'border-black/15 hover:border-azul-500 dark:border-white/15'">
                  {{ m.nombre }}
                </button>
              }
            </div>
          </div>
        }

        <div class="rounded-ek bg-gradient-to-br from-azul-700 to-navy-900 p-5 text-white">
          <h4 class="font-display text-sm font-semibold">¿Necesitas ayuda?</h4>
          <p class="mt-2 text-sm text-white/70">Nuestros técnicos te ayudan a elegir la pieza correcta para tu modelo.</p>
          <a routerLink="/" class="btn-voltaje mt-4 w-full text-sm">Hablar con un experto</a>
        </div>
      </aside>

      <!-- ===== LISTADO ===== -->
      <div>
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span class="text-sm text-black/60 dark:text-white/60">
            <b class="font-display text-black dark:text-white">{{ resultado()?.meta?.total ?? 0 }}</b> productos encontrados
          </span>
          <div class="flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-sm dark:border-white/15">
            Ordenar:
            <select [(ngModel)]="orden" (ngModelChange)="ordenar()" class="bg-transparent font-semibold outline-none">
              <option value="recientes">Más nuevos</option>
              <option value="precio_asc">Precio: menor a mayor</option>
              <option value="precio_desc">Precio: mayor a menor</option>
            </select>
          </div>
        </div>

        @if (tieneFiltros()) {
          <div class="mb-4 flex flex-wrap items-center gap-2">
            @if (search) {
              <span class="inline-flex items-center gap-2 rounded-full bg-azul-700/10 px-3 py-1 text-sm font-semibold text-azul-700">
                "{{ search }}" <button type="button" (click)="quitarBusqueda()">✕</button>
              </span>
            }
            @if (catNombre()) {
              <span class="inline-flex items-center gap-2 rounded-full bg-azul-700/10 px-3 py-1 text-sm font-semibold text-azul-700">
                {{ catNombre() }} <button type="button" (click)="seleccionarCategoria('')">✕</button>
              </span>
            }
            @if (marcaNombre()) {
              <span class="inline-flex items-center gap-2 rounded-full bg-azul-700/10 px-3 py-1 text-sm font-semibold text-azul-700">
                {{ marcaNombre() }} <button type="button" (click)="toggleMarca(marcaId())">✕</button>
              </span>
            }
            <button type="button" (click)="limpiarTodo()" class="text-sm text-black/50 underline dark:text-white/50">Limpiar todo</button>
          </div>
        }

        @if (loading()) {
          <p class="text-black/50 dark:text-white/50">Cargando…</p>
        } @else if (resultado(); as r) {
          @if (r.data.length === 0) {
            <div class="card text-center text-black/60 dark:text-white/60">No se encontraron productos con esos filtros.</div>
          } @else {
            <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
              @for (p of r.data; track p.id) {
                <ek-product-card [producto]="p" />
              }
            </div>

            @if (r.meta.pages > 1) {
              <div class="mt-10 flex items-center justify-center gap-1.5">
                <button type="button" class="grid h-10 min-w-10 place-items-center rounded-ek-md border border-black/15 px-3 font-semibold disabled:opacity-40 dark:border-white/15"
                        [disabled]="r.meta.page <= 1" (click)="irPagina(r.meta.page - 1)">‹</button>
                @for (n of pageNumbers(); track n) {
                  <button type="button" (click)="irPagina(n)"
                          class="grid h-10 min-w-10 place-items-center rounded-ek-md border px-3 font-semibold"
                          [class]="n === r.meta.page ? 'border-azul-700 bg-azul-700 text-white' : 'border-black/15 dark:border-white/15'">{{ n }}</button>
                }
                <button type="button" class="grid h-10 min-w-10 place-items-center rounded-ek-md border border-black/15 px-3 font-semibold disabled:opacity-40 dark:border-white/15"
                        [disabled]="r.meta.page >= r.meta.pages" (click)="irPagina(r.meta.page + 1)">›</button>
              </div>
            }
          }
        }
      </div>
    </div>
  `,
})
export class TiendaComponent {
  private readonly productos = inject(ProductosService);
  private readonly categoriasSvc = inject(CategoriasService);
  private readonly marcasSvc = inject(MarcasService);
  private readonly route = inject(ActivatedRoute);

  readonly categorias = signal<Categoria[]>([]);
  readonly marcas = signal<Marca[]>([]);
  readonly resultado = signal<Paginated<Producto> | null>(null);
  readonly loading = signal(true);
  readonly categoriaId = signal('');
  readonly marcaId = signal('');
  search = '';
  orden = 'recientes';
  private page = 1;

  readonly catNombre = computed(
    () => this.categorias().find((c) => c.id === this.categoriaId())?.nombre,
  );
  readonly marcaNombre = computed(
    () => this.marcas().find((m) => m.id === this.marcaId())?.nombre,
  );
  readonly tieneFiltros = computed(
    () => !!this.search || !!this.categoriaId() || !!this.marcaId(),
  );

  constructor() {
    this.categoriasSvc.list().subscribe((c) => this.categorias.set(c));
    this.marcasSvc.list().subscribe({
      next: (m) => this.marcas.set(m),
      error: () => this.marcas.set([]),
    });

    // Estado inicial desde los query params (?search=, ?categoriaId=).
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.search = params.get('search') ?? '';
      this.categoriaId.set(params.get('categoriaId') ?? '');
      this.page = 1;
      this.cargar();
    });
  }

  seleccionarCategoria(id: string) {
    this.categoriaId.set(id);
    this.page = 1;
    this.cargar();
  }

  toggleMarca(id: string) {
    this.marcaId.set(this.marcaId() === id ? '' : id);
    this.page = 1;
    this.cargar();
  }

  quitarBusqueda() {
    this.search = '';
    this.page = 1;
    this.cargar();
  }

  limpiarTodo() {
    this.search = '';
    this.categoriaId.set('');
    this.marcaId.set('');
    this.page = 1;
    this.cargar();
  }

  ordenar() {
    this.page = 1;
    this.cargar();
  }

  irPagina(page: number) {
    this.page = page;
    this.cargar();
  }

  pageNumbers(): number[] {
    const meta = this.resultado()?.meta;
    if (!meta) return [];
    const out: number[] = [];
    for (
      let i = Math.max(1, meta.page - 2);
      i <= Math.min(meta.pages, meta.page + 2);
      i++
    ) {
      out.push(i);
    }
    return out;
  }

  private cargar() {
    this.loading.set(true);
    this.productos
      .list({
        page: this.page,
        limit: 12,
        categoriaId: this.categoriaId() || undefined,
        marcaId: this.marcaId() || undefined,
        search: this.search || undefined,
      })
      .subscribe({
        next: (r) => {
          this.resultado.set(this.aplicarOrden(r));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  /** Orden en cliente (la API aún no expone ordenamiento). */
  private aplicarOrden(r: Paginated<Producto>): Paginated<Producto> {
    if (this.orden === 'recientes') return r;
    const data = [...r.data].sort((a, b) =>
      this.orden === 'precio_asc'
        ? Number(a.precio) - Number(b.precio)
        : Number(b.precio) - Number(a.precio),
    );
    return { ...r, data };
  }
}
