# Proposal: Paginate admin order/CFDI lists with dedicated stats endpoint

## Intent

`GET /api/orders/all` and `GET /api/cfdi` run unbounded `findMany` with eager
relations (no `skip`/`take`). They degrade in memory and latency as tables grow.
Several admin components derive KPIs (total sales, order count, ticket average)
from the full array, so naive pagination would break them — KPIs must move to an
O(1) aggregate endpoint.

## Scope

### In Scope
- `GET /api/orders/all` → offset pagination (`?page&limit&estado`), reusing the products pattern.
- `GET /api/orders/stats` → `SUM(total)`, `COUNT(*)` via `prisma.pedido.aggregate` (total-ever).
- `GET /api/cfdi` → offset pagination (`?page&limit`); no stats (no CFDI-derived KPIs).
- Prisma migration: `@@index([creadoEn])` on `Pedido` (list orders by `creadoEn desc`).
- Frontend: `AdminService.pedidos()`/`cfdis()` consume `{ data, meta }`; add `ordersStats()`. Update `PedidosComponent`, `DashboardComponent`, `ReportesComponent`, `CfdiComponent`.

### Out of Scope (Non-Goals)
- `GET /api/clientes` pagination → deferred follow-up (lean select, lower risk; would add a `/clientes/top` endpoint + 3 components).
- Date-range stats filtering → future (the `ventasMes` chart is hardcoded demo data anyway).
- CfdiComponent pedido-selector redesign (search-as-you-type) → future.
- Hardcoded demo charts (`ventasMes`/`metodos`/`categorias`) → untouched.
- Renaming `/orders/all` → `/admin` → cosmetic, skipped.

## Capabilities

### New Capabilities
- `order-pagination`: paginated `GET /api/orders/all` + aggregate `GET /api/orders/stats`.
- `cfdi-pagination`: paginated `GET /api/cfdi`.

### Modified Capabilities
- None (no existing spec files).

## Approach

Approach C from exploration: offset pagination (`$transaction([findMany, count])`)
+ dedicated stats endpoint. Reuse the EXISTING `Paginated<T>` envelope
`{ data, meta: { total, page, limit, pages } }` from `products.service.ts` and
`models.ts` — no new conventions. Default `limit=20`, max `100` (matches products).
CfdiComponent pedido selector populated short-term via paginated orders with
`limit=100` on page 1.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `electric-kar/src/orders/orders.{service,controller}.ts` | Modified | Paginate `findAll`, add `stats` |
| `electric-kar/src/cfdi/cfdi.{service,controller}.ts` | Modified | Paginate `findAll` |
| `electric-kar/prisma/schema.prisma` + migration | Modified | `@@index([creadoEn])` |
| `electric-kar-front/.../admin.service.ts` | Modified | `{data,meta}` + `ordersStats()` |
| `admin/{pedidos,dashboard,reportes,cfdi}.component.ts` | Modified | Consume paginated/stats data |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking `T[]` → `{data,meta}`; 4 orders + 1 cfdi consumers | High | Ship FE + BE together in one PR on a dedicated branch |
| Deep-offset scan without index | Med | Migration adds `@@index([creadoEn])` |
| Cfdi selector misses orders beyond page 1 | Med | `limit=100` page-1 load short-term; redesign deferred |

## Rollback Plan

Single PR on a dedicated branch — revert the merge commit. Migration is additive
(index only, no data change); leaving the index in place is harmless if FE/BE roll back.

## Dependencies

- Local migration flow (`prisma:deploy` + `prisma:generate`); `migrate dev` is interactive here.

## Success Criteria

- [ ] `/orders/all` and `/cfdi` return `{ data, meta }`; no unbounded `findMany`.
- [ ] `/orders/stats` returns correct `SUM`/`COUNT`; KPIs match pre-change totals.
- [ ] All 5 consumers render with paginated data; CfdiComponent selector still lists orders.
- [ ] `@@index([creadoEn])` present after migration.
