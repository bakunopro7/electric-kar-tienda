# Design: SSR for the electrick-Kar Storefront (First Slice)

## Technical Approach

Convert the storefront Angular app from a browser-only build into a hybrid SSR
app using Angular's official `@angular/ssr` (Express Node server). The first
slice lands the **infrastructure**: scaffold the server target, enable client
hydration + `fetch`-based HTTP, make the four header services SSR-safe, and
make `ThemeService` cookie-driven so first paint has the correct theme with no
flash. Per-route render-mode tuning is deferred (see proposal first-slice
boundary).

The guiding rule for every change: **service constructors and signal
initializers must never touch a browser global on the server.** We adopt ONE
canonical guard pattern across all services so the codebase stays consistent.

---

## Architecture Decisions

### Decision: One canonical browser-API guard pattern

| Option | Tradeoff | Decision |
|---|---|---|
| `isPlatformBrowser(inject(PLATFORM_ID))` guard + safe default; `afterNextRender()` only where DOM is required | Synchronous, signal-initializer friendly, no async lifecycle dependency for pure storage reads | **Chosen** |
| `afterNextRender()` everywhere | Forces all init into a callback; awkward for signals that need an initial value at construction | Rejected |
| Wrap `localStorage` in a try/catch | Hides the real problem (Node has no `localStorage` global → `ReferenceError`, not a catchable storage exception in all cases) and pollutes every call site | Rejected |

**Rationale**: `localStorage`/`document` reads that feed a signal's *initial
value* need to be synchronous, so a `PLATFORM_ID` guard with a server-safe
default is the right tool. `afterNextRender()` is reserved for code that must
touch the live DOM (e.g. applying the `dark` class on the client, badge
hydration), because it only runs in the browser after the first render — exactly
the hydration-safe window.

### Decision: Cookie as the SSR source of truth for theme

| Option | Tradeoff | Decision |
|---|---|---|
| Theme cookie read on the server, `dark` class emitted on `<html>` at render | Server and client agree on first paint → no flash, no hydration mismatch | **Chosen** |
| Accept a flash, fix theme client-side in `afterNextRender()` | Simpler, no cookie, but a visible light→dark flash on every dark-mode user's first paint — violates Locked Decision 2 | Rejected |
| `prefers-color-scheme` only | Ignores explicit user choice; still flashes when user overrode the OS theme | Rejected |

**Rationale**: Only data the server can read during render can prevent a flash.
`localStorage` is invisible to the server; a cookie is sent with the request.
Cookie is the source of truth the server sees; `localStorage` is kept in sync as
a client convenience (and lets existing code that reads it keep working).

### Decision: Same-host server fetch, explicit prod environment

Keep `apiUrl` pointed at `http://localhost:3000/api` in both dev and the new
`environment.prod.ts` (Locked Decision 1). The SSR Node server and NestJS share
the host, so server-side `fetch` hits localhost directly. No runtime-config
indirection now; the prod file exists only to make the value explicit and
prevent the dev URL silently shipping.

### Decision: Scaffold via `ng add`, not hand-authored files

Run `PATH="$HOME/.local/bin:$PATH" ng add @angular/ssr`. It wires
`angular.json`, `main.server.ts`, `server.ts`, and deps consistently with the
installed Angular 21 version — hand-authoring risks version drift. We only
*adjust* what it generates.

---

## Data Flow

### Theme, server render → hydration (no flash)

```
HTTP request (Cookie: ek_theme=dark)
        │
        ▼
server.ts  ── parse cookie ──► provide THEME_COOKIE token ──► ThemeService.isDark = true (server)
        │                                                          │
        ▼                                                          ▼
index.html rendered with <html class="dark">  ◄──── server emits class string
        │
        ▼  (sent to browser — already dark, no flash)
client bootstraps ──► ThemeService reads same cookie/localStorage ──► isDark = true (matches)
        │
        ▼  afterNextRender(): sync localStorage + keep <html class> via effect
```

### Header badge (cart/favorites) hydration

```
Server: localStorage absent → count signal = 0 (safe default) → render stable placeholder (no number)
Client: afterNextRender() → load from localStorage → count updates → badge appears
        (server HTML and FIRST client paint both show "no badge" → no mismatch warning)
```

---

## File Changes

| File | Action | Description |
|---|---|---|
| `angular.json` | Modify (by `ng add`) | Adds `server`, `ssr`, `outputMode: server`; keep generated values |
| `package.json` | Modify | `@angular/ssr` (+ explicit `@angular/platform-server` if pnpm hides it); `start:prod` runs the Node server |
| `src/main.server.ts` | Create (by `ng add`) | Server bootstrap; keep as generated |
| `src/server.ts` | Modify | Generated Express server + **add cookie parse → inject `THEME_COOKIE`** |
| `src/app/app.config.server.ts` | Create (by `ng add`) | Merges base config with server providers; add `THEME_COOKIE` provider wiring |
| `src/app/app.config.ts` | Modify | Add `provideClientHydration(withEventReplay())`, `withFetch()` on `provideHttpClient` |
| `src/environments/environment.prod.ts` | Create | Same-host `apiUrl`, `production: true` |
| `src/app/core/theme.service.ts` | Rewrite | Cookie-driven, SSR-safe (see below) |
| `src/app/core/auth.service.ts` | Modify | Guard `localStorage` reads |
| `src/app/core/admin-auth.service.ts` | Modify | Guard `localStorage` reads |
| `src/app/core/cart.service.ts` | Modify | Guard load + defer persistence effect |
| `src/app/core/favorites.service.ts` | Modify | Guard load + defer persistence effect |
| `src/app/core/browser-storage.ts` | Create (optional) | Tiny `isBrowser` helper + `safeLocalGet/Set` to avoid repetition |

---

## Concrete BEFORE / AFTER

### 1. `app.config.ts`

```ts
// BEFORE
provideHttpClient(withInterceptors([authInterceptor])),

// AFTER
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
// ...
provideClientHydration(withEventReplay()),
provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
```

`withFetch()` is mandatory: Node has no `XMLHttpRequest`.
`provideClientHydration()` also enables automatic `TransferState` for HTTP.

### 2. Canonical guard — `auth.service.ts` (admin-auth identical)

```ts
// BEFORE
readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
readonly cliente = signal<ClienteAuth | null>(this.readCliente());

private readCliente(): ClienteAuth | null {
  const raw = localStorage.getItem(CLIENTE_KEY);
  return raw ? (JSON.parse(raw) as ClienteAuth) : null;
}

// AFTER
import { PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

readonly token = signal<string | null>(
  this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null,
);
readonly cliente = signal<ClienteAuth | null>(this.readCliente());

private readCliente(): ClienteAuth | null {
  if (!this.isBrowser) return null;
  const raw = localStorage.getItem(CLIENTE_KEY);
  return raw ? (JSON.parse(raw) as ClienteAuth) : null;
}
```

> Field-initializer ordering: declare `isBrowser` **before** the signals that
> use it (TypeScript initializes fields top-to-bottom). `store()`/`logout()`
> write to `localStorage` only inside event handlers, which never run on the
> server — they can stay as-is, but defensively guard if desired.

### 3. Canonical guard — `cart.service.ts` (favorites identical)

```ts
// BEFORE
readonly items = signal<CartItem[]>(this.load());

constructor() {
  effect(() => localStorage.setItem(CART_KEY, JSON.stringify(this.items())));
}

private load(): CartItem[] {
  const raw = localStorage.getItem(CART_KEY);
  return raw ? (JSON.parse(raw) as CartItem[]) : [];
}

// AFTER
import { PLATFORM_ID, inject, effect, afterNextRender, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

readonly items = signal<CartItem[]>([]); // safe default on server

constructor() {
  // Browser-only: hydrate from storage AFTER first render, then keep it in sync.
  afterNextRender(() => {
    this.items.set(this.load());
    effect(() => localStorage.setItem(CART_KEY, JSON.stringify(this.items())));
  });
}

private load(): CartItem[] {
  const raw = localStorage.getItem(CART_KEY);
  return raw ? (JSON.parse(raw) as CartItem[]) : [];
}
```

> Why `afterNextRender()` here (not a plain `isBrowser` initial read): the cart
> count drives the header badge. If the server rendered the *real* count from a
> guard but the server has no storage, it would render 0 anyway — and reading on
> the client at construction would change the value between server HTML and first
> client paint → hydration mismatch. Loading inside `afterNextRender()` keeps the
> server HTML and the first client paint identical (badge absent), then the badge
> appears post-hydration. The badge template must render a stable placeholder
> when `count() === 0`.

### 4. `theme.service.ts` — cookie-driven, SSR-correct

```ts
// AFTER
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable, InjectionToken, PLATFORM_ID, afterNextRender, effect, inject, signal,
} from '@angular/core';

export const THEME_COOKIE = new InjectionToken<string | null>('THEME_COOKIE');
const THEME_KEY = 'ek_theme';
const COOKIE = 'ek_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  // On the server this token carries the parsed cookie; on the client it is null.
  private readonly serverCookie = inject(THEME_COOKIE, { optional: true });

  readonly isDark = signal<boolean>(this.seed());

  constructor() {
    // SERVER: emit the class during render so first paint matches the cookie.
    // CLIENT: keep <html class> + cookie + localStorage in sync on every change.
    effect(() => {
      const dark = this.isDark();
      this.doc.documentElement.classList.toggle('dark', dark);
      if (this.isBrowser) {
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
        document.cookie =
          `${COOKIE}=${dark ? 'dark' : 'light'}; Path=/; Max-Age=31536000; SameSite=Lax`;
      }
    });
  }

  toggle() { this.isDark.update((v) => !v); }

  private seed(): boolean {
    if (this.isBrowser) {
      // Prefer cookie (server-visible truth); fall back to localStorage.
      const ck = this.readCookieBrowser();
      if (ck) return ck === 'dark';
      return localStorage.getItem(THEME_KEY) === 'dark';
    }
    return this.serverCookie === 'dark';
  }

  private readCookieBrowser(): string | null {
    const m = document.cookie.match(/(?:^|; )ek_theme=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
}
```

**Why this is flash-free**: on the server `seed()` reads `THEME_COOKIE`, the
`effect()` runs during render and toggles `class="dark"` on `<html>` (via the
injected `DOCUMENT`, which is the server document in SSR). The server sends HTML
that is *already* dark. On the client, `seed()` reads the same cookie → `isDark`
matches → no mismatch, no flash.

### 5. `server.ts` — parse cookie, provide the token

```ts
// Inside the Express request handler (Angular 21 generated server.ts),
// before angularApp.handle / commonEngine.render, parse the cookie and
// pass it through providers:
const cookieHeader = req.headers.cookie ?? '';
const m = cookieHeader.match(/(?:^|; )ek_theme=([^;]+)/);
const themeCookie = m ? decodeURIComponent(m[1]) : null;

// provide it so app.config.server.ts / ThemeService can inject THEME_COOKIE
// e.g. via the render's `providers: [{ provide: THEME_COOKIE, useValue: themeCookie }]`
```

> Angular 21's generated `server.ts` exposes the Express `req`. The request
> cookie is parsed there and handed to the render via a `providers` entry for
> `THEME_COOKIE`. (Alternative: inject Angular's `REQUEST` token directly in
> `ThemeService` and read `req.headers.get('cookie')` — both work; the explicit
> token keeps `ThemeService` decoupled from the HTTP request shape and easier to
> test. We use the explicit `THEME_COOKIE` token.)

### 6. `serverRoutes` (declared this slice, full map deferred)

Per the proposal first-slice boundary, the **per-route render-mode map is
deferred**. This slice may include a minimal `app.routes.server.ts` that defaults
everything to `RenderMode.Server` (so `/` server-renders and admin still loads),
leaving the Server/Prerender/Client split to the next slice:

```ts
// src/app/app.routes.server.ts (minimal, this slice)
import { RenderMode, ServerRoute } from '@angular/ssr';
export const serverRoutes: ServerRoute[] = [
  { path: '**', renderMode: RenderMode.Server },
];
```

---

## Interfaces / Contracts

- `THEME_COOKIE: InjectionToken<string | null>` — server-only value of the
  `ek_theme` cookie, `null` on the client.
- Cookie `ek_theme`: values `dark` | `light`; `Path=/; Max-Age=31536000;
  SameSite=Lax`; **no `Secure`** in dev (HTTP localhost) — add `Secure` only
  under HTTPS prod later.
- `environment.prod.ts`: `{ production: true, apiUrl: 'http://localhost:3000/api', googleClientId: '' }`.

---

## TransferState / double-fetch

`provideClientHydration()` automatically installs the HTTP `TransferState`
interceptor: HTTP responses fetched during server render are serialized into the
HTML and the client **reuses** them instead of re-fetching. No manual
`TransferState` wiring is needed for this slice. **Caveat**: this only covers
`HttpClient` requests issued during the initial server render; requests fired
later (post-hydration, e.g. on user interaction) hit NestJS normally — expected.
Cross-route double-fetch verification is in the deferred slice.

---

## Deployment / Run

- New build emits `dist/electric-kar-front/server/server.mjs`.
- `pnpm start:prod` → `node dist/electric-kar-front/server/server.mjs`.
- The SSR Node server listens on **port 4200** (Angular SSR default), NestJS
  stays on **3000**. They coexist: the SSR server renders pages and proxies
  nothing — it calls NestJS at `http://localhost:3000/api` for data.
- Restart workflow (per CLAUDE.local.md): the existing `fuser -k 3000/tcp` is for
  NestJS; the SSR server now needs its own free port (4200). Document both.

---

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Build | `ng build` produces server bundle; `ng add` deps present | CI build + assert `server.mjs` exists |
| SSR smoke | `/` returns meaningful HTML (not empty `app-root`); `<html class="dark">` when `Cookie: ek_theme=dark` | `curl` the running SSR server, grep markup |
| Hydration | No NG0500/hydration-mismatch console warnings on `/`; header badges stable | Headless browser load, assert clean console |
| Unit | Each guarded service constructs under a server `PLATFORM_ID` without throwing | `TestBed` with `{ provide: PLATFORM_ID, useValue: 'server' }` |
| Unit | `ThemeService.seed()` returns dark when `THEME_COOKIE='dark'` on server | `TestBed` providing `THEME_COOKIE` |

---

## Migration / Rollout

No data migration. Additive build target; the existing browser build still
works. Rollback = revert the branch (no schema or API changes). The cookie is
new and self-healing (absent cookie → light default).

---

## Trade-offs & Alternatives Considered

- **Cookie theme vs accept-flash**: cookie chosen — flash violates Locked
  Decision 2 and looks broken to dark-mode users on every first paint.
- **`isPlatformBrowser` guard vs `afterNextRender()` everywhere**: split by need —
  synchronous guard for signal *initial values* (auth/admin-auth), and
  `afterNextRender()` for state that drives hydration-visible UI (cart/favorites
  badge) or live DOM. Uniform `afterNextRender()` would force awkward async init
  on signals that need a value at construction.
- **`ng add` vs manual scaffold**: `ng add` chosen to avoid version drift with
  Angular 21 (Locked Decision 3); we only adjust generated files.
- **Explicit `THEME_COOKIE` token vs injecting Angular's `REQUEST`**: explicit
  token chosen — keeps `ThemeService` decoupled from the HTTP request shape and
  trivially unit-testable; `REQUEST` is the fallback if token wiring is awkward.

## Open Questions

- [ ] Does `ng add @angular/ssr` add `@angular/platform-server` as a direct dep,
  or must we list it explicitly (pnpm hides transitives)? Verify post-scaffold.
- [ ] Generated `server.ts` shape in Angular 21 (CommonEngine vs new
  `AngularNodeAppEngine`) determines the exact `providers` injection point for
  `THEME_COOKIE`; confirm against the actually-generated file.
