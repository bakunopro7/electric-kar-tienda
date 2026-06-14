import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CartService } from '@core/cart.service';
import { IconComponent } from '@shared/icon.component';

@Component({
  selector: 'ek-confirmacion',
  imports: [RouterLink, IconComponent],
  template: `
    <!-- Pasos -->
    <div class="mx-auto flex max-w-xl items-center justify-center gap-2 text-sm">
      @for (s of pasos; track s; let last = $last) {
        <div class="flex items-center gap-2 font-semibold text-exito">
          <span class="grid h-6 w-6 place-items-center rounded-full bg-exito text-white"><ek-icon name="check" class="h-3.5 w-3.5" /></span>
          {{ s }}
        </div>
        @if (!last) { <span class="h-px w-8 bg-exito/40"></span> }
      }
    </div>

    <!-- Éxito -->
    <div class="mt-8 text-center">
      <div class="mx-auto grid h-20 w-20 place-items-center rounded-full bg-exito/15 text-exito">
        <ek-icon name="check" class="h-10 w-10" />
      </div>
      <h1 class="mt-4 text-3xl font-bold">¡Gracias por tu compra!</h1>
      <p class="mt-2 text-black/60 dark:text-white/60">Tu pedido fue confirmado. Te enviamos los detalles por correo.</p>
      <span class="mt-4 inline-block rounded-full bg-black/5 px-4 py-1.5 text-sm font-semibold dark:bg-white/10">
        Pedido <b class="font-mono">{{ folio }}</b>
      </span>
    </div>

    <div class="mx-auto mt-8 grid max-w-4xl gap-6 lg:grid-cols-[1.4fr_1fr]">
      <!-- Seguimiento -->
      <section class="card">
        <h3 class="flex items-center gap-2 font-bold"><ek-icon name="truck" class="h-5 w-5 text-azul-700" /> Seguimiento del pedido</h3>
        <div class="mt-4 space-y-4">
          @for (t of tracking; track t.titulo; let i = $index) {
            <div class="flex items-start gap-3">
              <span class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full"
                    [class]="i === 0 ? 'bg-exito text-white' : i === 1 ? 'bg-azul-700 text-white' : 'bg-black/10 text-black/40 dark:bg-white/10 dark:text-white/40'">
                <ek-icon [name]="i === 0 ? 'check' : i === 1 ? 'box' : 'truck'" class="h-4 w-4" />
              </span>
              <div>
                <b class="block text-sm">{{ t.titulo }}</b>
                <small class="text-xs text-black/50 dark:text-white/50">{{ t.sub }}</small>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Acciones / ayuda -->
      <section class="space-y-4">
        <div class="card">
          <h3 class="font-bold">Tu pedido va en camino</h3>
          <p class="mt-2 text-sm text-black/60 dark:text-white/60">Puedes ver el estado y los detalles desde tu cuenta.</p>
          <a routerLink="/cuenta" class="btn-primary mt-4 w-full">Ver mis pedidos</a>
          <a routerLink="/tienda" class="btn-outline mt-2 w-full text-sm">Seguir comprando</a>
        </div>
        <div class="rounded-ek bg-gradient-to-br from-azul-700 to-navy-900 p-5 text-white">
          <h3 class="flex items-center gap-2 font-bold"><ek-icon name="chat" class="h-5 w-5" /> ¿Necesitas ayuda?</h3>
          <p class="mt-2 text-sm text-white/70">¿Dudas con tu pedido o la instalación? Nuestros técnicos te asisten.</p>
          <a routerLink="/faq" class="btn-voltaje mt-4 w-full text-sm">Centro de ayuda</a>
        </div>
      </section>
    </div>
  `,
})
export class ConfirmacionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly cart = inject(CartService);
  readonly folio = this.route.snapshot.queryParamMap.get('folio') ?? '#EK-204815';

  constructor() {
    // Al volver de un pago exitoso (Stripe), vaciamos el carrito local.
    if (this.route.snapshot.queryParamMap.get('pago') === 'ok') {
      this.cart.clear();
    }
  }

  readonly pasos = ['Carrito', 'Envío y pago', 'Confirmación'];
  readonly tracking = [
    { titulo: 'Pedido confirmado', sub: 'Hemos recibido tu pago' },
    { titulo: 'En preparación', sub: 'Empacando tu pedido' },
    { titulo: 'En camino', sub: 'Estimado: 24-48 h' },
    { titulo: 'Entregado', sub: 'Te avisaremos al llegar' },
  ];
}
