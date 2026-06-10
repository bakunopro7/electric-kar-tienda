import { Component, computed, inject } from '@angular/core';
import { AdminAuthService, Rol } from '@core/admin-auth.service';

@Component({
  selector: 'ek-admin-perfil',
  template: `
    <h2 class="text-xl font-bold">Mi perfil</h2>

    @if (auth.usuario(); as u) {
      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <div class="card">
          <h3 class="font-bold">Datos de la cuenta</h3>
          <dl class="mt-3 space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-black/50 dark:text-white/50">Nombre</dt><dd class="font-semibold">{{ u.nombre }}</dd></div>
            <div class="flex justify-between"><dt class="text-black/50 dark:text-white/50">Correo</dt><dd>{{ u.correo }}</dd></div>
            <div class="flex justify-between"><dt class="text-black/50 dark:text-white/50">Rol</dt><dd><span class="rounded-full bg-azul-700/10 px-2 py-0.5 text-xs font-bold text-azul-700">{{ rolLabel() }}</span></dd></div>
          </dl>
        </div>

        <div class="card">
          <h3 class="font-bold">Permisos de tu rol</h3>
          <ul class="mt-3 space-y-1.5 text-sm text-black/70 dark:text-white/70">
            @for (p of permisos(); track p) {
              <li class="flex items-center gap-2"><span class="text-exito">✓</span> {{ p }}</li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class PerfilComponent {
  protected readonly auth = inject(AdminAuthService);

  private readonly labels: Record<Rol, string> = {
    SUPER: 'Super admin',
    ADMIN: 'Administrador',
    VENDEDOR: 'Vendedor',
    CONTADOR: 'Contador',
  };

  private readonly permisosPorRol: Record<Rol, string[]> = {
    SUPER: ['Control total del sistema', 'Gestión de usuarios y permisos', 'Datos fiscales e integraciones', 'Todas las secciones'],
    ADMIN: ['Pedidos, productos y clientes', 'Cupones y reportes', 'Facturación (emitir)', 'Ajustes de tienda'],
    VENDEDOR: ['Gestionar pedidos', 'Consultar clientes y productos', 'Reportes de ventas'],
    CONTADOR: ['Emitir, timbrar y cancelar CFDI', 'Complementos de pago (REP)', 'Datos fiscales y reportes'],
  };

  readonly rolLabel = computed(() => {
    const r = this.auth.rol();
    return r ? this.labels[r] : '';
  });
  readonly permisos = computed(() => {
    const r = this.auth.rol();
    return r ? this.permisosPorRol[r] : [];
  });
}
