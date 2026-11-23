import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent, IconName } from '@shared/icon.component';
import { PageHeadComponent } from '@shared/page-head.component';
import { RevealDirective } from '@shared/reveal.directive';

@Component({
  selector: 'ek-contacto',
  imports: [FormsModule, IconComponent, PageHeadComponent, RevealDirective],
  template: `
    <ek-page-head titulo="Contáctanos" subtitulo="¿Dudas sobre un producto o tu pedido? Te ayudamos a elegir la pieza correcta."
                  [migas]="[{ label: 'Contacto' }]" />

    <div class="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <ul class="grid gap-3 self-start sm:grid-cols-2 lg:grid-cols-1">
        @for (d of datos; track d.titulo; let i = $index) {
          <li class="ek-tarjeta card flex items-center gap-3" ekReveal [ekRevealDelay]="i * 70">
            <span class="grid h-11 w-11 shrink-0 -skew-x-6 place-items-center rounded-ek-md bg-navy-950 text-voltaje"><ek-icon [name]="d.icon" class="h-5 w-5" /></span>
            <div class="min-w-0">
              <b class="block text-sm">{{ d.titulo }}</b>
              @if (d.href) {
                <a [href]="d.href" class="break-words text-sm text-texto-suave hover:text-marca">{{ d.valor }}</a>
              } @else {
                <span class="text-sm text-texto-suave">{{ d.valor }}</span>
              }
            </div>
          </li>
        }
      </ul>

      <form class="card sm:p-6" (submit)="enviar($event)">
        <div class="ek-seccion"><h2>Envíanos un mensaje</h2></div>
        <div class="grid gap-3">
          <input [(ngModel)]="nombre" name="nombre" placeholder="Tu nombre" autocomplete="name" aria-label="Tu nombre" required class="ek-input" />
          <input [(ngModel)]="correo" name="correo" type="email" inputmode="email" autocomplete="email" placeholder="Tu correo" aria-label="Tu correo" required class="ek-input" />
          <textarea [(ngModel)]="mensaje" name="mensaje" rows="5" placeholder="¿En qué te ayudamos?" aria-label="Tu mensaje" required class="ek-input"></textarea>
          @if (enviado()) {
            <p class="flex items-center gap-2 text-sm font-semibold text-exito" role="status"><ek-icon name="check" class="h-4 w-4" /> Mensaje enviado. Te responderemos pronto (demo).</p>
          }
          <button type="submit" class="btn-voltaje btn-lg uppercase tracking-wide">Enviar mensaje</button>
        </div>
      </form>
    </div>
  `,
})
export class ContactoComponent {
  protected readonly datos: { icon: IconName; titulo: string; valor: string; href?: string }[] = [
    { icon: 'pin', titulo: 'Dirección', valor: 'Av. Tecnología 1200, CDMX' },
    { icon: 'phone', titulo: 'Teléfono', valor: '55 1234 5678', href: 'tel:+525512345678' },
    { icon: 'mail', titulo: 'Correo', valor: 'hola@electrick-kar.com', href: 'mailto:hola@electrick-kar.com' },
    { icon: 'clock', titulo: 'Horario', valor: 'Lunes a sábado, 9:00 a 19:00' },
  ];

  nombre = '';
  correo = '';
  mensaje = '';
  readonly enviado = signal(false);

  enviar(e: Event) {
    e.preventDefault();
    this.enviado.set(true);
  }
}
