# Cliente Pagination Specification

## Purpose

Replaces the unbounded `GET /api/clientes` admin query with offset pagination.
Adds dedicated aggregate endpoints `GET /api/clientes/top` and
`GET /api/clientes/stats` so that KPI consumers are decoupled from the list.
Updates all admin frontend consumers to the new shapes.

---

## Requirements

### Requirement: Paginated Admin Clientes List

The endpoint `GET /api/clientes` MUST accept `page` (integer ≥ 1, default 1)
and `limit` (integer 1–100, default 20) query parameters.
It MUST return `Paginated<ClienteAdmin>`:
`{ data: ClienteAdmin[], meta: { total, page, limit, pages } }`.
It MUST NOT perform an unbounded `findMany`.
`limit` MUST be clamped to 100.
Existing role guard (ADMIN, SUPER) MUST remain unchanged.
The result MUST be ordered by `creadoEn` descending.

#### Scenario: Default pagination

- GIVEN an authenticated ADMIN with 55 clientes in the database
- WHEN `GET /api/clientes` is called with no query parameters
- THEN the response status is 200
- AND `data` contains exactly 20 items
- AND `meta.total` is 55, `meta.page` is 1, `meta.limit` is 20, `meta.pages` is 3

#### Scenario: Explicit page navigation

- GIVEN an authenticated ADMIN with 55 clientes
- WHEN `GET /api/clientes?page=3&limit=20` is called
- THEN `data` contains exactly 15 items
- AND `meta.page` is 3 and `meta.pages` is 3

#### Scenario: Limit capped at 100

- GIVEN an authenticated ADMIN
- WHEN `GET /api/clientes?limit=999` is called
- THEN `limit` is clamped to 100
- AND `meta.limit` in the response is 100

#### Scenario: Page beyond range returns empty data

- GIVEN an authenticated ADMIN with 3 clientes
- WHEN `GET /api/clientes?page=50` is called
- THEN the response status is 200
- AND `data` is an empty array
- AND `meta.total` is 3 and `meta.pages` is 1

#### Scenario: Role guard unchanged — unauthenticated rejected

- GIVEN a request with no valid JWT
- WHEN `GET /api/clientes` is called
- THEN the response status is 401

#### Scenario: Role guard unchanged — CLIENTE role rejected

- GIVEN an authenticated user with role CLIENTE
- WHEN `GET /api/clientes` is called
- THEN the response status is 403

---

### Requirement: Top Clientes Endpoint

The endpoint `GET /api/clientes/top` MUST exist and MUST be accessible to roles
ADMIN and SUPER.
It MUST accept a `limit` query parameter (integer ≥ 1, default 5, max 50).
It MUST return `ClienteAdmin[]` (not wrapped in a `Paginated` envelope) ordered
by `totalGastado` descending.
`totalGastado` MUST be read from the denormalized `Cliente.totalGastado` column;
it MUST NOT aggregate from the orders table at query time.

#### Scenario: Returns top clientes by totalGastado

- GIVEN an authenticated ADMIN and the database has 10 clientes with varying `totalGastado`
- WHEN `GET /api/clientes/top` is called with no parameters
- THEN the response is an array of 5 items
- AND items are ordered by `totalGastado` descending (highest first)

#### Scenario: Explicit limit parameter

- GIVEN an authenticated ADMIN with 10 clientes
- WHEN `GET /api/clientes/top?limit=3` is called
- THEN the response is an array of exactly 3 items ordered by `totalGastado` desc

#### Scenario: Limit above max is clamped

- GIVEN an authenticated ADMIN
- WHEN `GET /api/clientes/top?limit=200` is called
- THEN the response array length does not exceed 50

#### Scenario: Role guard — CLIENTE role rejected

- GIVEN an authenticated user with role CLIENTE
- WHEN `GET /api/clientes/top` is called
- THEN the response status is 403

---

### Requirement: Clientes Stats Endpoint

The endpoint `GET /api/clientes/stats` MUST exist and MUST be accessible to
roles ADMIN and SUPER.
It MUST return `{ total: number }` where `total` is the database-level
`COUNT(*)` of the `Cliente` table.
The implementation MUST use Prisma `count` — it MUST NOT fetch rows to derive
the count.

#### Scenario: Returns correct total count

- GIVEN an authenticated ADMIN and the database contains 42 clientes
- WHEN `GET /api/clientes/stats` is called
- THEN the response status is 200
- AND `total` is 42

#### Scenario: Returns zero when no clientes exist

- GIVEN an authenticated ADMIN and the database contains 0 clientes
- WHEN `GET /api/clientes/stats` is called
- THEN the response status is 200
- AND `total` is 0

#### Scenario: Role guard — VENDEDOR rejected

- GIVEN an authenticated user with role VENDEDOR
- WHEN `GET /api/clientes/stats` is called
- THEN the response status is 403

---

### Requirement: Frontend Admin Clientes Consumers Updated

`AdminService.clientes()` MUST return `Observable<Paginated<ClienteAdmin>>`.
`AdminService.clientesTop(limit?: number)` MUST exist and return
`Observable<ClienteAdmin[]>`.
`AdminService.clientesStats()` MUST exist and return `Observable<{ total: number }>`.
`ClientesComponent` MUST read `response.data` for table rows and `response.meta`
for the paginator; it MUST render without runtime errors.
`ReportesComponent` MUST call `clientesTop()` for the top-clients chart and
MUST NOT derive the top list by reducing the full clientes array.
`ReportesComponent` MUST call `clientesStats()` for the clientes count KPI.
`DashboardComponent` MUST call `clientesStats()` for the clientes count KPI;
it MUST NOT derive the count from the clientes list array.

#### Scenario: ClientesComponent renders paginated table

- GIVEN `AdminService.clientes()` resolves with `{ data: [c1, c2], meta: { total: 2, page: 1, limit: 20, pages: 1 } }`
- WHEN `ClientesComponent` initializes
- THEN the table renders exactly 2 rows without runtime errors
- AND the paginator reflects `meta.total` and `meta.page`

#### Scenario: ReportesComponent reads topClientes from clientesTop()

- GIVEN `AdminService.clientesTop()` resolves with an array of 5 ClienteAdmin items
- WHEN `ReportesComponent` initializes
- THEN the top-clients section displays exactly 5 items without runtime errors
- AND `AdminService.clientes()` is NOT used to derive the top-clients list

#### Scenario: ReportesComponent reads clientes count from clientesStats()

- GIVEN `AdminService.clientesStats()` resolves with `{ total: 88 }`
- WHEN `ReportesComponent` initializes
- THEN the clientes count KPI displays 88 without runtime errors

#### Scenario: DashboardComponent reads clientes count from clientesStats()

- GIVEN `AdminService.clientesStats()` resolves with `{ total: 23 }`
- WHEN `DashboardComponent` initializes
- THEN the clientes count KPI displays 23 without runtime errors
- AND `AdminService.clientes()` response `.data` is NOT used to derive the count
