import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';

export interface Miga {
  label: string;
  /** Sin `url` = página actual. */
  url?: string;
}

/**
 * Encabezado de página de la tienda: banda oscura a todo el ancho con ruta,
 * titular de impacto y subtítulo. Todas las páginas interiores usan este.
 *
 *   <ek-page-head titulo="Contacto" subtitulo="…" [migas]="[{ label: 'Contacto' }]" />
 *
 * El contenido proyectado (p. ej. un buscador) va debajo del subtítulo.
 */
@Component({
  selector: 'ek-page-head',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <section class="ek-sangrado relative -mt-5 mb-6 overflow-hidden bg-navy-950 text-white sm:-mt-8 sm:mb-8">
      <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>
      <div class="relative mx-auto max-w-7xl px-4 py-6 sm:py-10">
        @if (migas().length) {
          <nav aria-label="Ruta" class="mb-2 flex flex-wrap items-center gap-1.5 text-sm text-white/60">
            <a routerLink="/" class="hover:text-voltaje">Inicio</a>
            @for (m of migas(); track m.label) {
              <ek-icon name="chevron" class="h-3 w-3 shrink-0" />
              @if (m.url) {
                <a [routerLink]="m.url" class="hover:text-voltaje">{{ m.label }}</a>
              } @else {
                <span aria-current="page">{{ m.label }}</span>
              }
            }
          </nav>
        }
        <h1 class="ek-titular ek-entra max-w-3xl text-4xl sm:text-6xl">{{ titulo() }}</h1>
        @if (subtitulo()) {
          <p class="ek-entra mt-3 max-w-2xl text-white/75 sm:text-lg" style="--i:1">{{ subtitulo() }}</p>
        }
        <ng-content />
      </div>
      <div class="ek-franja h-1.5"></div>
    </section>
  `,
})
export class PageHeadComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
  readonly migas = input<Miga[]>([]);
}
