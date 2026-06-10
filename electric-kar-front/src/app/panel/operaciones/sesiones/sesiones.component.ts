import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AdminService, SesionAdmin } from '@core/admin.service';

@Component({
  selector: 'ek-admin-sesiones',
  imports: [DatePipe],
  template: `
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">Sesiones activas</h2>
      @if (sesiones().length) {
        <button type="button" class="btn text-sm bg-peligro text-white hover:opacity-90" (click)="cerrarTodas()">Cerrar todas</button>
      }
    </div>

    <div class="card mt-4 overflow-x-auto">
      @if (loading()) { <p class="text-sm text-black/50 dark:text-white/50">Cargando…</p> }
      @else if (sesiones().length === 0) { <p class="text-sm text-black/50 dark:text-white/50">No hay sesiones activas registradas.</p> }
      @else {
        <table class="w-full text-sm">
          <thead class="text-left text-black/50 dark:text-white/50"><tr class="border-b border-black/10 dark:border-white/10"><th class="py-2">Usuario</th><th>Dispositivo</th><th>IP</th><th>Inicio</th><th></th></tr></thead>
          <tbody>
            @for (s of sesiones(); track s.id) {
              <tr class="border-b border-black/5 dark:border-white/10">
                <td class="py-2.5 font-semibold">{{ s.usuario?.nombre || '—' }}<br /><span class="text-xs font-normal text-black/50 dark:text-white/50">{{ s.usuario?.correo }}</span></td>
                <td class="max-w-xs truncate text-black/60 dark:text-white/60">{{ s.dispositivo || '—' }}</td>
                <td class="font-mono text-xs">{{ s.ip || '—' }}</td>
                <td class="text-black/60 dark:text-white/60">{{ s.creadoEn | date: 'short' }}</td>
                <td class="text-right"><button type="button" class="text-peligro hover:underline" (click)="cerrar(s)">Cerrar</button></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class SesionesComponent {
  private readonly admin = inject(AdminService);
  readonly sesiones = signal<SesionAdmin[]>([]);
  readonly loading = signal(true);

  constructor() { this.cargar(); }

  cerrar(s: SesionAdmin) { this.admin.cerrarSesion(s.id).subscribe(() => this.cargar()); }
  cerrarTodas() { this.admin.cerrarTodasSesiones().subscribe(() => this.cargar()); }

  private cargar() {
    this.loading.set(true);
    this.admin.sesiones().subscribe({
      next: (l) => { this.sesiones.set(l); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
