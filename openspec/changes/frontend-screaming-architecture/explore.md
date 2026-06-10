# Exploration — Screaming Architecture for the electrick-Kar Frontend

## Context

Angular 21.2 standalone + signals + Tailwind v4, SSR already enabled
(`app.config.server.ts`, `app.routes.server.ts` present). The `electric-kar-front/` app is an
e-commerce of automotive electrical parts (refacciones eléctricas automotrices, MX, CFDI/SAT).
Its `src/app` is organized by **Angular technical type** (`pages/`, `admin/`, `core/`,
`shared/`, `layout/`) and partly by **role** (`admin/` flattens 20 files). The top-level
structure screams "this is an Angular app", not "this is an automotive-parts store with a
storefront and a back-office". Goal: reorganize into a **channel-first Screaming Architecture**
so the root reveals the business domain — a purely **structural move**, no behavior changes.

## Current State — Layout Evidence

```
src/app/
  pages/        17 storefront components, each already in its own folder (folder-per-page),
                but specs are NOT co-located in a deeper folder (only cuenta has a .spec.ts,
                sitting flat beside its component). blog/ holds blog + articulo + blog.data.ts.
  admin/        FLAT: 20 .ts files (17 components + admin-layout + admin-login + placeholder)
                + admin.routes.ts, 5 .spec.ts beside them. This is the worst offender.
  core/         auth, http, storage, theme, models, guards, domain services. Cross-cutting.
  shared/       icon.component.ts, money.pipe.ts, product-card.component.ts. Cross-cutting.
  layout/       header.component.ts, footer.component.ts. Storefront-transversal.
  app.routes.ts          storefront routes inline (18 lazy loadComponent + 1 loadChildren)
  app.routes.server.ts   SSR render-mode map (already present)
```

**File census (src/app, excluding SSR/app shell):**

| Area | Components (non-spec) | Co-located specs |
|---|---|---|
| `pages/` (storefront) | 17 | 1 (`cuenta`) |
| `admin/` (back-office) | 17 + `admin-layout` + `admin-login` + `placeholder` | 5 |
| `layout/` | 2 | 0 |
| `shared/` | 3 (2 components + 1 pipe) | 0 |
| **Total moved surface** | **~40 components** | **6 specs** |

Whole-`src/app` totals: 63 non-spec `.ts`, 14 `.spec.ts` (the rest are `core/` services with
specs, which stay put).

## Why the Current Layout Hurts

- **The root screams the framework, not the business.** A new dev opening `src/app` sees
  `pages/`, `admin/`, `shared/` — Angular nouns. They cannot tell from the tree that this is a
  storefront + back-office for automotive parts, nor where "checkout" or "facturación CFDI"
  lives without grepping routes.
- **`admin/` is a flat dumping ground.** 20 sibling files mixing pedidos, productos, clientes,
  cupones, CFDI, auditoría, sesiones, reportes, dashboard, perfil — no domain grouping. Finding
  "the invoicing screen" means scanning 20 filenames.
- **Storefront and back-office are conflated at the root despite being different bounded
  contexts** — different users (customers vs staff), different guards (`adminAuthGuard` +
  `rolesGuard` SUPER/ADMIN/VENDEDOR/CONTADOR), different layout (`AdminLayoutComponent` vs
  `Header`/`Footer`). The current split (`pages/` vs `admin/`) encodes this accidentally, not
  intentionally.
- **Specs are inconsistently placed** — some flat beside components, most missing, none in a
  per-component folder.

## Target — Channel-First Screaming Architecture

Two bounded contexts at the root; domains live INSIDE each context:

```
src/app/
  tienda/                         # storefront bounded context
    catalogo/    -> home, tienda, producto, busqueda, destacados
    carrito/     -> carrito
    checkout/    -> checkout, confirmacion
    cuenta/      -> acceso, cuenta, recuperar, favoritos
    contenido/   -> blog (blog, articulo, blog.data), faq, nosotros, contacto
    tienda.routes.ts              # storefront routes, currently inline in app.routes.ts
  panel/                          # back-office bounded context
    pedidos/, catalogo/ (productos admin), clientes/ (clientes, usuarios),
    cupones/, facturacion/ (cfdi),
    operaciones/ (control, sesiones, auditoria, integraciones, reportes, menu, dashboard),
    perfil/, acceso/ (admin-login),
    admin-layout.component.ts, admin.routes.ts
  layout/   (header, footer)      # storefront-transversal — stays
  shared/   (icon, money.pipe, product-card)  # cross-cutting — stays
  core/     (auth, http, storage, theme, models, guards)  # cross-cutting — stays
```

Each component moves into its own folder with its `.spec.ts` co-located beside it. `core/` and
`shared/` are deliberately NOT domains — the Angular style guide endorses keeping cross-cutting
singletons and reusable presentational pieces in dedicated folders.

## Coupling / Move Mechanics — Evidence

- **No tsconfig path aliases.** `tsconfig.json` has no `paths`/`baseUrl`; `tsconfig.app.json`
  none either. **Every import is relative**, so every move recomputes depth by hand.
- **Lazy loading everywhere.** `app.routes.ts` = 18 `loadComponent(() => import('...'))` +
  `loadChildren` for admin; `admin.routes.ts` = 17 `loadComponent` imports. A wrong path after a
  move breaks lazy-loading at **runtime**, not compile time — TypeScript never resolves a dynamic
  `import('./x')` string at build.
- **Depth changes on the cross-cutting imports:**
  - Admin (current depth 1): `import ... from '../core/...'` / `'../shared/...'`. After moving to
    `panel/<domain>/<component>/`, the same import becomes `'../../../core/...'`.
  - Pages (current depth 2): `import ... from '../../core/...'`. After moving to
    `tienda/<domain>/<component>/` it becomes `'../../../core/...'`.
  - `app.routes.ts` / `admin.routes.ts` import paths all shift.
- **`placeholder.component.ts` is unused** (no references found) — candidate for deletion, but
  out of scope for a pure move (flag, don't act).
- **SSR route map** (`app.routes.server.ts`) references route paths, not component file paths, so
  it is unaffected by file moves — but worth a smoke-check.

## Approaches Compared

| Approach | Screams domain? | Move surface | Runtime-break risk | Effort |
|---|---|---|---|---|
| **A. Keep technical-type layout** (status quo) | No | 0 | None | None |
| **B. Domain-only flat** (e.g. `catalogo/`, `pedidos/` at root, no channel split) | Partial — mixes storefront + back-office domains as siblings | ~40 | Medium | Medium |
| **C. Channel-first, domains nested** (`tienda/` + `panel/`, cross-cutting kept) | Yes — root reveals two bounded contexts | ~40 | Medium (lazy paths) | Medium |

- **A** does nothing — rejected (this change exists to fix the screaming problem).
- **B** loses the bounded-context boundary: storefront `catalogo/` and back-office `catalogo/`
  (productos admin) collide as root siblings, and shared guards/layout stop having a clear home.
- **C** matches reality: storefront and back-office ARE different bounded contexts (users, roles,
  guards, layout). Domains nest inside each. Cross-cutting `core`/`shared`/`layout` stay separate.

## Recommendation — Approach C (Channel-First)

Reorganize into `tienda/` + `panel/` with domains nested, cross-cutting folders untouched, each
component in its own folder with co-located spec. Because the only risk vector is broken lazy
import paths (runtime, invisible to `tsc`), execute as **small staged moves**: move a domain,
fix that domain's import depths AND the route file's import paths in the same stage, then run
build + Vitest + a route smoke-check before the next stage. Migrate `panel/` first (self-contained
behind its own `admin.routes.ts` `loadChildren`, contained blast radius), then `tienda/`.

## Risks & Unknowns

1. **Lazy import paths break at runtime, not compile time** — a typo'd `import('./x')` passes
   `tsc` and fails only when the route loads. Highest-impact risk.
2. **No path aliases → manual depth recompute** on every moved file (`../core` → `../../../core`).
   Could introduce a `@core`/`@shared` alias to make moves depth-independent, but that is itself a
   change (open question, not assumed).
3. **Spec co-location** — moving specs into per-component folders changes their relative imports
   to the component-under-test and to test helpers.
4. **`tienda.routes.ts` extraction** — storefront routes currently live inline in `app.routes.ts`;
   extracting them is part of the move and changes `app.routes.ts` to a `loadChildren`/spread.
5. **SSR route map** keyed by route path, not file path — should be unaffected, but smoke-check
   after the storefront move.
6. **`placeholder.component.ts`** unused — leave in place (delete is a separate cleanup).

## Open Questions for Proposal Phase

1. **Introduce `@core` / `@shared` tsconfig path aliases** as part of this change to make the move
   depth-independent and harden future moves, or keep pure relative imports?
2. **Chained PRs** — ~40 components across two contexts almost certainly exceeds a 400-line review
   budget. Split into `panel/` PR then `tienda/` PR?
3. **`tienda.routes.ts` shape** — `loadChildren` from `app.routes.ts` vs spreading an exported
   `Routes` array?
4. **`placeholder.component.ts`** — delete now (it's unused) or leave for a separate cleanup?
