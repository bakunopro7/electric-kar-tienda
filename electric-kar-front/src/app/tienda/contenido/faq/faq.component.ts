import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/icon.component';

interface QA { grupo: string; q: string; a: string; }

@Component({
  selector: 'ek-faq',
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <section class="relative -mx-4 overflow-hidden bg-navy-900 px-4 text-white">
      <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>
      <div class="relative mx-auto max-w-3xl py-12 text-center">
        <h1 class="text-3xl font-bold sm:text-4xl">¿En qué te podemos ayudar?</h1>
        <p class="mt-2 text-white/70">Respuestas sobre pedidos, envíos, garantías y productos.</p>
        <div class="mx-auto mt-6 flex max-w-lg items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 focus-within:border-azul-500">
          <ek-icon name="search" class="h-5 w-5 text-white/50" />
          <input [(ngModel)]="filtro" placeholder="Busca tu pregunta… garantía, envío, batería"
                 class="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/50" />
        </div>
      </div>
    </section>

    <div class="mx-auto mt-8 max-w-3xl">
      @for (g of grupos(); track g.nombre) {
        <div class="mb-6">
          <h2 class="mb-2 font-display text-sm font-bold uppercase tracking-wider text-azul-700">{{ g.nombre }}</h2>
          <div class="space-y-2">
            @for (item of g.items; track item.q) {
              <div class="card overflow-hidden p-0">
                <button type="button" (click)="toggle(item.q)" class="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left font-semibold">
                  {{ item.q }}
                  <ek-icon name="chevron" class="h-4 w-4 shrink-0 transition-transform" [class.rotate-90]="abierto().has(item.q)" />
                </button>
                @if (abierto().has(item.q)) {
                  <div class="border-t border-black/5 px-4 py-3 text-sm text-black/70 dark:border-white/10 dark:text-white/70">{{ item.a }}</div>
                }
              </div>
            }
          </div>
        </div>
      } @empty {
        <p class="text-center text-black/50 dark:text-white/50">No hay preguntas que coincidan con "{{ filtro }}".</p>
      }

      <div class="mt-6 rounded-[18px] bg-gradient-to-br from-azul-700 to-navy-900 p-6 text-center text-white">
        <h3 class="font-bold">¿No encuentras lo que buscas?</h3>
        <p class="mt-1 text-sm text-white/70">Nuestro equipo de soporte te ayuda con gusto.</p>
        <a routerLink="/" class="btn-voltaje mt-4">Contactar soporte</a>
      </div>
    </div>
  `,
})
export class FaqComponent {
  filtro = '';
  readonly abierto = signal<Set<string>>(new Set());

  private readonly faqs: QA[] = [
    { grupo: 'Pedidos y envíos', q: '¿Cuánto tarda en llegar mi pedido?', a: 'El envío exprés llega en 24 a 48 horas hábiles. En zona metropolitana hay entrega el mismo día si compras antes de las 13:00 h, o recoge en tienda en 2 horas.' },
    { grupo: 'Pedidos y envíos', q: '¿El envío tiene costo?', a: 'El envío exprés es gratis en compras superiores a $999. Para montos menores tiene un costo desde $99 según tu ubicación.' },
    { grupo: 'Pedidos y envíos', q: '¿Cómo rastreo mi pedido?', a: 'Desde Mi cuenta → Mis pedidos puedes ver el estado en tiempo real. También te enviamos el número de guía por correo.' },
    { grupo: 'Pagos', q: '¿Qué métodos de pago aceptan?', a: 'Tarjetas de crédito y débito (Visa, Mastercard, Amex), PayPal, transferencia y pago en efectivo en OXXO. Todo cifrado con SSL.' },
    { grupo: 'Pagos', q: '¿Hay meses sin intereses?', a: 'Sí, hasta 12 meses sin intereses con tarjetas participantes en compras desde $1,500.' },
    { grupo: 'Garantías y devoluciones', q: '¿Qué garantía tienen los productos?', a: 'Todos son originales con garantía de fábrica de 6 a 24 meses según el artículo. La vigencia se indica en cada ficha.' },
    { grupo: 'Garantías y devoluciones', q: '¿Puedo devolver un producto?', a: 'Tienes 30 días para devolver un producto sin usar y en su empaque original. El reembolso se procesa en 3-5 días hábiles.' },
    { grupo: 'Productos e instalación', q: '¿Cómo sé qué pieza es compatible con mi auto?', a: 'Cada ficha indica compatibilidad. Si tienes dudas, nuestros técnicos te asesoran gratis para elegir la pieza correcta.' },
  ];

  readonly grupos = computed(() => {
    const f = this.filtro.trim().toLowerCase();
    const items = f
      ? this.faqs.filter((x) => (x.q + ' ' + x.a).toLowerCase().includes(f))
      : this.faqs;
    const map = new Map<string, QA[]>();
    for (const it of items) {
      if (!map.has(it.grupo)) map.set(it.grupo, []);
      map.get(it.grupo)!.push(it);
    }
    return [...map.entries()].map(([nombre, items]) => ({ nombre, items }));
  });

  toggle(q: string) {
    this.abierto.update((set) => {
      const next = new Set(set);
      next.has(q) ? next.delete(q) : next.add(q);
      return next;
    });
  }
}
