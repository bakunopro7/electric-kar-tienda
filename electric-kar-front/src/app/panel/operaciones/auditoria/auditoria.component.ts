import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActividadAdmin, AdminService } from '@core/admin.service';

@Component({
  selector: 'ek-admin-auditoria',
  imports: [DatePipe],
  template: `
    <h2 class="text-xl font-bold">Registro de actividad</h2>
    <p class="mt-1 text-sm text-black/60 dark:text-white/60">Bitácora de acciones del personal (últimas 200).</p>

    <div class="card mt-4 overflow-x-auto">
      @if (loading()) { <p class="text-sm text-black/50 dark:text-white/50">Cargando…</p> }
      @else if (actividades().length === 0) { <p class="text-sm text-black/50 dark:text-white/50">Sin actividad registrada todavía.</p> }
      @else {
        <table class="w-full text-sm">
          <thead class="text-left text-black/50 dark:text-white/50"><tr class="border-b border-black/10 dark:border-white/10"><th class="py-2">Tipo</th><th>Descripción</th><th>Usuario</th><th>IP</th><th>Fecha</th></tr></thead>
          <tbody>
            @for (a of actividades(); track a.id) {
              <tr class="border-b border-black/5 dark:border-white/10">
                <td class="py-2.5"><span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="color(a.tipo)">{{ a.tipo }}</span></td>
                <td>{{ a.descripcion }}</td>
                <td class="text-black/60 dark:text-white/60">{{ a.usuario?.nombre || '—' }}</td>
                <td class="font-mono text-xs">{{ a.ip || '—' }}</td>
                <td class="whitespace-nowrap text-black/60 dark:text-white/60">{{ a.fecha | date: 'short' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class AuditoriaComponent {
  private readonly admin = inject(AdminService);
  readonly actividades = signal<ActividadAdmin[]>([]);
  readonly loading = signal(true);

  constructor() {
    this.admin.auditoria().subscribe({
      next: (l) => { this.actividades.set(l); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  color(tipo: string) {
    switch (tipo) {
      case 'FISCAL': return 'bg-azul-700/10 text-azul-700';
      case 'ELIMINAR': return 'bg-peligro/15 text-peligro';
      case 'ACCESO': return 'bg-exito/15 text-exito';
      default: return 'bg-black/10 dark:bg-white/10';
    }
  }
}
