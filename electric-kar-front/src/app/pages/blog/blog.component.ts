import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { ARTICULOS, Articulo, CATEGORIAS_BLOG } from './blog.data';

@Component({
  selector: 'ek-blog',
  imports: [RouterLink, IconComponent],
  template: `
    <!-- Cabecera -->
    <section class="relative -mx-4 overflow-hidden bg-navy-900 px-4 text-white">
      <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>
      <div class="relative mx-auto max-w-7xl py-10">
        <nav class="flex items-center gap-2 text-sm text-white/50">
          <a routerLink="/" class="hover:text-white">Inicio</a>
          <ek-icon name="chevron" class="h-3 w-3" /> <span>Blog</span>
        </nav>
        <h1 class="mt-3 text-3xl font-bold sm:text-4xl">Blog electrick-Kar</h1>
        <p class="mt-2 text-white/70">Guías, consejos y novedades sobre el sistema eléctrico de tu auto.</p>
      </div>
    </section>

    <!-- Destacado -->
    @if (destacado(); as f) {
      <a [routerLink]="['/blog', f.slug]" class="card group mt-8 grid gap-6 overflow-hidden md:grid-cols-2">
        <div class="relative -m-4 mb-0 grid aspect-video place-items-center bg-gradient-to-br from-azul-700 to-navy-900 text-6xl md:m-0 md:aspect-auto md:min-h-64">
          <span class="absolute left-4 top-4 rounded-full bg-voltaje px-3 py-1 text-xs font-bold text-navy-900">Destacado</span>
          📰
        </div>
        <div class="flex flex-col justify-center">
          <div class="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
            <span class="font-semibold text-azul-500">{{ f.categoria }}</span> · <span>{{ f.fecha }}</span> · <span>{{ f.lectura }}</span>
          </div>
          <h2 class="mt-2 font-display text-2xl font-bold group-hover:text-azul-700">{{ f.titulo }}</h2>
          <p class="mt-2 text-black/70 dark:text-white/70">{{ f.resumen }}</p>
          <div class="mt-4 flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-full bg-azul-700/10 text-sm font-bold text-azul-700">{{ f.autor.iniciales }}</span>
            <div><b class="block text-sm">{{ f.autor.nombre }}</b><small class="text-xs text-black/50 dark:text-white/50">{{ f.autor.rol }}</small></div>
          </div>
        </div>
      </a>
    }

    <!-- Filtros -->
    <div class="mt-10 flex flex-wrap gap-2">
      @for (c of categorias; track c) {
        <button type="button" (click)="filtro.set(c)"
                class="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
                [class]="filtro() === c ? 'border-azul-700 bg-azul-700 text-white' : 'border-black/15 hover:border-azul-500 dark:border-white/15'">
          {{ c }}
        </button>
      }
    </div>

    <div class="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
      <!-- Posts -->
      <div class="grid gap-6 sm:grid-cols-2">
        @for (p of posts(); track p.slug) {
          <a [routerLink]="['/blog', p.slug]" class="card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div class="relative -m-4 mb-3 grid aspect-video place-items-center bg-gradient-to-br from-azul-700 to-navy-900 text-4xl">
              @if (p.etiqueta) { <span class="absolute left-3 top-3 rounded-full bg-voltaje px-2.5 py-0.5 text-xs font-bold text-navy-900">{{ p.etiqueta }}</span> }
              📰
            </div>
            <div class="flex flex-1 flex-col">
              <div class="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
                <span class="font-semibold text-azul-500">{{ p.categoria }}</span> · <span>{{ p.fecha }}</span> · <span>{{ p.lectura }}</span>
              </div>
              <h3 class="mt-1 font-display font-bold group-hover:text-azul-700">{{ p.titulo }}</h3>
              <p class="mt-2 flex-1 text-sm text-black/60 dark:text-white/60">{{ p.resumen }}</p>
              <span class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-azul-700">Leer artículo →</span>
            </div>
          </a>
        } @empty {
          <p class="text-black/50 dark:text-white/50">No hay artículos en esta categoría.</p>
        }
      </div>

      <!-- Sidebar -->
      <aside class="space-y-4">
        <div class="card">
          <h4 class="flex items-center gap-2 font-display font-bold"><ek-icon name="chart" class="h-4 w-4 text-azul-700" /> Más leídos</h4>
          <div class="mt-3 space-y-3">
            @for (p of masLeidos; track p.slug) {
              <a [routerLink]="['/blog', p.slug]" class="flex gap-3">
                <span class="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-gradient-to-br from-azul-700 to-navy-900 text-lg">📰</span>
                <div><b class="text-sm leading-tight hover:text-azul-700">{{ p.titulo }}</b><small class="block text-xs text-black/40 dark:text-white/40">{{ p.lectura }}</small></div>
              </a>
            }
          </div>
        </div>
        <div class="card">
          <h4 class="flex items-center gap-2 font-display font-bold"><ek-icon name="tag" class="h-4 w-4 text-azul-700" /> Temas</h4>
          <div class="mt-3 flex flex-wrap gap-2">
            @for (t of temas; track t) {
              <span class="rounded-full bg-black/5 px-3 py-1 text-xs dark:bg-white/10">{{ t }}</span>
            }
          </div>
        </div>
        <div class="rounded-[14px] bg-gradient-to-br from-azul-700 to-navy-900 p-5 text-white">
          <h4 class="font-display font-bold">Newsletter</h4>
          <p class="mt-1 text-sm text-white/70">Recibe nuestras guías y ofertas en tu correo.</p>
          <input type="email" placeholder="tu@correo.com" class="mt-3 w-full rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-white/50" />
          <button type="button" class="btn-voltaje mt-2 w-full text-sm">Suscribirme</button>
        </div>
      </aside>
    </div>
  `,
})
export class BlogComponent {
  readonly categorias = CATEGORIAS_BLOG;
  readonly filtro = signal('Todos');

  private readonly normales = ARTICULOS.filter((a) => !a.destacado);
  readonly destacado = signal<Articulo | undefined>(
    ARTICULOS.find((a) => a.destacado) ?? ARTICULOS[0],
  );
  readonly masLeidos = this.normales.slice(0, 3);
  readonly temas = ['Baterías', 'LED', 'Alternador', 'Audio', 'Start-Stop', 'Cableado', 'Diagnóstico'];

  readonly posts = computed(() =>
    this.filtro() === 'Todos'
      ? this.normales
      : this.normales.filter((p) => p.categoria === this.filtro()),
  );
}
