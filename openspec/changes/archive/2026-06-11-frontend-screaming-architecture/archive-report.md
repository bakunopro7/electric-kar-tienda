# Archive Report: frontend-screaming-architecture

**Status:** SHIPPED & ARCHIVED · PR #15 merged to `develop`.

## What shipped

Reorganized `electric-kar-front/src/app` from an Angular technical-type + role layout
(`pages/`, flat `admin/`) into a **channel-first Screaming Architecture** with two bounded
contexts at the root — `tienda/` (storefront) and `panel/` (back-office) — and domains nested
inside each. `core/`, `shared/`, `layout/` stayed cross-cutting.

**Delivered as 3 stacked slices:**
- **Slice 0 — Aliases:** `baseUrl: "src"` + `@core/@shared/@layout/@tienda/@panel` paths in root
  `tsconfig.json` (inherited by `tsconfig.app.json` and `tsconfig.spec.json`).
- **Slice 1 — panel/:** 22 back-office files moved from flat `admin/` into `panel/<domain>/<component>/`
  via `git mv`; cross-cutting imports aliased; `admin.routes.ts` + `app.routes.ts` lazy imports
  rewired to `@panel/*`.
- **Slice 2 — tienda/:** 17 storefront files moved from `pages/` into `tienda/<domain>/<component>/`;
  `tienda.routes.ts` extracted (`TIENDA_ROUTES`, lazy `loadChildren`); `app.routes.ts` reduced to
  `''`→tienda, `admin`→panel, `**` wildcard.

Pure structural move — 40 files relocated with import-path/alias edits only. Zero behavior,
template, logic, route-URL, guard, or render-mode changes.

## Final verification

- Vitest: **14 files / 39 tests green** at every slice.
- Production build: clean (exit 0); 3 static routes prerendered; all lazy chunks emitted.
- SSR smoke-check: `/`, `/tienda`, `/producto/1`, `/blog`, `/admin/login`, `/carrito`, `/cuenta`,
  `/faq` all 200. Confirmed the empty-path `loadChildren` for `tienda/` does NOT shadow `/admin`.
- Fresh adversarial review: **SHIP** — 40 moved files, 0 non-import differences; all routes,
  titles, and guards preserved byte-identical.

## Key empirical finding

`@angular/build` (esbuild) resolves tsconfig `paths` aliases inside **dynamic `import()` strings**
in lazy routes, in static imports, and in **Vitest** — with config in root `tsconfig.json` only.
This removed the proposal's fallback (relative strings in route files) and made the whole move
depth-independent. Promoted to the main spec.

## Spec promotion

The two lasting invariants — `target-structure` and `path-aliases` — were consolidated and
promoted to `openspec/specs/frontend-architecture/spec.md`. The two migration-process gates
(`behavior-preservation`, `green-tests-per-stage`) remain inside this archived change folder; they
described HOW the one-time migration was guaranteed, not an ongoing capability.

## Non-goals (deferred)

- Template extraction (`.html`/`.css` split) — inline templates stay inline.
- `placeholder.component.ts` deletion — the lone unused file kept in `admin/` by decision; `admin/`
  survives only for it (separate cleanup change).
- `core/`/`shared/` internal reorganization.
