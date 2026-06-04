import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, PedidoAdmin } from '../core/admin.service';
import { MoneyPipe } from '../shared/money.pipe';

const ESTADOS = ['NUEVO', 'PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];

@Component({
  selector: 'ek-admin-pedidos',
  imports: [FormsModule, MoneyPipe, DatePipe],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xl font-bold">Pedidos</h2>
      <select [(ngModel)]="filtro" class="ek-input">
        <option value="">Todos los estados</option>
        @for (e of estados; track e) { <option [value]="e">{{ e }}</option> }
      </select>
    </div>

    <div class="card mt-4 overflow-x-auto">
      @if (loading()) {
        <p class="text-sm text-black/50 dark:text-white/50">Cargando…</p>
      } @else if (filtrados().length === 0) {
        <p class="text-sm text-black/50 dark:text-white/50">Sin pedidos.</p>
      } @else {
        <table class="w-full text-sm">
          <thead class="text-left text-black/50 dark:text-white/50">
            <tr class="border-b border-black/10 dark:border-white/10">
              <th class="py-2">Folio</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (p of filtrados(); track p.id) {
              <tr class="border-b border-black/5 dark:border-white/10">
                <td class="py-2.5 font-mono text-xs">{{ p.folio || (p.id.slice(0, 8)) }}</td>
                <td class="font-semibold">{{ p.cliente?.nombre || '—' }}<br /><span class="text-xs font-normal text-black/50 dark:text-white/50">{{ p.cliente?.correo }}</span></td>
                <td class="text-black/60 dark:text-white/60">{{ p.creadoEn | date: 'short' }}</td>
                <td class="font-mono font-semibold">{{ p.total | money }}</td>
                <td>
                  <select [ngModel]="p.estado" (ngModelChange)="cambiarEstado(p, $event)"
                          class="ek-input py-1 text-xs" [disabled]="guardando() === p.id">
                    @for (e of estados; track e) { <option [value]="e">{{ e }}</option> }
                  </select>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class PedidosComponent {
  private readonly admin = inject(AdminService);

  readonly estados = ESTADOS;
  readonly pedidos = signal<PedidoAdmin[]>([]);
  readonly loading = signal(true);
  readonly guardando = signal<string | null>(null);
  filtro = '';

  readonly filtrados = computed(() =>
    this.filtro ? this.pedidos().filter((p) => p.estado === this.filtro) : this.pedidos(),
  );

  constructor() {
    this.admin.pedidos().subscribe({
      next: (list) => { this.pedidos.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  cambiarEstado(p: PedidoAdmin, estado: string) {
    if (estado === p.estado) return;
    this.guardando.set(p.id);
    this.admin.actualizarEstadoPedido(p.id, estado).subscribe({
      next: () => {
        this.pedidos.update((list) =>
          list.map((x) => (x.id === p.id ? { ...x, estado } : x)),
        );
        this.guardando.set(null);
      },
      error: () => this.guardando.set(null),
    });
  }
}
