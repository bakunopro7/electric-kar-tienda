# Exploration — SSR Migration for electrick-Kar Storefront

## Context

Angular 21.2 standalone + signals + Tailwind v4. The `electric-kar-front/` app is currently
a pure client-side SPA (CSR): `angular.json` builder is `@angular/build:application` with
`"browser": "src/main.ts"`, no `outputMode`, no `main.server.ts`, no `server.ts`, and no
`@angular/ssr` dependency. Goal: migrate the **public storefront** (products, catalog, blog)
to Server-Side Rendering with hydration for SEO and faster first paint, while keeping the
private admin panel client-rendered.

## Current State — Browser-API Evidence

All offending code lives in `providedIn: 'root'` singletons that run their constructors on
the server during SSR.

- `src/app/core/auth.service.ts` (~L28-29): `signal(localStorage.getItem(TOKEN_KEY))` in initializer.
- `src/app/core/admin-auth.service.ts` (~L28-29): same localStorage pattern.
- `src/app/core/cart.service.ts` (~L12,23): signal `load()` from localStorage + `effect()` writing localStorage.
- `src/app/core/favorites.service.ts` (~L9,13): same pattern.
- `src/app/core/theme.service.ts` (~L8,12-13): `localStorage` + `document.documentElement.classList` at construction.
- `src/app/pages/acceso/acceso.component.ts` (~L117-128): Google GSI SDK + `document.getElementById` inside `ngAfterViewInit` — **already safe** (lifecycle doesn't run on SSR).
- `src/app/pages/checkout/checkout.component.ts` (~L259): `window.location.href = res.url` — event-driven (Stripe redirect), **safe** as-is.

**Critical path:** the shared `Header` injects `AuthService`, `CartService`, `FavoritesService`,
and `ThemeService`. The header renders on every server-rendered page, so all four constructors
execute on the server. Guarding these four is the highest-impact fix.

## Routing Map (public vs private)

**Public storefront — SSR/prerender candidates (SEO-relevant):**

| Route | SEO value | Data fetch (in constructor) |
|---|---|---|
| `/` (home) | High | `ProductosService.list({limit:8})` |
| `/tienda` | High | `ProductosService`, `CategoriasService`, `MarcasService` |
| `/producto/:id` | Very high | `ProductosService.get(id)` |
| `/blog` | High | `BlogService.list()` + `destacado()` |
| `/blog/:slug` | Very high | `BlogService.porSlug(slug)` |
| `/nosotros`, `/contacto`, `/faq` | Low-Med | Static |
| `/destacados`, `/busqueda` | Med | Query/products |

**Auth/transactional — Client render (no SEO value):**
`/acceso`, `/recuperar`, `/cuenta`, `/carrito`, `/checkout`, `/confirmacion`, `/favoritos`.

**Private admin — hard CSR boundary:** `/admin/**` (14 children, behind `adminAuthGuard`,
`AdminLayoutComponent` uses localStorage). Already lazy-loaded as a separate chunk — maps
cleanly to `RenderMode.Client`.

## HTTP / Base URL

- All services use `environment.apiUrl = 'http://localhost:3000/api'` (hardcoded absolute).
  Under SSR the Node process must reach the NestJS API at this URL — fine for same-host
  dev/prod, requires a configurable URL for split deployments.
- `app.config.ts` has no `withFetch()` — **mandatory** for SSR (Node has no XMLHttpRequest).
- `authInterceptor` reads tokens from localStorage → `null` on server → public requests go
  out unauthenticated, which is correct for public pages.

## SSR Mechanics in Angular 21

- `ng add @angular/ssr` scaffolds `main.server.ts`, `server.ts` (Express), updates `angular.json`.
- `provideClientHydration()` (+ optional `withEventReplay()`) for non-destructive hydration.
- `isPlatformBrowser(PLATFORM_ID)` guards; `afterNextRender()` / `afterRender()` for browser-only init (preferred over `ngAfterViewInit`).
- Route-level `serverRoutes` with `RenderMode.Server | Prerender | Client`.
- `provideHttpClient(withFetch())` — required.
- `TransferState` — server serializes HTTP responses into HTML; client rehydrates instead of
  re-fetching. Automatic with `provideClientHydration()` + identical requests.

## Approaches Compared

| Approach | SEO Gain | Complexity | Deploy Change | Admin Risk | Effort |
|---|---|---|---|---|---|
| **A. Full SSR (incl. admin)** | Max | High — guards everywhere incl. admin | Node server all routes | Admin localStorage breaks w/o guards | High |
| **B. Hybrid: SSR storefront + Client admin** | High | Medium — guards in shared services + storefront | Node server (built-in Express) | Admin stays CSR via `RenderMode.Client` | Medium |
| **C. Prerender-only (SSG) + CSR rest** | Partial | Low-Med | No Node server (static) | None | Low-Med |

- **A** touches private admin for zero reward — rejected.
- **B** matches the existing `/admin` lazy boundary; six services need consistent platform guards.
- **C** underdelivers: `/producto/:id` is the highest-value SEO page and is dynamic; prerender
  needs all IDs at build time (brittle). Valid as a sub-strategy inside B (prerender truly static pages).

## Recommendation — Approach B (Hybrid) with mixed render modes

- `RenderMode.Server`: `/`, `/tienda`, `/producto/:id`, `/blog`, `/blog/:slug`, `/busqueda`, `/destacados`
- `RenderMode.Prerender`: `/nosotros`, `/faq`, `/contacto` (fully static, no API)
- `RenderMode.Client`: `/admin/**`, `/checkout`, `/carrito`, `/acceso`, `/cuenta`, `/recuperar`, `/favoritos`, `/confirmacion`

Core migration work: guard the six browser-API services with `afterNextRender()` /
`isPlatformBrowser`, add `provideClientHydration()` + `withFetch()`, scaffold SSR entry points,
configure `serverRoutes`. Medium-complexity, well-bounded.

## Risks & Unknowns

1. **Header injects all four problematic services** — single highest-impact fix.
2. **Theme flash / hydration mismatch**: server renders `isDark=false`; mitigate via cookie or accept deferred apply with `afterNextRender()`.
3. **Cart/favorites badge**: server renders count 0, client hydrates real count — watch hydration warnings.
4. **`pnpm start:prod` workflow change**: production now runs a Node server (`node dist/.../server.mjs`), not just static files.
5. **pnpm PATH**: `ng add @angular/ssr` shells out to pnpm (at `~/.local/bin`, not on PATH) → run with `PATH="$HOME/.local/bin:$PATH"` or scaffold manually.
6. **`@angular/platform-server`** likely needs explicit listing (pnpm hides transitive deps).
7. **`setInterval` in HomeComponent** countdown — verify `DestroyRef` cleanup on server.
8. **Missing production environment file** — `apiUrl=localhost:3000` in all builds unless added.
9. **Double-fetch** if `provideClientHydration()` not configured → doubles NestJS load.
10. **Blog slug prerender** needs `getPrerenderParams()` (build-time API call) — may be better as `RenderMode.Server`.

## Open Questions for Proposal Phase

1. **Deployment target** — SSR Node server same host as NestJS (localhost works) or separate (needs runtime-configurable `apiUrl`)?
2. **Theme flash** — acceptable, or must be SSR-correct via cookie?
3. **Blog prerender vs per-request SSR** — acceptable staleness?
4. **`ng add` vs manual scaffold** — given the pnpm PATH constraint (manual recommended).
5. **Cart/Favorites future** — stay client-only or sync to server API later (affects init design)?
