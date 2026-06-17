import { DestroyRef, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Categoria, Feature, Marca, Producto, Promo } from '@core/models';
import { CategoriasService } from '@core/categorias.service';
import { ContenidoService } from '@core/contenido.service';
import { MarcasService } from '@core/marcas.service';
import { ProductosService } from '@core/productos.service';
import { IconComponent, IconName } from '@shared/icon.component';
import { ProductCardComponent } from '@shared/product-card.component';

@Component({
  selector: 'ek-home',
  imports: [RouterLink, ProductCardComponent, IconComponent],
  template: `
    <!-- ===================== HERO ===================== -->
    <section class="relative -mx-4 overflow-hidden bg-navy-900 px-4 text-white">
      <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>
      <div class="pointer-events-none absolute -right-32 -top-52 h-[620px] w-[620px] rounded-full bg-azul-500/40 blur-[90px]"></div>
      <div class="pointer-events-none absolute -bottom-64 -left-40 h-[620px] w-[620px] rounded-full bg-azul-700/40 blur-[90px]"></div>

      <div class="relative mx-auto grid max-w-7xl items-center gap-10 py-16 md:grid-cols-2 md:py-20">
        <div class="max-w-xl">
          <span class="font-mono text-sm font-bold uppercase tracking-widest text-azul-500">Refacciones eléctricas para autos</span>
          <h1 class="mt-3 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Energía y tecnología para tu <span class="text-voltaje">auto</span>, en un solo lugar.
          </h1>
          <p class="mt-5 max-w-prose text-lg text-white/70">
            Baterías, iluminación, audio, sensores y todo el sistema eléctrico de tu
            vehículo. Marcas originales, garantía real y envío exprés.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <a routerLink="/tienda" class="btn-voltaje">Comprar ahora →</a>
            <a routerLink="/tienda" class="btn-outline border-white text-white hover:bg-white hover:text-navy-900">Ver catálogo</a>
          </div>
          <div class="mt-10 flex flex-wrap gap-8">
            @for (t of heroTags; track t.titulo) {
              <div class="flex items-center gap-3">
                <span class="grid h-10 w-10 place-items-center rounded-ek-md bg-azul-500/15 text-azul-500">
                  <ek-icon [name]="t.icon" class="h-5 w-5" />
                </span>
                <div>
                  <b class="font-display text-sm">{{ t.titulo }}</b>
                  <small class="block text-xs text-white/50">{{ t.sub }}</small>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="relative hidden md:block">
          <div class="aspect-[4/3.4] w-full rounded-ek border border-white/15 bg-white/5 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.05)_0_12px,rgba(255,255,255,.02)_12px_24px)]"></div>
          <div class="animate-floaty absolute -left-6 top-6 flex items-center gap-3 rounded-ek bg-white p-3 text-navy-900 shadow-xl">
            <span class="grid h-9 w-9 place-items-center rounded-ek-md bg-azul-700/10 text-azul-700"><ek-icon name="box" class="h-5 w-5" /></span>
            <div><b class="block font-display text-sm">+2,400 productos</b><small class="text-xs text-black/50">en catálogo</small></div>
          </div>
          <div class="animate-floaty absolute -right-4 bottom-8 flex items-center gap-3 rounded-ek bg-white p-3 text-navy-900 shadow-xl [animation-delay:1.4s]">
            <span class="grid h-9 w-9 place-items-center rounded-ek-md bg-exito/15 text-exito"><ek-icon name="check" class="h-5 w-5" /></span>
            <div><b class="block font-display text-sm">Compra protegida</b><small class="text-xs text-black/50">Pago 100% seguro</small></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== CATEGORÍAS ===================== -->
    <section class="mt-14">
      <div class="mb-6 flex items-end justify-between">
        <div>
          <span class="font-mono text-sm font-bold uppercase tracking-widest text-azul-700">Explora por categoría</span>
          <h2 class="mt-1 text-2xl font-bold">Todo el sistema eléctrico</h2>
        </div>
        <a routerLink="/tienda" class="btn-outline px-3 py-1.5 text-sm">Ver todo</a>
      </div>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        @for (c of categorias(); track c.id) {
          <a [routerLink]="['/tienda']" [queryParams]="{ categoriaId: c.id }"
             class="group card text-center transition-all hover:-translate-y-1 hover:border-azul-500 hover:shadow-lg">
            <span class="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-ek bg-black/5 text-azul-700 transition-colors group-hover:bg-azul-700 group-hover:text-white dark:bg-white/5">
              <ek-icon [name]="iconoCategoria(c.slug)" class="h-7 w-7" />
            </span>
            <b class="block font-display text-sm">{{ c.nombre }}</b>
            @if (c.descripcion) {
              <small class="text-xs text-black/50 dark:text-white/50">{{ c.descripcion }}</small>
            }
          </a>
        } @empty {
          <p class="col-span-full card text-center text-sm text-black/60 dark:text-white/60">
            Aún no hay categorías para mostrar.
          </p>
        }
      </div>
    </section>

    <!-- ===================== DESTACADOS ===================== -->
    <section class="mt-14">
      <div class="mb-6 flex items-end justify-between">
        <div>
          <span class="font-mono text-sm font-bold uppercase tracking-widest text-azul-700">Lo más vendido</span>
          <h2 class="mt-1 text-2xl font-bold">Productos destacados</h2>
          <p class="mt-1 text-sm text-black/60 dark:text-white/60">Calidad comprobada y los favoritos de la comunidad.</p>
        </div>
        <a routerLink="/tienda" class="btn-outline px-3 py-1.5 text-sm">Ver más</a>
      </div>

      @if (loading()) {
        <p class="text-black/50 dark:text-white/50">Cargando productos…</p>
      } @else if (destacados().length === 0) {
        <div class="card text-center text-black/60 dark:text-white/60">
          No hay productos todavía. Inicia el backend y carga datos (<code>pnpm db:seed</code>) para verlos aquí.
        </div>
      } @else {
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          @for (p of destacados(); track p.id) {
            <ek-product-card [producto]="p" />
          }
        </div>
      }
    </section>

    <!-- ===================== PROMO ===================== -->
    @if (promo(); as p) {
      <section class="mt-14">
        <div class="relative grid overflow-hidden rounded-ek-lg bg-gradient-to-r from-azul-700 to-navy-900 text-white md:grid-cols-2">
          <div class="ek-grid-overlay pointer-events-none absolute inset-0 opacity-60"></div>
          <div class="relative p-10 sm:p-12">
            <span class="inline-block rounded-full bg-voltaje px-3 py-1 text-xs font-bold text-navy-900">{{ p.badge }}</span>
            <h2 class="mt-4 text-3xl font-bold">{{ p.titulo }}</h2>
            <p class="mt-3 max-w-md text-white/70">{{ p.texto }}</p>
            <div class="mt-6 flex gap-2">
              @for (b of countdown(); track b.label) {
                <div class="min-w-16 rounded-ek-md border border-white/15 bg-white/10 px-3 py-2 text-center">
                  <b class="block font-display text-2xl leading-none">{{ b.value }}</b>
                  <small class="text-[10px] uppercase tracking-wide text-white/50">{{ b.label }}</small>
                </div>
              }
            </div>
            <a [routerLink]="p.ctaUrl" class="btn-voltaje mt-6">{{ p.ctaTexto }}</a>
          </div>
          <div class="relative hidden min-h-72 md:block">
            <span class="absolute right-6 top-6 z-10 rounded-full bg-peligro px-3 py-1 text-sm font-bold text-white">{{ p.descuento }}</span>
            <div class="absolute inset-5 rounded-ek border border-white/15 bg-white/5"></div>
          </div>
        </div>
      </section>
    }

    <!-- ===================== FEATURES ===================== -->
    <section class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      @for (f of features(); track f.id) {
        <div class="card flex items-start gap-4 transition-shadow hover:shadow-lg">
          <span class="grid h-12 w-12 shrink-0 place-items-center rounded-ek-md bg-azul-700/10 text-azul-700">
            <ek-icon [name]="$any(f.icono)" class="h-6 w-6" />
          </span>
          <div>
            <b class="font-display text-base">{{ f.titulo }}</b>
            <p class="mt-1 text-sm text-black/60 dark:text-white/60">{{ f.texto }}</p>
          </div>
        </div>
      }
    </section>

    <!-- ===================== MARCAS ===================== -->
    <section class="mt-14">
      <p class="mb-7 text-center font-mono text-xs uppercase tracking-[0.14em] text-black/50 dark:text-white/50">Trabajamos con las mejores marcas</p>
      <div class="flex flex-wrap justify-center gap-4">
        @for (m of marcas(); track m.id) {
          <div class="grid h-16 w-36 place-items-center rounded-ek border border-black/10 bg-white font-display font-bold text-black/30 dark:border-white/10 dark:bg-navy-800 dark:text-white/30">{{ m.nombre }}</div>
        } @empty {
          <p class="text-sm text-black/50 dark:text-white/50">Próximamente.</p>
        }
      </div>
    </section>

    <!-- ===================== NEWSLETTER ===================== -->
    <section class="mt-14">
      <div class="relative grid items-center gap-10 overflow-hidden rounded-ek-lg bg-navy-900 p-10 text-white sm:p-14 md:grid-cols-2">
        <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>
        <div class="relative">
          <span class="font-mono text-sm font-bold uppercase tracking-widest text-azul-500">Únete a la comunidad</span>
          <h2 class="mt-3 text-3xl font-bold">Recibe ofertas y novedades eléctricas</h2>
          <p class="mt-3 text-white/70">Suscríbete y obtén <b class="text-voltaje">10% de descuento</b> en tu primera compra.</p>
        </div>
        <form class="relative flex gap-2" (submit)="$event.preventDefault()">
          <input type="email" placeholder="tu@correo.com"
                 class="flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-white outline-none placeholder:text-white/50 focus:border-azul-500" />
          <button type="submit" class="btn-voltaje rounded-full">Suscribirme</button>
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
  private readonly destroyRef = inject(DestroyRef);

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
