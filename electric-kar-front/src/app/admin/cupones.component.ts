import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, CuponAdmin } from '../core/admin.service';
import { MoneyPipe } from '../shared/money.pipe';

interface CuponForm {
  codigo: string;
  tipo: string;
  valor: number | null;
  compraMinima: number | null;
  fechaInicio: string;
  fechaFin: string;
}

const VACIO: CuponForm = { codigo: '', tipo: 'PORCENTAJE', valor: null, compraMinima: 0, fechaInicio: '', fechaFin: '' };

@Component({
  selector: 'ek-admin-cupones',
  imports: [FormsModule, MoneyPipe, DatePipe],
  template: `
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">Cupones</h2>
      <button type="button" class="btn-primary text-sm" (click)="mostrarForm.set(!mostrarForm())">{{ mostrarForm() ? 'Cancelar' : 'Nuevo cupón' }}</button>
    </div>

    @if (mostrarForm()) {
      <form (ngSubmit)="crear()" class="card mt-4 grid gap-3 sm:grid-cols-2">
        <input [(ngModel)]="form.codigo" name="codigo" placeholder="CÓDIGO" required class="ek-input uppercase" />
        <select [(ngModel)]="form.tipo" name="tipo" class="ek-input">
          <option value="PORCENTAJE">Porcentaje (%)</option>
          <option value="MONTO_FIJO">Monto fijo ($)</option>
          <option value="ENVIO_GRATIS">Envío gratis</option>
        </select>
        <input [(ngModel)]="form.valor" name="valor" type="number" step="0.01" placeholder="Valor (% o $)" required class="ek-input" />
        <input [(ngModel)]="form.compraMinima" name="compraMinima" type="number" step="0.01" placeholder="Compra mínima" class="ek-input" />
        <label class="text-sm">Inicio<input [(ngModel)]="form.fechaInicio" name="fi" type="date" required class="ek-input mt-1 w-full" /></label>
        <label class="text-sm">Fin<input [(ngModel)]="form.fechaFin" name="ff" type="date" required class="ek-input mt-1 w-full" /></label>
        @if (error()) { <p class="text-sm text-peligro sm:col-span-2">{{ error() }}</p> }
        <button type="submit" class="btn-primary sm:col-span-2" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Crear cupón' }}</button>
      </form>
    }

    <div class="card mt-4 overflow-x-auto">
      @if (loading()) {
        <p class="text-sm text-black/50 dark:text-white/50">Cargando…</p>
      } @else if (cupones().length === 0) {
        <p class="text-sm text-black/50 dark:text-white/50">Sin cupones.</p>
      } @else {
        <table class="w-full text-sm">
          <thead class="text-left text-black/50 dark:text-white/50">
            <tr class="border-b border-black/10 dark:border-white/10"><th class="py-2">Código</th><th>Tipo</th><th>Valor</th><th>Vigencia</th><th>Usos</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            @for (c of cupones(); track c.id) {
              <tr class="border-b border-black/5 dark:border-white/10">
                <td class="py-2.5 font-mono font-bold">{{ c.codigo }}</td>
                <td class="text-black/60 dark:text-white/60">{{ c.tipo }}</td>
                <td>{{ c.tipo === 'PORCENTAJE' ? c.valor + '%' : (c.valor | money) }}</td>
                <td class="text-xs text-black/60 dark:text-white/60">{{ c.fechaInicio | date: 'dd/MM/yy' }} – {{ c.fechaFin | date: 'dd/MM/yy' }}</td>
                <td>{{ c.usos }}</td>
                <td><span class="rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold dark:bg-white/10">{{ c.estado }}</span></td>
                <td class="text-right"><button type="button" class="text-peligro hover:opacity-70" (click)="eliminar(c)">✕</button></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class CuponesComponent {
  private readonly admin = inject(AdminService);

  readonly cupones = signal<CuponAdmin[]>([]);
  readonly loading = signal(true);
  readonly mostrarForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  form: CuponForm = { ...VACIO };

  constructor() { this.cargar(); }

  crear() {
    this.error.set(null);
    this.saving.set(true);
    const dto: Record<string, unknown> = {
      codigo: this.form.codigo.toUpperCase(),
      tipo: this.form.tipo,
      valor: Number(this.form.valor),
      compraMinima: Number(this.form.compraMinima ?? 0),
      fechaInicio: new Date(this.form.fechaInicio).toISOString(),
      fechaFin: new Date(this.form.fechaFin).toISOString(),
    };
    this.admin.crearCupon(dto).subscribe({
      next: () => { this.saving.set(false); this.mostrarForm.set(false); this.form = { ...VACIO }; this.cargar(); },
      error: (e: { error?: { message?: string | string[] } }) => {
        const m = e?.error?.message;
        this.error.set(Array.isArray(m) ? m.join(', ') : m ?? 'No se pudo crear');
        this.saving.set(false);
      },
    });
  }

  eliminar(c: CuponAdmin) { this.admin.eliminarCupon(c.id).subscribe(() => this.cargar()); }

  private cargar() {
    this.loading.set(true);
    this.admin.cupones().subscribe({
      next: (list) => { this.cupones.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
