import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ActividadAdmin, AdminService } from '../core/admin.service';
import { IconComponent, IconName } from '../shared/icon.component';

interface Estado { label: string; detalle: string; nivel: 'ok' | 'warn' | 'off'; }

@Component({
  selector: 'ek-admin-control',
  imports: [IconComponent, DatePipe],
  template: `
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-bold">Centro de control</h2>
      <span class="flex items-center gap-1.5 rounded-full bg-exito/15 px-2.5 py-0.5 text-xs font-bold text-exito">
        <span class="h-2 w-2 animate-pulse rounded-full bg-exito"></span> LIVE
      </span>
    </div>
    <p class="mt-1 text-sm text-black/60 dark:text-white/60">Estado del sistema y mantenimiento (solo Super admin).</p>

    @if (mensaje()) {
      <div class="mt-4 rounded-[12px] bg-exito/10 px-4 py-2.5 text-sm font-semibold text-exito">{{ mensaje() }}</div>
    }

    <!-- Estado del sistema -->
    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      @for (e of estados; track e.label) {
        <div class="card flex items-center gap-3">
          <span class="h-3 w-3 shrink-0 rounded-full"
                [class]="e.nivel === 'ok' ? 'bg-exito' : e.nivel === 'warn' ? 'bg-voltaje' : 'bg-peligro'"></span>
          <div>
            <div class="text-sm font-semibold">{{ e.label }}</div>
            <div class="text-xs text-black/50 dark:text-white/50">{{ e.detalle }}</div>
          </div>
        </div>
      }
    </div>

    <!-- KPIs técnicos -->
    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      @for (k of kpis(); track k.label) {
        <div class="card">
          <div class="flex items-center justify-between">
            <span class="text-sm text-black/50 dark:text-white/50">{{ k.label }}</span>
            <span class="grid h-9 w-9 place-items-center rounded-[10px] bg-azul-700/10 text-azul-700"><ek-icon [name]="k.icon" class="h-5 w-5" /></span>
          </div>
          <div class="mt-2 font-display text-2xl font-bold">{{ k.value }}</div>
          @if (k.demo) { <span class="text-[10px] uppercase tracking-wide text-black/30 dark:text-white/30">demo</span> }
        </div>
      }
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <!-- Actividad reciente -->
      <div class="card">
        <h3 class="font-bold">Actividad reciente</h3>
        @if (actividad().length === 0) {
          <p class="mt-3 text-sm text-black/50 dark:text-white/50">Sin actividad registrada.</p>
        } @else {
          <div class="mt-3 divide-y divide-black/5 dark:divide-white/10">
            @for (a of actividad().slice(0, 8); track a.id) {
              <div class="flex items-center gap-3 py-2 text-sm">
                <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="color(a.tipo)">{{ a.tipo }}</span>
                <span class="min-w-0 flex-1 truncate">{{ a.descripcion }}</span>
                <span class="whitespace-nowrap text-xs text-black/40 dark:text-white/40">{{ a.fecha | date: 'short' }}</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Zona de mantenimiento -->
      <div class="card border-peligro/30">
        <h3 class="flex items-center gap-2 font-bold text-peligro"><ek-icon name="lock" class="h-5 w-5" /> Zona de mantenimiento</h3>
        <p class="mt-1 text-sm text-black/60 dark:text-white/60">Acciones sensibles del sistema.</p>

        <div class="mt-4 space-y-3">
          <div class="flex items-center justify-between">
            <div><b class="text-sm">Modo mantenimiento</b><p class="text-xs text-black/50 dark:text-white/50">Cierra la tienda temporalmente</p></div>
            <button type="button" (click)="toggleMantenimiento()"
                    class="rounded-full px-3 py-1 text-xs font-bold" [class]="mantenimiento() ? 'bg-peligro text-white' : 'bg-black/10 dark:bg-white/10'">
              {{ mantenimiento() ? 'Activado' : 'Desactivado' }}
            </button>
          </div>

          <button type="button" class="btn-outline w-full text-sm" (click)="demo('Respaldo de base de datos iniciado (demo).')">Respaldo de BD</button>
          <button type="button" class="btn-outline w-full text-sm" (click)="demo('Caché purgada (demo).')">Purgar caché</button>
          <button type="button" class="btn w-full bg-peligro text-sm text-white hover:opacity-90" (click)="cerrarSesiones()">
            Cerrar todas las sesiones del personal
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ControlComponent {
  private readonly admin = inject(AdminService);

  readonly actividad = signal<ActividadAdmin[]>([]);
  readonly sesionesActivas = signal(0);
  readonly usuarios = signal(0);
  readonly mantenimiento = signal(false);
  readonly mensaje = signal<string | null>(null);

  readonly estados: Estado[] = [
    { label: 'Tienda', detalle: 'Operativa', nivel: 'ok' },
    { label: 'Pasarela de pago', detalle: 'No configurada', nivel: 'warn' },
    { label: 'PAC de timbrado', detalle: 'No configurado', nivel: 'warn' },
    { label: 'Último respaldo', detalle: 'Hace 6 h (demo)', nivel: 'ok' },
  ];

  readonly kpis = computed<{ label: string; value: string; icon: IconName; demo?: boolean }[]>(() => [
    { label: 'Sesiones activas', value: String(this.sesionesActivas()), icon: 'user' },
    { label: 'Usuarios del panel', value: String(this.usuarios()), icon: 'lock' },
    { label: 'Latencia API', value: '48 ms', icon: 'chart', demo: true },
    { label: 'Almacenamiento', value: '32%', icon: 'box', demo: true },
  ]);

  constructor() {
    this.admin.auditoria().pipe(catchError(() => of([] as ActividadAdmin[]))).subscribe((l) => this.actividad.set(l));
    this.refrescarSesiones();
    this.admin.usuarios().pipe(catchError(() => of([]))).subscribe((l) => this.usuarios.set(l.length));
  }

  toggleMantenimiento() {
    this.mantenimiento.update((v) => !v);
    this.flash(this.mantenimiento() ? 'Modo mantenimiento ACTIVADO (demo).' : 'Modo mantenimiento desactivado.');
  }

  demo(msg: string) { this.flash(msg); }

  cerrarSesiones() {
    this.admin.cerrarTodasSesiones().subscribe({
      next: () => { this.flash('Todas las sesiones del personal fueron cerradas.'); this.refrescarSesiones(); },
      error: () => this.flash('No se pudieron cerrar las sesiones.'),
    });
  }

  private refrescarSesiones() {
    this.admin.sesiones().pipe(catchError(() => of([]))).subscribe((l) => this.sesionesActivas.set(l.length));
  }

  private flash(msg: string) {
    this.mensaje.set(msg);
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
