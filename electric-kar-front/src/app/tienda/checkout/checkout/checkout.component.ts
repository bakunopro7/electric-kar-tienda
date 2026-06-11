import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth.service';
import { CartService } from '@core/cart.service';
import { CheckoutService } from '@core/checkout.service';
import { IconComponent, IconName } from '@shared/icon.component';
import { MoneyPipe } from '@shared/money.pipe';

interface Opcion {
  id: string;
  icon: IconName;
  titulo: string;
  sub: string;
  precio: number;
}

@Component({
  selector: 'ek-checkout',
  imports: [FormsModule, RouterLink, MoneyPipe, IconComponent],
  template: `
    <h1 class="text-2xl font-bold">Finalizar compra</h1>

    @if (cart.items().length === 0) {
      <div class="card mt-4 text-center text-black/60 dark:text-white/60">
        <p>No hay nada en el carrito.</p>
        <a routerLink="/tienda" class="btn-primary mt-4">Ir a la tienda</a>
      </div>
    } @else {
      <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <!-- FORMULARIO -->
        <div class="space-y-5">
          <!-- 1. Contacto -->
          <section class="card">
            <div class="mb-4 flex items-center gap-3">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-azul-700 text-sm font-bold text-white">1</span>
              <h2 class="text-lg font-bold">Datos de contacto</h2>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <input [(ngModel)]="nombre" placeholder="Nombre completo" class="ek-input sm:col-span-2" />
              <input [(ngModel)]="correo" type="email" placeholder="Correo" class="ek-input" />
              <input [(ngModel)]="telefono" placeholder="Teléfono" class="ek-input" />
            </div>
          </section>

          <!-- 2. Dirección -->
          <section class="card">
            <div class="mb-4 flex items-center gap-3">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-azul-700 text-sm font-bold text-white">2</span>
              <h2 class="text-lg font-bold">Dirección de envío</h2>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <input [(ngModel)]="calle" placeholder="Calle y número" class="ek-input sm:col-span-2" />
              <input [(ngModel)]="colonia" placeholder="Colonia" class="ek-input" />
              <input [(ngModel)]="cp" placeholder="C.P." class="ek-input" />
              <input [(ngModel)]="ciudad" placeholder="Ciudad" class="ek-input" />
              <input [(ngModel)]="estado" placeholder="Estado" class="ek-input" />
            </div>
          </section>

          <!-- 3. Envío -->
          <section class="card">
            <div class="mb-4 flex items-center gap-3">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-azul-700 text-sm font-bold text-white">3</span>
              <h2 class="text-lg font-bold">Método de envío</h2>
            </div>
            <div class="space-y-2">
              @for (o of envios; track o.id) {
                <button type="button" (click)="envio.set(o.id)"
                        class="flex w-full items-center gap-3 rounded-[12px] border p-3 text-left transition-colors"
                        [class]="envio() === o.id ? 'border-azul-700 bg-azul-700/5' : 'border-black/15 dark:border-white/15'">
                  <span class="grid h-4 w-4 place-items-center rounded-full border-2" [class]="envio() === o.id ? 'border-azul-700' : 'border-black/30'">
                    @if (envio() === o.id) { <span class="h-2 w-2 rounded-full bg-azul-700"></span> }
                  </span>
                  <ek-icon [name]="o.icon" class="h-5 w-5 text-azul-700" />
                  <span class="flex-1"><b class="block text-sm">{{ o.titulo }}</b><small class="text-xs text-black/50 dark:text-white/50">{{ o.sub }}</small></span>
                  <span class="text-sm font-semibold" [class.text-exito]="o.precio === 0">{{ o.precio === 0 ? 'Gratis' : (o.precio | money) }}</span>
                </button>
              }
            </div>
          </section>

          <!-- 4. Pago -->
          <section class="card">
            <div class="mb-4 flex items-center gap-3">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-azul-700 text-sm font-bold text-white">4</span>
              <h2 class="text-lg font-bold">Método de pago</h2>
            </div>
            <div class="space-y-2">
              @for (o of pagos; track o.id) {
                <button type="button" (click)="pago.set(o.id)"
                        class="flex w-full items-center gap-3 rounded-[12px] border p-3 text-left transition-colors"
                        [class]="pago() === o.id ? 'border-azul-700 bg-azul-700/5' : 'border-black/15 dark:border-white/15'">
                  <span class="grid h-4 w-4 place-items-center rounded-full border-2" [class]="pago() === o.id ? 'border-azul-700' : 'border-black/30'">
                    @if (pago() === o.id) { <span class="h-2 w-2 rounded-full bg-azul-700"></span> }
                  </span>
                  <ek-icon [name]="o.icon" class="h-5 w-5 text-azul-700" />
                  <span class="flex-1"><b class="block text-sm">{{ o.titulo }}</b><small class="text-xs text-black/50 dark:text-white/50">{{ o.sub }}</small></span>
                </button>
              }
            </div>
            @if (pago() === 'tarjeta') {
              <div class="mt-3 grid gap-3 sm:grid-cols-3">
                <input placeholder="Número de tarjeta" class="ek-input sm:col-span-3" />
                <input placeholder="MM/AA" class="ek-input" />
                <input placeholder="CVV" class="ek-input" />
                <select class="ek-input"><option>1 pago</option><option>3 MSI</option><option>6 MSI</option><option>12 MSI</option></select>
              </div>
            }
          </section>
        </div>

        <!-- RESUMEN -->
        <aside class="card h-fit lg:sticky lg:top-24">
          <h3 class="text-lg font-bold">Resumen del pedido</h3>
          <div class="mt-4 space-y-3">
            @for (item of cart.items(); track item.producto.id) {
              <div class="flex items-center gap-3">
                <span class="relative grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-black/5 dark:bg-white/5">
                  @if (item.producto.imagenes.length) {
                    <img [src]="item.producto.imagenes[0]" [alt]="item.producto.nombre" class="h-full w-full rounded-[8px] object-cover" />
                  } @else { 🔋 }
                  <span class="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-navy-900 px-1 text-xs font-bold text-white">{{ item.cantidad }}</span>
                </span>
                <span class="min-w-0 flex-1 truncate text-sm">{{ item.producto.nombre }}</span>
                <span class="font-mono text-sm">{{ +item.producto.precio * item.cantidad | money }}</span>
              </div>
            }
          </div>

          <!-- Cupón -->
          <div class="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
            <div class="flex gap-2">
              <input [(ngModel)]="cupon" placeholder="Código de cupón" class="ek-input flex-1 uppercase" [disabled]="!!codigoAplicado()" />
              @if (codigoAplicado()) {
                <button type="button" class="btn-outline px-3 text-sm" (click)="quitarCupon()">Quitar</button>
              } @else {
                <button type="button" class="btn-primary px-3 text-sm" [disabled]="validando()" (click)="aplicarCupon()">Aplicar</button>
              }
            </div>
            @if (cuponMsg()) { <p class="mt-2 text-xs" [class.text-exito]="codigoAplicado()" [class.text-peligro]="!codigoAplicado()">{{ cuponMsg() }}</p> }
          </div>

          <div class="mt-4 space-y-1.5 border-t border-black/10 pt-4 text-sm dark:border-white/10">
            <div class="flex justify-between"><span>Subtotal</span><span class="font-mono">{{ cart.total() | money }}</span></div>
            @if (descuento() > 0) {
              <div class="flex justify-between text-exito"><span>Descuento ({{ codigoAplicado() }})</span><span class="font-mono">−{{ descuento() | money }}</span></div>
            }
            <div class="flex justify-between"><span>Envío</span><span class="font-mono" [class.text-exito]="envioCosto() === 0">{{ envioCosto() === 0 ? 'Gratis' : (envioCosto() | money) }}</span></div>
            <div class="flex justify-between text-black/50 dark:text-white/50"><span>IVA incluido</span><span class="font-mono">{{ ivaIncluido() | money }}</span></div>
            <div class="mt-2 flex justify-between border-t border-black/10 pt-2 text-base font-bold dark:border-white/10"><span>Total</span><span class="font-mono">{{ total() | money }}</span></div>
          </div>

          @if (!auth.isAuthenticated()) {
            <p class="mt-4 text-xs text-peligro">Inicia sesión para completar tu compra.</p>
            <a routerLink="/acceso" class="btn-primary mt-2 w-full">Iniciar sesión</a>
          } @else {
            @if (error()) { <p class="mt-3 text-sm text-peligro">{{ error() }}</p> }
            <button type="button" class="btn-primary mt-4 w-full" [disabled]="procesando()" (click)="pagar()">
              <ek-icon name="lock" class="h-5 w-5" /> {{ procesando() ? 'Procesando…' : 'Pagar ' + (total() | money) }}
            </button>
          }

          <div class="mt-4 space-y-2 text-xs text-black/50 dark:text-white/50">
            <p class="flex items-center gap-2"><ek-icon name="lock" class="h-4 w-4" /> Datos protegidos con cifrado SSL</p>
            <p class="flex items-center gap-2"><ek-icon name="shield" class="h-4 w-4" /> Garantía en todos los productos</p>
          </div>
        </aside>
      </div>
    }
  `,
})
export class CheckoutComponent {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly checkout = inject(CheckoutService);
  private readonly router = inject(Router);

  readonly procesando = signal(false);
  readonly error = signal<string | null>(null);

  // Cupón
  cupon = '';
  readonly codigoAplicado = signal<string | null>(null);
  readonly descuento = signal(0);
  readonly validando = signal(false);
  readonly cuponMsg = signal<string | null>(null);

  nombre = '';
  correo = '';
  telefono = '';
  calle = '';
  colonia = '';
  cp = '';
  ciudad = '';
  estado = '';

  readonly envio = signal('expres');
  readonly pago = signal('tarjeta');

  readonly envios: Opcion[] = [
    { id: 'expres', icon: 'truck', titulo: 'Envío exprés', sub: 'Recíbelo en 24-48 h hábiles', precio: 0 },
    { id: 'mismo', icon: 'bolt', titulo: 'Envío mismo día', sub: 'Zona metropolitana · antes de 13:00', precio: 149 },
    { id: 'pickup', icon: 'box', titulo: 'Recoger en tienda', sub: 'Av. Tecnología 1200, CDMX · listo en 2 h', precio: 0 },
  ];

  readonly pagos: Opcion[] = [
    { id: 'tarjeta', icon: 'card', titulo: 'Tarjeta de crédito o débito', sub: 'Hasta 12 meses sin intereses', precio: 0 },
    { id: 'paypal', icon: 'card', titulo: 'PayPal', sub: 'Paga con tu cuenta PayPal', precio: 0 },
    { id: 'oxxo', icon: 'box', titulo: 'Pago en efectivo (OXXO)', sub: 'Recibe tu referencia por correo', precio: 0 },
  ];

  readonly envioCosto = computed(
    () => this.envios.find((e) => e.id === this.envio())?.precio ?? 0,
  );
  readonly ivaIncluido = computed(() => this.cart.total() - this.cart.total() / 1.16);
  readonly total = computed(() =>
    Math.max(0, this.cart.total() - this.descuento()) + this.envioCosto(),
  );

  aplicarCupon() {
    if (!this.cupon.trim()) return;
    this.validando.set(true);
    this.cuponMsg.set(null);
    this.checkout.validarCupon(this.cupon.trim().toUpperCase(), this.cart.total()).subscribe({
      next: (r) => {
        this.codigoAplicado.set(r.codigo);
        this.descuento.set(Number(r.descuento));
        this.cuponMsg.set(
          r.envioGratis ? 'Cupón de envío gratis aplicado' : `Cupón aplicado: −${r.descuento}`,
        );
        this.validando.set(false);
      },
      error: (e: { error?: { message?: string } }) => {
        this.cuponMsg.set(e?.error?.message ?? 'Cupón no válido');
        this.validando.set(false);
      },
    });
  }

  quitarCupon() {
    this.codigoAplicado.set(null);
    this.descuento.set(0);
    this.cupon = '';
    this.cuponMsg.set(null);
  }

  pagar() {
    const items = this.cart.items().map((it) => ({
      productoId: it.producto.id,
      cantidad: it.cantidad,
    }));
    if (items.length === 0) return;

    this.error.set(null);
    this.procesando.set(true);
    this.checkout.realizarPedido(items, this.codigoAplicado() ?? undefined).subscribe({
      next: (res) => {
        if (res.url) {
          // Stripe configurado: redirige a la página de pago (no vaciamos el
          // carrito local por si el cliente cancela y vuelve).
          window.location.href = res.url;
          return;
        }
        // Modo demo (sin Stripe): pedido creado, vamos a confirmación.
        this.cart.clear();
        this.procesando.set(false);
        this.router.navigate(['/confirmacion'], {
          queryParams: { folio: res.folio || res.pedidoId },
        });
      },
      error: (e: { error?: { message?: string | string[] } }) => {
        const m = e?.error?.message;
        this.error.set(Array.isArray(m) ? m.join(', ') : m ?? 'No se pudo procesar el pedido');
        this.procesando.set(false);
      },
    });
  }
}

