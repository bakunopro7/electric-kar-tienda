# Design: Screaming Architecture for the electrick-Kar Frontend

## Technical Approach

Reorganize `electric-kar-front/src/app` from a framework-type layout (`pages/`, `admin/`) into a
**channel-first Screaming Architecture**: two bounded-context roots (`tienda/` storefront, `panel/`
back-office) with domains nested inside each, and cross-cutting `core/`/`shared/`/`layout/` left in
place. This is a **pure structural move** — no template, logic, route-URL, guard, or render-mode
change.

The dominant runtime-break risk is that lazy routes use `loadComponent(() => import('...'))` /
`loadChildren`, and TypeScript NEVER resolves a dynamic `import()` string at type-check time — a
wrong path passes `tsc` and fails only when the route is navigated to. The whole approach is shaped
to neutralize that risk: introduce path aliases **first** (Slice 0) so every cross-cutting import
becomes depth-independent, then move each context in its own slice, updating that slice's route-file
import strings in the **same stage** as the move, and gate every slice on Vitest + production build +
a runtime smoke-check.

The guiding rule for every move: **a moved file's imports must resolve from its new location, and
the route file that lazy-loads it must point at the new path — both in the same commit.** Aliases
make the cross-cutting half of that rule a no-op (depth-independent); the route-string half is
verified by the smoke-check because the build cannot.

---

## ⚠️ Empirical Experiment Result (resolves the dominant open question)

The proposal's `path-aliases` spec flagged ONE unverified question for this phase:

> Does `@angular/build` resolve TypeScript `paths` aliases **inside dynamic `import()` strings** used
> in lazy routes? TypeScript does not resolve dynamic import strings at type-check time; the bundler
> (esbuild via `@angular/build`) must.

**This was tested empirically against the real app, then fully reverted.** Protocol: added
`baseUrl: "src"` + `paths` (including a throwaway `@pages/*` → `app/pages/*`) to `tsconfig.json`;
rewrote ONE lazy route (`path: ''` home) to `import('@pages/home/home.component')`; rewrote
`cuenta.component.spec.ts`'s three `../../core/*` imports to `@core/*`; ran a clean production build
and the full Vitest suite; reverted every touched file with `git checkout`.

| Question | Result | Evidence |
|---|---|---|
| **Aliases in DYNAMIC `import()` strings (lazy routes)?** | ✅ **YES** | Clean `pnpm build` succeeded and emitted the `home-component` lazy chunk as both `browser/*.js` and `server/*.mjs`. esbuild (via `@angular/build:application`) resolves `tsconfig` `paths` inside dynamic `import()` at bundle time. |
| **Aliases in STATIC imports (build)?** | ✅ **YES** | Same build compiled with the spec/component using `@core/*` — no `Cannot find module '@core/...'`. |
| **Aliases in Vitest (`@angular/build:unit-test`)?** | ✅ **YES, automatically** | `pnpm test` → **14 files / 39 tests passed**, including the rewritten `cuenta.component.spec.ts` importing `@core/cliente.service`, `@core/auth.service`, `@core/models`. **No standalone `vitest.config.ts` and no `resolve.alias` block were needed** — the unit-test builder reads `tsconfig.spec.json` (which extends root `tsconfig.json`) and configures Vitest's resolver from `paths` automatically. |

**Bottom line: aliases work EVERYWHERE — static imports, dynamic `import()` lazy-route strings, and
Vitest — with config in root `tsconfig.json` alone.** This unblocks the most aggressive (and
cleanest) approach: use aliases uniformly, including inside route files.

> Build note observed during the experiment: a *second* build over a dirty `dist/`/incremental cache
> exited non-zero with no diagnostic (a transient prerender artifact), while a clean build
> (`rm -rf dist .angular/cache` first) was deterministically green. Operational takeaway for
> `sdd-apply`: **run the slice gate build from a clean state** (or trust the clean run) rather than
> chaining incremental rebuilds, to avoid false-red gates.

---

## Architecture Decisions

### Decision: Aliases EVERYWHERE — including dynamic `import()` in route files

| Option | Tradeoff | Decision |
|---|---|---|
| Aliases for static imports AND dynamic `import()` route strings | Experiment proved esbuild resolves `paths` in dynamic imports → route strings become depth-independent and self-documenting (`@panel/operaciones/dashboard/...`); a moved component never forces a route-string edit driven by depth | **Chosen** |
| Aliases for static imports only; relative strings in route files | The proposal's fallback IF dynamic-import aliases failed — they did NOT fail, so this adds zero safety and reintroduces depth coupling in the exact files most prone to runtime breakage | Rejected |
| No aliases, pure relative everywhere | Every move recomputes `../` depth by hand on ~40 files; a single off-by-one silently mis-resolves | Rejected (also violates Locked Decision 7) |

**Rationale**: the experiment removed the only reason to hold back. Route files are where lazy
breakage lives; making their import strings alias-based (`@tienda/...`, `@panel/...`) decouples them
from physical depth, so moving a component within its context does not ripple a path edit into the
route file beyond the one intentional location change. Aliases are mandatory anyway per Locked
Decision 7 and the `path-aliases` spec's "All Moved Files Use Aliases for Cross-Cutting Imports"
requirement.

### Decision: Alias scheme and where it lives

| Alias | Maps to (`baseUrl: "src"`) | Purpose |
|---|---|---|
| `@core/*` | `app/core/*` | cross-cutting singletons (auth, http, storage, theme, models, guards) |
| `@shared/*` | `app/shared/*` | reusable presentational (icon, money.pipe, product-card) |
| `@layout/*` | `app/layout/*` | storefront-transversal header/footer |
| `@tienda/*` | `app/tienda/*` | storefront bounded-context root (incl. route-file lazy imports) |
| `@panel/*` | `app/panel/*` | back-office bounded-context root (incl. route-file lazy imports) |

Declared **once in root `electric-kar-front/tsconfig.json`** under `compilerOptions` with
`"baseUrl": "src"`. Both `tsconfig.app.json` (build) and `tsconfig.spec.json` (test) `extends` it, so
the build (`@angular/build:application`) and the test runner (`@angular/build:unit-test`) inherit the
aliases with **no per-config duplication**. This exactly matches the `path-aliases` spec.

> `@pages/*` was a throwaway used only to test against the pre-move tree; it is NOT part of the final
> config. `@tienda/*` / `@panel/*` point at the post-move folders.

### Decision: Vitest resolution — inherited, no extra config

| Option | Tradeoff | Decision |
|---|---|---|
| Rely on `@angular/build:unit-test` reading `tsconfig.spec.json` paths | Experiment proved it works (39 tests green with `@core/*`); zero new files | **Chosen** |
| Add a standalone `vitest.config.ts` with `resolve.alias` mirroring tsconfig | Redundant given the proof; a standalone config would *override* the builder's tsconfig wiring and become a second source of truth to keep in sync | Rejected |

**Rationale**: there is no standalone `vitest.config.ts` in the repo, and the unit-test builder
configures Vitest's resolver from `tsconfig.spec.json`. The `path-aliases` spec's conditional ("IF
the Vitest runner cannot resolve aliases… a `resolve.alias` block MUST be added") is **not
triggered** — the condition is empirically false.

### Decision: `tienda.routes.ts` shape — exported `Routes` lazy-loaded via `loadChildren`

| Option | Tradeoff | Decision |
|---|---|---|
| `tienda/tienda.routes.ts` exports `TIENDA_ROUTES`; `app.routes.ts` lazy-loads it via `loadChildren: () => import('@tienda/tienda.routes').then(m => m.TIENDA_ROUTES)` | **Mirrors how `admin.routes.ts` already works** (`loadChildren` → `ADMIN_ROUTES`); keeps one consistent pattern across both contexts; `app.routes.ts` shrinks to two `loadChildren` lines + the `**` wildcard; preserves the lazy boundary | **Chosen** |
| Export `TIENDA_ROUTES` and `...spread` it inline in `app.routes.ts` | Keeps storefront routes eagerly in the main route config (no lazy boundary for the route table itself); inconsistent with the admin pattern; `app.routes.ts` stays large | Rejected |
| Leave storefront routes inline in `app.routes.ts` | Violates the proposal's "extract into `tienda/tienda.routes.ts`" scope and `target-structure` spec | Rejected |

**Rationale**: the codebase already establishes the `loadChildren → EXPORTED_ROUTES` idiom for
`panel/`. Using the same shape for `tienda/` makes the root `app.routes.ts` a clean two-context map
and keeps the screaming-architecture intent legible at the routing layer too. **Route URLs are
unchanged**: the storefront routes move under a `loadChildren` with `path: ''`, so `/`, `/tienda`,
`/producto/:id`, `/blog/:slug`, etc. resolve identically.

> **One caveat to verify in apply**: storefront routes include `path: ''` (home) and `path: '**'`
> (redirect to `''`). The `**` wildcard MUST stay in the **parent** `app.routes.ts` AFTER the
> `loadChildren` entries (a child `**` inside a `loadChildren` group can shadow sibling contexts).
> Concretely: `app.routes.ts` becomes `[ { path: '', loadChildren: …TIENDA_ROUTES }, { path:
> 'admin', loadChildren: …ADMIN_ROUTES }, { path: '**', redirectTo: '' } ]`, and `TIENDA_ROUTES`
> contains the storefront paths WITHOUT the `**` redirect. This is a routing-shape detail, not a URL
> change.

### Decision: `placeholder.component.ts` — deferred, not moved, not deleted

Out of scope per the proposal and `target-structure` non-goals. It is provably unused (no
references). During Slice 1 it is **left in place** (it will end up as an orphan under the old
`admin/` path being emptied). Apply note: since Slice 1 empties `admin/`, the placeholder must either
(a) move to a neutral location, or (b) the change accepts a one-line deletion ONLY if the user
approves folding the cleanup in. **Default: leave it; do not delete.** If leaving it means `admin/`
is not fully empty, that is acceptable — the `target-structure` spec requires no *component* remains
under `admin/`, and `placeholder` is unrouted. Flag this to the user at apply time; do not silently
delete.

---

## Exact Component → Folder Mapping

`<context>/<domain>/<component>/` is the uniform shape: **every moved component sits exactly 3
levels below `src/app`**, so its cross-cutting imports are uniformly `@core/*` / `@shared/*` /
`@layout/*` (depth-independent) after aliasing.

### Storefront — `pages/` → `tienda/` (Slice 2, 17 components + 1 spec + route file)

| Current path (`src/app/pages/…`) | New path (`src/app/tienda/…`) | Spec |
|---|---|---|
| `home/home.component.ts` | `catalogo/home/home.component.ts` | — |
| `tienda/tienda.component.ts` | `catalogo/tienda/tienda.component.ts` | — |
| `producto/producto.component.ts` | `catalogo/producto/producto.component.ts` | — |
| `busqueda/busqueda.component.ts` | `catalogo/busqueda/busqueda.component.ts` | — |
| `destacados/destacados.component.ts` | `catalogo/destacados/destacados.component.ts` | — |
| `carrito/carrito.component.ts` | `carrito/carrito/carrito.component.ts` | — |
| `checkout/checkout.component.ts` | `checkout/checkout/checkout.component.ts` | — |
| `confirmacion/confirmacion.component.ts` | `checkout/confirmacion/confirmacion.component.ts` | — |
| `acceso/acceso.component.ts` | `cuenta/acceso/acceso.component.ts` | — |
| `cuenta/cuenta.component.ts` | `cuenta/cuenta/cuenta.component.ts` | `cuenta/cuenta/cuenta.component.spec.ts` |
| `recuperar/recuperar.component.ts` | `cuenta/recuperar/recuperar.component.ts` | — |
| `favoritos/favoritos.component.ts` | `cuenta/favoritos/favoritos.component.ts` | — |
| `blog/blog.component.ts` | `contenido/blog/blog.component.ts` | — |
| `blog/articulo.component.ts` | `contenido/articulo/articulo.component.ts` | — |
| `blog/blog.data.ts` | `contenido/blog/blog.data.ts` | — (data file, see note) |
| `faq/faq.component.ts` | `contenido/faq/faq.component.ts` | — |
| `nosotros/nosotros.component.ts` | `contenido/nosotros/nosotros.component.ts` | — |
| `contacto/contacto.component.ts` | `contenido/contacto/contacto.component.ts` | — |
| `app.routes.ts` (inline storefront) | `tienda/tienda.routes.ts` (new, exports `TIENDA_ROUTES`) | — |

> **`blog.data.ts` placement**: both `blog.component.ts` and `articulo.component.ts` import
> `blog.data`. The `target-structure` spec lists `blog`, `articulo`, `faq`, `nosotros`, `contacto`
> under `contenido/`. Keep `blog.data.ts` co-located with `blog/` (its primary owner) at
> `contenido/blog/blog.data.ts`. `articulo` (now `contenido/articulo/`) imports it via a relative
> intra-context path `../blog/blog.data` — an **intra-`tienda/` relative import, which the
> `path-aliases` spec explicitly permits** (only cross-cutting imports must be aliased). Alternative
> if the apply step prefers zero intra-domain coupling: introduce a `@tienda/contenido/blog/blog.data`
> alias-style import — also acceptable since `@tienda/*` resolves. Default: relative `../blog/blog.data`.

### Back-office — `admin/` → `panel/` (Slice 1, 17 components + layout + login + 5 specs + route file)

| Current path (`src/app/admin/…`) | New path (`src/app/panel/…`) | Spec |
|---|---|---|
| `dashboard.component.ts` | `operaciones/dashboard/dashboard.component.ts` | `…/dashboard.component.spec.ts` |
| `pedidos.component.ts` | `pedidos/pedidos/pedidos.component.ts` | `…/pedidos.component.spec.ts` |
| `productos.component.ts` | `catalogo/productos/productos.component.ts` | — |
| `clientes.component.ts` | `clientes/clientes/clientes.component.ts` | `…/clientes.component.spec.ts` |
| `usuarios.component.ts` | `clientes/usuarios/usuarios.component.ts` | — |
| `cupones.component.ts` | `cupones/cupones/cupones.component.ts` | — |
| `cfdi.component.ts` | `facturacion/cfdi/cfdi.component.ts` | `…/cfdi.component.spec.ts` |
| `control.component.ts` | `operaciones/control/control.component.ts` | — |
| `sesiones.component.ts` | `operaciones/sesiones/sesiones.component.ts` | — |
| `auditoria.component.ts` | `operaciones/auditoria/auditoria.component.ts` | — |
| `integraciones.component.ts` | `operaciones/integraciones/integraciones.component.ts` | — |
| `reportes.component.ts` | `operaciones/reportes/reportes.component.ts` | `…/reportes.component.spec.ts` |
| `menu.component.ts` | `operaciones/menu/menu.component.ts` | — |
| `perfil.component.ts` | `perfil/perfil/perfil.component.ts` | — |
| `admin-login.component.ts` | `acceso/admin-login/admin-login.component.ts` | — (has uncommitted `M` — preserve it) |
| `admin-layout.component.ts` | `admin-layout.component.ts` (panel root) | — |
| `admin.routes.ts` | `admin.routes.ts` (panel root) | — |
| `placeholder.component.ts` | **deferred — leave in `admin/`, do not move/delete** | — |

> **`admin-login.component.ts` has an uncommitted modification** (the pre-existing `M` in git
> status). `git mv` preserves working-tree content, so the modification rides along to
> `panel/acceso/admin-login/admin-login.component.ts`. Apply note: do the move via `git mv` so the
> edit is not lost.

> Each `MenuAdminComponent` class name etc. is **unchanged** — only file location and import paths
> move. No class renames (Locked Decision 5 / behavior-preservation spec).

---

## Migration Mechanic

| Step | Rule |
|---|---|
| Move a file | `git mv <old> <new>` — preserves history; one file (or its component+spec pair) at a time |
| Update its imports | After alias config (Slice 0), cross-cutting imports become `@core/*` / `@shared/*` / `@layout/*` — **depth-independent**, so the import lines change from `../core/...`/`../../core/...` to the alias form, NOT a depth recompute |
| Update the route string | In the SAME commit/slice, update the `loadComponent`/`loadChildren` `import('...')` string that lazy-loads the moved file to the new `@tienda/...` / `@panel/...` path |
| Intra-context relative imports | Permitted to stay relative (e.g. `articulo` → `../blog/blog.data`); recompute their `../` from the new location |

**Commit granularity (work-unit-commits thinking)**: commit **per domain**, not per file, because a
domain is the smallest unit that keeps the tree, its imports, and its route entries internally
consistent and independently reviewable. Each commit is a complete work unit: move the domain's
components + co-located specs, alias their cross-cutting imports, update the route file's lazy strings
for those components, and the slice gate (Vitest + build) stays green. Example Slice 1 commits:
`refactor(panel): move operaciones domain`, `refactor(panel): move facturacion (cfdi)`, etc., with a
final `refactor(panel): rewire admin.routes + app.routes loadChildren`. This keeps each commit a
reviewable work unit and the suite green commit-to-commit.

> Why aliases eliminate the proposal's "manual depth recompute" risk entirely for cross-cutting
> imports: with `@core/*` the import text is **identical regardless of how deep the file sits**, so a
> move cannot off-by-one a `../`. The only depth-sensitive imports left are intra-context ones (e.g.
> `articulo` → `blog.data`), a tiny and checkable surface.

---

## Slice Ordering

```
Slice 0 (aliases, no moves)  →  Slice 1 (panel/)  →  Slice 2 (tienda/)
   gate: build + Vitest          gate: + /admin smoke    gate: + storefront + SSR smoke
```

Stage ordering is **enforced** (green-tests-per-stage spec): a slice does not begin until all three
gates pass for the prior slice. `panel/` goes first — it is the worst offender (20 flat files) yet
the most contained (self-contained behind its own `admin.routes.ts` `loadChildren`), so its blast
radius is isolated from the SEO-critical storefront.

### Slice 0 — Aliases (no file moves)

- **Files touched**: `electric-kar-front/tsconfig.json` only — add `baseUrl: "src"` + the five
  `paths` entries (`@core`, `@shared`, `@layout`, `@tienda`, `@panel`).
- **Route-file edits**: none.
- **Optional verification import**: rewrite ONE existing cross-cutting import to its alias form (the
  `path-aliases` spec's "at least one component uses an `@core/*` import") to prove resolution; the
  experiment already proved this, so apply may add it or rely on the proof.
- **Green gate**: `pnpm --filter electric-kar-front build` exits 0 **and** `pnpm --filter
  electric-kar-front test` → 14 files / 39 tests green. No smoke-check (no moves yet).

### Slice 1 — `panel/` (back-office)

- **Files touched**: 17 admin components + `admin-layout.component.ts` + `admin-login.component.ts`
  (move + alias their `../core`/`../shared` imports → `@core/*`/`@shared/*`); 5 specs co-located;
  `admin.routes.ts` → `panel/admin.routes.ts`.
- **Route-file edits**:
  - `panel/admin.routes.ts`: every `import('./<x>.component')` → `import('@panel/<domain>/<x>/<x>.component')`;
    the static `import { adminAuthGuard, rolesGuard } from '../core/admin.guards'` → `@core/admin.guards`.
  - `app.routes.ts`: `loadChildren: () => import('./admin/admin.routes')` →
    `import('@panel/admin.routes').then((m) => m.ADMIN_ROUTES)`.
- **Green gate**: build green + Vitest 14/39 green + **`/admin/**` route smoke-check** (every admin
  lazy route loads its chunk without a runtime error). `placeholder.component.ts` left in place.

### Slice 2 — `tienda/` (storefront)

- **Files touched**: 17 page components + `blog.data.ts` (move + alias cross-cutting imports);
  `cuenta` spec co-located; **new** `tienda/tienda.routes.ts` exporting `TIENDA_ROUTES`.
- **Route-file edits**:
  - `tienda/tienda.routes.ts` (new): the 18 inline storefront `loadComponent` entries from
    `app.routes.ts`, each `import('@tienda/<domain>/<component>/<component>.component')`; **no `**`
    redirect inside** (stays in parent).
  - `app.routes.ts`: replace the 18 inline storefront entries with a single
    `{ path: '', loadChildren: () => import('@tienda/tienda.routes').then((m) => m.TIENDA_ROUTES) }`;
    keep the `admin` `loadChildren` and the trailing `{ path: '**', redirectTo: '' }`.
- **`app.routes.server.ts`**: **NOT modified** (keyed by route path, not file path —
  behavior-preservation spec).
- **Green gate**: build green + Vitest 14/39 green + **storefront route smoke-check** (every
  storefront route loads its chunk) + **SSR smoke-check** (`GET /` and `GET /producto/<slug>` return
  populated, non-empty `<app-root>` HTML, status 200).

---

## Smoke-Check Definition (Gate 3)

The build CANNOT validate dynamic `import()` strings, so a runtime check is mandatory after each move
slice. Two complementary, concrete checks:

### A. Lazy-chunk emission check (build-time proxy, fast)

After the slice build, assert the expected lazy chunk **names** were emitted. `@angular/build` names
lazy chunks after the component file (e.g. `dashboard-component`, `home-component` — observed in the
experiment output). A missing or wrongly-resolved dynamic import means the chunk is absent.

```bash
# After Slice 1 build — every admin route's chunk must exist:
rg -l 'dashboard-component|pedidos-component|cfdi-component|cupones-component|control-component' \
  dist/electric-kar-front/browser
# After Slice 2 build — storefront chunks:
rg -l 'home-component|tienda-component|producto-component|blog-component|articulo-component' \
  dist/electric-kar-front/browser
```

> This catches a mis-resolved alias/path at build time (the chunk simply won't be emitted), turning
> a runtime-only failure into a build-observable one. It is a proxy, not a substitute, for the live
> hit.

### B. Live route hit (authoritative, runtime)

Run the SSR server (`pnpm start:prod` over a fresh build, port 4200) and `curl` each route; a broken
lazy import yields a 500 or an empty/error `<app-root>`. For the SSR-rendered routes, assert the body
contains real content, not `<app-root></app-root>`:

```bash
# Slice 1: each admin route returns 200 and renders (admin shell is client-rendered but must not 500)
for r in /admin/login /admin /admin/pedidos /admin/productos /admin/clientes /admin/cupones \
         /admin/cfdi /admin/control /admin/reportes /admin/integraciones /admin/sesiones \
         /admin/auditoria /admin/menu /admin/usuarios /admin/perfil; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:4200$r"); echo "$code $r"
done   # expect all 200, none 500

# Slice 2: storefront routes + SSR populated-HTML assertion
for r in / /tienda /carrito /checkout /acceso /cuenta /favoritos /faq /nosotros /contacto \
         /destacados /busqueda /confirmacion /blog; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:4200$r"); echo "$code $r"
done
# SSR populated-HTML (no JS): body must NOT be an empty app-root
curl -s http://localhost:4200/ | rg -q 'app-root>.*\S' && echo "/ SSR populated"
curl -s "http://localhost:4200/producto/<known-slug>" | rg -q 'app-root>.*\S' && echo "producto SSR populated"
```

**Definition of pass**: every targeted route returns 200 (no 500 from a failed lazy import), and the
two SSR routes return non-empty `<app-root>` content. Check A is the cheap per-build gate; Check B is
the authoritative per-slice gate before merging.

---

## File Changes (summary)

| File | Slice | Action |
|---|---|---|
| `tsconfig.json` | 0 | Add `baseUrl: "src"` + 5 `paths` aliases |
| `src/app/admin/*.component.ts` (17) | 1 | `git mv` → `panel/<domain>/<component>/`; alias cross-cutting imports |
| `src/app/admin/admin-layout.component.ts` | 1 | `git mv` → `panel/admin-layout.component.ts`; alias imports |
| `src/app/admin/admin-login.component.ts` | 1 | `git mv` → `panel/acceso/admin-login/…` (preserves uncommitted `M`) |
| 5 admin `*.spec.ts` | 1 | `git mv` co-located with components; alias imports |
| `src/app/admin/admin.routes.ts` | 1 | `git mv` → `panel/admin.routes.ts`; rewrite lazy strings to `@panel/*`; static guard import to `@core/*` |
| `src/app/app.routes.ts` | 1 & 2 | S1: `loadChildren` → `@panel/admin.routes`. S2: replace inline storefront entries with `loadChildren` → `@tienda/tienda.routes` |
| `src/app/pages/*` (17 + `blog.data.ts`) | 2 | `git mv` → `tienda/<domain>/<component>/`; alias cross-cutting imports; intra-context relatives recomputed |
| `cuenta.component.spec.ts` | 2 | `git mv` co-located; alias imports |
| `src/app/tienda/tienda.routes.ts` | 2 | **Create** — exports `TIENDA_ROUTES` with `@tienda/*` lazy strings |
| `src/app/placeholder.component.ts` | — | **Deferred** — not moved, not deleted |
| `src/app/app.routes.server.ts` | — | **Unchanged** (keyed by route path) |
| `core/`, `shared/`, `layout/` | — | **Unchanged** (cross-cutting; only their consumers' import paths change) |

---

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Aliases (build) | `@core/*`/`@shared/*`/`@layout/*`/`@tienda/*`/`@panel/*` resolve in `ng build`, incl. dynamic `import()` route strings | `pnpm build` exit 0 + expected lazy chunk names emitted (proven in experiment) |
| Aliases (test) | Same aliases resolve under `@angular/build:unit-test` (Vitest) | `pnpm test` → 14 files / 39 tests green (proven in experiment) |
| Behavior preservation | Moved component file diff is import-path-only; no `templateUrl` introduced; `app.routes.server.ts` byte-unchanged | code review of slice diff |
| Route URLs | Every pre-existing URL still resolves to the same component | smoke-check Check B per slice |
| Lazy chunks | Each lazy route emits + loads its chunk (the runtime-only risk) | smoke-check Check A (build) + Check B (live hit) per move slice |
| SSR | `/` and `/producto/<slug>` server-render populated HTML, 200 | `curl` the SSR server, assert non-empty `<app-root>` |
| Test count invariant | 14 spec files remain after each move (no spec lost) | `pnpm test` reports 14 files every slice |

---

## Migration / Rollout

No data migration, no API change, no schema change. Each slice is independently deployable
(green-tests-per-stage spec): merging Slice 1 leaves `panel/` migrated and `pages/` still serving the
storefront until Slice 2 lands. **Rollback = revert the slice branch** — there is no runtime state to
unwind. Chained PRs recommended (`panel/` → `tienda/`) to stay within the 400-line review budget; the
slice boundary IS the PR boundary.

---

## Trade-offs & Alternatives Considered

- **Aliases in dynamic imports vs relative route strings**: aliases chosen — the experiment proved
  esbuild resolves them, removing the only reason (the proposal's fallback) to keep route strings
  relative. Relative strings would reintroduce depth coupling in the highest-risk files.
- **`tienda.routes.ts` `loadChildren` vs inline spread**: `loadChildren` chosen to mirror the
  existing `admin.routes.ts` pattern and keep `app.routes.ts` a clean two-context map.
- **Per-domain vs per-file commits**: per-domain — the smallest unit that keeps tree + imports +
  route entries internally consistent and green commit-to-commit.
- **`placeholder.component.ts` delete-now vs defer**: defer — proposal/`target-structure` put cleanup
  out of scope; deleting it is a separate change. Flag to user; do not silently delete.
- **Standalone `vitest.config.ts` vs inherited tsconfig paths**: inherited — proven sufficient; a
  standalone config would become a second alias source of truth to keep in sync.

## Open Questions

- [ ] `placeholder.component.ts`: confirm with the user whether to fold its one-line deletion into
  Slice 1 (it is provably unused) or leave it (default). Resolving this avoids an orphan file under a
  near-empty `admin/`.
- [ ] `blog.data.ts` import style for `articulo` (relative `../blog/blog.data` vs `@tienda/...`):
  both resolve; default relative. Confirm at apply if a no-intra-relative-imports policy is desired.
