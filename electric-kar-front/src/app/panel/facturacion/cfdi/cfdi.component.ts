import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, CfdiAdmin, PedidoAdmin } from '@core/admin.service';
import { MoneyPipe } from '@shared/money.pipe';

interface EmitirForm {
  pedidoId: string;
  receptorNombre: string;
  receptorRfc: string;
  receptorCp: string;
  receptorRegimen: string;
  usoCfdi: string;
  formaPago: string;
  metodoPago: string;
}

const VACIO: EmitirForm = {
  pedidoId: '', receptorNombre: '', receptorRfc: '', receptorCp: '',
  receptorRegimen: '612', usoCfdi: 'G03', formaPago: '03', metodoPago: 'PUE',
};

@Component({
  selector: 'ek-admin-cfdi',
  imports: [FormsModule, MoneyPipe],
  template: `
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">Facturación (CFDI 4.0)</h2>
      <button type="button" class="btn-primary text-sm" (click)="mostrarForm.set(!mostrarForm())">{{ mostrarForm() ? 'Cancelar' : 'Emitir CFDI' }}</button>
    </div>

    @if (mostrarForm()) {
      <form (ngSubmit)="emitir()" class="card mt-4 grid gap-3 sm:grid-cols-2">
        <select [(ngModel)]="form.pedidoId" name="pedidoId" required class="ek-input sm:col-span-2">
          <option value="">— Selecciona un pedido —</option>
          @for (p of pedidos(); track p.id) {
            <option [value]="p.id">{{ p.folio || p.id.slice(0,8) }} · {{ p.cliente?.nombre }} · {{ p.total | money }}</option>
          }
        </select>
        <input [(ngModel)]="form.receptorNombre" name="rn" placeholder="Nombre/Razón social receptor" required class="ek-input" />
        <input [(ngModel)]="form.receptorRfc" name="rfc" placeholder="RFC receptor" required class="ek-input uppercase" />
        <input [(ngModel)]="form.receptorCp" name="cp" placeholder="C.P. receptor" required class="ek-input" />
        <input [(ngModel)]="form.receptorRegimen" name="reg" placeholder="Régimen (ej. 612)" required class="ek-input" />
        <input [(ngModel)]="form.usoCfdi" name="uso" placeholder="Uso CFDI (ej. G03)" required class="ek-input" />
        <input [(ngModel)]="form.formaPago" name="fp" placeholder="Forma de pago (ej. 03)" required class="ek-input" />
        <select [(ngModel)]="form.metodoPago" name="mp" class="ek-input">
          <option value="PUE">PUE — Pago en una exhibición</option>
          <option value="PPD">PPD — Pago en parcialidades/diferido</option>
        </select>
        @if (error()) { <p class="text-sm text-peligro sm:col-span-2">{{ error() }}</p> }
        <button type="submit" class="btn-primary sm:col-span-2" [disabled]="saving()">{{ saving() ? 'Emitiendo…' : 'Emitir CFDI' }}</button>
      </form>
    }

    <div class="card mt-4 overflow-x-auto">
      @if (loading()) {
        <p class="text-sm text-black/50 dark:text-white/50">Cargando…</p>
      } @else if (cfdis().length === 0) {
        <p class="text-sm text-black/50 dark:text-white/50">Sin comprobantes.</p>
      } @else {
        <table class="w-full text-sm">
          <thead class="text-left text-black/50 dark:text-white/50">
            <tr class="border-b border-black/10 dark:border-white/10"><th class="py-2">Folio / UUID</th><th>Receptor</th><th>Método</th><th>Total</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            @for (c of cfdis(); track c.id) {
              <tr class="border-b border-black/5 dark:border-white/10">
                <td class="py-2.5 font-mono text-xs">{{ c.serieFolio || '—' }}<br /><span class="text-black/40">{{ c.uuidFiscal ? (c.uuidFiscal.slice(0,8) + '…') : 'sin timbrar' }}</span></td>
                <td>{{ c.receptorNombre }}<br /><span class="font-mono text-xs text-black/50 dark:text-white/50">{{ c.receptorRfc }}</span></td>
                <td>{{ c.metodoPago }}</td>
                <td class="font-mono font-semibold">{{ c.total | money }}</td>
                <td><span class="rounded-full px-2 py-0.5 text-xs font-semibold"
                          [class]="c.estado === 'TIMBRADA' ? 'bg-exito/15 text-exito' : c.estado === 'CANCELADA' ? 'bg-peligro/15 text-peligro' : 'bg-black/10 dark:bg-white/10'">{{ c.estado }}</span></td>
                <td class="whitespace-nowrap text-right">
                  @if (c.estado === 'POR_TIMBRAR') {
                    <button type="button" class="text-azul-700 hover:underline" [disabled]="busy() === c.id" (click)="timbrar(c)">Timbrar</button>
                  } @else if (c.estado === 'TIMBRADA') {
                    <button type="button" class="text-peligro hover:underline" [disabled]="busy() === c.id" (click)="abrirCancelacion(c)">Cancelar</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <!-- ===== MODAL CANCELACIÓN ===== -->
    @if (cancelTarget(); as c) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" (click)="cancelTarget.set(null)">
        <div class="w-full max-w-md rounded-[18px] bg-white p-6 shadow-2xl dark:bg-navy-800" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-bold">Cancelar CFDI</h3>
          <p class="mt-1 text-sm text-black/60 dark:text-white/60">
            {{ c.serieFolio || 'Comprobante' }} · {{ c.receptorNombre }}
          </p>

          <label class="mt-4 block text-sm font-semibold">Motivo de cancelación (SAT)</label>
          <select [(ngModel)]="motivoSel" class="ek-input mt-1 w-full">
            @for (m of motivos; track m.value) {
              <option [value]="m.value">{{ m.label }}</option>
            }
          </select>

          @if (motivoSel === 'M01') {
            <label class="mt-3 block text-sm font-semibold">Folio fiscal que sustituye (UUID)</label>
            <input [(ngModel)]="uuidSust" class="ek-input mt-1 w-full font-mono text-sm" placeholder="UUID del CFDI que lo sustituye" />
            <p class="mt-1 text-xs text-black/50 dark:text-white/50">Requerido para el motivo 01 (con relación).</p>
          }

          @if (cancelError()) {
            <p class="mt-3 text-sm text-peligro">{{ cancelError() }}</p>
          }

          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="btn-outline text-sm" (click)="cancelTarget.set(null)">Volver</button>
            <button type="button" class="btn text-sm bg-peligro text-white hover:opacity-90"
                    [disabled]="busy() === c.id || (motivoSel === 'M01' && !uuidSust)"
                    (click)="confirmarCancelacion()">
              {{ busy() === c.id ? 'Cancelando…' : 'Confirmar cancelación' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CfdiComponent {
  private readonly admin = inject(AdminService);

  readonly cfdis = signal<CfdiAdmin[]>([]);
  readonly pedidos = signal<PedidoAdmin[]>([]);
  readonly loading = signal(true);
  readonly mostrarForm = signal(false);
  readonly saving = signal(false);
  readonly busy = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  form: EmitirForm = { ...VACIO };

  // Cancelación
  readonly cancelTarget = signal<CfdiAdmin | null>(null);
  readonly cancelError = signal<string | null>(null);
  motivoSel = 'M02';
  uuidSust = '';
  readonly motivos = [
    { value: 'M01', label: '01 · Comprobante con errores con relación' },
    { value: 'M02', label: '02 · Comprobante con errores sin relación' },
    { value: 'M03', label: '03 · No se llevó a cabo la operación' },
    { value: 'M04', label: '04 · Operación nominativa en factura global' },
  ];

  constructor() {
    this.admin.pedidos({ page: 1, limit: 100 }).subscribe({
      next: (r) => this.pedidos.set(r.data),
      error: () => {},
    });
    this.cargar();
  }

  emitir() {
    this.error.set(null);
    this.saving.set(true);
    this.admin.emitirCfdi({ ...this.form, receptorRfc: this.form.receptorRfc.toUpperCase() }).subscribe({
      next: () => { this.saving.set(false); this.mostrarForm.set(false); this.form = { ...VACIO }; this.cargar(); },
      error: (e: { error?: { message?: string | string[] } }) => {
        const m = e?.error?.message;
        this.error.set(Array.isArray(m) ? m.join(', ') : m ?? 'No se pudo emitir');
        this.saving.set(false);
      },
    });
  }

  timbrar(c: CfdiAdmin) {
    this.busy.set(c.id);
    this.admin.timbrarCfdi(c.id).subscribe({
      next: () => { this.busy.set(null); this.cargar(); },
      error: () => this.busy.set(null),
    });
  }

  abrirCancelacion(c: CfdiAdmin) {
    this.cancelTarget.set(c);
    this.motivoSel = 'M02';
    this.uuidSust = '';
    this.cancelError.set(null);
  }

  confirmarCancelacion() {
    const c = this.cancelTarget();
    if (!c) return;
    this.cancelError.set(null);
    this.busy.set(c.id);
    this.admin
      .cancelarCfdi(c.id, this.motivoSel, this.motivoSel === 'M01' ? this.uuidSust : undefined)
      .subscribe({
        next: () => { this.busy.set(null); this.cancelTarget.set(null); this.cargar(); },
        error: (e: { error?: { message?: string | string[] } }) => {
          const m = e?.error?.message;
          this.cancelError.set(Array.isArray(m) ? m.join(', ') : m ?? 'No se pudo cancelar');
          this.busy.set(null);
        },
      });
  }

  private cargar() {
    this.loading.set(true);
    this.admin.cfdis().subscribe({
      next: (r) => { this.cfdis.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
