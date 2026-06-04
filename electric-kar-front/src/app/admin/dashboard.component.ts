import { SlicePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { AdminService, PedidoAdmin } from '../core/admin.service';
import { Producto } from '../core/models';
import { IconComponent, IconName } from '../shared/icon.component';
import { MoneyPipe } from '../shared/money.pipe';

@Component({
  selector: 'ek-admin-dashboard',
  imports: [IconComponent, MoneyPipe, SlicePipe],
  template: `
    <h2 class="text-xl font-bold">Resumen</h2>

    <!-- KPIs -->
    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      @for (k of kpis(); track k.label) {
        <div class="card">
          <div class="flex items-center justify-between">
            <span class="text-sm text-black/50 dark:text-white/50">{{ k.label }}</span>
            <span class="grid h-9 w-9 place-items-center rounded-[10px] bg-azul-700/10 text-azul-700"><ek-icon [name]="k.icon" class="h-5 w-5" /></span>
          </div>
          <div class="mt-2 font-display text-2xl font-bold">{{ k.value }}</div>
        </div>
      }
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <!-- Pedidos recientes -->
      <div class="card lg:col-span-2">
        <h3 class="font-bold">Pedidos recientes</h3>
        @if (pedidos().length === 0) {
          <p class="mt-3 text-sm text-black/50 dark:text-white/50">Sin pedidos (o sin acceso a esta sección).</p>
        } @else {
          <div class="mt-3 divide-y divide-black/5 dark:divide-white/10">
            @for (p of pedidosRecientes(); track p.id) {
              <div class="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span class="font-mono">{{ p.folio || (p.id | slice: 0 : 8) }}</span>
                  <span class="ml-2 text-black/50 dark:text-white/50">{{ p.cliente?.nombre || '—' }}</span>
                </div>
                <span class="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold dark:bg-white/10">{{ p.estado }}</span>
                <span class="font-mono font-semibold">{{ p.total | money }}</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Bajo inventario -->
      <div class="card">
        <h3 class="font-bold">Bajo inventario</h3>
        @if (bajoStock().length === 0) {
          <p class="mt-3 text-sm text-black/50 dark:text-white/50">Todo en orden 👍</p>
        } @else {
          <div class="mt-3 space-y-2">
            @for (p of bajoStock(); track p.id) {
              <div class="flex items-center justify-between text-sm">
                <span class="min-w-0 truncate pr-2">{{ p.nombre }}</span>
                <span class="font-mono font-semibold text-peligro">{{ p.existencias }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent {
  private readonly admin = inject(AdminService);

  readonly pedidos = signal<PedidoAdmin[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly totalProductos = signal(0);
  readonly totalClientes = signal(0);

  readonly ventas = computed(() =>
    this.pedidos().reduce((acc, p) => acc + Number(p.total), 0),
  );
  readonly pedidosRecientes = computed(() => this.pedidos().slice(0, 6));
  readonly bajoStock = computed(() =>
    this.productos()
      .filter((p) => p.existencias <= 5)
      .slice(0, 6),
  );

  readonly kpis = computed<{ label: string; value: string; icon: IconName }[]>(
    () => [
      { label: 'Ventas', value: this.fmt(this.ventas()), icon: 'card' },
      { label: 'Pedidos', value: String(this.pedidos().length), icon: 'cart' },
      { label: 'Clientes', value: String(this.totalClientes()), icon: 'user' },
      { label: 'Productos', value: String(this.totalProductos()), icon: 'box' },
    ],
  );

  constructor() {
    this.admin
      .pedidos()
      .pipe(catchError(() => of([] as PedidoAdmin[])))
      .subscribe((list) => this.pedidos.set(list));

    this.admin
      .clientes()
      .pipe(catchError(() => of([])))
      .subscribe((list) => this.totalClientes.set(list.length));

    this.admin
      .productos({ limit: 100 })
      .pipe(catchError(() => of(null)))
      .subscribe((r) => {
        if (r) {
          this.productos.set(r.data);
          this.totalProductos.set(r.meta.total);
        }
      });
  }

  private fmt(n: number) {
    return n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    });
  }
}
