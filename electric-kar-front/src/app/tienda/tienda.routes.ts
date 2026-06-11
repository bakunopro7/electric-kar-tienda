import { Routes } from '@angular/router';

export const TIENDA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@tienda/catalogo/home/home.component').then((m) => m.HomeComponent),
    title: 'electrick-Kar — Inicio',
  },
  {
    path: 'tienda',
    loadComponent: () =>
      import('@tienda/catalogo/tienda/tienda.component').then((m) => m.TiendaComponent),
    title: 'Tienda — electrick-Kar',
  },
  {
    path: 'producto/:id',
    loadComponent: () =>
      import('@tienda/catalogo/producto/producto.component').then((m) => m.ProductoComponent),
    title: 'Producto — electrick-Kar',
  },
  {
    path: 'carrito',
    loadComponent: () =>
      import('@tienda/carrito/carrito/carrito.component').then((m) => m.CarritoComponent),
    title: 'Carrito — electrick-Kar',
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('@tienda/checkout/checkout/checkout.component').then((m) => m.CheckoutComponent),
    title: 'Checkout — electrick-Kar',
  },
  {
    path: 'acceso',
    loadComponent: () =>
      import('@tienda/cuenta/acceso/acceso.component').then((m) => m.AccesoComponent),
    title: 'Acceso — electrick-Kar',
  },
  {
    path: 'cuenta',
    loadComponent: () =>
      import('@tienda/cuenta/cuenta/cuenta.component').then((m) => m.CuentaComponent),
    title: 'Mi cuenta — electrick-Kar',
  },
  {
    path: 'recuperar',
    loadComponent: () =>
      import('@tienda/cuenta/recuperar/recuperar.component').then((m) => m.RecuperarComponent),
    title: 'Recuperar contraseña — electrick-Kar',
  },
  {
    path: 'destacados',
    loadComponent: () =>
      import('@tienda/catalogo/destacados/destacados.component').then(
        (m) => m.DestacadosComponent,
      ),
    title: 'Destacados — electrick-Kar',
  },
  {
    path: 'busqueda',
    loadComponent: () =>
      import('@tienda/catalogo/busqueda/busqueda.component').then((m) => m.BusquedaComponent),
    title: 'Búsqueda — electrick-Kar',
  },
  {
    path: 'favoritos',
    loadComponent: () =>
      import('@tienda/cuenta/favoritos/favoritos.component').then((m) => m.FavoritosComponent),
    title: 'Favoritos — electrick-Kar',
  },
  {
    path: 'faq',
    loadComponent: () =>
      import('@tienda/contenido/faq/faq.component').then((m) => m.FaqComponent),
    title: 'Preguntas frecuentes — electrick-Kar',
  },
  {
    path: 'confirmacion',
    loadComponent: () =>
      import('@tienda/checkout/confirmacion/confirmacion.component').then(
        (m) => m.ConfirmacionComponent,
      ),
    title: 'Pedido confirmado — electrick-Kar',
  },
  {
    path: 'blog',
    loadComponent: () =>
      import('@tienda/contenido/blog/blog.component').then((m) => m.BlogComponent),
    title: 'Blog — electrick-Kar',
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('@tienda/contenido/articulo/articulo.component').then((m) => m.ArticuloComponent),
    title: 'Artículo — electrick-Kar',
  },
  {
    path: 'nosotros',
    loadComponent: () =>
      import('@tienda/contenido/nosotros/nosotros.component').then((m) => m.NosotrosComponent),
    title: 'Nosotros — electrick-Kar',
  },
  {
    path: 'contacto',
    loadComponent: () =>
      import('@tienda/contenido/contacto/contacto.component').then((m) => m.ContactoComponent),
    title: 'Contacto — electrick-Kar',
  },
];
