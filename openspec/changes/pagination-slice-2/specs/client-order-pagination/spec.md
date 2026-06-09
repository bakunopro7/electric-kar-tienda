# Client Order Pagination Specification

## Purpose

Replaces the unbounded `GET /api/orders` (client-facing) query with offset
pagination so that a client's order history is fetched in bounded pages.
Updates the `cuenta` page to read the `Paginated<PedidoCliente>` envelope.

---

## Requirements

### Requirement: Paginated Client Order List

The endpoint `GET /api/orders` MUST accept `page` (integer ≥ 1, default 1) and
`limit` (integer 1–100, default 20) query parameters.
It MUST return `Paginated<PedidoCliente>`:
`{ data: PedidoCliente[], meta: { total, page, limit, pages } }`.
It MUST NOT perform an unbounded `findMany` — every query MUST include `skip`
and `take` derived from `page` and `limit`.
`limit` MUST be clamped to 100; any value above 100 MUST be treated as 100.
The response MUST be scoped to the authenticated client's own orders only;
`clienteId` filtering MUST remain unchanged — a client MUST NOT receive another
client's orders.
Existing authentication guard (JWT, CLIENTE role) MUST remain unchanged.
The result MUST be ordered by `creadoEn` descending (newest first).

#### Scenario: Default pagination

- GIVEN an authenticated CLIENTE with 35 orders in the database
- WHEN `GET /api/orders` is called with no query parameters
- THEN the response status is 200
- AND `data` contains exactly 20 items (all belonging to that client)
- AND `meta.total` is 35, `meta.page` is 1, `meta.limit` is 20, `meta.pages` is 2

#### Scenario: Explicit page navigation

- GIVEN an authenticated CLIENTE with 35 orders
- WHEN `GET /api/orders?page=2&limit=20` is called
- THEN `data` contains exactly 15 items
- AND `meta.page` is 2 and `meta.pages` is 2

#### Scenario: Limit capped at 100

- GIVEN an authenticated CLIENTE
- WHEN `GET /api/orders?limit=500` is called
- THEN `limit` is clamped to 100
- AND `meta.limit` in the response is 100

#### Scenario: Page beyond range returns empty data

- GIVEN an authenticated CLIENTE with 5 orders
- WHEN `GET /api/orders?page=99` is called
- THEN the response status is 200
- AND `data` is an empty array
- AND `meta.total` is 5 and `meta.pages` is 1

#### Scenario: Client isolation — cannot see other client's orders

- GIVEN two clients (A and B), each with 10 orders
- WHEN client A calls `GET /api/orders`
- THEN `meta.total` is 10
- AND all items in `data` belong to client A only

#### Scenario: Unauthenticated request rejected

- GIVEN a request with no valid JWT
- WHEN `GET /api/orders` is called
- THEN the response status is 401

---

### Requirement: Frontend Cuenta Page Consumers Updated

`ClienteService.pedidos()` (or equivalent) MUST return
`Observable<Paginated<PedidoCliente>>`.
`CuentaComponent` MUST read `meta.total` for the order count badge; it MUST NOT
use `response.data.length` or `response.length` for the badge count.
`CuentaComponent` MUST read `response.data` for the recent-orders display slice.
`CuentaComponent` MUST render without runtime errors when the paginated response
shape is received.

#### Scenario: Order count badge uses meta.total

- GIVEN `ClienteService.pedidos()` resolves with `{ data: [...5 items], meta: { total: 42, page: 1, limit: 20, pages: 3 } }`
- WHEN `CuentaComponent` initializes
- THEN the order count badge displays 42, not 5
- AND no runtime error is thrown

#### Scenario: Recent orders section reads .data

- GIVEN `ClienteService.pedidos()` resolves with `{ data: [order1, order2, order3], meta: { total: 3, page: 1, limit: 20, pages: 1 } }`
- WHEN `CuentaComponent` initializes
- THEN the recent orders section renders exactly 3 rows from `data`
- AND no runtime error is thrown

#### Scenario: Empty order history renders gracefully

- GIVEN `ClienteService.pedidos()` resolves with `{ data: [], meta: { total: 0, page: 1, limit: 20, pages: 0 } }`
- WHEN `CuentaComponent` initializes
- THEN the order count badge displays 0
- AND the recent orders section is empty (no items rendered, no error thrown)
