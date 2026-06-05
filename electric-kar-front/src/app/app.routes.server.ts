import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Static marketing pages — prerendered at build time (SSG), no API calls.
  { path: 'nosotros', renderMode: RenderMode.Prerender },
  { path: 'faq', renderMode: RenderMode.Prerender },
  { path: 'contacto', renderMode: RenderMode.Prerender },

  // Private / transactional routes — client-rendered only, no SEO value.
  { path: 'carrito', renderMode: RenderMode.Client },
  { path: 'checkout', renderMode: RenderMode.Client },
  { path: 'acceso', renderMode: RenderMode.Client },
  { path: 'cuenta', renderMode: RenderMode.Client },
  { path: 'recuperar', renderMode: RenderMode.Client },
  { path: 'favoritos', renderMode: RenderMode.Client },
  { path: 'confirmacion', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },

  // Public storefront (home, catalog, product, blog, search) — server-rendered
  // per request for SEO and fast first paint.
  { path: '**', renderMode: RenderMode.Server },
];
