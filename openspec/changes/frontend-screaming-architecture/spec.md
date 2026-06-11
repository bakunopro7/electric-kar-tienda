# Spec: frontend-screaming-architecture

## Change

`frontend-screaming-architecture`

## Capabilities

| Capability | Type | Spec File |
|-----------|------|-----------|
| `target-structure` | Restructure | `specs/target-structure/spec.md` |
| `behavior-preservation` | Invariant | `specs/behavior-preservation/spec.md` |
| `path-aliases` | New | `specs/path-aliases/spec.md` |
| `green-tests-per-stage` | Process Gate | `specs/green-tests-per-stage/spec.md` |

## Summary

This change reorganizes `electric-kar-front/src/app` from an Angular-technical-type layout
(`pages/`, `admin/`) into a **channel-first Screaming Architecture** that reveals the two bounded
contexts of the business — storefront (`tienda/`) and back-office (`panel/`) — with domains nested
inside each context. It covers:

1. **Target structure:** `tienda/<domain>/<component>/` for 17 storefront components; `panel/<domain>/<component>/` for 20 back-office files; `core/`, `shared/`, `layout/` untouched.
2. **Behavior preservation:** pure structural move — no template, logic, route URL, guard, or render-mode changes.
3. **Path aliases:** `baseUrl` + `paths` in `tsconfig.json` (`@core/*`, `@shared/*`, `@tienda/*`, `@panel/*`); aliases must resolve in both the Angular production build and the Vitest test runner (`@angular/build:unit-test`).
4. **Green tests per stage:** Vitest suite passes, production build succeeds, and a route smoke-check confirms lazy chunks load after each migration stage before the next begins.

## Non-Goals

- Template extraction (inline templates stay inline; no `.html`/`.css` split)
- Logic or behavior changes to any component, service, or guard
- `core/` or `shared/` reorganization
- Backend changes (NestJS, Prisma, DTOs untouched)
- `placeholder.component.ts` deletion (separate cleanup change)

## Delivery Slices

| Slice | Scope | Gate |
|-------|-------|------|
| Slice 0 — Aliases | Add `baseUrl` + `paths` to `tsconfig.json`; verify build + Vitest pass with no file moves yet | Build green + Vitest green |
| Slice 1 — `panel/` | Move 20 back-office files; update `admin.routes.ts` import strings + `app.routes.ts` `loadChildren` path; co-locate 5 specs | Build green + Vitest green + `/admin/*` smoke-check |
| Slice 2 — `tienda/` | Move 17 storefront components; extract `tienda.routes.ts`; rewire `app.routes.ts`; co-locate `cuenta` spec; verify SSR routes | Build green + Vitest green + storefront smoke-check |

## Spec Dependencies

Full requirements and Given/When/Then scenarios are in the per-capability spec files listed above.
