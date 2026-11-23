import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CategoriasService } from '@core/categorias.service';
import { MarcasService } from '@core/marcas.service';
import { Categoria, Marca, Paginated, Producto } from '@core/models';
import { ProductosService } from '@core/productos.service';
import { IconComponent } from '@shared/icon.component';
import { PageHeadComponent } from '@shared/page-head.component';
import { ProductCardComponent } from '@shared/product-card.component';

@Component({
  selector: 'ek-tienda',
  imports: [FormsModule, RouterLink, ProductCardComponent, IconComponent, PageHeadComponent],
  template: `
    <ek-page-head [titulo]="catNombre() || 'Catálogo'" subtitulo="Encuentra la pieza eléctrica exacta para tu vehículo."
                  [migas]="[{ label: 'Catálogo' }]" />

    <!-- Filtros en móvil: chips deslizables -->
    <div class="space-y-2 lg:hidden">
      <div class="ek-scroll-x" role="group" aria-label="Categorías">
        <button type="button" class="ek-chip" [class.ek-chip-activo]="categoriaId() === ''" (click)="seleccionarCategoria('')">Todas</button>
        @for (c of categorias(); track c.id) {
          <button type="button" class="ek-chip" [class.ek-chip-activo]="categoriaId() === c.id" (click)="seleccionarCategoria(c.id)">{{ c.nombre }}</button>
        }
      </div>
      @if (marcas().length) {
        <div class="ek-scroll-x" role="group" aria-label="Marcas">
          @for (m of marcas(); track m.id) {
            <button type="button" class="ek-chip" [class.ek-chip-activo]="marcaId() === m.id" [attr.aria-pressed]="marcaId() === m.id" (click)="toggleMarca(m.id)">{{ m.nombre }}</button>
          }
        </div>
      }
    </div>

    <div class="mt-4 grid gap-8 lg:mt-0 lg:grid-cols-[250px_1fr]">
      <!-- Filtros en escritorio -->
      <aside class="hidden flex-col gap-4 lg:sticky lg:top-24 lg:flex lg:self-start">
        <div class="card">
          <h2 class="mb-2 font-display text-sm font-semibold">Categorías</h2>
          <div class="flex flex-col">
            <button type="button" (click)="seleccionarCategoria('')"
                    class="rounded-ek-sm px-2 py-2 text-left text-sm hover:bg-superficie-2"
                    [class.text-marca]="categoriaId() === ''" [class.font-semibold]="categoriaId() === ''">Todas</button>
            @for (c of categorias(); track c.id) {
              <button type="button" (click)="seleccionarCategoria(c.id)"
                      class="rounded-ek-sm px-2 py-2 text-left text-sm hover:bg-superficie-2"
                      [class.text-marca]="categoriaId() === c.id" [class.font-semibold]="categoriaId() === c.id">{{ c.nombre }}</button>
            }
          </div>
        </div>

        @if (marcas().length) {
          <div class="card">
            <h2 class="mb-3 font-display text-sm font-semibold">Marca</h2>
            <div class="flex flex-wrap gap-2">
              @for (m of marcas(); track m.id) {
                <button type="button" (click)="toggleMarca(m.id)" class="ek-chip min-h-9 px-3"
                        [class.ek-chip-activo]="marcaId() === m.id" [attr.aria-pressed]="marcaId() === m.id">{{ m.nombre }}</button>
              }
            </div>
          </div>
        }

        <div class="card">
          <h2 class="font-display text-sm font-semibold">¿No sabes qué pieza es?</h2>
          <p class="mt-1 text-sm text-texto-suave">Un técnico te ayuda a elegir la correcta para tu modelo.</p>
          <a routerLink="/contacto" class="btn-outline mt-3 w-full text-sm">Pedir asesoría</a>
        </div>
      </aside>

      <div>
        <div class="mb-4 flex items-center justify-between gap-3">
          <span class="whitespace-nowrap text-sm text-texto-suave">
            <b class="ek-num text-texto">{{ resultado()?.meta?.total ?? 0 }}</b> productos
          </span>
          <label class="flex items-center gap-2 text-sm text-texto-suave">
            Ordenar
            <select [(ngModel)]="orden" (ngModelChange)="ordenar()" class="ek-input font-semibold">
              <option value="recientes">Más nuevos</option>
              <option value="precio_asc">Precio: menor a mayor</option>
              <option value="precio_desc">Precio: mayor a menor</option>
            </select>
          </label>
        </div>

        @if (tieneFiltros()) {
          <div class="mb-4 flex flex-wrap items-center gap-2">
            @if (search) {
              <button type="button" class="ek-chip min-h-9 px-3" (click)="quitarBusqueda()" [attr.aria-label]="'Quitar búsqueda ' + search">
                “{{ search }}” <ek-icon name="x" class="h-3.5 w-3.5" />
              </button>
            }
            @if (catNombre()) {
              <button type="button" class="ek-chip min-h-9 px-3" (click)="seleccionarCategoria('')" [attr.aria-label]="'Quitar filtro ' + catNombre()">
                {{ catNombre() }} <ek-icon name="x" class="h-3.5 w-3.5" />
              </button>
            }
            @if (marcaNombre()) {
              <button type="button" class="ek-chip min-h-9 px-3" (click)="toggleMarca(marcaId())" [attr.aria-label]="'Quitar filtro ' + marcaNombre()">
                {{ marcaNombre() }} <ek-icon name="x" class="h-3.5 w-3.5" />
              </button>
            }
            <button type="button" (click)="limpiarTodo()" class="ek-enlace min-h-9 px-1">Quitar filtros</button>
          </div>
        }

        @if (loading()) {
          <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3" aria-busy="true" aria-label="Cargando productos">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <div class="ek-skeleton aspect-[3/5]"></div>
            }
          </div>
        } @else if (resultado(); as r) {
          @if (r.data.length === 0) {
            <div class="card py-10 text-center">
              <p class="font-display font-semibold">No hay productos con esos filtros</p>
              <button type="button" class="btn-outline mt-4" (click)="limpiarTodo()">Quitar filtros</button>
            </div>
          } @else {
            <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              @for (p of r.data; track p.id) {
                <ek-product-card [producto]="p" />
              }
            </div>

            @if (r.meta.pages > 1) {
              <nav aria-label="Páginas" class="mt-8 flex items-center justify-center gap-1.5">
                <button type="button" class="ek-icon-btn rotate-180 rounded-ek-md border border-borde disabled:opacity-40" aria-label="Página anterior"
                        [disabled]="r.meta.page <= 1" (click)="irPagina(r.meta.page - 1)"><ek-icon name="chevron" class="h-4 w-4" /></button>
                @for (n of pageNumbers(); track n) {
                  <button type="button" (click)="irPagina(n)" [attr.aria-current]="n === r.meta.page ? 'page' : null"
                          class="ek-num grid h-11 min-w-11 place-items-center rounded-ek-md border px-3 font-semibold"
                          [class]="n === r.meta.page ? 'border-azul-700 bg-azul-700 text-white' : 'border-borde bg-superficie'">{{ n }}</button>
                }
                <button type="button" class="ek-icon-btn rounded-ek-md border border-borde disabled:opacity-40" aria-label="Página siguiente"
                        [disabled]="r.meta.page >= r.meta.pages" (click)="irPagina(r.meta.page + 1)"><ek-icon name="chevron" class="h-4 w-4" /></button>
              </nav>
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
