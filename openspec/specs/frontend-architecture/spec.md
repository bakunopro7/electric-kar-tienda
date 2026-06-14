# Frontend Architecture Specification

## Purpose

Defines the lasting structural contract of `electric-kar-front/src/app`: a **channel-first
Screaming Architecture** that reveals the two bounded contexts of the business — storefront
(`tienda/`) and back-office (`panel/`) — with domains nested inside each context, plus the
TypeScript path-alias configuration that keeps imports depth-independent.

Promoted from the `frontend-screaming-architecture` change (archived 2026-06-11).

---

## Requirements

### Requirement: Channel-First Root Layout

`src/app` MUST contain exactly two bounded-context roots — `tienda/` (storefront) and `panel/`
(back-office) — alongside the three cross-cutting folders (`core/`, `shared/`, `layout/`) and the
app-shell files (`app.ts`, `app.config.ts`, `app.config.server.ts`, `app.routes.ts`,
`app.routes.server.ts`).

There MUST NOT be a `pages/` or `admin/`-style technical/role folder holding feature components.

#### Scenario: Root tree reveals bounded contexts

- GIVEN the `src/app` directory
- WHEN it is listed
- THEN it contains `tienda/`, `panel/`, `core/`, `shared/`, `layout/`
- AND it does NOT contain a `pages/` folder of storefront components

---

### Requirement: Storefront Context Layout (`tienda/`)

The `tienda/` context groups storefront components by domain, each component in its own folder
(`tienda/<domain>/<component>/`):

| Domain | Components |
|--------|-----------|
| `catalogo/` | `home/`, `tienda/`, `producto/`, `busqueda/`, `destacados/` |
| `carrito/` | `carrito/` |
| `checkout/` | `checkout/`, `confirmacion/` |
| `cuenta/` | `acceso/`, `cuenta/`, `recuperar/`, `favoritos/` |
| `contenido/` | `blog/`, `articulo/`, `faq/`, `nosotros/`, `contacto/` |

`tienda/tienda.routes.ts` MUST hold the storefront route definitions (`TIENDA_ROUTES`), lazy-loaded
from `app.routes.ts` via `loadChildren`.

#### Scenario: Storefront components live under their domain folders

- WHEN the `tienda/` tree is traversed
- THEN each storefront component is found at `tienda/<domain>/<component>/<component>.component.ts`
- AND `tienda/tienda.routes.ts` exists

---

### Requirement: Back-Office Context Layout (`panel/`)

The `panel/` context groups back-office components by domain, each in its own folder
(`panel/<domain>/<component>/`):

| Domain | Components |
|--------|-----------|
| `pedidos/` | `pedidos/` |
| `catalogo/` | `productos/` |
| `clientes/` | `clientes/`, `usuarios/` |
| `cupones/` | `cupones/` |
| `facturacion/` | `cfdi/` |
| `operaciones/` | `control/`, `sesiones/`, `auditoria/`, `integraciones/`, `reportes/`, `menu/`, `dashboard/` |
| `perfil/` | `perfil/` |
| `acceso/` | `admin-login/` |

`panel/admin-layout.component.ts` and `panel/admin.routes.ts` (`ADMIN_ROUTES`) MUST live at the
`panel/` root, lazy-loaded from `app.routes.ts` at the `admin` path.

#### Scenario: Back-office components live under their domain folders

- WHEN the `panel/` tree is traversed
- THEN each back-office component is found at `panel/<domain>/<component>/<component>.component.ts`
- AND `panel/admin-layout.component.ts` and `panel/admin.routes.ts` exist at the `panel/` root

---

### Requirement: Spec Co-Location

Every component that has a `.spec.ts` file MUST keep it co-located in the same folder as its
component `.ts`. No `.spec.ts` may sit flat at an ancestor level above its component.

#### Scenario: Component spec sits beside its component

- GIVEN any component folder under `tienda/` or `panel/`
- WHEN it contains a `.spec.ts` file
- THEN that spec sits in the same folder as the component `.ts` it tests

---

### Requirement: Cross-Cutting Folders Stay Cross-Cutting

`core/`, `shared/`, and `layout/` remain at `src/app/core/`, `src/app/shared/`, `src/app/layout/`.
They are NOT domains and MUST NOT be folded into `tienda/` or `panel/`.

#### Scenario: Cross-cutting folders are not nested in a context

- WHEN `src/app` is listed
- THEN `core/`, `shared/`, `layout/` are top-level siblings of `tienda/` and `panel/`

---

### Requirement: Path Aliases for Depth-Independent Imports

`tsconfig.json` (workspace root) MUST declare `baseUrl: "src"` and `paths` for the bounded-context
and cross-cutting roots:

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

Imports from any component into `core/`, `shared/`, or `layout/` MUST use the alias, never a
relative path. Lazy `loadComponent`/`loadChildren` `import()` strings in the route files use
`@tienda/*` and `@panel/*` aliases (verified to resolve in dynamic imports by `@angular/build`).

These aliases resolve in BOTH the Angular production build and the Vitest test runner with config
in root `tsconfig.json` alone (`tsconfig.app.json` and `tsconfig.spec.json` extend it); no separate
Vite/Webpack/Vitest alias block is required.

#### Scenario: Cross-cutting imports use aliases

- GIVEN any component under `tienda/` or `panel/`
- WHEN it imports from `core/`, `shared/`, or `layout/`
- THEN the import uses `@core/...`, `@shared/...`, or `@layout/...` — not a relative path

#### Scenario: Aliases resolve in build and tests

- GIVEN `tsconfig.json` declares the `baseUrl` + `paths` above
- WHEN `pnpm build` and `pnpm test` are run inside `electric-kar-front/`
- THEN both succeed with no `Cannot find module '@...'` resolution error
