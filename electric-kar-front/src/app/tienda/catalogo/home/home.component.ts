import { DestroyRef, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Categoria, Feature, Marca, Producto, Promo } from '@core/models';
import { CategoriasService } from '@core/categorias.service';
import { ContenidoService } from '@core/contenido.service';
import { MarcasService } from '@core/marcas.service';
import { NewsletterService } from '@core/newsletter.service';
import { NotificationService } from '@core/notification.service';
import { ProductosService } from '@core/productos.service';
import { IconComponent, IconName } from '@shared/icon.component';
import { ProductCardComponent } from '@shared/product-card.component';
import { RevealDirective } from '@shared/reveal.directive';

@Component({
  selector: 'ek-home',
  imports: [RouterLink, ReactiveFormsModule, ProductCardComponent, IconComponent, RevealDirective],
  template: `
    <!-- HERO: titular de impacto + circuito con corriente en movimiento -->
    <section class="ek-sangrado relative -mt-5 overflow-hidden bg-navy-950 text-white sm:-mt-8">
      <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>

      <!-- Circuito vivo: la corriente va de la batería a cada sistema del auto -->
      <svg viewBox="0 0 520 420" aria-hidden="true"
           class="pointer-events-none absolute -right-24 top-0 h-full w-[520px] max-w-none opacity-45 md:right-[max(0px,calc(50vw-640px))] md:opacity-100">
        <g fill="none" stroke="#1b3a66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M150 210H70V90h110" /><path d="M150 230H40v120h150" /><path d="M370 210h80V70H300" />
          <path d="M370 230h110v110H330" /><path d="M260 150V40" /><path d="M260 290v100" />
        </g>
        <g fill="none" stroke="#ffd21a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path class="ek-corriente" d="M150 210H70V90h110" />
          <path class="ek-corriente" style="animation-delay:-.6s" d="M150 230H40v120h150" />
          <path class="ek-corriente" style="animation-delay:-1.1s" d="M370 210h80V70H300" />
          <path class="ek-corriente" style="animation-delay:-1.7s" d="M370 230h110v110H330" />
          <path class="ek-corriente" style="animation-delay:-.3s" d="M260 150V40" />
          <path class="ek-corriente" style="animation-delay:-2s" d="M260 290v100" />
        </g>
        <g fill="#2f74ff">
          <circle class="ek-nodo" cx="180" cy="90" r="7" /><circle class="ek-nodo" style="animation-delay:-.4s" cx="190" cy="350" r="7" />
          <circle class="ek-nodo" style="animation-delay:-.8s" cx="300" cy="70" r="7" /><circle class="ek-nodo" style="animation-delay:-1.2s" cx="330" cy="340" r="7" />
          <circle class="ek-nodo" style="animation-delay:-.2s" cx="260" cy="40" r="7" /><circle class="ek-nodo" style="animation-delay:-1s" cx="260" cy="390" r="7" />
        </g>
        <!-- Batería cargándose -->
        <g>
          <rect x="150" y="150" width="220" height="140" rx="8" fill="#071f3d" stroke="#2f74ff" stroke-width="3" />
          <rect x="185" y="132" width="40" height="18" rx="3" fill="#2f74ff" /><rect x="295" y="132" width="40" height="18" rx="3" fill="#2f74ff" />
          <g fill="#ffd21a">
            <rect class="ek-celda" x="172" y="176" width="38" height="88" rx="3" />
            <rect class="ek-celda" style="animation-delay:.3s" x="218" y="176" width="38" height="88" rx="3" />
            <rect class="ek-celda" style="animation-delay:.6s" x="264" y="176" width="38" height="88" rx="3" />
            <rect class="ek-celda" style="animation-delay:.9s" x="310" y="176" width="38" height="88" rx="3" />
          </g>
        </g>
      </svg>
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-transparent md:via-navy-950/60"></div>

      <div class="relative mx-auto max-w-7xl px-4 py-10 md:py-20">
        <p class="ek-entra flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-voltaje">
          <span class="ek-vivo"></span> Refacciones eléctricas automotrices
        </p>
        <h1 class="ek-titular mt-3 max-w-2xl text-[3.25rem] sm:text-7xl lg:text-8xl">
          <span class="ek-entra block" style="--i:1">La pieza exacta.</span>
          <span class="ek-entra block" style="--i:2">Potencia <span class="ek-marcado">real</span>.</span>
        </h1>
        <p class="ek-entra mt-4 max-w-md text-white/75 sm:text-lg" style="--i:3">
          Baterías, iluminación, audio, alternadores y sensores de marcas originales, con garantía.
        </p>
        <div class="ek-entra mt-6 flex gap-3" style="--i:4">
          <a routerLink="/tienda" class="btn-voltaje btn-lg flex-1 uppercase tracking-wide sm:flex-none sm:px-8">Ver catálogo</a>
          <a routerLink="/destacados" class="btn btn-lg flex-1 border-2 border-white/40 uppercase tracking-wide text-white hover:border-voltaje hover:text-voltaje sm:flex-none sm:px-8">Ofertas</a>
        </div>

        <ul class="ek-entra mt-8 grid max-w-xl grid-cols-3 gap-2 border-t border-white/15 pt-5" style="--i:5">
          @for (t of heroTags; track t.titulo) {
            <li class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <ek-icon [name]="t.icon" class="h-6 w-6 shrink-0 text-voltaje" />
              <div>
                <b class="block font-display text-xs leading-tight sm:text-sm">{{ t.titulo }}</b>
                <span class="block text-[11px] text-white/60 sm:text-xs">{{ t.sub }}</span>
              </div>
            </li>
          }
        </ul>
      </div>
      <div class="ek-franja h-2"></div>
    </section>

    <!-- CATEGORÍAS: carrusel táctil en móvil, rejilla en escritorio -->
    <section class="mt-8 sm:mt-12" ekReveal>
      <div class="ek-seccion">
        <h2>Compra por categoría</h2>
        <a routerLink="/tienda" class="ek-enlace">Ver todo</a>
      </div>
      <div class="ek-scroll-x lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0">
        @for (c of categorias(); track c.id) {
          <a [routerLink]="['/tienda']" [queryParams]="{ categoriaId: c.id }"
             class="group ek-tarjeta flex w-28 shrink-0 flex-col items-center gap-2 overflow-hidden rounded-ek border border-borde bg-superficie p-3 text-center lg:w-auto lg:p-4">
            <span class="grid h-12 w-12 -skew-x-6 place-items-center rounded-ek-md bg-navy-950 text-voltaje transition-colors group-hover:bg-voltaje group-hover:text-navy-950">
              <ek-icon [name]="iconoCategoria(c.slug)" class="h-6 w-6" />
            </span>
            <b class="font-display text-sm leading-tight">{{ c.nombre }}</b>
          </a>
        } @empty {
          <p class="text-sm text-texto-suave">Aún no hay categorías para mostrar.</p>
        }
      </div>
    </section>

    <!-- DESTACADOS -->
    <section class="mt-8 sm:mt-12" ekReveal>
      <div class="ek-seccion">
        <h2>Productos destacados</h2>
        <a routerLink="/tienda" class="ek-enlace">Ver más</a>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Cargando productos">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="ek-skeleton aspect-[3/5]"></div>
          }
        </div>
      } @else if (destacados().length === 0) {
        <div class="card text-center text-texto-suave">Todavía no hay productos publicados.</div>
      } @else {
        <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          @for (p of destacados(); track p.id) {
            <ek-product-card [producto]="p" />
          }
        </div>
      }
    </section>

    <!-- PROMO -->
    @if (promo(); as p) {
      <section class="mt-8 sm:mt-12" ekReveal>
        <div class="ek-franja h-2 rounded-t-ek-lg"></div>
        <div class="ek-corte relative overflow-hidden rounded-b-ek-lg bg-azul-700 p-6 text-white sm:p-10">
          <div class="ek-grid-overlay pointer-events-none absolute inset-0 opacity-60"></div>
          <div class="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <span class="ek-badge -skew-x-6 rounded-none bg-voltaje uppercase text-navy-900"><span class="ek-vivo mr-2 text-peligro"></span>{{ p.badge }}</span>
              <span class="ek-badge bg-navy-900/40 text-white">{{ p.descuento }}</span>
              <h2 class="ek-titular mt-3 text-4xl sm:text-5xl">{{ p.titulo }}</h2>
              <p class="mt-2 max-w-md text-white/80">{{ p.texto }}</p>
            </div>
            <div>
              <div class="flex gap-2" role="timer" aria-label="Tiempo restante de la oferta">
                @for (b of countdown(); track b.label) {
                  <div class="min-w-14 flex-1 rounded-ek-md bg-navy-900/40 px-2 py-2 text-center">
                    <b class="ek-num block text-xl leading-none sm:text-2xl">{{ b.value }}</b>
                    <span class="text-[11px] text-white/70">{{ b.label }}</span>
                  </div>
                }
              </div>
              <a [routerLink]="p.ctaUrl" class="btn-voltaje btn-lg mt-4 w-full">{{ p.ctaTexto }}</a>
            </div>
          </div>
        </div>
      </section>
    }

    <!-- POR QUÉ COMPRAR AQUÍ -->
    @if (features().length) {
      <section class="mt-8 sm:mt-12">
        <ul class="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          @for (f of features(); track f.id; let i = $index) {
            <li class="flex items-start gap-3" ekReveal [ekRevealDelay]="i * 80">
              <span class="grid h-11 w-11 shrink-0 -skew-x-6 place-items-center rounded-ek-md bg-navy-950 text-voltaje">
                <ek-icon [name]="$any(f.icono)" class="h-5 w-5" />
              </span>
              <div>
                <b class="font-display">{{ f.titulo }}</b>
                <p class="text-sm text-texto-suave">{{ f.texto }}</p>
              </div>
            </li>
          }
        </ul>
      </section>
    }

    <!-- MARCAS: cinta en movimiento (se pausa al pasar el cursor) -->
    @if (marcas().length) {
      <section class="ek-sangrado mt-8 border-y border-borde bg-superficie py-4 sm:mt-12" aria-label="Marcas que manejamos">
        <div class="ek-cinta" style="--ek-cinta-t: 22s">
          @for (copia of [0, 1]; track copia) {
            <ul [attr.aria-hidden]="copia === 1 ? 'true' : null">
              @for (m of marcasCinta(); track $index) {
                <li class="ek-titular flex items-center gap-6 whitespace-nowrap px-6 text-3xl text-texto-tenue">
                  {{ m.nombre }} <ek-icon name="bolt" class="h-5 w-5 text-voltaje" />
                </li>
              }
            </ul>
          }
        </div>
      </section>
    }

    <!-- NEWSLETTER -->
    <section class="mt-8 sm:mt-12">
      <div class="ek-corte relative grid gap-5 overflow-hidden rounded-ek-lg bg-navy-950 p-6 text-white sm:p-10 md:grid-cols-2 md:items-center">
        <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>
        <div class="relative">
          <h2 class="ek-titular text-4xl sm:text-5xl"><span class="text-voltaje">10% de descuento</span> en tu primera compra</h2>
          <p class="mt-2 text-white/70">Suscríbete y recibe ofertas y novedades por correo.</p>
        </div>
        <form class="relative flex flex-col gap-2 sm:flex-row" [formGroup]="form" (ngSubmit)="suscribir()">
          <input type="email" inputmode="email" autocomplete="email" placeholder="tu@correo.com" formControlName="correo" aria-label="Correo electrónico"
                 class="min-h-12 flex-1 rounded-ek border border-white/20 bg-white/10 px-4 text-white outline-none placeholder:text-white/50 focus:border-voltaje" />
          <button type="submit" [disabled]="enviando()" class="btn-voltaje btn-lg uppercase tracking-wide">
            {{ enviando() ? 'Enviando…' : 'Suscribirme' }}
          </button>
        </form>
      </div>
    </section>
  `,
})
export class HomeComponent {
  private readonly productos = inject(ProductosService);
  private readonly categoriasSvc = inject(CategoriasService);
  private readonly marcasSvc = inject(MarcasService);
  private readonly contenido = inject(ContenidoService);
  private readonly newsletter = inject(NewsletterService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  // --- Newsletter (captación de correos) ---
  readonly form = new FormGroup({
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });
  readonly enviando = signal(false);

  suscribir(): void {
    if (this.form.invalid) {
      this.notifications.error('Escribe un correo válido.');
      return;
    }
    this.enviando.set(true);
    this.newsletter
      .suscribir(this.form.controls.correo.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.enviando.set(false);
          this.form.reset();
          if (res.nuevo) {
            this.notifications.success('Te suscribiste. Revisa tu correo.');
          } else {
            this.notifications.info('Este correo ya estaba suscrito.');
          }
        },
        error: () => {
          this.enviando.set(false);
          this.notifications.error('No pudimos suscribirte. Intenta de nuevo.');
        },
      });
  }

  readonly destacados = signal<Producto[]>([]);
  readonly loading = signal(true);

  readonly heroTags: { icon: IconName; titulo: string; sub: string }[] = [
    { icon: 'shield', titulo: 'Garantía total', sub: 'Hasta 24 meses' },
    { icon: 'truck', titulo: 'Envío exprés', sub: '24-48 h' },
    { icon: 'chat', titulo: 'Soporte técnico', sub: 'Expertos reales' },
  ];

  readonly categorias = signal<Categoria[]>([]);

  /** La DB no guarda un ícono por categoría: lo resolvemos por slug. */
  private readonly iconosPorSlug: Record<string, IconName> = {
    baterias: 'battery',
    iluminacion: 'bulb',
    'iluminacion-led': 'bulb',
    audio: 'speaker',
    'audio-estereo': 'speaker',
    alternadores: 'alternator',
    alarmas: 'lock',
    cableado: 'cable',
  };

  iconoCategoria(slug: string): IconName {
    return this.iconosPorSlug[slug] ?? 'box';
  }

  readonly features = signal<Feature[]>([]);
  readonly promo = signal<Promo | null>(null);

  readonly marcas = signal<Marca[]>([]);

  /** Repite las marcas hasta llenar el ancho de la cinta (con pocas marcas se vería vacía). */
  readonly marcasCinta = computed(() => {
    const m = this.marcas();
    if (!m.length) return [];
    return Array.from({ length: Math.max(8, m.length) }, (_, i) => m[i % m.length]);
  });

  readonly countdown = signal<{ label: string; value: string }[]>([]);

  constructor() {
    this.categoriasSvc
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (c) => this.categorias.set(c),
        error: () => this.categorias.set([]),
      });

    this.marcasSvc
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (m) => this.marcas.set(m),
        error: () => this.marcas.set([]),
      });

    this.contenido
      .features()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (f) => this.features.set(f),
        error: () => this.features.set([]),
      });

    this.contenido
      .promo()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (p) => {
          this.promo.set(p);
          if (p) this.iniciarCountdown(new Date(p.fechaFin).getTime());
        },
        error: () => this.promo.set(null),
      });

    this.productos
      .list({ limit: 8 })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (r) => {
          this.destacados.set(r.data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

  }

  /** Cuenta regresiva de la promo, basada en su fechaFin (desde la DB). */
  private iniciarCountdown(targetMs: number) {
    const tick = () => {
      const diff = Math.max(0, targetMs - Date.now());
      const s = Math.floor(diff / 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      this.countdown.set([
        { label: 'Días', value: pad(Math.floor(s / 86400)) },
        { label: 'Horas', value: pad(Math.floor((s % 86400) / 3600)) },
        { label: 'Min', value: pad(Math.floor((s % 3600) / 60)) },
        { label: 'Seg', value: pad(s % 60) },
      ]);
    };
    tick();
    const id = setInterval(tick, 1000);
    this.destroyRef.onDestroy(() => clearInterval(id));
  }
}

