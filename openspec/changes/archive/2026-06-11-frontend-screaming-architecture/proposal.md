# Proposal — Screaming Architecture for the electrick-Kar Frontend

## Why

`electric-kar-front/src/app` is organized by **Angular technical type** (`pages/`, `admin/`,
`core/`, `shared/`, `layout/`) and partly by **role** (`admin/` flattens 20 files). Opening the
tree tells you "this is an Angular app" — it does NOT tell you this is an e-commerce of automotive
electrical parts (refacciones eléctricas automotrices, MX, CFDI/SAT) with a customer storefront
and a staff back-office. The structure screams the framework, not the business. Two concrete costs:

- **Navigability.** `admin/` is a flat dumping ground of 20 sibling files — pedidos, productos,
  clientes, cupones, CFDI, auditoría, sesiones, reportes, dashboard, perfil — with no domain
  grouping. Locating "the invoicing screen" means scanning filenames. A new dev cannot read intent
  from the directory tree.
- **Lost bounded-context boundary.** Storefront and back-office are genuinely different bounded
  contexts — different users (customers vs staff), different guards (`adminAuthGuard` +
  `rolesGuard` SUPER/ADMIN/VENDEDOR/CONTADOR), different layout (`AdminLayoutComponent` vs
  `Header`/`Footer`). The current `pages/` vs `admin/` split encodes this accidentally, not as a
  deliberate architectural statement.

The fix is structural, not behavioral: reorganize into a **channel-first Screaming Architecture**
so the root reveals the two bounded contexts and the domains inside each. No behavior, template, or
logic changes — a pure move.

## What Changes

Reorganize `src/app` into **two channel-first bounded contexts** (`tienda/` storefront, `panel/`
back-office) with **domains nested inside each context**, keeping cross-cutting folders
(`core/`, `shared/`, `layout/`) in place. Concretely:

- Move the 17 storefront components from `pages/` into `tienda/<domain>/<component>/`, grouped by
  domain (`catalogo`, `carrito`, `checkout`, `cuenta`, `contenido`).
- Move the 20 back-office files from the flat `admin/` into `panel/<domain>/<component>/`, grouped
  by domain (`pedidos`, `catalogo`, `clientes`, `cupones`, `facturacion`, `operaciones`, `perfil`,
  `acceso`), with `admin-layout.component.ts` and `admin.routes.ts` at the `panel/` root.
- Give **each component its own folder with its `.spec.ts` co-located** beside it.
- Extract the inline storefront routes from `app.routes.ts` into `tienda/tienda.routes.ts`.
- Update every relative import path (depth recompute) and every lazy `loadComponent` / `loadChildren`
  import string in the route files, in the **same stage** as each move.

### Target structure

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

## Locked Decisions

These are settled constraints, not open options:

1. **Channel-first root boundary.** Two bounded contexts at the root: `tienda/` (storefront) and
   `panel/` (back-office). Domains live INSIDE each context, never as root siblings. Rationale:
   storefront and back-office are genuinely different bounded contexts — different users, roles
   (`rolesGuard` SUPER/ADMIN/VENDEDOR/CONTADOR), layout, and guards.
2. **`core/` and `shared/` stay as cross-cutting folders — they are NOT domains.** The Angular
   style guide supports keeping cross-cutting singletons and reusable presentational pieces
   separate. `core/` = auth, http, storage, theme, models, guards. `shared/` = icon, money.pipe,
   product-card.
3. **`layout/` (header, footer) stays as storefront-transversal.**
4. **Each component moves into its own folder, with its `.spec.ts` co-located beside it.**
5. **Structural move ONLY.** No behavior changes, no template rewrites, no logic changes.
   Templates stay inline where they are — separating inline templates into `.html` is explicitly
   OUT OF SCOPE (a different change).
6. **Strict TDD is active.** The existing Vitest suite must stay GREEN after each migration stage.
7. **TypeScript path aliases are IN SCOPE.** `tsconfig.json` (root) MUST declare `baseUrl: "src"`
   and `paths` entries — at minimum `@core/*`, `@shared/*`, `@tienda/*`, `@panel/*` — so imports
   into cross-cutting roots and context roots are depth-independent. The alias resolution MUST work
   for BOTH the Angular build (`@angular/build:unit-test` → Vitest) AND production build
   (`ng build`). Rationale: the dominant runtime-break risk is deep relative imports breaking after
   a move; aliases convert them into stable, depth-insensitive references.

## In Scope

- Moving the 17 storefront components into `tienda/<domain>/<component>/` folders.
- Moving the 20 back-office files into `panel/<domain>/<component>/` folders, with
  `admin-layout.component.ts` + `admin.routes.ts` at the `panel/` root.
- Co-locating each component's `.spec.ts` in its component folder.
- Extracting inline storefront routes into `tienda/tienda.routes.ts` and rewiring `app.routes.ts`.
- Updating all relative import paths and all lazy `loadComponent` / `loadChildren` import strings
  (aliases make cross-cutting imports depth-independent after the alias stage).
- Adding `baseUrl` + `paths` to `tsconfig.json` for `@core/*`, `@shared/*`, `@tienda/*`,
  `@panel/*`; verifying alias resolution in both `ng build` and `pnpm --filter electric-kar-front test`.
- Keeping build + Vitest + route smoke-check GREEN after each stage.

## Out of Scope

- **No template extraction.** Inline templates stay inline; no `.html`/`.css` split.
- **No logic or behavior changes.** Components, services, guards behave identically before and after.
- **No `core/` / `shared/` reorganization** beyond leaving them in place.
- **No backend changes.** NestJS, Prisma, routes, DTOs untouched.
- **`placeholder.component.ts` cleanup.** It is currently unused; deleting it is a separate change,
  not part of this move.

## Impact

- **~40 components moved** across two bounded contexts: 17 storefront + 17 admin components +
  `admin-layout` + `admin-login` + 2 layout (stay) ... the moving surface is the storefront `pages/`
  (17) and the back-office `admin/` (20 files incl. layout/login/placeholder).
- **6 co-located specs** relocated alongside their components: `cuenta` (storefront) and `cfdi`,
  `clientes`, `dashboard`, `pedidos`, `reportes` (admin).
- **Route files rewritten:** `app.routes.ts` (18 lazy `loadComponent` + 1 `loadChildren`),
  new `tienda/tienda.routes.ts`, `admin.routes.ts` → `panel/admin.routes.ts` (17 lazy
  `loadComponent`). Every import string in these files changes.
- **Relative import depth shifts** on every moved file: admin imports go `../core` → `../../../core`,
  page imports go `../../core` → `../../../core`. **No tsconfig path aliases exist** (`tsconfig.json`
  / `tsconfig.app.json` have no `paths`/`baseUrl`), so every depth is recomputed by hand.
- **`core/` services and their specs are untouched** — they stay in `core/`.
- **SSR route map** (`app.routes.server.ts`) is keyed by route path, not file path, so it should be
  unaffected — verified by smoke-check after the storefront stage.
- **Test count:** 14 spec files in `src/app`; the 6 component specs move, the 8 `core`/app-shell
  specs stay. The whole suite must stay GREEN per stage.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Lazy import paths break at RUNTIME, not compile time.** Every route uses `loadComponent(() => import('...'))` / `loadChildren`; a wrong path passes `tsc` and fails only when the route loads. | Move in **small stages**; update the route file's import strings in the **same stage** as the move; run build + Vitest + a **route smoke-check** (navigate each moved route) after each stage. |
| **No tsconfig path aliases → manual depth recompute** on every moved file (`../core` → `../../../core`, `../../core` → `../../../core`). A single wrong `../` silently resolves to the wrong module or fails to resolve. | Recompute and verify each moved file's relative imports in the same stage; rely on `tsc` for static imports and the route smoke-check for lazy ones. Optionally introduce `@core`/`@shared` aliases (Open Question) to make moves depth-independent. |
| **Relative imports from moved components into `core`/`shared` change depth** (`../core` vs `../../../core`) and are easy to off-by-one. | Same-stage verification + build; per-component folder depth is uniform (`<context>/<domain>/<component>/` = 3 levels to `src/app`), so the rule is consistent and checkable. |
| **Spec co-location changes test imports** to the component-under-test and helpers. | Move spec with its component in the same stage; Vitest run per stage catches broken spec imports immediately. |
| **`tienda.routes.ts` extraction** rewires `app.routes.ts`. | Treat the extraction as its own stage; smoke-check all storefront routes after. |
| **SSR route map** might reference moved paths. | Confirmed keyed by route path, not file path; smoke-check `/`, `/producto/:id`, `/blog/:slug` server-render after the storefront stage. |
| **Large blast radius (~40 components) blows the 400-line review budget.** | Split into chained PRs: `panel/` first, `tienda/` second (First Slice). |

## First Slice / Delivery Boundary

Migrate **`panel/` first** — it is the worst offender (20 flat files) yet the most contained: it is
self-contained behind its own `admin.routes.ts` `loadChildren`, so the blast radius is isolated from
the storefront. Then migrate **`tienda/`** second.

**Slice 1 — `panel/` (back-office):**
- Move the 20 `admin/` files into `panel/<domain>/<component>/` folders per the target structure,
  with `admin-layout.component.ts` + `admin.routes.ts` at the `panel/` root.
- Co-locate the 5 admin specs.
- Recompute admin relative imports (`../core` → `../../../core`, `../shared` → `../../../shared`).
- Update `admin.routes.ts` import strings and the `loadChildren` path in `app.routes.ts`.
- Build + Vitest + smoke-check every `/admin/*` route.

**Slice 2 — `tienda/` (storefront):**
- Move the 17 `pages/` components into `tienda/<domain>/<component>/` folders.
- Co-locate the `cuenta` spec.
- Extract inline storefront routes into `tienda/tienda.routes.ts`; rewire `app.routes.ts`.
- Recompute page relative imports; verify SSR route map still resolves.
- Build + Vitest + smoke-check every storefront route incl. server-rendered `/producto/:id`,
  `/blog/:slug`.

This split keeps each PR within a reviewable budget, contains the runtime-break risk to one context
per PR, and lets the back-office (self-contained, lazy-loaded) land and stabilize before touching the
SEO-critical storefront. Given ~40 components, **chained PRs are recommended** (`panel/` → `tienda/`).

## Open Questions

1. ~~**`@core` / `@shared` tsconfig path aliases**~~ — **RESOLVED (Locked Decision 7):** aliases
   are IN SCOPE. `@core/*`, `@shared/*`, `@tienda/*`, `@panel/*` added to `tsconfig.json`.
2. **`tienda.routes.ts` shape** — `loadChildren` from `app.routes.ts`, or spread an exported `Routes`
   array inline? (Low risk; either preserves lazy boundaries.)
3. **`placeholder.component.ts`** — leave it (out of scope) or fold a one-line deletion into Slice 1
   since it's provably unused?

(Channel-first boundary, cross-cutting folder placement, spec co-location, structural-only scope, and
strict-TDD-per-stage are resolved by the Locked Decisions.)
