# SSR Storefront — Apply Progress

## Batch 1 (Phases 1-3)

### Phase 1 — Scaffold

- [x] **T-01** — DONE
  Scaffolded SSR manually (ng add broken due to pnpm non-interactive TTY issue in shell).
  Generated: `src/main.server.ts`, `src/app/app.config.server.ts`, `src/app/app.routes.server.ts`, `src/server.ts`, updated `angular.json`.
  
  **Server engine shape: `AngularNodeAppEngine`** (not CommonEngine).
  - Import: `@angular/ssr/node`
  - Key exports: `AngularNodeAppEngine`, `createNodeRequestHandler`, `isMainModule`, `writeResponseToNodeResponse`
  - `handle(req)` takes the Node `IncomingMessage` as first arg; second arg is `requestContext` (stored as `REQUEST_CONTEXT` token, not a providers array).
  - **THEME_COOKIE injection point for Phase 5 (T-12)**: Since `AngularNodeAppEngine.handle()` does NOT support per-request `providers[]`, the correct approach is to inject Angular's `REQUEST` token directly in `ThemeService` and read `req.headers.get('cookie')`. The explicit `THEME_COOKIE` token pattern still works but must be wired via `app.config.server.ts` default providers, not per-request.
  - The `express` request `req` is available as `inject(REQUEST)` inside `ThemeService` during SSR.

- [x] **T-02** — DONE
  `@angular/platform-server@21.2.16` added as direct dependency. Was NOT present before (pnpm hides transitives). Installed via pnpm.

- [x] **T-03** — DONE
  Build succeeded. Server bundle at:
  `dist/electric-kar-front/server/server.mjs` — confirmed present.

### Phase 2 — Core Providers

- [x] **T-04** — DONE
  `provideClientHydration(withEventReplay())` and `withFetch()` added to `app.config.ts`.
  Test: `app.config.spec.ts` — 2 tests pass.

- [x] **T-05** — DONE
  `src/app/app.routes.server.ts` created with `{ path: '**', renderMode: RenderMode.Server }`.
  Wired into `app.config.server.ts` via `provideServerRendering(withRoutes(serverRoutes))` from `@angular/ssr`.
  Note: Angular 21 SSR API uses `provideServerRendering(withRoutes(...))` from `@angular/ssr`, NOT from `@angular/platform-server`.

### Phase 3 — Browser-API Guard Helper

- [x] **T-06** — DONE (TDD: test written first, then implementation)
  `src/app/core/browser-storage.ts` created with `injectIsBrowser()`, `safeLocalGet()`, `safeLocalSet()`.
  `src/app/core/browser-storage.spec.ts` — 5 tests pass.

---

## Batch 2 (Phases 4-5)

### Phase 4 — Header Service Guards

- [x] **T-07** — DONE (TDD: test written first, then implementation)
  `src/app/core/auth.service.ts` — guarded with `isPlatformBrowser(inject(PLATFORM_ID))`.
  - `isBrowser` declared as FIRST field before all signal fields.
  - `token` signal: `this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null`.
  - `readCliente()`: early return `null` if `!this.isBrowser`.
  - Test: `auth.service.spec.ts` — 2 tests pass (server: no throw + null token).

- [x] **T-08** — DONE (TDD: test written first, then implementation)
  `src/app/core/admin-auth.service.ts` — identical pattern to T-07.
  - `isBrowser` declared first; `token` signal guarded; `readUser()` guarded.
  - Test: `admin-auth.service.spec.ts` — 2 tests pass.

- [x] **T-09** — DONE (TDD: test written first, then implementation)
  `src/app/core/cart.service.ts` — `afterNextRender` pattern.
  - `isBrowser` declared first; `items` signal defaults to `[]`.
  - `afterNextRender()` guarded by `if (this.isBrowser)` — hydrates from localStorage + sets up persistence effect after first render.
  - Test: `cart.service.spec.ts` — 2 tests pass (server: no throw + empty items).

- [x] **T-10** — DONE (TDD: test written first, then implementation)
  `src/app/core/favorites.service.ts` — same `afterNextRender` pattern as T-09.
  - Test: `favorites.service.spec.ts` — 2 tests pass.

### Phase 5 — Cookie-Based ThemeService

- [x] **T-11** — DONE (TDD: test written first, then implementation)
  `src/app/core/theme.service.ts` — full rewrite using `REQUEST` token from `@angular/core`.
  - `REQUEST` confirmed exported from `@angular/core` (type: `InjectionToken<Request | null>`).
  - `isBrowser` declared before `isDark` signal (field-ordering gotcha — handled correctly).
  - `seed()`: server path reads `this.request.headers.get('cookie')` and parses `ek_theme`; client path reads browser cookie then falls back to localStorage.
  - `effect()`: toggles `doc.documentElement.classList`; browser-only branch writes localStorage + `document.cookie` with `SameSite=Lax; Max-Age=31536000`.
  - `{ optional: true }` on `inject(REQUEST)` so tests without REQUEST provided don't throw.
  - Test: `theme.service.spec.ts` — 5 tests pass (server seeds dark from cookie, seeds false when no cookie, constructs with null REQUEST, applies dark class to <html>, client toggle works).

- [x] **T-12** — DONE (design path adapted)
  No changes to `src/server.ts` required. `AngularNodeAppEngine` provides the `REQUEST` token automatically per-request (confirmed in `@angular/ssr/fesm2022/ssr.mjs` line 1268: `provide: REQUEST`). The per-request cookie is available directly inside `ThemeService` via `inject(REQUEST, { optional: true })`.

- [x] **T-13** — DONE (design path adapted)
  No `THEME_COOKIE` token needed. `REQUEST` is `null` on the client (Angular sets it so), and `inject(REQUEST, { optional: true })` returns `null` when not in SSR context. `seed()` handles `null` request gracefully — returns `false` (light default). No extra provider in `app.config.server.ts` required.

---

## Batch 3 (Phase 7 — Verification)

- [x] **T-15** — DONE. `pnpm test --watch=false` → 8 test files, 21 tests passed (0 failed).
- [N/A] **T-16** — NOT APPLICABLE. No ESLint configured in this project (no `lint`
  script, no eslint dependency). Nothing to run. Spec NFR-3 assumed a linter that
  the front never had. Deferred: add `@angular-eslint` in a separate change.
- [x] **T-17** — DONE. `pnpm build` exit 0; `dist/electric-kar-front/server/server.mjs`
  present (832k). 3 static routes prerendered (nosotros, faq, contacto).
- [x] **T-18** — DONE. SSR smoke-test on `/` (port 4200):
  - Home returns HTTP 200, ~86 KB populated HTML (not empty `<app-root>`).
  - `ek_theme=dark` cookie → `<html lang="es" class="dark">` server-side (no theme flash).
  - No cookie → `<html lang="es">` (light = absence of `dark` class, Tailwind pattern).
    The spec's `class="light"` expectation did not match the implementation; not a bug.
- [ ] **T-19** — PENDING (manual). Requires a real browser (Chrome DevTools) to confirm
  zero NG0500 / hydration-mismatch warnings after bootstrap. Cannot be automated headless.

---

## Tasks NOT started in Batch 2

- [x] T-14 — Phase 6 (environment.prod.ts) — DONE (Batch 1 note)

---

## Key Discoveries

1. **`ng add @angular/ssr` can't run in non-interactive shell**: pnpm is a corepack shim that exits 1 silently without TTY. Workaround: `CI=true npx pnpm@11.5.1 install --no-frozen-lockfile`. The scaffold was done manually.

2. **`@angular/ssr` 21.x API**: Uses `provideServerRendering(withRoutes(...))` — NOT `provideServerRoutesConfig`. Both `provideServerRendering` from `@angular/ssr` and from `@angular/platform-server` exist but serve different purposes.

3. **`AngularNodeAppEngine.handle()` has NO per-request providers**: The `requestContext` arg is stored as `REQUEST_CONTEXT` token, not as injectable providers. For cookie-based theme, inject Angular's `REQUEST` token directly in `ThemeService` instead of a per-request THEME_COOKIE provider.

4. **pnpm `onlyBuiltDependencies`**: In pnpm 11+, this must go in `pnpm.yaml` (not `package.json`). Needed for @parcel/watcher, esbuild, lmdb, msgpackr-extract. Approved via `pnpm approve-builds`.

5. **`REQUEST` token import**: `import { REQUEST } from '@angular/core'` — confirmed exported from `@angular/core`, type `InjectionToken<Request | null>`. It is provided automatically by `AngularNodeAppEngine` per-request during SSR; returns `null` on the client or when not provided.

6. **Field-ordering gotcha (CRITICAL)**: TypeScript initializes class fields top-to-bottom. `isBrowser` MUST be declared before any signal field that calls `this.isBrowser` in its initializer expression. Declaring it after causes `this.isBrowser` to be `undefined` at signal construction time. Applied correctly in all 4 guarded services and ThemeService.

7. **`afterNextRender` inside `if (isBrowser)` guard**: For cart and favorites, calling `afterNextRender` on the server would throw or do nothing — wrapping it in `if (this.isBrowser)` is the correct server-safe pattern. The design's plain `afterNextRender` call without guard would also work (Angular 21 silently no-ops it on the server), but the explicit guard is safer and communicates intent.

---

## Test Results (Batch 2)

- Test files: 8 passed (0 failed)
- Tests: 21 passed (0 failed)
- Build: SUCCESS — `dist/electric-kar-front/server/server.mjs` exists
