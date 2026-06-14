import { Component, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { AdminService, ClienteAdmin } from '@core/admin.service';
import { IconComponent, IconName } from '@shared/icon.component';
import { MoneyPipe } from '@shared/money.pipe';

interface Barra { label: string; valor: number; color: string; }

interface OrderStats {
  ventasTotal: string;
  pedidosCount: number;
  ticketPromedio: string;
}

@Component({
  selector: 'ek-admin-reportes',
  imports: [IconComponent, MoneyPipe],
  template: `
    <div class="flex items-center gap-2">
      <h2 class="text-xl font-bold">Reportes</h2>
      <span class="rounded-full bg-voltaje/20 px-2 py-0.5 text-xs font-semibold text-voltaje-600">demo</span>
    </div>
    <p class="mt-1 text-sm text-black/60 dark:text-white/60">
      KPIs, pedidos y top clientes con datos reales; los desgloses por categoría y método de pago son de ejemplo.
    </p>

    <!-- KPIs -->
    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      @for (k of kpis(); track k.label) {
        <div class="card">
          <div class="flex items-center justify-between">
            <span class="text-sm text-black/50 dark:text-white/50">{{ k.label }}</span>
            <span class="grid h-9 w-9 place-items-center rounded-ek-md bg-azul-700/10 text-azul-700"><ek-icon [name]="k.icon" class="h-5 w-5" /></span>
          </div>
          <div class="mt-2 font-display text-2xl font-bold">{{ k.value }}</div>
        </div>
      }
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <!-- Ventas por mes (vertical bars) -->
      <div class="card">
        <h3 class="font-bold">Ventas por mes <span class="text-xs font-normal text-black/40">· demo</span></h3>
        <div class="mt-4 flex h-44 items-end justify-between gap-2">
          @for (m of ventasMes; track m.label) {
            <div class="flex flex-1 flex-col items-center gap-2">
              <div class="w-full rounded-t-[6px] bg-azul-700 transition-all" [style.height.%]="(m.valor / maxMes) * 100"></div>
              <span class="text-xs text-black/50 dark:text-white/50">{{ m.label }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Métodos de pago (donut) -->
      <div class="card">
        <h3 class="font-bold">Métodos de pago <span class="text-xs font-normal text-black/40">· demo</span></h3>
        <div class="mt-4 flex items-center gap-6">
          <div class="relative h-36 w-36 shrink-0 rounded-full" [style.background]="donut()">
            <div class="absolute inset-[22%] grid place-items-center rounded-full bg-white text-center dark:bg-navy-800">
              <span class="text-xs text-black/50 dark:text-white/50">Total<br /><b class="text-base text-black dark:text-white">100%</b></span>
            </div>
          </div>
          <ul class="space-y-2 text-sm">
            @for (s of metodos; track s.label) {
              <li class="flex items-center gap-2">
                <span class="h-3 w-3 rounded-full" [style.background]="s.color"></span>
                {{ s.label }} <b class="ml-auto">{{ s.valor }}%</b>
              </li>
            }
          </ul>
        </div>
      </div>

      <!-- Ventas por categoría (horizontal bars) -->
      <div class="card">
        <h3 class="font-bold">Ventas por categoría <span class="text-xs font-normal text-black/40">· demo</span></h3>
        <div class="mt-4 space-y-3">
          @for (c of categorias; track c.label) {
            <div>
              <div class="mb-1 flex justify-between text-sm"><span>{{ c.label }}</span><span class="font-mono">{{ c.valor | money }}</span></div>
              <div class="h-2.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <div class="h-full rounded-full transition-all" [style.width.%]="(c.valor / maxCat) * 100" [style.background]="c.color"></div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Top clientes (real) -->
      <div class="card">
        <h3 class="font-bold">Top clientes</h3>
        @if (topClientes().length === 0) {
          <p class="mt-3 text-sm text-black/50 dark:text-white/50">Sin datos de clientes.</p>
        } @else {
          <div class="mt-4 space-y-2">
            @for (c of topClientes(); track c.id; let i = $index) {
              <div class="flex items-center gap-3 text-sm">
                <span class="grid h-7 w-7 place-items-center rounded-full bg-azul-700/10 text-xs font-bold text-azul-700">{{ i + 1 }}</span>
                <span class="min-w-0 flex-1 truncate">{{ c.nombre }}</span>
                <span class="font-mono font-semibold">{{ c.totalGastado | money }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ReportesComponent {
  private readonly admin = inject(AdminService);

  readonly stats = signal<OrderStats>({ ventasTotal: '0.00', pedidosCount: 0, ticketPromedio: '0.00' });
  readonly topClientes = signal<ClienteAdmin[]>([]);
  readonly clientesStats = signal<{ total: number }>({ total: 0 });

  // --- Demo data ---
  readonly ventasMes = [
    { label: 'Ene', valor: 42000 }, { label: 'Feb', valor: 38000 },
    { label: 'Mar', valor: 51000 }, { label: 'Abr', valor: 47000 },
    { label: 'May', valor: 63000 }, { label: 'Jun', valor: 58000 },
  ];
  readonly maxMes = Math.max(...this.ventasMes.map((m) => m.valor));

  readonly metodos = [
    { label: 'Tarjeta', valor: 58, color: '#0f4bd1' },
    { label: 'SPEI', valor: 22, color: '#2f74ff' },
    { label: 'OXXO Pay', valor: 14, color: '#ffd21a' },
    { label: 'PayPal', valor: 6, color: '#16a36a' },
  ];

  readonly categorias: Barra[] = [
    { label: 'Baterías', valor: 128000, color: '#0f4bd1' },
    { label: 'Iluminación LED', valor: 96000, color: '#2f74ff' },
    { label: 'Audio & Estéreo', valor: 74000, color: '#ffd21a' },
    { label: 'Alternadores', valor: 41000, color: '#16a36a' },
    { label: 'Cableado', valor: 23000, color: '#e23b4e' },
  ];
  readonly maxCat = Math.max(...this.categorias.map((c) => c.valor));

  readonly donut = computed(() => {
    let acc = 0;
    const stops = this.metodos.map((s) => {
      const from = acc;
      acc += s.valor;
      return `${s.color} ${from}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  });

  readonly kpis = computed<{ label: string; value: string; icon: IconName }[]>(() => [
    { label: 'Ventas (real)', value: this.fmt(+this.stats().ventasTotal), icon: 'card' },
    { label: 'Pedidos (real)', value: String(this.stats().pedidosCount), icon: 'cart' },
    { label: 'Ticket promedio', value: this.fmt(+this.stats().ticketPromedio), icon: 'chart' },
    { label: 'Clientes (real)', value: String(this.clientesStats().total), icon: 'user' },
  ]);

  constructor() {
    this.admin
      .ordersStats()
      .pipe(catchError(() => of({ ventasTotal: '0.00', pedidosCount: 0, ticketPromedio: '0.00' })))
      .subscribe((s) => this.stats.set(s));

    this.admin
      .clientesTop(5)
      .pipe(catchError(() => of([] as ClienteAdmin[])))
      .subscribe((l) => this.topClientes.set(l));

    this.admin
      .clientesStats()
      .pipe(catchError(() => of({ total: 0 })))
      .subscribe((s) => this.clientesStats.set(s));
  }

  private fmt(n: number) {
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  }
}
