import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAuthService } from '../core/admin-auth.service';
import { AdminService, ClienteAdmin } from '../core/admin.service';
import { MoneyPipe } from '../shared/money.pipe';

const SEGMENTOS = ['NUEVO', 'FRECUENTE', 'MAYOREO'];

@Component({
  selector: 'ek-admin-clientes',
  imports: [FormsModule, MoneyPipe],
  template: `
    <h2 class="text-xl font-bold">Clientes</h2>

    <div class="card mt-4 overflow-x-auto">
      @if (loading()) {
        <p class="text-sm text-black/50 dark:text-white/50">Cargando…</p>
      } @else if (clientes().length === 0) {
        <p class="text-sm text-black/50 dark:text-white/50">Sin clientes.</p>
      } @else {
        <table class="w-full text-sm">
          <thead class="text-left text-black/50 dark:text-white/50">
            <tr class="border-b border-black/10 dark:border-white/10">
              <th class="py-2">Cliente</th><th>Segmento</th><th>Pedidos</th><th>Total gastado</th>
            </tr>
          </thead>
          <tbody>
            @for (c of clientes(); track c.id) {
              <tr class="border-b border-black/5 dark:border-white/10">
                <td class="py-2.5 font-semibold">{{ c.nombre }}<br /><span class="text-xs font-normal text-black/50 dark:text-white/50">{{ c.correo }}</span></td>
                <td>
                  @if (puedeEditar()) {
                    <select [ngModel]="c.segmento" (ngModelChange)="cambiarSegmento(c, $event)" class="ek-input py-1 text-xs" [disabled]="guardando() === c.id">
                      @for (s of segmentos; track s) { <option [value]="s">{{ s }}</option> }
                    </select>
                  } @else {
                    <span class="rounded-full bg-azul-700/10 px-2 py-0.5 text-xs font-semibold text-azul-700">{{ c.segmento }}</span>
                  }
                </td>
                <td>{{ c.pedidosCount }}</td>
                <td class="font-mono font-semibold">{{ c.totalGastado | money }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class ClientesComponent {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AdminAuthService);

  readonly segmentos = SEGMENTOS;
  readonly clientes = signal<ClienteAdmin[]>([]);
  readonly loading = signal(true);
  readonly guardando = signal<string | null>(null);

  readonly puedeEditar = computed(() => this.auth.hasRole('ADMIN', 'SUPER'));

  constructor() {
    this.admin.clientes().subscribe({
      next: (list) => { this.clientes.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  cambiarSegmento(c: ClienteAdmin, segmento: string) {
    if (segmento === c.segmento) return;
    this.guardando.set(c.id);
    this.admin.actualizarSegmento(c.id, segmento).subscribe({
      next: () => {
        this.clientes.update((list) => list.map((x) => (x.id === c.id ? { ...x, segmento } : x)));
        this.guardando.set(null);
      },
      error: () => this.guardando.set(null),
    });
  }
}
