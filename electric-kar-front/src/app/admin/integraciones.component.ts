import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAuthService } from '../core/admin-auth.service';
import { AdminService, IntegracionAdmin, MetodoPagoAdmin } from '../core/admin.service';

@Component({
  selector: 'ek-admin-integraciones',
  imports: [FormsModule],
  template: `
    <h2 class="text-xl font-bold">Integraciones</h2>
    <p class="mt-1 text-sm text-black/60 dark:text-white/60">Pasarelas de pago, PAC de timbrado y paqueterías.</p>

    @if (esSuper()) {
      <form (ngSubmit)="crear()" class="card mt-4 grid gap-3 sm:grid-cols-4">
        <select [(ngModel)]="form.tipo" name="tipo" class="ek-input">
          <option value="PASARELA">Pasarela</option>
          <option value="PAC">PAC (timbrado)</option>
          <option value="PAQUETERIA">Paquetería</option>
        </select>
        <input [(ngModel)]="form.proveedor" name="prov" placeholder="Proveedor (ej. Stripe)" required class="ek-input sm:col-span-2" />
        <select [(ngModel)]="form.modo" name="modo" class="ek-input">
          <option value="PRUEBAS">Pruebas</option>
          <option value="PRODUCCION">Producción</option>
        </select>
        <button type="submit" class="btn-primary text-sm sm:col-span-4 sm:w-auto sm:justify-self-start">Añadir integración</button>
      </form>
    }

    <div class="card mt-4 overflow-x-auto">
      @if (loading()) { <p class="text-sm text-black/50 dark:text-white/50">Cargando…</p> }
      @else if (integraciones().length === 0) { <p class="text-sm text-black/50 dark:text-white/50">Sin integraciones configuradas.</p> }
      @else {
        <table class="w-full text-sm">
          <thead class="text-left text-black/50 dark:text-white/50"><tr class="border-b border-black/10 dark:border-white/10"><th class="py-2">Tipo</th><th>Proveedor</th><th>Modo</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (i of integraciones(); track i.id) {
              <tr class="border-b border-black/5 dark:border-white/10">
                <td class="py-2.5">{{ i.tipo }}</td>
                <td class="font-semibold">{{ i.proveedor }}</td>
                <td><span class="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">{{ i.modo }}</span></td>
                <td>{{ i.estado }}</td>
                <td class="text-right">@if (esSuper()) { <button type="button" class="text-peligro hover:opacity-70" (click)="eliminar(i)">✕</button> }</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <!-- Métodos de pago -->
    <h2 class="mt-8 text-xl font-bold">Métodos de pago</h2>
    <div class="card mt-3">
      @if (metodos().length === 0) {
        <p class="text-sm text-black/50 dark:text-white/50">Sin métodos configurados. Añade los básicos:</p>
        <div class="mt-3 flex flex-wrap gap-2">
          @for (b of base; track b.codigo) {
            <button type="button" class="btn-outline text-sm" (click)="alta(b)">+ {{ b.nombre }}</button>
          }
        </div>
      } @else {
        <div class="space-y-2">
          @for (m of metodos(); track m.id) {
            <div class="flex items-center justify-between border-b border-black/5 py-2 last:border-0 dark:border-white/10">
              <div><b class="text-sm">{{ m.nombre }}</b> <span class="font-mono text-xs text-black/40">{{ m.codigo }}</span></div>
              <button type="button" class="rounded-full px-3 py-1 text-xs font-semibold"
                      [class]="m.activo ? 'bg-exito/15 text-exito' : 'bg-black/10 dark:bg-white/10'"
                      (click)="toggle(m)">{{ m.activo ? 'Activo' : 'Inactivo' }}</button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class IntegracionesComponent {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AdminAuthService);

  readonly integraciones = signal<IntegracionAdmin[]>([]);
  readonly metodos = signal<MetodoPagoAdmin[]>([]);
  readonly loading = signal(true);
  form = { tipo: 'PASARELA', proveedor: '', modo: 'PRUEBAS' };

  readonly esSuper = computed(() => this.auth.hasRole('SUPER'));
  readonly base = [
    { codigo: 'card', nombre: 'Tarjeta' },
    { codigo: 'spei', nombre: 'Transferencia SPEI' },
    { codigo: 'oxxo', nombre: 'OXXO Pay' },
    { codigo: 'pickup', nombre: 'Recoger en tienda' },
  ];

  constructor() {
    this.cargar();
    this.admin.metodosPago().subscribe({ next: (m) => this.metodos.set(m), error: () => {} });
  }

  crear() {
    this.admin.crearIntegracion({ ...this.form }).subscribe(() => {
      this.form = { tipo: 'PASARELA', proveedor: '', modo: 'PRUEBAS' };
      this.cargar();
    });
  }
  eliminar(i: IntegracionAdmin) { this.admin.eliminarIntegracion(i.id).subscribe(() => this.cargar()); }

  alta(b: { codigo: string; nombre: string }) {
    this.admin.upsertMetodoPago({ ...b, activo: true }).subscribe(() =>
      this.admin.metodosPago().subscribe((m) => this.metodos.set(m)),
    );
  }
  toggle(m: MetodoPagoAdmin) {
    this.admin.upsertMetodoPago({ codigo: m.codigo, nombre: m.nombre, activo: !m.activo }).subscribe(() =>
      this.admin.metodosPago().subscribe((list) => this.metodos.set(list)),
    );
  }

  private cargar() {
    this.loading.set(true);
    this.admin.integraciones().subscribe({
      next: (l) => { this.integraciones.set(l); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
