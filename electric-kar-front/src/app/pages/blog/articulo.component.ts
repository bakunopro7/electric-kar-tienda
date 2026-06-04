import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Articulo, findArticulo } from './blog.data';

@Component({
  selector: 'ek-articulo',
  imports: [RouterLink, DatePipe],
  template: `
    @if (articulo(); as a) {
      <article class="mx-auto max-w-3xl">
        <nav class="flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
          <a routerLink="/" class="hover:text-azul-700">Inicio</a> <span>›</span>
          <a routerLink="/blog" class="hover:text-azul-700">Blog</a> <span>›</span>
          <span class="truncate">{{ a.titulo }}</span>
        </nav>

        <span class="mt-5 inline-block text-xs font-semibold uppercase tracking-wide text-azul-500">{{ a.categoria }}</span>
        <h1 class="mt-2 text-3xl font-bold sm:text-4xl">{{ a.titulo }}</h1>
        <p class="mt-2 text-sm text-black/40 dark:text-white/40">{{ a.fecha | date: 'longDate' }}</p>

        <div class="mt-6 grid aspect-video place-items-center rounded-[14px] bg-gradient-to-br from-azul-700 to-navy-900 text-6xl">📰</div>

        <div class="mt-6 space-y-4 leading-relaxed text-black/80 dark:text-white/80">
          <p class="text-lg font-medium">{{ a.resumen }}</p>
          @for (p of a.contenido; track $index) { <p>{{ p }}</p> }
        </div>

        <a routerLink="/blog" class="btn-outline mt-8 text-sm">← Volver al blog</a>
      </article>
    } @else {
      <div class="card text-center">
        <p class="text-black/60 dark:text-white/60">Artículo no encontrado.</p>
        <a routerLink="/blog" class="btn-primary mt-4">Ir al blog</a>
      </div>
    }
  `,
})
export class ArticuloComponent {
  private readonly route = inject(ActivatedRoute);
  readonly articulo = signal<Articulo | null>(findArticulo(this.route.snapshot.paramMap.get('slug') ?? ''));
}
