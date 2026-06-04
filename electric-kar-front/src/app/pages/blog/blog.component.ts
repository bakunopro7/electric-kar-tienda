import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ARTICULOS } from './blog.data';

@Component({
  selector: 'ek-blog',
  imports: [RouterLink, DatePipe],
  template: `
    <section class="relative -mx-4 overflow-hidden bg-navy-900 px-4 text-white">
      <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>
      <div class="relative mx-auto max-w-7xl py-10">
        <h1 class="text-3xl font-bold sm:text-4xl">Blog electrick-Kar</h1>
        <p class="mt-2 text-white/70">Guías, comparativas y consejos para el sistema eléctrico de tu auto.</p>
      </div>
    </section>

    <div class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      @for (a of articulos; track a.slug) {
        <a [routerLink]="['/blog', a.slug]" class="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
          <div class="-m-4 mb-3 grid aspect-video place-items-center bg-gradient-to-br from-azul-700 to-navy-900 text-5xl">📰</div>
          <span class="text-xs font-semibold uppercase tracking-wide text-azul-500">{{ a.categoria }}</span>
          <h2 class="mt-1 font-display text-lg font-bold group-hover:text-azul-700">{{ a.titulo }}</h2>
          <p class="mt-2 flex-1 text-sm text-black/60 dark:text-white/60">{{ a.resumen }}</p>
          <span class="mt-3 text-xs text-black/40 dark:text-white/40">{{ a.fecha | date: 'longDate' }}</span>
        </a>
      }
    </div>
  `,
})
export class BlogComponent {
  readonly articulos = ARTICULOS;
}
