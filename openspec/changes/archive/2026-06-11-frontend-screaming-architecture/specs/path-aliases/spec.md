# Path Aliases Specification

## Purpose

Defines the TypeScript path alias configuration that MUST be added as part of this change (Slice 0).
Aliases convert depth-sensitive relative imports (`../../../core/...`) into stable, depth-independent
references (`@core/...`), eliminating the dominant runtime-break risk of lazy import paths silently
breaking when component depth changes.

---

## Requirements

### Requirement: baseUrl and Paths Declared in tsconfig.json

`tsconfig.json` (the workspace root tsconfig, not `tsconfig.app.json`) MUST declare:

```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@core/*":   ["app/core/*"],
      "@shared/*": ["app/shared/*"],
      "@layout/*": ["app/layout/*"],
      "@tienda/*": ["app/tienda/*"],
      "@panel/*":  ["app/panel/*"]
    }
  }
}
```

The `baseUrl` value MUST be `"src"` so that path resolution starts from `electric-kar-front/src`.

No alias may point outside of `src/app/`. The five aliases listed above are the minimum required;
additional aliases may be added if implementation requires them without violating this spec.

#### Scenario: tsconfig.json contains required aliases

- GIVEN the feature branch after Slice 0
- WHEN `electric-kar-front/tsconfig.json` is read
- THEN `compilerOptions.baseUrl` equals `"src"`
- AND `compilerOptions.paths` contains entries for `@core/*`, `@shared/*`, `@layout/*`,
  `@tienda/*`, and `@panel/*`
- AND each path array maps to the correct sub-path under `app/`

---

### Requirement: Angular Production Build Resolves Aliases

The Angular production build (`ng build` / `pnpm build` inside `electric-kar-front/`) MUST resolve
all five path aliases without error. `@angular/build` reads `tsconfig.json` natively and resolves
`paths` entries; no additional Vite plugin or Webpack alias configuration is required.

After adding the aliases and updating at least one import to use them (in Slice 0 verification),
`ng build` MUST exit 0.

#### Scenario: Build succeeds with aliases in tsconfig.json

- GIVEN `tsconfig.json` contains `baseUrl` + `paths` as specified
- AND at least one component uses an `@core/*` import
- WHEN `ng build` is run inside `electric-kar-front/`
- THEN the exit code is 0
- AND no `Cannot find module '@core/...'` (or equivalent) TypeScript error is emitted

---

### Requirement: Vitest Test Runner Resolves Aliases

`pnpm --filter electric-kar-front test` (which runs `ng test` → `@angular/build:unit-test` →
Vitest) MUST resolve all five path aliases without a module-resolution error.

`@angular/build:unit-test` at Angular 21.2+ reads `tsconfig.json` and configures Vitest's
resolver to honor `paths` automatically. No separate `vitest.config.ts` alias section is required
unless a standalone `vitest.config.ts` file is introduced (it is not, in this change).

If the Vitest runner cannot resolve aliases from `tsconfig.json` alone (e.g. because a standalone
`vitest.config.ts` overrides the builder config), a `resolve.alias` block MUST be added to the
relevant config file to mirror the tsconfig `paths` entries.

#### Scenario: Test suite passes with aliases after Slice 0

- GIVEN `tsconfig.json` contains `baseUrl` + `paths` as specified
- WHEN `pnpm --filter electric-kar-front test` is run
- THEN all pre-existing tests pass (no new failures introduced by the alias config)
- AND no `Cannot find module '@core/...'` (or equivalent) resolver error appears in test output

#### Scenario: Moved component spec resolves @core via alias

- GIVEN a moved component in `panel/<domain>/<component>/` imports a service using `@core/...`
- WHEN `pnpm --filter electric-kar-front test` is run
- THEN the spec compiles and runs without a module-not-found error

---

### Requirement: All Moved Files Use Aliases for Cross-Cutting Imports

After Slices 1 and 2, every moved component and spec file MUST use path aliases (not relative
paths) when importing from `core/`, `shared/`, or `layout/`. Relative imports into cross-cutting
folders (e.g. `../../../core/auth/auth.service`) MUST NOT exist in any file moved by this change.

Relative imports WITHIN a context (e.g. a `tienda/` component importing a sibling within `tienda/`)
are permitted.

This is a static invariant enforced at code review.

#### Scenario: No relative cross-cutting imports in moved files

- GIVEN the diff of Slices 1 and 2
- WHEN every changed import statement in moved files is inspected
- THEN no import from a moved file into `core/`, `shared/`, or `layout/` uses a relative path
  (starting with `./` or `../`)
- AND all such imports use the corresponding alias (`@core/...`, `@shared/...`, `@layout/...`)

---

### Requirement: Lazy loadComponent / loadChildren Strings Updated

`tienda/tienda.routes.ts` and `panel/admin.routes.ts` MUST use `@tienda/*` and `@panel/*` aliases
in their `loadComponent(() => import(...))` and `loadChildren(() => import(...))` strings
respectively. Using relative strings in route files is permitted ONLY if the alias approach is
verified to work for dynamic `import()` in the Angular build; if not, relative strings from the
route file's new location are acceptable and the alias requirement applies to static imports only.

> **Note for design phase:** Verify whether `@angular/build` resolves `paths` aliases inside
> dynamic `import()` strings at bundle time. If yes, use aliases in route files. If no, route files
> may use relative strings while all static imports use aliases.

#### Scenario: Route files reference components via their new locations

- GIVEN `panel/admin.routes.ts` after Slice 1
- WHEN the file is read
- THEN each `loadComponent` string references a path under `panel/` (either `@panel/...` alias
  or a relative path from `panel/admin.routes.ts`)
- AND no string still references the old `admin/` path

#### Scenario: Storefront route file references components via new locations

- GIVEN `tienda/tienda.routes.ts` after Slice 2
- WHEN the file is read
- THEN each `loadComponent` string references a path under `tienda/` (either `@tienda/...` alias
  or a relative path from `tienda/tienda.routes.ts`)
- AND `app.routes.ts` no longer contains inline storefront `loadComponent` entries
