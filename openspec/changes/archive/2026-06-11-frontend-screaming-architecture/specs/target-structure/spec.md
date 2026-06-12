# Target Structure Specification

## Purpose

Defines the required directory layout of `electric-kar-front/src/app` after the
frontend-screaming-architecture change is applied. This is a structural invariant: the tree MUST
match exactly — no extra top-level folders, no components left in `pages/` or `admin/`.

---

## Requirements

### Requirement: Channel-First Root Layout

`src/app` MUST contain exactly two bounded-context roots — `tienda/` (storefront) and `panel/`
(back-office) — alongside the three cross-cutting folders (`core/`, `shared/`, `layout/`) and the
app-shell files (`app.component.ts`, `app.config.ts`, `app.config.server.ts`, `app.routes.ts`,
`app.routes.server.ts`).

`pages/` and `admin/` MUST NOT exist after the change is applied.

#### Scenario: Root tree reveals bounded contexts

- GIVEN the feature branch is checked out after all slices are applied
- WHEN the `src/app` directory is listed
- THEN it contains `tienda/`, `panel/`, `core/`, `shared/`, `layout/`
- AND it does NOT contain `pages/` or `admin/`

---

### Requirement: Storefront Context Layout (`tienda/`)

The `tienda/` folder MUST contain exactly the following domain sub-folders and route file:

| Folder | Components |
|--------|-----------|
| `catalogo/` | `home/`, `tienda/`, `producto/`, `busqueda/`, `destacados/` |
| `carrito/` | `carrito/` |
| `checkout/` | `checkout/`, `confirmacion/` |
| `cuenta/` | `acceso/`, `cuenta/`, `recuperar/`, `favoritos/` |
| `contenido/` | `blog/`, `articulo/`, `faq/`, `nosotros/`, `contacto/` |

`tienda/tienda.routes.ts` MUST exist and contain the storefront route definitions (previously
inline in `app.routes.ts`).

Each component listed above MUST live in its own sub-folder under its domain folder:
`tienda/<domain>/<component>/`.

#### Scenario: All 17 storefront components present under tienda/

- GIVEN the feature branch is checked out after Slice 2
- WHEN the `tienda/` directory tree is traversed
- THEN each of the 17 storefront component `.ts` files is found at
  `tienda/<domain>/<component>/<component>.component.ts`
- AND `tienda/tienda.routes.ts` exists
- AND no component file remains under `pages/`

---

### Requirement: Back-Office Context Layout (`panel/`)

The `panel/` folder MUST contain exactly the following domain sub-folders plus root-level files:

| Folder | Components |
|--------|-----------|
| `pedidos/` | `pedidos/` |
| `catalogo/` | `productos/` (admin product management) |
| `clientes/` | `clientes/`, `usuarios/` |
| `cupones/` | `cupones/` |
| `facturacion/` | `cfdi/` |
| `operaciones/` | `control/`, `sesiones/`, `auditoria/`, `integraciones/`, `reportes/`, `menu/`, `dashboard/` |
| `perfil/` | `perfil/` |
| `acceso/` | `admin-login/` |

`panel/admin-layout.component.ts` and `panel/admin.routes.ts` MUST exist at the `panel/` root
(not inside any domain sub-folder).

Each component MUST live at `panel/<domain>/<component>/<component>.component.ts`.

#### Scenario: All 20 back-office files present under panel/

- GIVEN the feature branch is checked out after Slice 1
- WHEN the `panel/` directory tree is traversed
- THEN each of the 17 admin component `.ts` files is found at
  `panel/<domain>/<component>/<component>.component.ts`
- AND `panel/admin-layout.component.ts`, `panel/admin.routes.ts` exist
- AND `panel/acceso/admin-login/admin-login.component.ts` exists
- AND no `.ts` file from the original `admin/` remains under `admin/`

---

### Requirement: Spec Co-Location

Every component that has a `.spec.ts` file MUST have it co-located in the same folder as its
component `.ts` file. No `.spec.ts` file may sit flat alongside a component at an ancestor level.

After Slice 1, the 5 admin `.spec.ts` files MUST be in their respective component folders under
`panel/`.

After Slice 2, the `cuenta.component.spec.ts` MUST be in
`tienda/cuenta/cuenta/cuenta.component.spec.ts`.

The 8 `core/` and app-shell specs that do not move MUST remain in their original locations.

#### Scenario: Admin specs co-located after Slice 1

- GIVEN the feature branch is checked out after Slice 1
- WHEN the `panel/` directory tree is traversed
- THEN the 5 moved spec files (`cfdi.component.spec.ts`, `clientes.component.spec.ts`,
  `dashboard.component.spec.ts`, `pedidos.component.spec.ts`, `reportes.component.spec.ts`) are
  each found beside their corresponding component `.ts` file
- AND no `.spec.ts` file from `admin/` remains outside of `panel/`

#### Scenario: Storefront spec co-located after Slice 2

- GIVEN the feature branch is checked out after Slice 2
- WHEN the `tienda/cuenta/cuenta/` directory is listed
- THEN it contains both `cuenta.component.ts` and `cuenta.component.spec.ts`

---

### Requirement: Cross-Cutting Folders Untouched

`core/`, `shared/`, and `layout/` MUST remain at `src/app/core/`, `src/app/shared/`, and
`src/app/layout/` respectively. No file inside these folders may be moved, renamed, or modified
as part of this change (import-path updates inside moved files pointing TO these folders are
permitted and required; changes INSIDE the files under `core/`/`shared/`/`layout/` are not).

#### Scenario: core/ contents unchanged

- GIVEN the feature branch after all slices
- WHEN `src/app/core/` is compared to the baseline on the main branch
- THEN the file set is identical (no additions, deletions, or renames)
- AND each file's content is identical to its baseline (only import consumers in moved files
  changed their import paths, not the core files themselves)
