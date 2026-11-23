import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '@shared/icon.component';
import { PageHeadComponent } from '@shared/page-head.component';
import { Articulo, findArticulo } from '../blog/blog.data';

@Component({
  selector: 'ek-articulo',
  imports: [RouterLink, DatePipe, IconComponent, PageHeadComponent],
  template: `
    @if (articulo(); as a) {
      <ek-page-head [titulo]="a.titulo" [migas]="[{ label: 'Blog', url: '/blog' }, { label: a.categoria }]" />

      <article class="max-w-3xl">
        <time class="text-sm text-texto-tenue">{{ a.fecha | date: 'longDate' }}</time>
        <div class="mt-4 space-y-4 leading-relaxed text-texto-suave">
          <p class="text-lg font-semibold text-texto">{{ a.resumen }}</p>
          @for (p of a.contenido; track $index) { <p>{{ p }}</p> }
        </div>
        <a routerLink="/blog" class="btn-outline mt-8"><ek-icon name="chevron" class="h-4 w-4 rotate-180" /> Volver al blog</a>
      </article>
    } @else {
      <div class="card py-10 text-center">
        <p class="font-display font-semibold">No encontramos este artículo</p>
        <a routerLink="/blog" class="btn-primary mt-4">Ir al blog</a>
      </div>
    }
  `,
})
export class ArticuloComponent {
  private readonly route = inject(ActivatedRoute);
  readonly articulo = signal<Articulo | null>(findArticulo(this.route.snapshot.paramMap.get('slug') ?? ''));
}
