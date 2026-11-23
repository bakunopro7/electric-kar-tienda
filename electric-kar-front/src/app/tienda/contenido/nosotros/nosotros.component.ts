import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from '@shared/icon.component';
import { PageHeadComponent } from '@shared/page-head.component';
import { RevealDirective } from '@shared/reveal.directive';

@Component({
  selector: 'ek-nosotros',
  imports: [RouterLink, IconComponent, PageHeadComponent, RevealDirective],
  template: `
    <ek-page-head titulo="Especialistas en el sistema eléctrico de tu auto"
                  subtitulo="Baterías, iluminación, audio, alternadores y más, con marcas originales y garantía."
                  [migas]="[{ label: 'Nosotros' }]" />

    <ul class="grid gap-4 sm:grid-cols-3">
      @for (v of valores; track v.titulo; let i = $index) {
        <li class="ek-tarjeta card" ekReveal [ekRevealDelay]="i * 80">
          <span class="grid h-11 w-11 -skew-x-6 place-items-center rounded-ek-md bg-navy-950 text-voltaje"><ek-icon [name]="v.icon" class="h-5 w-5" /></span>
          <h2 class="mt-3 font-display text-lg font-bold">{{ v.titulo }}</h2>
          <p class="mt-1 text-sm text-texto-suave">{{ v.texto }}</p>
        </li>
      }
    </ul>

    <section class="ek-corte mt-8 rounded-ek-lg bg-navy-950 p-6 text-white sm:p-10" ekReveal>
      <h2 class="ek-titular text-4xl sm:text-5xl">Nuestra historia</h2>
      <p class="mt-3 max-w-prose leading-relaxed text-white/75">
        Nacimos para resolver un problema común: encontrar la pieza eléctrica correcta,
        original y a buen precio, con asesoría de verdad. Hoy enviamos a todo México
        y damos soporte técnico especializado.
      </p>
      <a routerLink="/tienda" class="btn-voltaje btn-lg mt-5 uppercase tracking-wide">Ver catálogo</a>
    </section>
  `,
})
export class NosotrosComponent {
  readonly valores: { icon: IconName; titulo: string; texto: string }[] = [
    { icon: 'shield', titulo: 'Garantía real', texto: 'Productos originales con respaldo de fábrica.' },
    { icon: 'truck', titulo: 'Envío exprés', texto: 'A todo México en 24 a 48 horas, gratis desde $999.' },
    { icon: 'chat', titulo: 'Asesoría experta', texto: 'Te ayudamos a elegir la pieza correcta.' },
  ];
}
