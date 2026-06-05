# SSR Storefront — Specification (First Slice)

## Purpose

Defines what the Angular storefront MUST satisfy after hybrid SSR is introduced.
This spec covers First Slice only. Per-route render-mode tuning, prerender, and admin SSR are out of scope.

---

## Requirements

### Requirement: SSR Build Target Exists

The project MUST produce a server bundle alongside the browser bundle when `pnpm build` is run.
The build output MUST include a `server.mjs` (or equivalent Express entry) under `dist/`.
The build MUST complete without TypeScript or lint errors.

#### Scenario: Build produces server bundle

- GIVEN the repository is on the feature branch with SSR scaffolded
- WHEN `pnpm build` is executed inside `electric-kar-front/`
- THEN the exit code is 0
- AND the `dist/` directory contains both a `browser/` sub-folder and a server entry file

---

### Requirement: Client Hydration and Fetch Transport

`app.config.ts` MUST include `provideClientHydration(withEventReplay())`.
`app.config.ts` MUST include `provideHttpClient(withFetch())`.
The application MUST NOT register `XMLHttpRequest`-based HTTP transport on the server side.

#### Scenario: HTTP client uses fetch

- GIVEN the SSR app is running
- WHEN a server-rendered page triggers an HTTP call to the NestJS API
- THEN the call uses the native `fetch` API, not `XMLHttpRequest`
- AND no runtime error about missing `XMLHttpRequest` is thrown

---

### Requirement: Header Services Are SSR-Safe

The four services that the shared `Header` component injects — `AuthService`, `AdminAuthService`, `CartService`, `FavoritesService` — MUST NOT access `localStorage` or any other browser-only API during server-side construction or initialization.
Each service MUST defer browser-only reads and writes to a platform check (`isPlatformBrowser`) or `afterNextRender()`.

#### Scenario: Cold server render — no token

- GIVEN no auth cookie or localStorage token exists
- WHEN the server renders the home route `/`
- THEN `AuthService` reports the user as logged-out without throwing
- AND no `localStorage is not defined` error appears in the server process output

#### Scenario: Cold server render — no cart data

- GIVEN no cart data is present on the server
- WHEN the server renders the home route `/`
- THEN `CartService` reports an empty cart (count 0 or stable placeholder) without throwing

---

### Requirement: Cart and Favorites Badge Hydration Stability

The cart and favorites badge counts MUST NOT cause a hydration mismatch warning.
The server render MUST emit a stable placeholder value (count 0, or no badge) for cart and favorites.
The real count MUST be populated on the client only after `afterNextRender()` fires.

#### Scenario: Badge hydrates without console warning

- GIVEN a user has items in their cart (stored in localStorage)
- WHEN the browser hydrates the server-rendered home page
- THEN no Angular hydration mismatch warning is emitted to the console
- AND the badge count updates to the correct value after hydration completes

---

### Requirement: Cookie-Based Theme — No Flash on First Paint

`ThemeService` MUST read theme preference from a cookie named `theme` during server-side rendering.
The server MUST emit the `dark` or `light` CSS class on the `<html>` element based on the cookie value before any client JavaScript runs.
If no `theme` cookie is present, the server MUST render the default theme class without flash.
The cookie MUST have `SameSite=Lax`, no `Secure` flag in development, and `Max-Age` of approximately one year (31536000 seconds).
`ThemeService` MUST keep the cookie and `localStorage` in sync on the client so subsequent server renders reflect the user's latest preference.

#### Scenario: Dark theme cookie — first paint is dark

- GIVEN a `theme=dark` cookie is present in the request
- WHEN the server renders any storefront page
- THEN the response HTML contains `class="dark"` (or equivalent) on the `<html>` element
- AND no theme-toggle flash is visible during client hydration

#### Scenario: No cookie — default theme renders without flash

- GIVEN no `theme` cookie is present
- WHEN the server renders any storefront page
- THEN the response HTML contains the default theme class on `<html>`
- AND no flash occurs during hydration

#### Scenario: Theme toggle persists across reload

- GIVEN a user is on the storefront and toggles to dark mode
- WHEN the page is reloaded (full navigation)
- THEN the server reads the updated `theme` cookie and emits `dark` from first byte
- AND the `theme` cookie `Max-Age` is ~1 year

---

### Requirement: Home Route Renders Meaningful Server-Side HTML

A GET request to `/` served by the SSR Node process MUST return HTML that contains non-empty storefront content (e.g., product cards, navigation, or page heading).
The response MUST NOT be an empty `<app-root></app-root>` shell.

#### Scenario: Home page SSR response is populated

- GIVEN the SSR Node server is running
- WHEN an HTTP GET to `http://localhost:4200/` is made without JavaScript execution
- THEN the response body contains meaningful text content inside `<app-root>`
- AND the response status is 200

#### Scenario: Home page hydrates without console errors

- GIVEN the browser loads the server-rendered home page
- WHEN Angular hydration completes
- THEN zero hydration errors or warnings appear in the browser console

---

### Requirement: Admin and Transactional Routes Are NOT Server-Rendered

Routes under `/admin/**` and the transactional routes (`/checkout`, `/carrito`, `/acceso`, `/cuenta`, `/recuperar`, `/favoritos`, `/confirmacion`) MUST be client-rendered only.
The SSR server MUST NOT attempt to server-render these routes (they MAY fall through to client bootstrap or return the SPA shell).

#### Scenario: Admin route is client-rendered

- GIVEN the SSR server is running
- WHEN an HTTP GET to `/admin/dashboard` (or any `/admin/**` path) is made
- THEN the server does NOT execute admin component logic on the server
- AND the response is the SPA shell (empty `<app-root>` or minimal HTML), with the admin app booting entirely in the browser

---

### Requirement: Production Environment File Exists

A production environment file (`environment.prod.ts` or equivalent) MUST exist and MUST declare `apiUrl` pointing to the same-host NestJS API (`http://localhost:3000/api`).
The build MUST substitute this file when building in production mode.

#### Scenario: Production build uses explicit apiUrl

- GIVEN the production environment file is present
- WHEN `pnpm build` runs with the production configuration
- THEN the resulting browser bundle references `http://localhost:3000/api` as `apiUrl`
- AND no `undefined` or missing `apiUrl` is present in the bundle

---

## Non-Functional Requirements

- NFR-1: Zero Angular hydration error or warning messages in the browser console on any server-rendered page load (MUST).
- NFR-2: No double-fetch of the same API resource on home page load. `TransferState` MUST serialize server HTTP responses into the HTML so the browser reuses them without re-requesting (MUST).
- NFR-3: `pnpm lint` MUST pass after all changes (MUST).
- NFR-4: `pnpm build` MUST succeed with exit code 0 (MUST).

---

## Out of Scope

- Per-route `serverRoutes` render-mode map (`RenderMode.Server` / `RenderMode.Prerender` / `RenderMode.Client`) — deferred to slice 2.
- Prerender of static routes (`/nosotros`, `/faq`, `/contacto`).
- Admin panel SSR or guarding of admin-only services.
- `HomeComponent` `setInterval` cleanup audit beyond what is already guarded.
- Server-side sync of cart or favorites data (cart/favorites remain localStorage-only).
- Real PAC timbrado or Stripe payment flow changes.
- Runtime-configurable `apiUrl` beyond the same-host production environment file.
