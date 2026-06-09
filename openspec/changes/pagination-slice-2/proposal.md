# Proposal: Pagination Slice 2 — Client Orders & Admin Clientes

## Intent

Slice 1 (`pagination-stats`) bounded the admin orders and CFDI lists and moved
KPIs to dedicated `stats` endpoints. Two unbounded `findMany` queries remain and
were explicit non-goals then. As order and customer tables grow, both fetch ALL
rows on every load — a latency/memory liability. This slice closes that gap using
the SAME `Paginated<T>` envelope and offset pattern, with no new conventions.

## Scope

### In Scope
- `GET /api/orders` (`OrdersService.findAllForCliente`) → offset pagination, `?page&limit` (default 20, max 100), `Paginated<PedidoCliente>` envelope.
- `GET /api/clientes` (`ClientesService.findAll`) → offset pagination, same envelope.
- New `GET /api/clientes/top?limit=5` (orderBy `totalGastado desc`, `take limit`) → returns `ClienteAdmin[]` (existing `clienteSelect` projection).
- New `GET /api/clientes/stats` → `{ total }` (Prisma `count`).
- Frontend: paginate `cuenta` "mis pedidos" page; repoint `ReportesComponent` (topClientes + count KPI) and `DashboardComponent` (count KPI) to the new endpoints; add a paginator to `ClientesComponent`.

### Out of Scope
- Search-as-you-type, date-range filters, sorting controls.
- Any change to already-paginated lists (orders admin, cfdi) or their stats.
- Cursor/keyset pagination — offset is sufficient at this scale.

## Capabilities

### New Capabilities
- `client-order-pagination`: paginated client order history (`GET /api/orders`) + its frontend consumer.
- `cliente-pagination`: paginated admin clientes list + `clientes/top` and `clientes/stats` aggregate endpoints + repointed consumers.

### Modified Capabilities
- None. (`order-pagination` spec unchanged — it covers the admin `/orders/all` list, not the client `/orders` history.)

## Approach

Mirror `OrdersService.findAll` (already shipped in slice 1): `Math.min(limit, 100)`,
`$transaction([findMany({ skip, take, orderBy: { creadoEn: 'desc' } }), count])`,
return `{ data, meta: { total, page, limit, pages } }`. For clientes, the breaking
shape change is mitigated by serving the two aggregate consumers from dedicated
endpoints BEFORE the list is paginated: `topClientes` reads the denormalized
`Cliente.totalGastado` (no order aggregation), and the count KPI reads
`clientes/stats`. The `cuenta` page count badge (`pedidos().length`) switches to
`meta.total`; recent-orders slice reads `.data`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `electric-kar/src/orders/orders.service.ts` (~169) | Modified | `findAllForCliente` → `skip/take` + count envelope |
| `electric-kar/src/orders/orders.controller.ts` | Modified | `GET /api/orders` accepts `page`/`limit` |
| `electric-kar/src/clientes/clientes.service.ts` (~78) | Modified | `findAll` paginated; add `findTop`, `stats` |
| `electric-kar/src/clientes/clientes.controller.ts` | Modified | add `GET /clientes/top`, `GET /clientes/stats` |
| `electric-kar-front/.../core` services + models | Modified | client `pedidos()` → `Paginated`; admin clientes/top/stats methods |
| `electric-kar-front/.../pages/cuenta/cuenta.component.ts` | Modified | read `.data`/`.meta`; paginator |
| `electric-kar-front/.../admin/clientes.component.ts` | Modified | read `.data`/`.meta`; paginator |
| `electric-kar-front/.../admin/reportes.component.ts` | Modified | topClientes + count from new endpoints |
| `electric-kar-front/.../admin/dashboard.component.ts` | Modified | clientes count from `clientes/stats` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `T[]` → `{ data, meta }` breaks clientes consumers | High | Ship backend + 4 frontend consumers atomically in one PR; aggregate endpoints serve KPIs |
| `cuenta` count/recent break on shape change | Med | Switch count to `meta.total`, recent to `.data` in same PR |
| Deep-offset scan on large clientes table | Low | Acceptable at SME scale; `creadoEn` ordering, index deferred |

## Rollback Plan

Single PR on `feat/pagination-slice-2`. Revert the merge commit — restores both
unbounded `findMany` calls and array-shaped responses; no schema/migration change,
so no DB rollback needed.

## Dependencies

- None. Builds on slice-1 conventions (already merged).

## Success Criteria

- [ ] `GET /api/orders` and `GET /api/clientes` return `{ data, meta }`, never an unbounded array.
- [ ] `clientes/top` and `clientes/stats` return correct top-5 and total.
- [ ] `cuenta`, `ClientesComponent`, `ReportesComponent`, `DashboardComponent` render without runtime errors on the new shapes.
- [ ] Backend + frontend ship together in one PR (no broken intermediate state).
