# Screaming Architecture — Implementation Tasks

Reorganize `electric-kar-front/src/app` from a framework-type layout (`pages/`, `admin/`) into a
channel-first Screaming Architecture: `tienda/` (storefront) and `panel/` (back-office) as bounded
context roots with domains nested inside each.

All commands run from the repo root unless noted. Invoke pnpm as
`PATH="$HOME/.local/bin:$PATH" pnpm`.

**Slice ordering is strictly sequential.** A slice does not begin until all its gates pass.
Each domain within Slices 1 and 2 is its own commit (`refactor(<context>): move <domain> domain`).

---

## Decision Tasks (resolve before or at the start of apply)

- [x] **D-01** · Confirm with the user whether `placeholder.component.ts` should be deleted in
  Slice 1 (it is provably unused — no references) or left in place under a near-empty `admin/`.
  **Default: leave it.** Record the decision here before Slice 1 begins.
  - Spec: `target-structure/spec.md` § Back-Office Context Layout
  - Design: § Decision: `placeholder.component.ts` — deferred, not moved, not deleted

- [x] **D-02** · Confirm the `blog.data.ts` intra-context import style for `articulo.component.ts`:
  relative `../blog/blog.data` (default, permitted by `path-aliases` spec) OR alias
  `@tienda/contenido/blog/blog.data`. Record choice before Slice 2 begins.
  - Spec: `path-aliases/spec.md` § All Moved Files Use Aliases for Cross-Cutting Imports
  - Design: § `blog.data.ts` placement note

---

## Slice 0 — Path Aliases (no file moves)

> Gate: `pnpm --filter electric-kar-front build` exits 0 **and** `pnpm --filter electric-kar-front test` passes (14 files / 39 tests green).

- [x] **S0-01** · Add `"baseUrl": "src"` and five `paths` entries to
  `electric-kar-front/tsconfig.json` under `compilerOptions`:

  ```json
  "baseUrl": "src",
  "paths": {
    "@core/*":   ["app/core/*"],
    "@shared/*": ["app/shared/*"],
    "@layout/*": ["app/layout/*"],
    "@tienda/*": ["app/tienda/*"],
    "@panel/*":  ["app/panel/*"]
  }
  ```

  No other file is touched in this task.
  - Spec: `path-aliases/spec.md` § baseUrl and Paths Declared in tsconfig.json
  - File: `electric-kar-front/tsconfig.json`

- [x] **S0-02** · (Optional verification import) Update one cross-cutting import in an existing
  file to alias form (e.g. `@core/auth.service`) to prove resolution end-to-end.
  The design's empirical experiment already proved this works; apply may rely on that proof
  and skip this task, but a live token is useful insurance. **Skipped — relying on the
  empirical experiment proof recorded in design.md (14/39 tests passed with @core/* imports).**
  - Spec: `path-aliases/spec.md` § Angular Production Build Resolves Aliases (requires
    "at least one component uses an `@core/*` import")

- [x] **S0-03** · **Slice 0 Green Gate** — run from a clean state:

  ```bash
  cd electric-kar-front && rm -rf dist .angular/cache
  PATH="$HOME/.local/bin:$PATH" pnpm --filter electric-kar-front build
  # exit code MUST be 0

  PATH="$HOME/.local/bin:$PATH" pnpm --filter electric-kar-front test
  # MUST report 14 spec files, 39 tests, 0 failures
  ```

  Do NOT proceed to Slice 1 until both commands pass.
  - Spec: `green-tests-per-stage/spec.md` § Gate 1 + Gate 2 (Slice 0)

- [ ] **S0-04** · Commit Slice 0:

  ```
  refactor(aliases): add tsconfig baseUrl and @core/@shared/@layout/@tienda/@panel paths
  ```

  One commit. No file moves.

---

## Slice 1 — `panel/` Back-Office

> Gate: build green + Vitest 14/39 green + `/admin/**` route smoke-check (Check A chunk emission + Check B curl).
> Each domain = one commit. Commit the route-file update last, after all domain moves.

### Pre-move setup

- [x] **S1-01** · Create the `panel/` directory tree (empty folders):

  ```
  src/app/panel/operaciones/dashboard/
  src/app/panel/operaciones/control/
  src/app/panel/operaciones/sesiones/
  src/app/panel/operaciones/auditoria/
  src/app/panel/operaciones/integraciones/
  src/app/panel/operaciones/reportes/
  src/app/panel/operaciones/menu/
  src/app/panel/pedidos/pedidos/
  src/app/panel/catalogo/productos/
  src/app/panel/clientes/clientes/
  src/app/panel/clientes/usuarios/
  src/app/panel/cupones/cupones/
  src/app/panel/facturacion/cfdi/
  src/app/panel/perfil/perfil/
  src/app/panel/acceso/admin-login/
  ```

### Domain: `operaciones/` (dashboard, control, sesiones, auditoria, integraciones, reportes, menu)

- [x] **S1-02** · Move `operaciones/` components and co-located spec:

  ```bash
  git mv src/app/admin/dashboard.component.ts \
         src/app/panel/operaciones/dashboard/dashboard.component.ts
  git mv src/app/admin/dashboard.component.spec.ts \
         src/app/panel/operaciones/dashboard/dashboard.component.spec.ts
  git mv src/app/admin/reportes.component.ts \
         src/app/panel/operaciones/reportes/reportes.component.ts
  git mv src/app/admin/reportes.component.spec.ts \
         src/app/panel/operaciones/reportes/reportes.component.spec.ts
  git mv src/app/admin/control.component.ts \
         src/app/panel/operaciones/control/control.component.ts
  git mv src/app/admin/sesiones.component.ts \
         src/app/panel/operaciones/sesiones/sesiones.component.ts
  git mv src/app/admin/auditoria.component.ts \
         src/app/panel/operaciones/auditoria/auditoria.component.ts
  git mv src/app/admin/integraciones.component.ts \
         src/app/panel/operaciones/integraciones/integraciones.component.ts
  git mv src/app/admin/menu.component.ts \
         src/app/panel/operaciones/menu/menu.component.ts
  ```

  - Spec: `target-structure/spec.md` § Back-Office Context Layout + Spec Co-Location

- [x] **S1-03** · Update cross-cutting imports in all 9 moved `operaciones/` files from relative
  (`../core/`, `../../core/`, `../shared/`) to alias form (`@core/*`, `@shared/*`).
  No relative import into `core/`, `shared/`, or `layout/` may remain.
  - Spec: `path-aliases/spec.md` § All Moved Files Use Aliases for Cross-Cutting Imports

- [x] **S1-04** · Commit `operaciones/` domain:

  ```
  refactor(panel): move operaciones domain (dashboard, control, sesiones, auditoria, integraciones, reportes, menu)
  ```

### Domain: `pedidos/`

- [x] **S1-05** · Move `pedidos.component.ts` + spec:

  ```bash
  git mv src/app/admin/pedidos.component.ts \
         src/app/panel/pedidos/pedidos/pedidos.component.ts
  git mv src/app/admin/pedidos.component.spec.ts \
         src/app/panel/pedidos/pedidos/pedidos.component.spec.ts
  ```

- [x] **S1-06** · Update cross-cutting imports in the two moved files to alias form.

- [x] **S1-07** · Commit `pedidos/` domain:

  ```
  refactor(panel): move pedidos domain
  ```

### Domain: `catalogo/` (admin)

- [x] **S1-08** · Move `productos.component.ts`:

  ```bash
  git mv src/app/admin/productos.component.ts \
         src/app/panel/catalogo/productos/productos.component.ts
  ```

- [x] **S1-09** · Update cross-cutting imports to alias form.

- [x] **S1-10** · Commit `catalogo/` domain:

  ```
  refactor(panel): move catalogo domain (admin productos)
  ```

### Domain: `clientes/` (clientes + usuarios)

- [x] **S1-11** · Move `clientes.component.ts` + spec and `usuarios.component.ts`:

  ```bash
  git mv src/app/admin/clientes.component.ts \
         src/app/panel/clientes/clientes/clientes.component.ts
  git mv src/app/admin/clientes.component.spec.ts \
         src/app/panel/clientes/clientes/clientes.component.spec.ts
  git mv src/app/admin/usuarios.component.ts \
         src/app/panel/clientes/usuarios/usuarios.component.ts
  ```

- [x] **S1-12** · Update cross-cutting imports to alias form.

- [x] **S1-13** · Commit `clientes/` domain:

  ```
  refactor(panel): move clientes domain (clientes, usuarios)
  ```

### Domain: `cupones/`

- [x] **S1-14** · Move `cupones.component.ts`:

  ```bash
  git mv src/app/admin/cupones.component.ts \
         src/app/panel/cupones/cupones/cupones.component.ts
  ```

- [x] **S1-15** · Update cross-cutting imports to alias form.

- [x] **S1-16** · Commit `cupones/` domain:

  ```
  refactor(panel): move cupones domain
  ```

### Domain: `facturacion/` (cfdi)

- [x] **S1-17** · Move `cfdi.component.ts` + spec:

  ```bash
  git mv src/app/admin/cfdi.component.ts \
         src/app/panel/facturacion/cfdi/cfdi.component.ts
  git mv src/app/admin/cfdi.component.spec.ts \
         src/app/panel/facturacion/cfdi/cfdi.component.spec.ts
  ```

- [x] **S1-18** · Update cross-cutting imports to alias form.

- [x] **S1-19** · Commit `facturacion/` domain:

  ```
  refactor(panel): move facturacion domain (cfdi)
  ```

### Domain: `perfil/`

- [x] **S1-20** · Move `perfil.component.ts`:

  ```bash
  git mv src/app/admin/perfil.component.ts \
         src/app/panel/perfil/perfil/perfil.component.ts
  ```

- [x] **S1-21** · Update cross-cutting imports to alias form.

- [x] **S1-22** · Commit `perfil/` domain:

  ```
  refactor(panel): move perfil domain
  ```

### Domain: `acceso/` (admin-login)

- [x] **S1-23** · Move `admin-login.component.ts` (note: this file has an uncommitted modification —
  `git mv` preserves the working-tree content, so the modification rides along):

  ```bash
  git mv src/app/admin/admin-login.component.ts \
         src/app/panel/acceso/admin-login/admin-login.component.ts
  ```

  Verify after the move that the working-tree edit is still present (run
  `git diff HEAD -- src/app/panel/acceso/admin-login/admin-login.component.ts`).
  - Design: § `admin-login.component.ts` uncommitted-M note

- [x] **S1-24** · Update cross-cutting imports to alias form.

- [x] **S1-25** · Commit `acceso/` domain:

  ```
  refactor(panel): move acceso domain (admin-login, preserves uncommitted edit)
  ```

### Panel root files (admin-layout + placeholder decision)

- [x] **S1-26** · Move `admin-layout.component.ts` to the `panel/` root:

  ```bash
  git mv src/app/admin/admin-layout.component.ts \
         src/app/panel/admin-layout.component.ts
  ```

  Update cross-cutting imports to alias form.

- [x] **S1-27** · Apply D-01 decision for `placeholder.component.ts`:
  - If decision = **leave**: do nothing. Verify `admin/` now contains only
    `placeholder.component.ts` (all other files have moved).
  - If decision = **delete**: `git rm src/app/admin/placeholder.component.ts`.
  - Spec: `target-structure/spec.md` § Back-Office Context Layout

### Route file rewire

- [x] **S1-28** · Move `admin.routes.ts` to the `panel/` root:

  ```bash
  git mv src/app/admin/admin.routes.ts \
         src/app/panel/admin.routes.ts
  ```

- [x] **S1-29** · In `panel/admin.routes.ts`, rewrite all `loadComponent(() => import(...))` strings
  from relative `'./<x>.component'` to alias form `'@panel/<domain>/<x>/<x>.component'`.
  Also rewrite the static `import { adminAuthGuard, rolesGuard }` from `'../core/admin.guards'`
  to `'@core/admin.guards'`.
  - Spec: `path-aliases/spec.md` § Lazy loadComponent / loadChildren Strings Updated
  - Design: § Slice 1 — Route-file edits

- [x] **S1-30** · In `src/app/app.routes.ts`, update the `panel` `loadChildren` entry:

  ```ts
  // Before
  loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES)
  // After
  loadChildren: () => import('@panel/admin.routes').then((m) => m.ADMIN_ROUTES)
  ```

  - Spec: `path-aliases/spec.md` § Lazy loadComponent / loadChildren Strings Updated
  - Design: § Slice 1 — Route-file edits

- [x] **S1-31** · Commit route file rewire:

  ```
  refactor(panel): rewire admin.routes and app.routes loadChildren to @panel alias
  ```

### Slice 1 Green Gate

- [x] **S1-32** · Run Vitest suite:

  ```bash
  PATH="$HOME/.local/bin:$PATH" pnpm --filter electric-kar-front test
  # MUST report 14 spec files (incl. 5 now under panel/), 0 failures
  ```

  - Spec: `green-tests-per-stage/spec.md` § Gate 1 (Slice 1)

- [x] **S1-33** · Run production build from a clean state:

  ```bash
  cd electric-kar-front && rm -rf dist .angular/cache
  PATH="$HOME/.local/bin:$PATH" pnpm --filter electric-kar-front build
  # exit code MUST be 0; browser/ and server/ bundles MUST be present
  ```

  - Spec: `green-tests-per-stage/spec.md` § Gate 2 (Slice 1)

- [x] **S1-34** · Check A — assert admin lazy-chunk names are emitted in the build output:

  ```bash
  rg -l 'dashboard-component|pedidos-component|cfdi-component|cupones-component|control-component' \
    electric-kar-front/dist/electric-kar-front/browser
  # All five chunk names MUST appear; any missing chunk means a mis-resolved @panel alias
  ```

  - Spec: `green-tests-per-stage/spec.md` § Gate 3 + Design § Smoke-Check A

- [x] **S1-35** · Check B — start the SSR server and curl every admin route:

  ```bash
  fuser -k 4200/tcp 2>/dev/null || true
  node electric-kar-front/dist/electric-kar-front/server/server.mjs &
  sleep 2

  for r in /admin/login /admin /admin/pedidos /admin/productos /admin/clientes /admin/cupones \
           /admin/cfdi /admin/control /admin/reportes /admin/integraciones /admin/sesiones \
           /admin/auditoria /admin/menu /admin/usuarios /admin/perfil; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:4200$r")
    echo "$code $r"
  done
  # Every route MUST return 200; none may return 500
  ```

  Kill the server after verification (`fuser -k 4200/tcp`).
  - Spec: `green-tests-per-stage/spec.md` § Gate 3 + Design § Smoke-Check B

  Do NOT proceed to Slice 2 until S1-32 through S1-35 all pass.

---

## Slice 2 — `tienda/` Storefront

> Gate: build green + Vitest 14/39 green + storefront route smoke-check (Check A + Check B) + SSR populated-HTML check.
> Each domain = one commit. Create `tienda.routes.ts` and rewire `app.routes.ts` in the final commit.

### Pre-move setup

- [x] **S2-01** · Create the `tienda/` directory tree (empty folders):

  ```
  src/app/tienda/catalogo/home/
  src/app/tienda/catalogo/tienda/
  src/app/tienda/catalogo/producto/
  src/app/tienda/catalogo/busqueda/
  src/app/tienda/catalogo/destacados/
  src/app/tienda/carrito/carrito/
  src/app/tienda/checkout/checkout/
  src/app/tienda/checkout/confirmacion/
  src/app/tienda/cuenta/acceso/
  src/app/tienda/cuenta/cuenta/
  src/app/tienda/cuenta/recuperar/
  src/app/tienda/cuenta/favoritos/
  src/app/tienda/contenido/blog/
  src/app/tienda/contenido/articulo/
  src/app/tienda/contenido/faq/
  src/app/tienda/contenido/nosotros/
  src/app/tienda/contenido/contacto/
  ```

### Domain: `catalogo/` (storefront — home, tienda, producto, busqueda, destacados)

- [x] **S2-02** · Move `catalogo/` components:

  ```bash
  git mv src/app/pages/home/home.component.ts \
         src/app/tienda/catalogo/home/home.component.ts
  git mv src/app/pages/tienda/tienda.component.ts \
         src/app/tienda/catalogo/tienda/tienda.component.ts
  git mv src/app/pages/producto/producto.component.ts \
         src/app/tienda/catalogo/producto/producto.component.ts
  git mv src/app/pages/busqueda/busqueda.component.ts \
         src/app/tienda/catalogo/busqueda/busqueda.component.ts
  git mv src/app/pages/destacados/destacados.component.ts \
         src/app/tienda/catalogo/destacados/destacados.component.ts
  ```

  - Spec: `target-structure/spec.md` § Storefront Context Layout

- [x] **S2-03** · Update cross-cutting imports in all 5 moved `catalogo/` files to alias form
  (`@core/*`, `@shared/*`, `@layout/*`). No relative import into `core/`, `shared/`, or `layout/`
  may remain.
  - Spec: `path-aliases/spec.md` § All Moved Files Use Aliases for Cross-Cutting Imports

- [x] **S2-04** · Commit `catalogo/` domain:

  ```
  refactor(tienda): move catalogo domain (home, tienda, producto, busqueda, destacados)
  ```

### Domain: `carrito/`

- [x] **S2-05** · Move `carrito.component.ts`:

  ```bash
  git mv src/app/pages/carrito/carrito.component.ts \
         src/app/tienda/carrito/carrito/carrito.component.ts
  ```

- [x] **S2-06** · Update cross-cutting imports to alias form.

- [x] **S2-07** · Commit `carrito/` domain:

  ```
  refactor(tienda): move carrito domain
  ```

### Domain: `checkout/` (checkout + confirmacion)

- [x] **S2-08** · Move `checkout/` components:

  ```bash
  git mv src/app/pages/checkout/checkout.component.ts \
         src/app/tienda/checkout/checkout/checkout.component.ts
  git mv src/app/pages/confirmacion/confirmacion.component.ts \
         src/app/tienda/checkout/confirmacion/confirmacion.component.ts
  ```

- [x] **S2-09** · Update cross-cutting imports to alias form.

- [x] **S2-10** · Commit `checkout/` domain:

  ```
  refactor(tienda): move checkout domain (checkout, confirmacion)
  ```

### Domain: `cuenta/` (acceso, cuenta+spec, recuperar, favoritos)

- [x] **S2-11** · Move `cuenta/` components and co-located spec:

  ```bash
  git mv src/app/pages/acceso/acceso.component.ts \
         src/app/tienda/cuenta/acceso/acceso.component.ts
  git mv src/app/pages/cuenta/cuenta.component.ts \
         src/app/tienda/cuenta/cuenta/cuenta.component.ts
  git mv src/app/pages/cuenta/cuenta.component.spec.ts \
         src/app/tienda/cuenta/cuenta/cuenta.component.spec.ts
  git mv src/app/pages/recuperar/recuperar.component.ts \
         src/app/tienda/cuenta/recuperar/recuperar.component.ts
  git mv src/app/pages/favoritos/favoritos.component.ts \
         src/app/tienda/cuenta/favoritos/favoritos.component.ts
  ```

  - Spec: `target-structure/spec.md` § Spec Co-Location (Slice 2)

- [x] **S2-12** · Update cross-cutting imports to alias form in all 5 moved files
  (including `cuenta.component.spec.ts`).

- [x] **S2-13** · Commit `cuenta/` domain:

  ```
  refactor(tienda): move cuenta domain (acceso, cuenta, recuperar, favoritos) + co-locate spec
  ```

### Domain: `contenido/` (blog + blog.data, articulo, faq, nosotros, contacto)

- [x] **S2-14** · Move `contenido/` components and data file:

  ```bash
  git mv src/app/pages/blog/blog.component.ts \
         src/app/tienda/contenido/blog/blog.component.ts
  git mv src/app/pages/blog/blog.data.ts \
         src/app/tienda/contenido/blog/blog.data.ts
  git mv src/app/pages/blog/articulo.component.ts \
         src/app/tienda/contenido/articulo/articulo.component.ts
  git mv src/app/pages/faq/faq.component.ts \
         src/app/tienda/contenido/faq/faq.component.ts
  git mv src/app/pages/nosotros/nosotros.component.ts \
         src/app/tienda/contenido/nosotros/nosotros.component.ts
  git mv src/app/pages/contacto/contacto.component.ts \
         src/app/tienda/contenido/contacto/contacto.component.ts
  ```

  - Spec: `target-structure/spec.md` § Storefront Context Layout

- [x] **S2-15** · Update cross-cutting imports to alias form in all 6 moved files.
  For `articulo.component.ts`: apply the D-02 decision for the `blog.data` import
  (relative `../blog/blog.data` OR `@tienda/contenido/blog/blog.data`).
  - Spec: `path-aliases/spec.md` § All Moved Files Use Aliases for Cross-Cutting Imports
  - Design: § `blog.data.ts` placement note

- [x] **S2-16** · Commit `contenido/` domain:

  ```
  refactor(tienda): move contenido domain (blog, articulo, faq, nosotros, contacto)
  ```

### Route file extraction and app.routes.ts rewire

- [x] **S2-17** · Create `src/app/tienda/tienda.routes.ts` exporting `TIENDA_ROUTES`.
  Extract the 18 inline storefront `loadComponent` entries from `src/app/app.routes.ts`.
  Each entry's `import('...')` string MUST use `@tienda/<domain>/<component>/<component>.component`.
  Do NOT include the `**` wildcard redirect inside `TIENDA_ROUTES` — it stays in `app.routes.ts`.

  Shape (matches the `admin.routes.ts` idiom):

  ```ts
  import { Routes } from '@angular/router';

  export const TIENDA_ROUTES: Routes = [
    { path: '', loadComponent: () => import('@tienda/catalogo/home/home.component').then((m) => m.HomeComponent) },
    // … all 17 storefront loadComponent entries …
  ];
  ```

  - Spec: `target-structure/spec.md` § Storefront Context Layout (tienda.routes.ts MUST exist)
  - Spec: `path-aliases/spec.md` § Lazy loadComponent / loadChildren Strings Updated
  - Design: § Decision: `tienda.routes.ts` shape

- [x] **S2-18** · Rewire `src/app/app.routes.ts`:
  - Replace the 18 inline storefront `loadComponent` entries with a single `loadChildren` entry:
    ```ts
    { path: '', loadChildren: () => import('@tienda/tienda.routes').then((m) => m.TIENDA_ROUTES) }
    ```
  - Keep the `admin` `loadChildren` entry (already updated in S1-30).
  - Keep the trailing `{ path: '**', redirectTo: '' }` in `app.routes.ts` (NOT inside `TIENDA_ROUTES`).
  - Final shape: `[ tienda loadChildren, admin loadChildren, ** wildcard ]`.
  - Do NOT modify `src/app/app.routes.server.ts` (keyed by route path, not file path).
  - Spec: `behavior-preservation/spec.md` (route URLs unchanged)
  - Design: § Decision: `tienda.routes.ts` shape — `**` wildcard caveat

- [x] **S2-19** · Commit route extraction and rewire:

  ```
  refactor(tienda): extract tienda.routes.ts and rewire app.routes loadChildren
  ```

### Slice 2 Green Gate

- [x] **S2-20** · Run Vitest suite:

  ```bash
  PATH="$HOME/.local/bin:$PATH" pnpm --filter electric-kar-front test
  # MUST report 14 spec files (cuenta spec now under tienda/cuenta/cuenta/), 0 failures
  ```

  - Spec: `green-tests-per-stage/spec.md` § Gate 1 (Slice 2)

- [x] **S2-21** · Run production build from a clean state:

  ```bash
  cd electric-kar-front && rm -rf dist .angular/cache
  PATH="$HOME/.local/bin:$PATH" pnpm --filter electric-kar-front build
  # exit code MUST be 0; browser/ and server/ bundles MUST be present
  ```

  - Spec: `green-tests-per-stage/spec.md` § Gate 2 (Slice 2)

- [x] **S2-22** · Check A — assert storefront lazy-chunk names are emitted:

  ```bash
  rg -l 'home-component|tienda-component|producto-component|blog-component|articulo-component' \
    electric-kar-front/dist/electric-kar-front/browser
  # All five chunk names MUST appear
  ```

  - Spec: `green-tests-per-stage/spec.md` § Gate 3 + Design § Smoke-Check A

- [x] **S2-23** · Check B — start the SSR server and curl every storefront route:

  ```bash
  fuser -k 4200/tcp 2>/dev/null || true
  node electric-kar-front/dist/electric-kar-front/server/server.mjs &
  sleep 2

  for r in / /tienda /carrito /checkout /acceso /cuenta /favoritos /faq /nosotros /contacto \
           /destacados /busqueda /confirmacion /blog; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:4200$r")
    echo "$code $r"
  done
  # Every route MUST return 200; none may return 500
  ```

  - Spec: `green-tests-per-stage/spec.md` § Gate 3 + Design § Smoke-Check B

- [x] **S2-24** · SSR populated-HTML check — assert `/` and `/producto/<slug>` render real content:

  ```bash
  curl -s http://localhost:4200/ | rg -q 'app-root>.*\S' && echo "/ SSR populated" || echo "FAIL: / empty"
  curl -s "http://localhost:4200/producto/<known-slug>" | rg -q 'app-root>.*\S' \
    && echo "/producto SSR populated" || echo "FAIL: producto empty"
  ```

  Both checks MUST print the "populated" message, not "FAIL". Kill the server after verification.
  - Spec: `green-tests-per-stage/spec.md` § Gate 3 — SSR scenario

- [x] **S2-25** · Verify final directory invariants:

  ```bash
  # pages/ and admin/ must NOT exist (or admin/ contains only placeholder)
  fd -t d '^pages$' electric-kar-front/src/app   # must return nothing
  fd -t f '' electric-kar-front/src/app/admin    # must return nothing (or only placeholder.component.ts if D-01 = leave)

  # core/, shared/, layout/ file sets must be byte-identical to baseline
  git diff HEAD -- electric-kar-front/src/app/core/ \
                   electric-kar-front/src/app/shared/ \
                   electric-kar-front/src/app/layout/
  # must show no changes in those folders (only their consumers' import paths changed)

  # app.routes.server.ts must be unchanged
  git diff HEAD -- electric-kar-front/src/app/app.routes.server.ts
  # must show no changes
  ```

  - Spec: `target-structure/spec.md` § Channel-First Root Layout + Cross-Cutting Folders Untouched
  - Spec: `behavior-preservation/spec.md`

  Do NOT open a PR until S2-20 through S2-25 all pass.

---

## Review Workload Forecast

**Scope of change**

| Area | Files | Estimated changed lines |
|---|---|---|
| `tsconfig.json` (Slice 0) | 1 | ~12 lines (baseUrl + 5 paths entries) |
| `admin/` → `panel/` component moves (git mv = rename, import edits are changed lines) | 17 components + 2 root files = 19 | ~60–80 import-path lines across 19 files |
| 5 admin spec moves (import edits) | 5 | ~15–25 lines |
| `admin.routes.ts` route strings (17 loadComponent lines + 1 static import) | 1 | ~18 lines |
| `app.routes.ts` Slice 1 edit (1 loadChildren line) | 1 | ~2 lines |
| `pages/` → `tienda/` component moves (import edits) | 17 components + `blog.data.ts` = 18 | ~55–70 import-path lines across 18 files |
| `cuenta.component.spec.ts` move (import edits) | 1 | ~8 lines |
| `tienda/tienda.routes.ts` (new file, ~20 routes) | 1 new | ~25 lines |
| `app.routes.ts` Slice 2 edit (replace 18 inline entries with 1 loadChildren) | 1 | ~20 net lines removed, 3 added → ~23 changed lines |
| **Total** | ~47 files touched (git mv renames + direct edits) | **~240–280 import/route-edit changed lines** |

> `git mv` renames show as rename operations in the diff (cheap), not as full adds/deletes. The
> real review surface is the import-path edits and route-string rewrites, estimated at 240–280 lines.
> The new `tienda.routes.ts` adds ~25 lines. Total meaningful reviewer lines: roughly 260–310.

**Components moved**: ~40 (17 admin + 2 root-level panel files + 5 admin specs + 17 storefront + 1 storefront spec + `blog.data.ts`)

**Files touched**: ~47 (counting both renamed files and files with content edits; `app.routes.ts` is touched in both slices)

**Chained PRs recommended: Yes**

The three natural slice boundaries map cleanly to three chained PRs:
- **PR 1** (Slice 0): 1 file, 12 lines — trivially small; can be merged to `develop` first.
- **PR 2** (Slice 1): ~25 files, ~115–125 changed lines — well within the 400-line budget for
  `panel/` alone; independently deployable (storefront still served from `pages/`).
- **PR 3** (Slice 2): ~22 files, ~130–145 changed lines — well within budget; finalizes the
  migration.

Merging as one PR would total roughly 260–310 changed lines, which is under the 400-line ceiling
numerically, but the reviewer surface spans both bounded contexts, all route files, and a new
`tienda.routes.ts`. Chaining per slice makes each PR easier to review with focused context, aligns
with the design's independently-deployable stage requirement, and keeps green gates verifiable
between merges.

**400-line budget risk: Low**

Each individual PR is well below 400 changed lines. Even combined, the total is under 400. The risk
is not line count but reviewer cognitive load across two contexts — chaining mitigates that.

**Decision needed before apply: Yes**

Two explicit decisions must be resolved before or at the start of apply (see D-01 and D-02 above):
1. `placeholder.component.ts`: delete in Slice 1 or leave as orphan.
2. `blog.data.ts` import style in `articulo.component.ts`: relative or `@tienda/*` alias.

Neither is blocking-critical (both have defaults), but confirming them prevents a mid-slice
interruption.
