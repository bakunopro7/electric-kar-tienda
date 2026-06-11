import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('@tienda/tienda.routes').then((m) => m.TIENDA_ROUTES),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('@panel/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
