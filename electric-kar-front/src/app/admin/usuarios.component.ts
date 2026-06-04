import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Rol } from '../core/admin-auth.service';
import { AdminService, CreateUsuarioDto, UsuarioAdmin } from '../core/admin.service';

@Component({
  selector: 'ek-admin-usuarios',
  imports: [FormsModule],
  template: `
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">Usuarios y permisos</h2>
      <button type="button" class="btn-primary text-sm" (click)="mostrarForm.set(!mostrarForm())">
        {{ mostrarForm() ? 'Cancelar' : 'Nuevo usuario' }}
      </button>
    </div>

    @if (mostrarForm()) {
      <form (ngSubmit)="crear()" class="card mt-4 grid gap-3 sm:grid-cols-2">
        <input [(ngModel)]="form.nombre" name="nombre" placeholder="Nombre" required class="ek-input" />
        <input [(ngModel)]="form.correo" name="correo" type="email" placeholder="Correo" required class="ek-input" />
        <input [(ngModel)]="form.password" name="password" type="password" placeholder="Contraseña (mín. 6)" required class="ek-input" />
        <select [(ngModel)]="form.rol" name="rol" class="ek-input">
          @for (r of rolesDisponibles; track r.value) {
            <option [value]="r.value">{{ r.label }}</option>
          }
        </select>
        @if (error()) { <p class="text-sm text-peligro sm:col-span-2">{{ error() }}</p> }
        <button type="submit" class="btn-primary sm:col-span-2" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : 'Crear usuario' }}
        </button>
      </form>
    }

    <div class="card mt-4 overflow-x-auto">
      @if (loading()) {
        <p class="text-sm text-black/50 dark:text-white/50">Cargando…</p>
      } @else {
        <table class="w-full text-sm">
          <thead class="text-left text-black/50 dark:text-white/50">
            <tr class="border-b border-black/10 dark:border-white/10">
              <th class="py-2">Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (u of usuarios(); track u.id) {
              <tr class="border-b border-black/5 dark:border-white/10">
                <td class="py-2.5 font-semibold">{{ u.nombre }}</td>
                <td class="text-black/60 dark:text-white/60">{{ u.correo }}</td>
                <td><span class="rounded-full bg-azul-700/10 px-2 py-0.5 text-xs font-bold text-azul-700">{{ rolLabel(u.rol) }}</span></td>
                <td class="text-black/60 dark:text-white/60">{{ u.estado }}</td>
                <td class="text-right">
                  <button type="button" class="text-peligro hover:opacity-70" (click)="eliminar(u)" aria-label="Eliminar">✕</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class UsuariosComponent {
  private readonly admin = inject(AdminService);

  readonly usuarios = signal<UsuarioAdmin[]>([]);
  readonly loading = signal(true);
  readonly mostrarForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly rolesDisponibles: { value: Rol; label: string }[] = [
    { value: 'VENDEDOR', label: 'Vendedor' },
    { value: 'CONTADOR', label: 'Contador' },
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'SUPER', label: 'Super admin' },
  ];

  form: CreateUsuarioDto = { nombre: '', correo: '', password: '', rol: 'VENDEDOR' };

  constructor() {
    this.cargar();
  }

  rolLabel(r: Rol) {
    return this.rolesDisponibles.find((x) => x.value === r)?.label ?? r;
  }

  crear() {
    this.error.set(null);
    this.saving.set(true);
    this.admin.crearUsuario(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.mostrarForm.set(false);
        this.form = { nombre: '', correo: '', password: '', rol: 'VENDEDOR' };
        this.cargar();
      },
      error: (e: { error?: { message?: string | string[] } }) => {
        const m = e?.error?.message;
        this.error.set(Array.isArray(m) ? m.join(', ') : m ?? 'No se pudo crear');
        this.saving.set(false);
      },
    });
  }

  eliminar(u: UsuarioAdmin) {
    this.admin.eliminarUsuario(u.id).subscribe(() => this.cargar());
  }

  private cargar() {
    this.loading.set(true);
    this.admin.usuarios().subscribe({
      next: (list) => {
        this.usuarios.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
