# Behavior Preservation Specification

## Purpose

Defines the invariants that prove this change is a pure structural move. Every user-visible
behavior, route URL, guard, render mode, and template MUST be identical before and after the
change. Any deviation is a defect in this change, not a feature.

---

## Requirements

### Requirement: Route URLs Unchanged

Every route URL defined in `app.routes.ts` and `admin.routes.ts` before the change MUST exist and
resolve to the same component after the change. Renaming or adding route paths is out of scope.

The `loadChildren` path for `panel/admin.routes.ts` in `app.routes.ts` MUST be updated to point to
the new file location; the route URL prefix (`/admin`) MUST remain identical.

The storefront `loadComponent` import strings in `tienda/tienda.routes.ts` (extracted from
`app.routes.ts`) MUST reference the new component paths; the route URLs (e.g. `/`, `/tienda`,
`/producto/:id`, `/blog/:slug`) MUST remain identical.

#### Scenario: All pre-existing storefront routes still resolve after Slice 2

- GIVEN the application is running after Slice 2 is applied
- WHEN each storefront route is navigated to in the browser (or a smoke-check script visits each)
- THEN the route resolves (no 404, no blank screen, no lazy-chunk loading error)
- AND the component that renders is visually and functionally identical to pre-change

#### Scenario: Admin routes still resolve after Slice 1

- GIVEN the application is running after Slice 1 is applied
- WHEN each route under `/admin/**` is navigated to (or a smoke-check script visits each)
- THEN the route resolves without a lazy-load error
- AND the component that renders is functionally identical to pre-change

#### Scenario: app.routes.ts loadChildren path updated, URL unchanged

- GIVEN the feature branch after Slice 1
- WHEN `app.routes.ts` is inspected
- THEN the `loadChildren` entry that previously referenced `./admin/admin.routes` now references
  `./panel/admin.routes` (or uses the `@panel/*` alias)
- AND the route path property is still `'admin'` (or whatever the pre-existing value was)

---

### Requirement: Guards Unchanged

`adminAuthGuard`, `rolesGuard`, and any other route guard applied to admin routes MUST continue to
protect the same routes with the same logic. No guard may be removed, added, or reordered as part
of this change.

#### Scenario: Unauthenticated user cannot access admin routes after Slice 1

- GIVEN a user who is not authenticated
- WHEN they navigate to `/admin/dashboard`
- THEN they are redirected (or receive the same denial response as before the change)
- AND the guard behavior is identical to the pre-change baseline

---

### Requirement: Templates Stay Inline

No component template may be extracted into a separate `.html` file as part of this change.
Every component whose `template` property was inline before the change MUST remain inline after.
The `templateUrl` property MUST NOT be introduced on any component during this change.

This is a static invariant verifiable by code review.

#### Scenario: No templateUrl introduced by this change

- GIVEN the diff of this change
- WHEN every changed `.component.ts` file is inspected
- THEN no file introduces a `templateUrl` property that was not present before
- AND no new `.component.html` file exists under `tienda/` or `panel/`

---

### Requirement: SSR Render Modes Unchanged

`app.routes.server.ts` maps route paths to render modes. Because it is keyed by route path (not
file path), it MUST NOT be modified as part of this change. The render modes for every route MUST
be identical before and after.

#### Scenario: app.routes.server.ts is unmodified

- GIVEN the diff of this change
- WHEN `app.routes.server.ts` is checked
- THEN the file is unchanged (no additions, deletions, or modifications)

#### Scenario: Server-rendered routes still return populated HTML after Slice 2

- GIVEN the SSR server is running after Slice 2
- WHEN an HTTP GET to `/` is made without JavaScript execution
- THEN the response body contains non-empty storefront content inside `<app-root>`
- AND the response status is 200 (same as pre-change)

#### Scenario: Server-rendered product route returns populated HTML

- GIVEN the SSR server is running after Slice 2
- WHEN an HTTP GET to `/producto/<known-slug>` is made without JavaScript execution
- THEN the response body contains product data inside `<app-root>`
- AND the response status is 200

---

### Requirement: No Logic or Service Changes

No component logic (methods, lifecycle hooks, signal computations), no service, no guard
implementation, and no pipe logic may be modified as part of this change. Import path updates on
moved files are required and permitted; all other file content must be byte-identical to the
pre-change baseline (whitespace normalization by the formatter is acceptable if the project uses
a formatter, but logic lines must not change).

#### Scenario: Component logic diff is import-path-only

- GIVEN the diff of this change for any moved component file
- WHEN lines that are not `import` statements are compared to the baseline
- THEN there are no changes (only import paths changed)
