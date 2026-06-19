import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContenidoService } from '@core/contenido.service';
import { DatosContacto } from '@core/models';
import { IconComponent } from '@shared/icon.component';

@Component({
  selector: 'ek-contacto',
  imports: [FormsModule, IconComponent],
  template: `
    <section class="relative -mx-4 overflow-hidden bg-navy-900 px-4 text-white">
      <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>
      <div class="relative mx-auto max-w-3xl py-12 text-center">
        <h1 class="text-3xl font-bold sm:text-4xl">Contáctanos</h1>
        <p class="mt-2 text-white/70">¿Dudas sobre un producto o tu pedido? Estamos para ayudarte.</p>
      </div>
    </section>

    <div class="mx-auto mt-8 grid max-w-4xl gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div class="space-y-3">
        @if (contacto(); as c) {
          <div class="card flex items-center gap-3"><span class="text-2xl">📍</span><div><b class="text-sm">Dirección</b><p class="text-sm text-black/60 dark:text-white/60">{{ c.direccion }}</p></div></div>
          <div class="card flex items-center gap-3"><span class="text-2xl">📞</span><div><b class="text-sm">Teléfono</b><p class="text-sm text-black/60 dark:text-white/60">{{ c.telefono }}</p></div></div>
          <div class="card flex items-center gap-3"><span class="text-2xl">✉️</span><div><b class="text-sm">Correo</b><p class="text-sm text-black/60 dark:text-white/60">{{ c.correo }}</p></div></div>
          <div class="card flex items-center gap-3"><span class="text-2xl">🕒</span><div><b class="text-sm">Horario</b><p class="text-sm text-black/60 dark:text-white/60">{{ c.horario }}</p></div></div>
        }
      </div>

      <form class="card" (submit)="enviar($event)">
        <h2 class="text-lg font-bold">Envíanos un mensaje</h2>
        <div class="mt-4 grid gap-3">
          <input [(ngModel)]="nombre" name="nombre" placeholder="Tu nombre" required class="ek-input" />
          <input [(ngModel)]="correo" name="correo" type="email" placeholder="Tu correo" required class="ek-input" />
          <textarea [(ngModel)]="mensaje" name="mensaje" rows="4" placeholder="¿En qué te ayudamos?" required class="ek-input"></textarea>
          @if (enviado()) {
            <p class="flex items-center gap-2 text-sm text-exito"><ek-icon name="check" class="h-4 w-4" /> ¡Gracias! Te responderemos pronto (demo).</p>
          }
          <button type="submit" class="btn-primary">Enviar mensaje</button>
        </div>
      </form>
    </div>
  `,
})
export class ContactoComponent {
  private readonly contenido = inject(ContenidoService);
  readonly contacto = signal<DatosContacto | null>(null);

  nombre = '';
  correo = '';
  mensaje = '';
  readonly enviado = signal(false);

  constructor() {
    this.contenido.contacto().subscribe({
      next: (c) => this.contacto.set(c),
      error: () => this.contacto.set(null),
    });
  }

  enviar(e: Event) {
    e.preventDefault();
    this.enviado.set(true);
  }
}
