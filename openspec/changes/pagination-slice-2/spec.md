# Spec: pagination-slice-2

## Change Summary

Closes the two unbounded `findMany` queries left out of slice 1: the
client-facing order history (`GET /api/orders`) and the admin clientes list
(`GET /api/clientes`). Adds dedicated aggregate endpoints
`GET /api/clientes/top` and `GET /api/clientes/stats`. Updates four frontend
consumers to the new `Paginated<T>` shapes.

## Capability Specs

| Capability | Spec File | Type |
|---|---|---|
| client-order-pagination | `specs/client-order-pagination/spec.md` | New |
| cliente-pagination | `specs/cliente-pagination/spec.md` | New |

## Non-Goals (from proposal)

- Search-as-you-type, date-range filters, or sort controls on any list.
- Any change to already-paginated admin orders (`/orders/all`) or CFDI lists.
- Cursor/keyset pagination — offset is sufficient at current scale.
- `totalGastado` aggregation logic — field is denormalized; maintenance is out of scope here.

## Response Envelope Contract

Both paginated list endpoints MUST return the existing `Paginated<T>` shape:

```typescript
{ data: T[]; meta: { total: number; page: number; limit: number; pages: number } }
```

Default `page=1`, default `limit=20`, max `limit=100` — identical to slice 1 and
the existing products pagination pattern.

`GET /api/clientes/top` returns a plain `T[]` (no envelope) — it is a ranked
list, not a pageable resource.

`GET /api/clientes/stats` returns `{ total: number }` — a single aggregate scalar.

## Invariants

1. No existing role guard MUST be altered by this change.
2. `GET /api/orders` MUST remain scoped to the authenticated client's own orders only.
3. No list endpoint covered by this change MUST perform an unbounded `findMany` after this change.
4. `GET /api/clientes/top` MUST read `Cliente.totalGastado` directly — MUST NOT aggregate from orders.
5. `GET /api/clientes/stats` MUST use Prisma `count` — MUST NOT fetch rows to derive the total.
6. All four frontend consumers (`CuentaComponent`, `ClientesComponent`,
   `ReportesComponent`, `DashboardComponent`) MUST render without runtime errors on the new shapes.
7. Backend and frontend changes MUST ship in a single PR — no intermediate broken state.
