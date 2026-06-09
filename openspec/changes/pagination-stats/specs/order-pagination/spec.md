# Order Pagination & Stats Specification

## Purpose

Replaces the unbounded `GET /api/orders/all` query with offset pagination and
adds a dedicated aggregate endpoint `GET /api/orders/stats` so that admin
components can render KPIs without fetching all rows.

---

## Requirements

### Requirement: Paginated Order List

The endpoint `GET /api/orders/all` MUST accept `page` (integer ≥ 1, default 1),
`limit` (integer 1–100, default 20), and optional `estado` query parameters.
It MUST return a `Paginated<PedidoAdmin>` envelope
`{ data: PedidoAdmin[], meta: { total, page, limit, pages } }`.
It MUST NOT perform an unbounded `findMany` — every query MUST include `skip`
and `take` derived from `page` and `limit`.
The single database round-trip MUST include the same eager relations as before
(`lineas.producto`, `cliente`) with no additional joins (no N+1).
Existing role guard (ADMIN, SUPER, VENDEDOR) MUST remain unchanged.

#### Scenario: Default pagination

- GIVEN an authenticated ADMIN user with 35 orders in the database
- WHEN `GET /api/orders/all` is called with no query parameters
- THEN the response status is 200
- AND `data` contains exactly 20 items
- AND `meta.total` is 35, `meta.page` is 1, `meta.limit` is 20, `meta.pages` is 2

#### Scenario: Explicit page navigation

- GIVEN an authenticated ADMIN user with 35 orders in the database
- WHEN `GET /api/orders/all?page=2&limit=20` is called
- THEN `data` contains exactly 15 items
- AND `meta.page` is 2 and `meta.pages` is 2

#### Scenario: Limit capped at 100

- GIVEN an authenticated ADMIN user
- WHEN `GET /api/orders/all?limit=200` is called
- THEN `limit` is clamped to 100
- AND `meta.limit` in the response is 100

#### Scenario: Estado filter

- GIVEN an authenticated ADMIN user with 10 orders of estado `PAGADO` and 25 of other estados
- WHEN `GET /api/orders/all?estado=PAGADO` is called
- THEN `data` contains only orders with `estado === 'PAGADO'`
- AND `meta.total` is 10

#### Scenario: Page beyond range returns empty data

- GIVEN an authenticated ADMIN user with 5 orders in the database
- WHEN `GET /api/orders/all?page=99` is called
- THEN the response status is 200
- AND `data` is an empty array
- AND `meta.total` is 5 and `meta.pages` is 1

#### Scenario: Role guard unchanged — unauthenticated request rejected

- GIVEN a request with no valid JWT
- WHEN `GET /api/orders/all` is called
- THEN the response status is 401

#### Scenario: Role guard unchanged — insufficient role rejected

- GIVEN an authenticated user with role CLIENTE
- WHEN `GET /api/orders/all` is called
- THEN the response status is 403

---

### Requirement: Order Stats Aggregate

The endpoint `GET /api/orders/stats` MUST exist and MUST be accessible to roles
ADMIN, SUPER, and VENDEDOR.
It MUST return `{ ventasTotal: string, pedidosCount: number, ticketPromedio: string }`
(money fields are Decimal serialized via `.toFixed(2)` strings to avoid float drift).
`ventasTotal` MUST equal the database-level `SUM` of `Pedido.total` across all
rows (not computed from a fetched array).
`pedidosCount` MUST equal the database-level `COUNT(*)` of `Pedido`.
`ticketPromedio` MUST equal `ventasTotal / pedidosCount` when `pedidosCount > 0`
and MUST be `0` when `pedidosCount` is `0` (no divide-by-zero).
The implementation MUST NOT fetch individual `Pedido` rows to compute these
values — Prisma `aggregate` or `count` primitives MUST be used.

#### Scenario: Stats with existing orders

- GIVEN an authenticated ADMIN user and the database contains 3 orders with totals 100, 200, 300
- WHEN `GET /api/orders/stats` is called
- THEN the response status is 200
- AND `ventasTotal` is 600
- AND `pedidosCount` is 3
- AND `ticketPromedio` is 200

#### Scenario: Stats with no orders (empty database)

- GIVEN an authenticated ADMIN user and the database contains 0 orders
- WHEN `GET /api/orders/stats` is called
- THEN the response status is 200
- AND `ventasTotal` is 0
- AND `pedidosCount` is 0
- AND `ticketPromedio` is 0

#### Scenario: Role guard — VENDEDOR can read stats

- GIVEN an authenticated user with role VENDEDOR
- WHEN `GET /api/orders/stats` is called
- THEN the response status is 200

#### Scenario: Role guard — CLIENTE cannot read stats

- GIVEN an authenticated user with role CLIENTE
- WHEN `GET /api/orders/stats` is called
- THEN the response status is 403

---

### Requirement: Pedido Index Migration

The `Pedido` table MUST have a database index on the `creadoEn` column
(`@@index([creadoEn])` in `schema.prisma`) after the migration is applied.
The migration MUST be additive (index-only, no data change).

#### Scenario: Index present after migration

- GIVEN the migration `<timestamp>_add_index_pedido_creado_en` has been applied
- WHEN the Prisma schema is inspected or the migration SQL is reviewed
- THEN `@@index([creadoEn])` appears in the `Pedido` model
- AND no data rows are modified or removed by the migration

---

### Requirement: Frontend Order Consumers Updated

`AdminService.pedidos()` MUST return `Observable<Paginated<PedidoAdmin>>`.
`AdminService.ordersStats()` MUST exist and return
`Observable<{ ventasTotal: string; pedidosCount: number; ticketPromedio: string }>`.
`PedidosComponent` MUST read `response.data` for the table rows.
`DashboardComponent` MUST call `ordersStats()` for KPI values (`ventasTotal`,
`pedidosCount`); it MUST NOT derive totals by reducing the orders array.
`ReportesComponent` MUST call `ordersStats()` for `ventasTotal`, `pedidosCount`,
and `ticketPromedio`; it MUST NOT derive totals by reducing the orders array.
All four components MUST render without runtime errors when the paginated
response shape is received.

#### Scenario: PedidosComponent renders paginated table

- GIVEN `AdminService.pedidos()` resolves with `{ data: [order1, order2], meta: { total: 2, page: 1, limit: 20, pages: 1 } }`
- WHEN `PedidosComponent` initializes
- THEN the table renders exactly 2 rows without runtime errors

#### Scenario: DashboardComponent reads stats from ordersStats()

- GIVEN `AdminService.ordersStats()` resolves with `{ ventasTotal: 500, pedidosCount: 5, ticketPromedio: 100 }`
- WHEN `DashboardComponent` initializes
- THEN the KPI display shows ventas = 500 and pedidos = 5 without runtime errors
- AND `AdminService.pedidos()` response `.data` is used only for the recent-orders slice

#### Scenario: ReportesComponent reads stats from ordersStats()

- GIVEN `AdminService.ordersStats()` resolves with `{ ventasTotal: 1200, pedidosCount: 10, ticketPromedio: 120 }`
- WHEN `ReportesComponent` initializes
- THEN ventas = 1200, pedidos = 10, and ticket = 120 are displayed without runtime errors

#### Scenario: CfdiComponent pedido selector still lists orders

- GIVEN `AdminService.pedidos()` is called with `{ page: 1, limit: 100 }`
- WHEN `CfdiComponent` initializes
- THEN the pedido selector `<select>` is populated from `response.data` without runtime errors
