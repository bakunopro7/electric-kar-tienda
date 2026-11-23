import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/icon.component';
import { PageHeadComponent } from '@shared/page-head.component';
import { RevealDirective } from '@shared/reveal.directive';
import { ARTICULOS } from './blog.data';

@Component({
  selector: 'ek-blog',
  imports: [RouterLink, DatePipe, IconComponent, PageHeadComponent, RevealDirective],
  template: `
    <ek-page-head titulo="Blog" subtitulo="Guías, comparativas y consejos para el sistema eléctrico de tu auto."
                  [migas]="[{ label: 'Blog' }]" />

    <div class="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
      @for (a of articulos; track a.slug; let i = $index) {
        <a [routerLink]="['/blog', a.slug]" class="ek-tarjeta group flex flex-col overflow-hidden rounded-ek border border-borde bg-superficie" ekReveal [ekRevealDelay]="(i % 3) * 80">
          <div class="relative grid aspect-video place-items-center overflow-hidden bg-navy-950 text-voltaje">
            <div class="ek-grid-overlay absolute inset-0"></div>
            <ek-icon name="doc" class="relative h-10 w-10" />
          </div>
          <div class="flex flex-1 flex-col p-4">
            <span class="text-xs font-bold uppercase tracking-wide text-marca">{{ a.categoria }}</span>
            <h2 class="mt-1 font-display text-lg font-bold leading-snug group-hover:text-marca">{{ a.titulo }}</h2>
            <p class="mt-2 flex-1 text-sm text-texto-suave">{{ a.resumen }}</p>
            <time class="mt-3 text-xs text-texto-tenue">{{ a.fecha | date: 'longDate' }}</time>
          </div>
        </a>
      }
    </div>
  `,
})
export class BlogComponent {
  readonly articulos = ARTICULOS;
}
