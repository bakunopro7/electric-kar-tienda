# Apply Progress — frontend-screaming-architecture

**Change**: frontend-screaming-architecture  
**Mode**: Strict TDD (suite must stay green; this slice adds no new behavior — gate is build + Vitest)

---

## Slice 0 — Path Aliases (COMPLETE)

### Completed Tasks

- [x] **S0-01** · Added `"baseUrl": "src"` and five `paths` entries to `electric-kar-front/tsconfig.json`
- [x] **S0-02** · Optional verification import — skipped; relying on design's empirical experiment proof (14/39 tests already passed with `@core/*` imports during experiment)
- [x] **S0-03** · Slice 0 Green Gate — PASSED

### Green Gate Results

| Gate | Command | Result |
|------|---------|--------|
| Production build | `pnpm build` (clean state — `dist` + `.angular/cache` removed first) | **PASS** — exit 0, `dist/electric-kar-front/` emitted |
| Vitest suite | `pnpm test` | **PASS** — 14 spec files, 39 tests, 0 failures |

### TDD Cycle Evidence

| Task | RED | GREEN | REFACTOR |
|------|-----|-------|----------|
| S0-01 (tsconfig paths config) | N/A — config-only change, no new behavior to test | Suite stayed green (14/39) after adding `baseUrl`+`paths` | No refactor needed |

> Slice 0 adds NO new behavior — it is a pure TypeScript compiler config change. TDD cycle evidence is build + test-suite green (not a new test written first), which is the correct discipline for a config-only slice.

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `electric-kar-front/tsconfig.json` | Modified | Added `"baseUrl": "src"` and 5 `paths` entries (`@core/*`, `@shared/*`, `@layout/*`, `@tienda/*`, `@panel/*`) under `compilerOptions` |

### Exact tsconfig.json Paths Block Added

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

Declared once in root `tsconfig.json`. Both `tsconfig.app.json` (build) and `tsconfig.spec.json`
(Vitest) extend it — inherited with no per-config duplication, as specified by design.md.

### Deviations from Design

None — implementation matches design exactly. Five aliases declared in root tsconfig.json, no
standalone `vitest.config.ts` added, no file moves performed.

### Pending (S0-04 — git commit)

- [ ] **S0-04** · Commit Slice 0: `refactor(aliases): add tsconfig baseUrl and @core/@shared/@layout/@tienda/@panel paths`
  — handled by the orchestrator after review, per instructions.

---

## Slice 1 — `panel/` Back-Office (COMPLETE)

### Decision Resolution

- **D-01** (placeholder.component.ts): **Leave in place** — file remains at `electric-kar-front/src/app/admin/placeholder.component.ts` as an orphan. Not moved, not deleted. `admin/` now contains only this file.

### Completed Tasks

- [x] **S1-01** · Created `panel/` directory tree (all 15 domain folders created)
- [x] **S1-02** · Moved all `operaciones/` components and specs via `git mv`
- [x] **S1-03** · Updated cross-cutting imports in all 9 `operaciones/` files to alias form (`@core/*`, `@shared/*`)
- [x] **S1-04** · (Commit deferred to orchestrator)
- [x] **S1-05** · Moved `pedidos.component.ts` + spec via `git mv`
- [x] **S1-06** · Updated cross-cutting imports in pedidos files to alias form
- [x] **S1-07** · (Commit deferred to orchestrator)
- [x] **S1-08** · Moved `productos.component.ts` via `git mv`
- [x] **S1-09** · Updated cross-cutting imports to alias form
- [x] **S1-10** · (Commit deferred to orchestrator)
- [x] **S1-11** · Moved `clientes.component.ts` + spec and `usuarios.component.ts` via `git mv`
- [x] **S1-12** · Updated cross-cutting imports in clientes and usuarios files
- [x] **S1-13** · (Commit deferred to orchestrator)
- [x] **S1-14** · Moved `cupones.component.ts` via `git mv`
- [x] **S1-15** · Updated cross-cutting imports
- [x] **S1-16** · (Commit deferred to orchestrator)
- [x] **S1-17** · Moved `cfdi.component.ts` + spec via `git mv`
- [x] **S1-18** · Updated cross-cutting imports
- [x] **S1-19** · (Commit deferred to orchestrator)
- [x] **S1-20** · Moved `perfil.component.ts` via `git mv`
- [x] **S1-21** · Updated cross-cutting imports
- [x] **S1-22** · (Commit deferred to orchestrator)
- [x] **S1-23** · Moved `admin-login.component.ts` via `git mv` (uncommitted M preserved — verified)
- [x] **S1-24** · Updated cross-cutting imports in admin-login
- [x] **S1-25** · (Commit deferred to orchestrator)
- [x] **S1-26** · Moved `admin-layout.component.ts` to `panel/` root; updated cross-cutting imports
- [x] **S1-27** · D-01 decision applied: `placeholder.component.ts` left in `admin/` (not moved, not deleted)
- [x] **S1-28** · Moved `admin.routes.ts` to `panel/` root via `git mv`
- [x] **S1-29** · Rewrote all `loadComponent` strings in `panel/admin.routes.ts` to `@panel/*` aliases; rewrote guard import to `@core/admin.guards`
- [x] **S1-30** · Updated `app.routes.ts` `loadChildren` entry to `@panel/admin.routes`
- [x] **S1-31** · (Commit deferred to orchestrator)
- [x] **S1-32** · Vitest suite — **PASS** (14 files, 39 tests, 0 failures — all 5 moved specs green at new paths)
- [x] **S1-33** · Clean production build — **PASS** (exit 0, browser/ and server/ bundles emitted)
- [x] **S1-34** · Check A — lazy chunk emission **CONFIRMED** (all panel chunks emitted: `dashboard-component`, `pedidos-component`, `cfdi-component`, `cupones-component`, `control-component`, `reportes-component`, `admin-login-component`, etc.)
- [x] **S1-35** · Check B — SSR smoke-check **PASS** (all 15 admin routes return 200, none return 500)

### Files Moved (old → new)

| Old path (`src/app/admin/…`) | New path (`src/app/panel/…`) |
|---|---|
| `dashboard.component.ts` | `operaciones/dashboard/dashboard.component.ts` |
| `dashboard.component.spec.ts` | `operaciones/dashboard/dashboard.component.spec.ts` |
| `reportes.component.ts` | `operaciones/reportes/reportes.component.ts` |
| `reportes.component.spec.ts` | `operaciones/reportes/reportes.component.spec.ts` |
| `control.component.ts` | `operaciones/control/control.component.ts` |
| `sesiones.component.ts` | `operaciones/sesiones/sesiones.component.ts` |
| `auditoria.component.ts` | `operaciones/auditoria/auditoria.component.ts` |
| `integraciones.component.ts` | `operaciones/integraciones/integraciones.component.ts` |
| `menu.component.ts` | `operaciones/menu/menu.component.ts` |
| `pedidos.component.ts` | `pedidos/pedidos/pedidos.component.ts` |
| `pedidos.component.spec.ts` | `pedidos/pedidos/pedidos.component.spec.ts` |
| `productos.component.ts` | `catalogo/productos/productos.component.ts` |
| `clientes.component.ts` | `clientes/clientes/clientes.component.ts` |
| `clientes.component.spec.ts` | `clientes/clientes/clientes.component.spec.ts` |
| `usuarios.component.ts` | `clientes/usuarios/usuarios.component.ts` |
| `cupones.component.ts` | `cupones/cupones/cupones.component.ts` |
| `cfdi.component.ts` | `facturacion/cfdi/cfdi.component.ts` |
| `cfdi.component.spec.ts` | `facturacion/cfdi/cfdi.component.spec.ts` |
| `perfil.component.ts` | `perfil/perfil/perfil.component.ts` |
| `admin-login.component.ts` | `acceso/admin-login/admin-login.component.ts` |
| `admin-layout.component.ts` | `admin-layout.component.ts` (panel root) |
| `admin.routes.ts` | `admin.routes.ts` (panel root) |
| `placeholder.component.ts` | **left in place at `admin/`** |

### Import Edits Applied

All moved files: `'../core/...'` → `'@core/...'`, `'../shared/...'` → `'@shared/...'`

`panel/admin.routes.ts` (route file):
- `'../core/admin.guards'` → `'@core/admin.guards'`
- All `loadComponent(() => import('./x.component'))` → `import('@panel/<domain>/<x>/<x>.component')`
- `loadComponent` for `admin-layout` → `'@panel/admin-layout.component'`
- `loadComponent` for `admin-login` → `'@panel/acceso/admin-login/admin-login.component'`

`src/app/app.routes.ts`:
- `import('./admin/admin.routes')` → `import('@panel/admin.routes')`

### Green Gate Results (Slice 1)

| Gate | Result |
|------|--------|
| Vitest (14 files / 39 tests) | **PASS** |
| Production build (clean state) | **PASS** — exit 0 |
| Check A (lazy chunk emission) | **PASS** — all panel admin chunks emitted in browser and server bundles |
| Check B (SSR smoke-check, all 15 admin routes) | **PASS** — all return 200, none 500 |

### Deviations from Design

None — implementation matches design exactly. All files moved as specified, imports aliased as specified, route file rewritten as specified. The `placeholder.component.ts` is left in `admin/` per D-01 default decision.

### TDD Cycle Evidence

This is a pure structural move — no behavior added, no new components. TDD discipline: suite stayed 14/39 green throughout (verified after all moves + import rewrites), which is the correct gate for a refactor slice.

### Pending (Commits deferred to orchestrator)

- [ ] **S1-04** `refactor(panel): move operaciones domain (dashboard, control, sesiones, auditoria, integraciones, reportes, menu)`
- [ ] **S1-07** `refactor(panel): move pedidos domain`
- [ ] **S1-10** `refactor(panel): move catalogo domain (admin productos)`
- [ ] **S1-13** `refactor(panel): move clientes domain (clientes, usuarios)`
- [ ] **S1-16** `refactor(panel): move cupones domain`
- [ ] **S1-19** `refactor(panel): move facturacion domain (cfdi)`
- [ ] **S1-22** `refactor(panel): move perfil domain`
- [ ] **S1-25** `refactor(panel): move acceso domain (admin-login, preserves uncommitted edit)`
- [ ] **S1-31** `refactor(panel): rewire admin.routes and app.routes loadChildren to @panel alias`

---

## Slice 2 — `tienda/` Storefront (NOT STARTED)

All S2-xx tasks remain `[ ]`.
