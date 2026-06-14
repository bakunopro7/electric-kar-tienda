# Green Tests Per Stage Specification

## Purpose

Defines the mandatory gate that MUST be passed after each migration stage (Slice 0, Slice 1,
Slice 2) before work on the next stage begins. This is a process invariant, not a post-hoc
verification: a stage is NOT complete until all three gates pass. Strict TDD Mode is active.

The test command is:
```
pnpm --filter electric-kar-front test
```
This runs `ng test` → `@angular/build:unit-test` → Vitest (Angular 21.2+).

The build command is:
```
pnpm --filter electric-kar-front build
```

---

## Requirements

### Requirement: Gate 1 — Vitest Suite Passes After Each Stage

After each of Slice 0, Slice 1, and Slice 2, `pnpm --filter electric-kar-front test` MUST exit 0
with zero failing tests. No pre-existing passing test may become a failing test as a result of a
stage's changes.

The suite includes all 14 `.spec.ts` files in `src/app`. After each move stage, the moved specs
run from their new co-located location — the test count MUST remain 14 (no spec may be lost).

#### Scenario: Vitest suite is green after Slice 0 (alias config)

- GIVEN `tsconfig.json` has been updated with `baseUrl` + `paths`
- AND no component files have been moved yet
- WHEN `pnpm --filter electric-kar-front test` is run
- THEN the exit code is 0
- AND all 14 specs pass

#### Scenario: Vitest suite is green after Slice 1 (panel/ move)

- GIVEN all 20 back-office files have been moved to `panel/` with co-located specs and updated imports
- AND `admin.routes.ts` and `app.routes.ts` have been updated in the same stage
- WHEN `pnpm --filter electric-kar-front test` is run
- THEN the exit code is 0
- AND all 14 specs pass (the 5 moved admin specs now run from their new locations under `panel/`)

#### Scenario: Vitest suite is green after Slice 2 (tienda/ move)

- GIVEN all 17 storefront components have been moved to `tienda/` with the `cuenta` spec co-located
- AND `tienda/tienda.routes.ts` has been extracted and `app.routes.ts` rewired
- WHEN `pnpm --filter electric-kar-front test` is run
- THEN the exit code is 0
- AND all 14 specs pass

---

### Requirement: Gate 2 — Production Build Succeeds After Each Stage

After each of Slice 0, Slice 1, and Slice 2, `pnpm --filter electric-kar-front build` MUST exit 0
with no TypeScript errors, no lint errors, and a complete browser + server bundle output.

A passing build does NOT guarantee lazy import paths are correct (TypeScript does not resolve
dynamic `import('./x')` strings at build time). Gate 3 (smoke-check) covers that gap.

#### Scenario: Production build passes after Slice 0

- GIVEN only the tsconfig alias update has been applied
- WHEN `pnpm --filter electric-kar-front build` is run
- THEN the exit code is 0
- AND no TypeScript errors are emitted

#### Scenario: Production build passes after Slice 1

- GIVEN the panel/ move is complete with updated import paths and route strings
- WHEN `pnpm --filter electric-kar-front build` is run
- THEN the exit code is 0
- AND the output includes both `browser/` and `server/` bundles

#### Scenario: Production build passes after Slice 2

- GIVEN the tienda/ move is complete with updated import paths and extracted route file
- WHEN `pnpm --filter electric-kar-front build` is run
- THEN the exit code is 0
- AND the output includes both `browser/` and `server/` bundles

---

### Requirement: Gate 3 — Route Smoke-Check Confirms Lazy Chunks Load

After Slice 1 and Slice 2, a manual or scripted route smoke-check MUST confirm that every lazy
route loads its component chunk without a runtime error. This gate exists specifically because
TypeScript does NOT validate dynamic `import('./x')` strings — a wrong path silently passes `tsc`
and fails only when the route is navigated to.

After Slice 1, the smoke-check target routes are all `/admin/**` paths.

After Slice 2, the smoke-check target routes are all storefront paths including at least:
`/`, `/tienda`, `/producto/<any-slug>`, `/blog/<any-slug>`, `/carrito`, `/checkout`, `/acceso`,
`/cuenta`, `/favoritos`, `/faq`, `/nosotros`, `/contacto`.

The SSR routes `/` and `/producto/<slug>` MUST also be checked for server-rendered populated HTML
(not empty `<app-root>`), confirming the SSR render map is unaffected.

#### Scenario: All admin routes load after Slice 1

- GIVEN the dev server is running after Slice 1 (`pnpm --filter electric-kar-front start`)
- WHEN each route under `/admin/**` is navigated to in the browser
- THEN no lazy-chunk loading error appears in the browser console
- AND each admin component renders its content

#### Scenario: All storefront routes load after Slice 2

- GIVEN the dev server (or SSR server) is running after Slice 2
- WHEN each storefront route is navigated to
- THEN no lazy-chunk loading error appears in the browser console
- AND each component renders its content

#### Scenario: SSR smoke-check passes after Slice 2

- GIVEN the SSR server is running after Slice 2
- WHEN HTTP GET `/` is made without JavaScript
- THEN the response body contains non-empty storefront content (not `<app-root></app-root>`)
- AND the response status is 200
- WHEN HTTP GET `/producto/<known-slug>` is made without JavaScript
- THEN the response body contains non-empty product content
- AND the response status is 200

---

### Requirement: Stage Ordering Is Enforced

Slice 1 MUST NOT begin until all three gates pass for Slice 0.
Slice 2 MUST NOT begin until all three gates pass for Slice 1.
No partial stage may be merged (PR) if any gate is red.

This is a process invariant, not a code invariant. It is enforced by the development workflow and
verified during the `sdd-verify` phase.

#### Scenario: Slice 1 not started until Slice 0 is green

- GIVEN Slice 0 changes are present (tsconfig aliases)
- AND the Vitest suite or build fails due to the alias config
- WHEN work continues on the stage
- THEN no file moves occur until the suite and build are green for Slice 0

#### Scenario: Each slice is independently deployable

- GIVEN Slice 1 is merged (panel/ complete, tienda/ not yet started)
- WHEN the application is deployed
- THEN it runs correctly with `panel/` in place and `pages/` still serving storefront routes
  (until Slice 2 completes)
