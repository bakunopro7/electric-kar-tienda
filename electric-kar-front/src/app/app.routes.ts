import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'electrick-Kar — Inicio',
  },
  {
    path: 'tienda',
    loadComponent: () =>
      import('./pages/tienda/tienda.component').then((m) => m.TiendaComponent),
    title: 'Tienda — electrick-Kar',
  },
  {
    path: 'producto/:id',
    loadComponent: () =>
      import('./pages/producto/producto.component').then((m) => m.ProductoComponent),
    title: 'Producto — electrick-Kar',
  },
  {
    path: 'carrito',
    loadComponent: () =>
      import('./pages/carrito/carrito.component').then((m) => m.CarritoComponent),
    title: 'Carrito — electrick-Kar',
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./pages/checkout/checkout.component').then((m) => m.CheckoutComponent),
    title: 'Checkout — electrick-Kar',
  },
  {
    path: 'acceso',
    loadComponent: () =>
      import('./pages/acceso/acceso.component').then((m) => m.AccesoComponent),
    title: 'Acceso — electrick-Kar',
  },
  {
    path: 'cuenta',
    loadComponent: () =>
      import('./pages/cuenta/cuenta.component').then((m) => m.CuentaComponent),
    title: 'Mi cuenta — electrick-Kar',
  },
  {
    path: 'recuperar',
    loadComponent: () =>
      import('./pages/recuperar/recuperar.component').then((m) => m.RecuperarComponent),
    title: 'Recuperar contraseña — electrick-Kar',
  },
  {
    path: 'destacados',
    loadComponent: () =>
      import('./pages/destacados/destacados.component').then((m) => m.DestacadosComponent),
    title: 'Destacados — electrick-Kar',
  },
  {
    path: 'busqueda',
    loadComponent: () =>
      import('./pages/busqueda/busqueda.component').then((m) => m.BusquedaComponent),
    title: 'Búsqueda — electrick-Kar',
  },
  {
    path: 'favoritos',
    loadComponent: () =>
      import('./pages/favoritos/favoritos.component').then((m) => m.FavoritosComponent),
    title: 'Favoritos — electrick-Kar',
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/faq/faq.component').then((m) => m.FaqComponent),
    title: 'Preguntas frecuentes — electrick-Kar',
  },
  {
    path: 'confirmacion',
    loadComponent: () =>
      import('./pages/confirmacion/confirmacion.component').then((m) => m.ConfirmacionComponent),
    title: 'Pedido confirmado — electrick-Kar',
  },
  {
    path: 'blog',
    loadComponent: () => import('./pages/blog/blog.component').then((m) => m.BlogComponent),
    title: 'Blog — electrick-Kar',
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./pages/blog/articulo.component').then((m) => m.ArticuloComponent),
    title: 'Artículo — electrick-Kar',
  },
  {
    path: 'nosotros',
    loadComponent: () =>
      import('./pages/nosotros/nosotros.component').then((m) => m.NosotrosComponent),
    title: 'Nosotros — electrick-Kar',
  },
  {
    path: 'contacto',
    loadComponent: () =>
      import('./pages/contacto/contacto.component').then((m) => m.ContactoComponent),
    title: 'Contacto — electrick-Kar',
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
