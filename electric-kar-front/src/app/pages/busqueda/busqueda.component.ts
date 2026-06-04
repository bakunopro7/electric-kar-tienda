import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Producto } from '../../core/models';
import { ProductosService } from '../../core/productos.service';
import { IconComponent } from '../../shared/icon.component';
import { ProductCardComponent } from '../../shared/product-card.component';

@Component({
  selector: 'ek-busqueda',
  imports: [FormsModule, ProductCardComponent, IconComponent],
  template: `
    <h1 class="text-2xl font-bold">Búsqueda</h1>

    <form class="mt-4 flex max-w-xl items-center gap-2 rounded-full border border-black/15 px-4 py-2 focus-within:border-azul-500 dark:border-white/15"
          (submit)="$event.preventDefault(); buscar()">
      <ek-icon name="search" class="h-5 w-5 text-black/40 dark:text-white/40" />
      <input [(ngModel)]="q" name="q" placeholder="¿Qué buscas? baterías, LED, alternadores…" class="min-w-0 flex-1 bg-transparent outline-none" />
      <button type="submit" class="btn-primary px-4 py-1.5 text-sm">Buscar</button>
    </form>

    @if (termino()) {
      <p class="mt-4 text-sm text-black/60 dark:text-white/60">
        Resultados para <b class="text-black dark:text-white">"{{ termino() }}"</b> — {{ resultados().length }} encontrados
      </p>
    }

    @if (loading()) {
      <p class="mt-6 text-black/50 dark:text-white/50">Buscando…</p>
    } @else if (termino() && resultados().length === 0) {
      <div class="card mt-6 text-center text-black/60 dark:text-white/60">
        Sin resultados para "{{ termino() }}". Prueba con otra palabra.
      </div>
    } @else if (resultados().length) {
      <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        @for (p of resultados(); track p.id) {
          <ek-product-card [producto]="p" />
        }
      </div>
    }
  `,
})
export class BusquedaComponent {
  private readonly productos = inject(ProductosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  q = '';
  readonly termino = signal('');
  readonly resultados = signal<Producto[]>([]);
  readonly loading = signal(false);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.q = params.get('q') ?? '';
      this.termino.set(this.q);
      if (this.q) this.cargar(this.q);
    });
  }

  buscar() {
    this.router.navigate(['/busqueda'], { queryParams: this.q ? { q: this.q } : {} });
  }

  private cargar(term: string) {
    this.loading.set(true);
    this.productos.list({ search: term, limit: 24 }).subscribe({
      next: (r) => { this.resultados.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
