# SSR Storefront — Implementation Tasks (First Slice)

All tasks are scoped to `electric-kar-front/`. Run all `ng`/`pnpm` commands
from inside that directory unless noted. Invoke pnpm as
`~/.local/bin/pnpm` or prefix `PATH="$HOME/.local/bin:$PATH"`.

Strict TDD Mode is active. Where unit tests apply, write the failing test first,
then implement until it passes.

---

## Phase 1 — Scaffold

- [x] **T-01** · Run `ng add` to scaffold SSR.

  ```bash
  cd electric-kar-front
  PATH="$HOME/.local/bin:$PATH" ng add @angular/ssr
  ```

  Accept all prompts. Files generated (keep as-is for now):
  `angular.json`, `src/main.server.ts`, `src/server.ts`,
  `src/app/app.config.server.ts`.

  > Risk (a): After the command completes, open `src/server.ts` and confirm
  > whether the generated server uses `CommonEngine` or `AngularNodeAppEngine`.
  > Record the shape — the THEME_COOKIE injection point in Phase 4 depends on it.

- [x] **T-02** · Verify `@angular/platform-server` is a **direct** dependency.

  ```bash
  cat package.json | grep platform-server
  ```

  > Risk (b): pnpm does not hoist transitive deps. If the entry is absent, add
  > it explicitly: `PATH="$HOME/.local/bin:$PATH" pnpm add @angular/platform-server`.

- [x] **T-03** · Confirm build succeeds at baseline (server bundle produced).

  ```bash
  PATH="$HOME/.local/bin:$PATH" pnpm build
  ls dist/electric-kar-front/server/
  ```

  Expected: `server.mjs` (or equivalent) exists. Fix any scaffold-only errors
  before proceeding.

---

## Phase 2 — Core Providers

- [x] **T-04** · Add `provideClientHydration(withEventReplay())` and
  `provideHttpClient(withFetch(), …)` to `src/app/app.config.ts`.

  **Write failing test first** (`app.config.spec.ts` or equivalent): assert
  that `provideClientHydration` and `withFetch` are present in the providers
  array.

  Then apply the BEFORE → AFTER from the design:

  ```ts
  // app.config.ts
  provideClientHydration(withEventReplay()),
  provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ```

  Imports to add:
  - `provideClientHydration, withEventReplay` from `@angular/platform-browser`
  - `withFetch` from `@angular/common/http`

  Files: `src/app/app.config.ts`.

- [x] **T-05** · Add a minimal `src/app/app.routes.server.ts` that defaults
  all routes to `RenderMode.Server`.

  ```ts
  import { RenderMode, ServerRoute } from '@angular/ssr';
  export const serverRoutes: ServerRoute[] = [
    { path: '**', renderMode: RenderMode.Server },
  ];
  ```

  Wire it into `app.config.server.ts` if `ng add` did not already do so:
  `provideServerRendering({ routes: serverRoutes })` (exact API per Angular 21
  generated file — check what was generated in T-01).

  Files: `src/app/app.routes.server.ts`, `src/app/app.config.server.ts`.

---

## Phase 3 — Browser-API Guard Helper

- [x] **T-06** · Create `src/app/core/browser-storage.ts` with the `isBrowser`
  helper and `safeLocalGet`/`safeLocalSet` utilities.

  **Write failing test first** (`browser-storage.spec.ts`): assert
  `isBrowser` returns `false` when platform is `'server'` and `true` when
  platform is `'browser'`.

  ```ts
  // browser-storage.ts
  import { PLATFORM_ID, inject } from '@angular/core';
  import { isPlatformBrowser } from '@angular/common';

  export function injectIsBrowser(): boolean {
    return isPlatformBrowser(inject(PLATFORM_ID));
  }

  export function safeLocalGet(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  export function safeLocalSet(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* server */ }
  }
  ```

  Files: `src/app/core/browser-storage.ts`,
  `src/app/core/browser-storage.spec.ts`.

  > Risk (c): `isBrowser` must be the FIRST field declared in any service that
  > uses it. TypeScript initializes class fields top-to-bottom; a signal that
  > reads `this.isBrowser` before it is assigned will crash.

---

## Phase 4 — Header Service Guards

All four tasks in this phase share the same guard pattern from the design.
Apply them sequentially; each has its own unit test.

- [x] **T-07** · Guard `AuthService` (`src/app/core/auth.service.ts`).

  **Write failing test first** (`auth.service.spec.ts`): construct
  `AuthService` inside `TestBed` with
  `{ provide: PLATFORM_ID, useValue: 'server' }` and assert that no error is
  thrown and `token()` is `null`.

  Apply the BEFORE → AFTER from the design:
  - Declare `private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));`
    as the **first field** in the class.
  - Change `token` signal initializer to `this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null`.
  - Guard `readCliente()` with `if (!this.isBrowser) return null;`.

  Files: `src/app/core/auth.service.ts`,
  `src/app/core/auth.service.spec.ts`.

- [x] **T-08** · Guard `AdminAuthService`
  (`src/app/core/admin-auth.service.ts`).

  Same pattern as T-07 (design says "admin-auth identical").

  **Write failing test first**: same `TestBed` with `PLATFORM_ID='server'`,
  assert construction without error, `token()` is `null`.

  Files: `src/app/core/admin-auth.service.ts`,
  `src/app/core/admin-auth.service.spec.ts`.

- [x] **T-09** · Guard `CartService` (`src/app/core/cart.service.ts`).

  **Write failing test first** (`cart.service.spec.ts`): construct under
  server `PLATFORM_ID`, assert `items()` is `[]`, no error thrown.

  Apply the `afterNextRender` pattern from the design:
  - Declare `private readonly isBrowser` as the first field.
  - Change `items` signal to `signal<CartItem[]>([])` (safe default).
  - Move `load()` call and persistence `effect` into `afterNextRender(() => { … })`.

  Files: `src/app/core/cart.service.ts`,
  `src/app/core/cart.service.spec.ts`.

- [x] **T-10** · Guard `FavoritesService`
  (`src/app/core/favorites.service.ts`).

  Same `afterNextRender` pattern as T-09.

  **Write failing test first**: construct under server `PLATFORM_ID`, assert
  stable initial state, no error.

  Files: `src/app/core/favorites.service.ts`,
  `src/app/core/favorites.service.spec.ts`.

---

## Phase 5 — Cookie-Based ThemeService

- [x] **T-11** · Define `THEME_COOKIE` injection token and rewrite
  `ThemeService` (`src/app/core/theme.service.ts`).

  **Write failing tests first** (`theme.service.spec.ts`):
  1. Provide `PLATFORM_ID='server'` and `THEME_COOKIE='dark'` → assert
     `isDark()` is `true` after construction.
  2. Provide `PLATFORM_ID='server'` and no `THEME_COOKIE` → assert
     `isDark()` is `false`.

  Apply the full rewrite from the design (see design § 4). Key points:
  - `export const THEME_COOKIE = new InjectionToken<string | null>('THEME_COOKIE');`
  - `isBrowser` declared before `isDark` signal.
  - `seed()` reads `THEME_COOKIE` on the server; reads browser cookie /
    `localStorage` on the client.
  - `effect()` toggles `doc.documentElement.classList` and (browser only)
    syncs `localStorage` + writes the `ek_theme` cookie with
    `Path=/; Max-Age=31536000; SameSite=Lax`.

  Files: `src/app/core/theme.service.ts`,
  `src/app/core/theme.service.spec.ts`.

- [x] **T-12** · Wire `THEME_COOKIE` in `src/server.ts`.

  > Risk (a) must be resolved (T-01) before this task. The exact injection
  > point differs between `CommonEngine` and `AngularNodeAppEngine`.

  **CommonEngine path** — inside the render call add a `providers` entry:

  ```ts
  const cookieHeader = req.headers['cookie'] ?? '';
  const m = cookieHeader.match(/(?:^|; )ek_theme=([^;]+)/);
  const themeCookie = m ? decodeURIComponent(m[1]) : null;

  // In commonEngine.render({ … , providers: [{ provide: THEME_COOKIE, useValue: themeCookie }] })
  ```

  **AngularNodeAppEngine path** — pass it through the app's server config or
  the `handle` call's providers array (consult Angular 21 generated `server.ts`
  for the exact hook).

  Import `THEME_COOKIE` from `./app/core/theme.service`.

  Files: `src/server.ts`.

- [x] **T-13** · Ensure `THEME_COOKIE` has a default provider (`null`) in
  `src/app/app.config.server.ts` so unit tests and any render path that
  omits it do not throw a NullInjectorError.

  ```ts
  { provide: THEME_COOKIE, useValue: null }
  ```

  Files: `src/app/app.config.server.ts`.

---

## Phase 6 — Production Environment File

- [x] **T-14** · Create `src/environments/environment.prod.ts`.

  ```ts
  export const environment = {
    production: true,
    apiUrl: 'http://localhost:3000/api',
    googleClientId: '',
  };
  ```

  Verify `angular.json` already has a `fileReplacements` entry for the prod
  configuration (`environment.ts` → `environment.prod.ts`). If not, add it
  under `configurations.production.fileReplacements`.

  Files: `src/environments/environment.prod.ts`, `angular.json` (if
  fileReplacements are missing).

---

## Phase 7 — Verification

- [ ] **T-15** · Run unit tests and confirm the four service specs and the
  `ThemeService` spec pass.

  ```bash
  PATH="$HOME/.local/bin:$PATH" pnpm test --watch=false
  ```

  All specs introduced in T-06 through T-11 must be green before proceeding.

- [ ] **T-16** · Run lint.

  ```bash
  PATH="$HOME/.local/bin:$PATH" pnpm lint
  ```

  Fix any errors before proceeding (spec: NFR-3).

- [ ] **T-17** · Run full production build and assert server bundle exists.

  ```bash
  PATH="$HOME/.local/bin:$PATH" pnpm build
  ls dist/electric-kar-front/server/server.mjs
  ```

  Exit code MUST be 0. `server.mjs` MUST exist (spec: NFR-4 + "SSR Build
  Target Exists").

- [ ] **T-18** · Smoke-test SSR output for `/`.

  Start the SSR server:

  ```bash
  node dist/electric-kar-front/server/server.mjs &
  ```

  Then:

  ```bash
  # 1. Home page returns populated HTML (not empty app-root)
  curl -s http://localhost:4200/ | grep -c '<app-root>'
  curl -s http://localhost:4200/ | grep -v '<app-root></app-root>' | grep -c 'app-root'

  # 2. Dark-theme cookie produces class="dark" on <html>
  curl -s --cookie "ek_theme=dark" http://localhost:4200/ | grep 'class="dark"'

  # 3. No-cookie path produces default theme class
  curl -s http://localhost:4200/ | grep -E 'class="(light|dark)"'
  ```

  All three checks must pass (spec: "Home Route Renders Meaningful Server-Side
  HTML" + "Cookie-Based Theme — No Flash").

- [ ] **T-19** · Load `/` in a browser (Chrome/Chromium), open DevTools
  Console, confirm zero NG0500 / hydration mismatch warnings after Angular
  finishes bootstrapping (spec: NFR-1).

---

## Deferred to Slice 2

The following items are **out of scope** for this slice. Do not implement them
here.

- Per-route `serverRoutes` render-mode map — explicit `RenderMode.Server`,
  `RenderMode.Prerender`, and `RenderMode.Client` assignments for each route
  group (storefront public, storefront transactional, admin).
- Prerender of static routes (`/nosotros`, `/faq`, `/contacto`).
- `setInterval` / subscription cleanup audit in `HomeComponent` and other
  components.
- Full `TransferState` verification across routes (cross-route double-fetch
  checks).
- Enforcing the client-only guard on `/admin/**`, `/checkout`, `/carrito`, etc.
  via explicit `RenderMode.Client` entries.
- `Secure` flag on `ek_theme` cookie (add only under HTTPS in production).

---

## Review Workload Forecast

**Estimated changed lines (reasoning)**

| Area | Files | Estimated lines changed |
|---|---|---|
| `ng add` scaffold artifacts | `angular.json`, `main.server.ts`, `server.ts` (generated), `app.config.server.ts` (generated) | ~80 net (mostly additive) |
| `app.config.ts` | 1 file, 3–4 lines added | ~5 |
| `app.routes.server.ts` | new file, ~6 lines | ~6 |
| `browser-storage.ts` + spec | 2 files | ~40 |
| `auth.service.ts` + spec | 2 files, guard additions | ~35 |
| `admin-auth.service.ts` + spec | 2 files | ~35 |
| `cart.service.ts` + spec | 2 files | ~40 |
| `favorites.service.ts` + spec | 2 files | ~40 |
| `theme.service.ts` rewrite + spec | 2 files | ~90 |
| `server.ts` (cookie inject) | 1 file, ~10 lines added | ~10 |
| `environment.prod.ts` | new file | ~6 |
| **Total** | ~17 files | **~387 lines** |

The scaffold step (`ng add`) generates files automatically and is not reviewer-authored; the human-authored delta is approximately 300 lines spread across 13 files.

**Chained PRs recommended: No**

**400-line budget risk: Medium**

The total is just under 400, and the scaffold automation keeps the human-authored diff well below that. All changes are in `electric-kar-front/` with no backend touching — the blast radius is contained. A single PR is reasonable; reviewers should focus on the four service specs and `theme.service.ts`.

**Decision needed before apply: No**

The scope is clear and bounded. One PR targeting `develop` is the right delivery unit. If the reviewer wants to separate "scaffold + providers" from "service guards + theme", a two-commit PR split is fine but not required.
