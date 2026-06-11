import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ek-nosotros',
  imports: [RouterLink],
  template: `
    <section class="relative -mx-4 overflow-hidden bg-navy-900 px-4 text-white">
      <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>
      <div class="relative mx-auto max-w-3xl py-14 text-center">
        <span class="font-mono text-sm font-bold uppercase tracking-widest text-azul-500">Quiénes somos</span>
        <h1 class="mt-3 text-3xl font-bold sm:text-4xl">Energía para tu auto, con respaldo experto</h1>
        <p class="mt-3 text-white/70">
          En electrick-Kar somos especialistas en el sistema eléctrico automotriz:
          baterías, iluminación, audio, alternadores y más, con marcas originales y garantía real.
        </p>
      </div>
    </section>

    <div class="mx-auto mt-10 max-w-4xl">
      <div class="grid gap-6 sm:grid-cols-3">
        @for (v of valores; track v.titulo) {
          <div class="card text-center">
            <div class="text-3xl">{{ v.emoji }}</div>
            <h3 class="mt-2 font-display font-bold">{{ v.titulo }}</h3>
            <p class="mt-1 text-sm text-black/60 dark:text-white/60">{{ v.texto }}</p>
          </div>
        }
      </div>

      <div class="card mt-8">
        <h2 class="text-xl font-bold">Nuestra historia</h2>
        <p class="mt-3 leading-relaxed text-black/70 dark:text-white/70">
          Nacimos para resolver un problema común: encontrar la pieza eléctrica correcta,
          original y al mejor precio, con asesoría de verdad. Hoy atendemos a miles de
          clientes en todo México con envío exprés y soporte técnico especializado.
        </p>
        <a routerLink="/tienda" class="btn-primary mt-5">Explorar el catálogo</a>
      </div>
    </div>
  `,
})
export class NosotrosComponent {
  readonly valores = [
    { emoji: '🛡️', titulo: 'Garantía real', texto: 'Productos originales con respaldo de fábrica.' },
    { emoji: '🚚', titulo: 'Envío exprés', texto: 'A todo México en 24-48 h, gratis desde $999.' },
    { emoji: '💬', titulo: 'Asesoría experta', texto: 'Te ayudamos a elegir la pieza correcta.' },
  ];
}
