import { Routes } from '@angular/router';
import { adminAuthGuard, rolesGuard } from '../core/admin.guards';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./admin-login.component').then((m) => m.AdminLoginComponent),
    title: 'Panel · Acceso',
  },
  {
    path: '',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./dashboard.component').then((m) => m.DashboardComponent),
        title: 'Panel · Dashboard',
      },
      {
        path: 'pedidos',
        canActivate: [rolesGuard('SUPER', 'ADMIN', 'VENDEDOR')],
        loadComponent: () =>
          import('./pedidos.component').then((m) => m.PedidosComponent),
        title: 'Panel · Pedidos',
      },
      {
        path: 'productos',
        canActivate: [rolesGuard('SUPER', 'ADMIN', 'VENDEDOR')],
        loadComponent: () =>
          import('./productos.component').then((m) => m.ProductosComponent),
        title: 'Panel · Productos',
      },
      {
        path: 'clientes',
        canActivate: [rolesGuard('SUPER', 'ADMIN', 'VENDEDOR', 'CONTADOR')],
        loadComponent: () =>
          import('./clientes.component').then((m) => m.ClientesComponent),
        title: 'Panel · Clientes',
      },
      {
        path: 'cupones',
        canActivate: [rolesGuard('SUPER', 'ADMIN')],
        loadComponent: () =>
          import('./cupones.component').then((m) => m.CuponesComponent),
        title: 'Panel · Cupones',
      },
      {
        path: 'cfdi',
        canActivate: [rolesGuard('SUPER', 'ADMIN', 'CONTADOR')],
        loadComponent: () =>
          import('./cfdi.component').then((m) => m.CfdiComponent),
        title: 'Panel · CFDI',
      },
      {
        path: 'control',
        canActivate: [rolesGuard('SUPER')],
        loadComponent: () =>
          import('./control.component').then((m) => m.ControlComponent),
        title: 'Panel · Centro de control',
      },
      {
        path: 'reportes',
        canActivate: [rolesGuard('SUPER', 'ADMIN', 'VENDEDOR', 'CONTADOR')],
        loadComponent: () =>
          import('./reportes.component').then((m) => m.ReportesComponent),
        title: 'Panel · Reportes',
      },
      {
        path: 'integraciones',
        canActivate: [rolesGuard('SUPER', 'ADMIN')],
        loadComponent: () =>
          import('./integraciones.component').then((m) => m.IntegracionesComponent),
        title: 'Panel · Integraciones',
      },
      {
        path: 'sesiones',
        canActivate: [rolesGuard('SUPER')],
        loadComponent: () =>
          import('./sesiones.component').then((m) => m.SesionesComponent),
        title: 'Panel · Sesiones',
      },
      {
        path: 'auditoria',
        canActivate: [rolesGuard('SUPER')],
        loadComponent: () =>
          import('./auditoria.component').then((m) => m.AuditoriaComponent),
        title: 'Panel · Auditoría',
      },
      {
        path: 'menu',
        canActivate: [rolesGuard('SUPER', 'ADMIN')],
        loadComponent: () =>
          import('./menu.component').then((m) => m.MenuAdminComponent),
        title: 'Panel · Menú',
      },
      {
        path: 'usuarios',
        canActivate: [rolesGuard('SUPER')],
        loadComponent: () =>
          import('./usuarios.component').then((m) => m.UsuariosComponent),
        title: 'Panel · Usuarios',
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./perfil.component').then((m) => m.PerfilComponent),
        title: 'Panel · Mi perfil',
      },
    ],
  },
];
