# Proposal — SSR for the electrick-Kar Storefront

## Why

The public storefront (`electric-kar-front/`) is a pure client-side Angular SPA. The browser
receives an empty `app-root` and the page only fills in after JavaScript boots and the API
responds. This has two business costs:

- **SEO is effectively broken for the catalog and blog.** Crawlers and link unfurlers see an
  empty shell. The pages that should rank — `/producto/:id`, `/blog/:slug`, `/tienda` — render
  nothing meaningful without executing JS, which most crawlers do unreliably or not at all.
  For an e-commerce site selling automotive electrical parts, organic discovery of product and
  blog pages is a primary acquisition channel that is currently forfeited.
- **Slow first contentful paint hurts conversion.** First paint waits on bundle download +
  hydration + the in-constructor API fetch. Server-rendering the storefront delivers real
  HTML on the first byte, improving perceived load time and Core Web Vitals on the exact pages
  where bounce equals lost revenue.

The gap is structural, not cosmetic: the app has no server build target at all
(`@angular/build:application` with only a `browser` entry, no `outputMode`, no `server.ts`,
no `@angular/ssr` dependency). Migrating the storefront to Server-Side Rendering with
client hydration closes both gaps while leaving the private admin panel untouched.

## What Changes

Adopt **Hybrid SSR (Approach B)**: server-render the SEO-relevant storefront, prerender the
fully-static pages, and keep transactional/admin routes client-rendered. Concretely:

- Scaffold the Angular SSR target via `ng add @angular/ssr` (generates `main.server.ts`,
  `server.ts`, updates `angular.json` to an Express Node server with a `server` build target).
- Add `provideClientHydration()` (with `withEventReplay()`) and `provideHttpClient(withFetch())`
  to `app.config.ts`. `withFetch()` is mandatory — Node has no `XMLHttpRequest`.
- Guard the six `providedIn: 'root'` browser-API services so their constructors are SSR-safe:
  `auth`, `admin-auth`, `cart`, `favorites`, `theme`, using `isPlatformBrowser(PLATFORM_ID)`
  for reads and `afterNextRender()` for browser-only init/effects.
- Make `ThemeService` **cookie-driven** so the server emits the correct `dark`/`light` class on
  first paint (no theme flash) — see Locked Decisions.
- Configure route-level `serverRoutes` with per-route render modes (table below).
- Add a production environment file so the API base URL is explicit for prod builds (kept at
  the same-host API — see Locked Decisions).

### Render-mode strategy

| Render mode | Routes | Rationale |
|---|---|---|
| `RenderMode.Server` | `/`, `/tienda`, `/producto/:id`, `/blog`, `/blog/:slug`, `/busqueda`, `/destacados` | High SEO value, dynamic data; rendered per request with fresh data |
| `RenderMode.Prerender` | `/nosotros`, `/faq`, `/contacto` | Fully static, no API — render once at build time |
| `RenderMode.Client` | `/admin/**`, `/checkout`, `/carrito`, `/acceso`, `/cuenta`, `/recuperar`, `/favoritos`, `/confirmacion` | Auth/transactional/admin — no SEO value, depend on browser state |

`/blog/:slug` is intentionally `RenderMode.Server` (not prerender) to avoid a brittle
build-time `getPrerenderParams()` API call and to keep blog content fresh per request.

## Locked Decisions

These are settled constraints, not open options:

1. **Same-host deployment.** The SSR Node server runs on the same host as the NestJS API.
   Server-side fetches target `http://localhost:3000/api` directly. No runtime-configurable
   `apiUrl` is required for now. A production environment file should still exist, but its
   `apiUrl` stays pointed at the same-host API.
2. **SSR-correct theme via cookie — no flash.** The theme preference is persisted to a cookie
   (read on the server during render) so the server emits the correct `dark`/`light` class on
   the `<html>` element on first paint. `ThemeService` is designed around the cookie as the
   source of truth the server can see, with localStorage as an optional client convenience.
   A theme flash is not acceptable.
3. **Scaffold with `ng add`, not manual files.** Use
   `PATH="$HOME/.local/bin:$PATH" ng add @angular/ssr` so the Angular CLI can shell out to
   pnpm correctly. Do not hand-author `server.ts` / `main.server.ts` / `angular.json` changes.

## In Scope

- SSR scaffolding and config (`angular.json`, `app.config.ts`, `main.server.ts`, `server.ts`).
- Platform-guarding the six shared browser-API services.
- Cookie-based `ThemeService` with SSR-correct first paint.
- `serverRoutes` per-route render-mode configuration.
- Production environment file with same-host `apiUrl`.
- Verifying the header and storefront pages render server-side and hydrate without warnings.

## Out of Scope

- **Admin panel stays CSR.** `/admin/**` maps to `RenderMode.Client`; no admin code is guarded
  or server-rendered.
- **Cart/favorites server-sync.** They remain client-only (localStorage). No new backend
  endpoints or server-side persistence for cart/favorites.
- **Real PAC / payment changes.** Stripe redirect, CFDI timbrado, and payment flows are
  untouched (they already run client-side / event-driven and are SSR-safe).

## Impact

- **Services (6):** `core/auth.service.ts`, `core/admin-auth.service.ts`, `core/cart.service.ts`,
  `core/favorites.service.ts`, `core/theme.service.ts` (cookie-based rewrite), plus verification
  of the already-safe `acceso.component.ts` and `checkout.component.ts`.
- **App config:** `app.config.ts` gains `provideClientHydration()` + `provideHttpClient(withFetch())`.
- **Build config:** `angular.json` gains a `server` target and `outputMode`; new `main.server.ts`
  and `server.ts` (Express). `@angular/ssr` (and likely an explicit `@angular/platform-server`,
  since pnpm hides transitive deps) added as direct dependencies.
- **Header:** the shared `Header` injects auth/cart/favorites/theme; it is the critical render
  path and must hydrate cleanly. Cart/favorites badge counts must avoid hydration mismatch.
- **Environment:** new production environment file (apiUrl = same-host API).
- **Deployment workflow change:** `pnpm start:prod` now runs a Node server
  (`node dist/.../server.mjs`) instead of serving static files. Backend restart/serve docs
  change accordingly.
- **Backend load:** with `provideClientHydration()` enabled, `TransferState` serializes
  server-side HTTP responses into the HTML and the client rehydrates from them instead of
  re-fetching — avoiding a double hit on NestJS for every server-rendered page.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Theme flash / hydration mismatch on `<html>` class | Cookie read on the server emits the correct class on first paint (Locked Decision 2). |
| Cart/favorites badge: server renders count 0, client hydrates real count → hydration warning | Render a stable placeholder (no count or skeleton) on the server; populate via `afterNextRender()` so server and first client paint match. |
| `ng add` shells out to pnpm not on PATH | Run with `PATH="$HOME/.local/bin:$PATH"` (Locked Decision 3). |
| Missing production environment file → `apiUrl=localhost:3000` in all builds silently | Add an explicit prod environment file as part of this change. |
| `setInterval` countdown in `HomeComponent` runs on server / leaks | Guard the timer behind `afterNextRender()` (browser-only) and confirm `DestroyRef` cleanup. |
| Double-fetch doubling NestJS load if hydration misconfigured | Ensure `provideClientHydration()` is wired so `TransferState` reuses server responses; verify no duplicate network calls on hydration. |
| `@angular/platform-server` missing as direct dep (pnpm hides transitive) | List it explicitly if `ng add` does not. |

## First Slice / Delivery Boundary

The first PR should establish a **working SSR foundation** and prove the home page renders
server-side, deferring per-route tuning:

**Included in first slice (~target under 400 lines):**
- `PATH="$HOME/.local/bin:$PATH" ng add @angular/ssr` scaffold (server.ts, main.server.ts,
  angular.json, deps).
- `app.config.ts`: add `provideClientHydration(withEventReplay())` +
  `provideHttpClient(withFetch())`.
- Guard the **four header services** (`auth`, `admin-auth`, `cart`, `favorites`) for SSR safety,
  with cart/favorites badge rendering a hydration-stable placeholder.
- Cookie-based `ThemeService` so first paint has the correct theme (no flash).
- Production environment file (same-host apiUrl).
- Verify `/` renders meaningful HTML server-side and hydrates without console warnings;
  confirm admin still loads (it will be plain SSR-default for now, refined next slice).

**Deferred to a later slice:**
- Per-route `serverRoutes` render-mode map (Server/Prerender/Client split, including
  `RenderMode.Client` for `/admin/**` and transactional routes).
- Prerender of `/nosotros`, `/faq`, `/contacto`.
- `HomeComponent` `setInterval` cleanup audit and any remaining storefront-page guards.
- `TransferState` double-fetch verification across all server routes.

This boundary keeps the first PR reviewable, lands the infrastructure once, and isolates the
route-by-route render-mode decisions into a second focused change.

## Open Questions

1. **`provideClientHydration` options** — confirm `withEventReplay()` is desired (captures
   user events during hydration); low risk, default recommendation is yes.
2. **Cookie attributes for theme** — `SameSite`/`Secure`/`Max-Age` values and whether the
   client should also keep localStorage in sync (cookie is the SSR source of truth regardless).

(Deployment target, theme-flash policy, and scaffold method are resolved by the Locked Decisions.)
