import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
        <div class="card flex items-center gap-3"><span class="text-2xl">📍</span><div><b class="text-sm">Dirección</b><p class="text-sm text-black/60 dark:text-white/60">Av. Tecnología 1200, CDMX</p></div></div>
        <div class="card flex items-center gap-3"><span class="text-2xl">📞</span><div><b class="text-sm">Teléfono</b><p class="text-sm text-black/60 dark:text-white/60">55 1234 5678</p></div></div>
        <div class="card flex items-center gap-3"><span class="text-2xl">✉️</span><div><b class="text-sm">Correo</b><p class="text-sm text-black/60 dark:text-white/60">hola&#64;electrick-kar.com</p></div></div>
        <div class="card flex items-center gap-3"><span class="text-2xl">🕒</span><div><b class="text-sm">Horario</b><p class="text-sm text-black/60 dark:text-white/60">Lun a Sáb · 9:00 - 19:00</p></div></div>
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
  nombre = '';
  correo = '';
  mensaje = '';
  readonly enviado = signal(false);

  enviar(e: Event) {
    e.preventDefault();
    this.enviado.set(true);
  }
}
