import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/admin.service';
import { DatosContacto } from '@core/models';
import { NotificationService } from '@core/notification.service';

@Component({
  selector: 'ek-admin-contacto',
  imports: [FormsModule],
  template: `
    <h2 class="text-xl font-bold">Datos de contacto</h2>
    <p class="mt-1 text-sm text-black/60 dark:text-white/60">
      Se muestran en la página de Contacto y en el pie de página de la tienda. Los cambios se reflejan al recargar.
    </p>

    @if (loading()) {
      <p class="mt-4 text-sm text-black/50 dark:text-white/50">Cargando…</p>
    } @else {
      <form (ngSubmit)="guardar()" class="card mt-4 grid max-w-xl gap-4">
        <label class="grid gap-1 text-sm font-medium">
          Dirección
          <input [(ngModel)]="form.direccion" name="direccion" required maxlength="200" class="ek-input" />
        </label>
        <label class="grid gap-1 text-sm font-medium">
          Teléfono
          <input [(ngModel)]="form.telefono" name="telefono" required maxlength="40" class="ek-input" />
        </label>
        <label class="grid gap-1 text-sm font-medium">
          Correo
          <input [(ngModel)]="form.correo" name="correo" type="email" required maxlength="254" class="ek-input" />
        </label>
        <label class="grid gap-1 text-sm font-medium">
          Horario
          <input [(ngModel)]="form.horario" name="horario" required maxlength="120" class="ek-input" />
        </label>
        <button type="submit" class="btn-primary justify-self-start" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </form>
    }
  `,
})
export class ContactoAdminComponent {
  private readonly admin = inject(AdminService);
  private readonly notifications = inject(NotificationService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  form: DatosContacto = { direccion: '', telefono: '', correo: '', horario: '' };

  constructor() {
    this.admin.datosContacto().subscribe({
      next: (c) => {
        if (c) this.form = { ...c };
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  guardar() {
    this.saving.set(true);
    this.admin.actualizarContacto(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success('Datos de contacto actualizados.');
      },
      error: () => {
        this.saving.set(false);
        this.notifications.error('No se pudieron guardar los cambios.');
      },
    });
  }
}
