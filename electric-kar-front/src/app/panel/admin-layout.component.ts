import { Component, computed, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AdminAuthService, Rol } from '@core/admin-auth.service';
import { IconComponent, IconName } from '@shared/icon.component';

interface MenuItem {
  label: string;
  path: string;
  icon: IconName;
  roles?: Rol[]; // sin roles = visible para todos
  exact?: boolean;
}

@Component({
  selector: 'ek-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="flex min-h-screen bg-black/5 dark:bg-navy-950">
      <!-- SIDEBAR -->
      <aside class="hidden w-64 shrink-0 flex-col bg-navy-900 text-white md:flex">
        <div class="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
          <span class="grid h-9 w-9 place-items-center rounded-ek-md bg-voltaje text-navy-900">
            <ek-icon name="bolt" class="h-5 w-5" />
          </span>
          <div class="leading-none">
            <div class="font-display text-base font-bold">electrick<span class="text-azul-500">-Kar</span></div>
            <small class="text-[10px] uppercase tracking-widest text-white/40">Panel</small>
          </div>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto p-3">
          @for (item of visibleMenu(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="bg-azul-700 text-white"
               [routerLinkActiveOptions]="{ exact: !!item.exact }"
               class="flex items-center gap-3 rounded-ek-md px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
              <ek-icon [name]="item.icon" class="h-5 w-5" />
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="border-t border-white/10 p-3">
          <a routerLink="/" class="flex items-center gap-2 rounded-ek-md px-3 py-2 text-sm text-white/60 hover:text-white">
            <ek-icon name="cart" class="h-4 w-4" /> Ver tienda
          </a>
        </div>
      </aside>

      <!-- CONTENIDO -->
      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex items-center gap-3 border-b border-black/10 bg-white px-5 py-3 dark:border-white/10 dark:bg-navy-900">
          <h1 class="font-display text-lg font-bold">Administración</h1>
          <div class="ml-auto flex items-center gap-3">
            <div class="text-right">
              <div class="text-sm font-semibold">{{ auth.usuario()?.nombre }}</div>
              <div class="text-xs text-black/50 dark:text-white/50">{{ auth.usuario()?.correo }}</div>
            </div>
            <span class="rounded-full bg-azul-700/10 px-3 py-1 text-xs font-bold text-azul-700">{{ rolLabel() }}</span>
            <button type="button" (click)="logout()" class="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label="Salir">
              <ek-icon name="logout" class="h-5 w-5" />
            </button>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto p-5">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminLayoutComponent {
  protected readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  private readonly menu: MenuItem[] = [
    { label: 'Dashboard', path: '/admin', icon: 'grid', exact: true },
    { label: 'Centro de control', path: '/admin/control', icon: 'shield', roles: ['SUPER'] },
    { label: 'Pedidos', path: '/admin/pedidos', icon: 'cart', roles: ['SUPER', 'ADMIN', 'VENDEDOR'] },
    { label: 'Productos', path: '/admin/productos', icon: 'box', roles: ['SUPER', 'ADMIN', 'VENDEDOR'] },
    { label: 'Clientes', path: '/admin/clientes', icon: 'user', roles: ['SUPER', 'ADMIN', 'VENDEDOR', 'CONTADOR'] },
    { label: 'Cupones', path: '/admin/cupones', icon: 'tag', roles: ['SUPER', 'ADMIN'] },
    { label: 'Reportes', path: '/admin/reportes', icon: 'chart' },
    { label: 'Facturación (CFDI)', path: '/admin/cfdi', icon: 'doc', roles: ['SUPER', 'ADMIN', 'CONTADOR'] },
    { label: 'Menú / Navegación', path: '/admin/menu', icon: 'menu', roles: ['SUPER', 'ADMIN'] },
    { label: 'Integraciones', path: '/admin/integraciones', icon: 'card', roles: ['SUPER', 'ADMIN'] },
    { label: 'Sesiones', path: '/admin/sesiones', icon: 'lock', roles: ['SUPER'] },
    { label: 'Auditoría', path: '/admin/auditoria', icon: 'doc', roles: ['SUPER'] },
    { label: 'Usuarios y permisos', path: '/admin/usuarios', icon: 'user', roles: ['SUPER'] },
    { label: 'Mi perfil', path: '/admin/perfil', icon: 'user' },
  ];

  readonly visibleMenu = computed(() =>
    this.menu.filter((m) => !m.roles || this.auth.hasRole(...m.roles)),
  );

  private readonly roles: Record<Rol, string> = {
    SUPER: 'Super admin',
    ADMIN: 'Administrador',
    VENDEDOR: 'Vendedor',
    CONTADOR: 'Contador',
  };
  readonly rolLabel = computed(() => {
    const r = this.auth.rol();
    return r ? this.roles[r] : '';
  });

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/admin/login');
  }
}
