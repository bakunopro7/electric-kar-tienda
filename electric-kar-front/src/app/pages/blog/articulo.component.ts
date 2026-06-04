import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Articulo, BlogService, iniciales } from '../../core/blog.service';

@Component({
  selector: 'ek-articulo',
  imports: [RouterLink, DatePipe],
  template: `
    @if (loading()) {
      <p class="text-black/50 dark:text-white/50">Cargando…</p>
    } @else if (articulo(); as a) {
      <article class="mx-auto max-w-3xl">
        <nav class="flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
          <a routerLink="/" class="hover:text-azul-700">Inicio</a> <span>›</span>
          <a routerLink="/blog" class="hover:text-azul-700">Blog</a> <span>›</span>
          <span class="truncate">{{ a.titulo }}</span>
        </nav>

        <span class="mt-5 inline-block text-xs font-semibold uppercase tracking-wide text-azul-500">{{ a.categoria }}</span>
        <h1 class="mt-2 text-3xl font-bold sm:text-4xl">{{ a.titulo }}</h1>
        <div class="mt-2 flex items-center gap-2 text-sm text-black/40 dark:text-white/40">
          <span>{{ a.publicadoEn | date: 'longDate' }}</span>@if (a.lectura) { · <span>{{ a.lectura }}</span> }
        </div>

        <div class="mt-6 grid aspect-video place-items-center overflow-hidden rounded-[14px] bg-gradient-to-br from-azul-700 to-navy-900 text-6xl">
          @if (a.imagen) { <img [src]="a.imagen" [alt]="a.titulo" class="h-full w-full object-cover" /> } @else { 📰 }
        </div>

        <div class="mt-4 flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-full bg-azul-700/10 text-sm font-bold text-azul-700">{{ ini(a.autorNombre) }}</span>
          <div><b class="block text-sm">{{ a.autorNombre }}</b><small class="text-xs text-black/50 dark:text-white/50">{{ a.autorRol }}</small></div>
        </div>

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
  private readonly blog = inject(BlogService);

  readonly ini = iniciales;
  readonly articulo = signal<Articulo | null>(null);
  readonly loading = signal(true);

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.blog.porSlug(slug).subscribe({
      next: (a) => { this.articulo.set(a); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
