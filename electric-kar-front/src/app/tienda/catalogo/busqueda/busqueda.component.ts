import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { CategoriasService } from '@core/categorias.service';
import { MarcasService } from '@core/marcas.service';
import { Categoria, Marca, Producto, SearchFacets, SearchQuery, SearchResult } from '@core/models';
import { ProductosService } from '@core/productos.service';
import { IconComponent } from '@shared/icon.component';
import { ProductCardComponent } from '@shared/product-card.component';

const PER_PAGE = 24;
const VACIO: SearchResult = {
  data: [],
  meta: { total: 0, page: 1, limit: PER_PAGE, pages: 0 },
  facets: {},
};

type OrdenBusqueda = NonNullable<SearchQuery['sort']>;

@Component({
  selector: 'ek-busqueda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ProductCardComponent, IconComponent],
  template: `
    <h1 class="text-2xl font-bold">Búsqueda</h1>

    <div class="mt-4 flex max-w-xl items-center gap-2 rounded-full border border-black/15 px-4 py-2 focus-within:border-azul-500 dark:border-white/15">
      <ek-icon name="search" class="h-5 w-5 text-black/40 dark:text-white/40" />
      <input [ngModel]="q()" (ngModelChange)="q.set($event)" name="q"
             placeholder="¿Qué buscas? baterías, LED, alternadores…"
             aria-label="Buscar productos"
             class="min-w-0 flex-1 bg-transparent outline-none" />
      @if (q()) {
        <button type="button" (click)="q.set('')" aria-label="Limpiar búsqueda"
                class="text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white">✕</button>
      }
    </div>

    <div class="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
      <!-- ===== FACETAS ===== -->
      @if (hayFacetas()) {
        <aside class="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          @if (facetasCategorias().length) {
            <div class="card">
              <h4 class="mb-3 font-display text-sm font-semibold">Categoría</h4>
              <div class="flex flex-col gap-1">
                @for (f of facetasCategorias(); track f.id) {
                  <button type="button" (click)="alternarCategoria(f.id)"
                          class="flex items-center justify-between rounded-ek-sm px-2 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                          [class.text-azul-700]="categoriaId() === f.id" [class.font-semibold]="categoriaId() === f.id">
                    <span>{{ f.nombre }}</span>
                    <span class="text-xs text-black/40 dark:text-white/40">{{ f.count }}</span>
                  </button>
                }
              </div>
            </div>
          }

          @if (facetasMarcas().length) {
            <div class="card">
              <h4 class="mb-3 font-display text-sm font-semibold">Marca</h4>
              <div class="flex flex-wrap gap-2">
                @for (f of facetasMarcas(); track f.id) {
                  <button type="button" (click)="alternarMarca(f.id)"
                          class="rounded-full border px-3 py-1.5 text-sm transition-colors"
                          [class]="marcaId() === f.id
                            ? 'border-azul-700 bg-azul-700 text-white'
                            : 'border-black/15 hover:border-azul-500 dark:border-white/15'">
                    {{ f.nombre }} ({{ f.count }})
                  </button>
                }
              </div>
            </div>
          }

          @if (facetasEtiquetas().length) {
            <div class="card">
              <h4 class="mb-3 font-display text-sm font-semibold">Etiquetas</h4>
              <div class="flex flex-wrap gap-2">
                @for (f of facetasEtiquetas(); track f.value) {
                  <button type="button" (click)="alternarEtiqueta(f.value)"
                          class="rounded-full border px-3 py-1 text-xs transition-colors"
                          [class]="etiquetas().includes(f.value)
                            ? 'border-azul-700 bg-azul-700 text-white'
                            : 'border-black/15 hover:border-azul-500 dark:border-white/15'">
                    {{ f.value }} ({{ f.count }})
                  </button>
                }
              </div>
            </div>
          }

          @if (hayFiltros()) {
            <button type="button" (click)="limpiarFiltros()"
                    class="text-left text-sm text-black/50 underline dark:text-white/50">Limpiar filtros</button>
          }
        </aside>
      } @else {
        <div class="hidden lg:block"></div>
      }

      <!-- ===== RESULTADOS ===== -->
      <div>
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          @if (termino()) {
            <p class="text-sm text-black/60 dark:text-white/60">
              Resultados para <b class="text-black dark:text-white">"{{ termino() }}"</b> — {{ total() }} encontrados
            </p>
          } @else {
            <p class="text-sm text-black/60 dark:text-white/60">
              <b class="text-black dark:text-white">{{ total() }}</b> productos
            </p>
          }
          <div class="flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-sm dark:border-white/15">
            Ordenar:
            <select [ngModel]="sort()" (ngModelChange)="sort.set($event)"
                    aria-label="Ordenar resultados"
                    class="bg-transparent font-semibold outline-none">
              <option value="relevancia">Relevancia</option>
              <option value="recientes">Más nuevos</option>
              <option value="precio_asc">Precio: menor a mayor</option>
              <option value="precio_desc">Precio: mayor a menor</option>
            </select>
          </div>
        </div>

        @if (loading()) {
          <p class="text-black/50 dark:text-white/50">Buscando…</p>
        } @else if (resultados().length) {
          <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
            @for (p of resultados(); track p.id) {
              <ek-product-card [producto]="p" />
            }
          </div>
        } @else if (termino() || hayFiltros()) {
          <div class="card text-center text-black/60 dark:text-white/60">
            Sin resultados. Prueba con otra palabra o quita algún filtro.
          </div>
        } @else {
          <div class="card text-center text-black/60 dark:text-white/60">
            Empieza a escribir para buscar productos.
          </div>
        }
      </div>
    </div>
  `,
})
export class BusquedaComponent {
  private readonly productos = inject(ProductosService);
  private readonly categoriasSvc = inject(CategoriasService);
  private readonly marcasSvc = inject(MarcasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // --- Criterios de búsqueda (fuente de verdad) ---
  readonly q = signal('');
  readonly categoriaId = signal('');
  readonly marcaId = signal('');
  readonly etiquetas = signal<string[]>([]);
  readonly sort = signal<OrdenBusqueda>('relevancia');

  // --- Resultado ---
  readonly resultados = signal<Producto[]>([]);
  readonly facets = signal<SearchFacets>({});
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly termino = signal('');

  // Catálogos para mapear los ids de las facetas a nombres legibles.
  private readonly categorias = signal<Categoria[]>([]);
  private readonly marcas = signal<Marca[]>([]);

  readonly facetasCategorias = computed(() => {
    const porId = new Map(this.categorias().map((c) => [c.id, c.nombre]));
    return (this.facets()['categoriaId'] ?? []).map((b) => ({
      id: b.value,
      nombre: porId.get(b.value) ?? b.value,
      count: b.count,
    }));
  });
  readonly facetasMarcas = computed(() => {
    const porId = new Map(this.marcas().map((m) => [m.id, m.nombre]));
    return (this.facets()['marcaId'] ?? []).map((b) => ({
      id: b.value,
      nombre: porId.get(b.value) ?? b.value,
      count: b.count,
    }));
  });
  readonly facetasEtiquetas = computed(() => this.facets()['etiquetas'] ?? []);
  readonly hayFacetas = computed(
    () =>
      this.facetasCategorias().length > 0 ||
      this.facetasMarcas().length > 0 ||
      this.facetasEtiquetas().length > 0,
  );
  readonly hayFiltros = computed(
    () => !!this.categoriaId() || !!this.marcaId() || this.etiquetas().length > 0,
  );

  // Criterios combinados que disparan una nueva búsqueda al cambiar.
  private readonly criterios = computed<SearchQuery>(() => ({
    q: this.q().trim() || undefined,
    categoriaId: this.categoriaId() || undefined,
    marcaId: this.marcaId() || undefined,
    etiquetas: this.etiquetas().length ? this.etiquetas() : undefined,
    sort: this.sort(),
    perPage: PER_PAGE,
  }));

  constructor() {
    this.categoriasSvc.list().subscribe({
      next: (c) => this.categorias.set(c),
      error: () => this.categorias.set([]),
    });
    this.marcasSvc.list().subscribe({
      next: (m) => this.marcas.set(m),
      error: () => this.marcas.set([]),
    });

    // Semilla inicial y reactividad ante el buscador del header (?q=...).
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const q = params.get('q') ?? '';
      if (q !== this.q().trim()) {
        this.q.set(q);
      }
    });

    // Búsqueda as-you-type: colapsa ráfagas de tecleo en una sola request.
    toObservable(this.criterios)
      .pipe(
        debounceTime(250),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        tap(() => this.loading.set(true)),
        switchMap((c) =>
          this.productos.search(c).pipe(catchError(() => of(VACIO))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((r) => {
        this.resultados.set(r.data);
        this.facets.set(r.facets ?? {});
        this.total.set(r.meta.total);
        this.termino.set(this.q().trim());
        this.loading.set(false);
        this.sincronizarUrl();
      });
  }

  alternarCategoria(id: string) {
    this.categoriaId.set(this.categoriaId() === id ? '' : id);
  }

  alternarMarca(id: string) {
    this.marcaId.set(this.marcaId() === id ? '' : id);
  }

  alternarEtiqueta(tag: string) {
    const actuales = this.etiquetas();
    this.etiquetas.set(
      actuales.includes(tag)
        ? actuales.filter((t) => t !== tag)
        : [...actuales, tag],
    );
  }

  limpiarFiltros() {
    this.categoriaId.set('');
    this.marcaId.set('');
    this.etiquetas.set([]);
  }

  /** Mantiene el `?q=` en la URL para que la búsqueda sea compartible. */
  private sincronizarUrl() {
    const q = this.q().trim();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: q || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
