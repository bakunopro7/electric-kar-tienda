import { Routes } from '@angular/router';
import { adminAuthGuard, rolesGuard } from '@core/admin.guards';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('@panel/acceso/admin-login/admin-login.component').then((m) => m.AdminLoginComponent),
    title: 'Panel · Acceso',
  },
  {
    path: '',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('@panel/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@panel/operaciones/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Panel · Dashboard',
      },
      {
        path: 'pedidos',
        canActivate: [rolesGuard('SUPER', 'ADMIN', 'VENDEDOR')],
        loadComponent: () =>
          import('@panel/pedidos/pedidos/pedidos.component').then((m) => m.PedidosComponent),
        title: 'Panel · Pedidos',
      },
      {
        path: 'productos',
        canActivate: [rolesGuard('SUPER', 'ADMIN', 'VENDEDOR')],
        loadComponent: () =>
          import('@panel/catalogo/productos/productos.component').then((m) => m.ProductosComponent),
        title: 'Panel · Productos',
      },
      {
        path: 'clientes',
        canActivate: [rolesGuard('SUPER', 'ADMIN', 'VENDEDOR', 'CONTADOR')],
        loadComponent: () =>
          import('@panel/clientes/clientes/clientes.component').then((m) => m.ClientesComponent),
        title: 'Panel · Clientes',
      },
      {
        path: 'cupones',
        canActivate: [rolesGuard('SUPER', 'ADMIN')],
        loadComponent: () =>
          import('@panel/cupones/cupones/cupones.component').then((m) => m.CuponesComponent),
        title: 'Panel · Cupones',
      },
      {
        path: 'cfdi',
        canActivate: [rolesGuard('SUPER', 'ADMIN', 'CONTADOR')],
        loadComponent: () =>
          import('@panel/facturacion/cfdi/cfdi.component').then((m) => m.CfdiComponent),
        title: 'Panel · CFDI',
      },
      {
        path: 'control',
        canActivate: [rolesGuard('SUPER')],
        loadComponent: () =>
          import('@panel/operaciones/control/control.component').then((m) => m.ControlComponent),
        title: 'Panel · Centro de control',
      },
      {
        path: 'reportes',
        canActivate: [rolesGuard('SUPER', 'ADMIN', 'VENDEDOR', 'CONTADOR')],
        loadComponent: () =>
          import('@panel/operaciones/reportes/reportes.component').then((m) => m.ReportesComponent),
        title: 'Panel · Reportes',
      },
      {
        path: 'integraciones',
        canActivate: [rolesGuard('SUPER', 'ADMIN')],
        loadComponent: () =>
          import('@panel/operaciones/integraciones/integraciones.component').then((m) => m.IntegracionesComponent),
        title: 'Panel · Integraciones',
      },
      {
        path: 'sesiones',
        canActivate: [rolesGuard('SUPER')],
        loadComponent: () =>
          import('@panel/operaciones/sesiones/sesiones.component').then((m) => m.SesionesComponent),
        title: 'Panel · Sesiones',
      },
      {
        path: 'auditoria',
        canActivate: [rolesGuard('SUPER')],
        loadComponent: () =>
          import('@panel/operaciones/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
        title: 'Panel · Auditoría',
      },
      {
        path: 'menu',
        canActivate: [rolesGuard('SUPER', 'ADMIN')],
        loadComponent: () =>
          import('@panel/operaciones/menu/menu.component').then((m) => m.MenuAdminComponent),
        title: 'Panel · Menú',
      },
      {
        path: 'contacto',
        canActivate: [rolesGuard('SUPER', 'ADMIN')],
        loadComponent: () =>
          import('@panel/operaciones/contacto/contacto.component').then((m) => m.ContactoAdminComponent),
        title: 'Panel · Datos de contacto',
      },
      {
        path: 'usuarios',
        canActivate: [rolesGuard('SUPER')],
        loadComponent: () =>
          import('@panel/clientes/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
        title: 'Panel · Usuarios',
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('@panel/perfil/perfil/perfil.component').then((m) => m.PerfilComponent),
        title: 'Panel · Mi perfil',
      },
    ],
  },
];
