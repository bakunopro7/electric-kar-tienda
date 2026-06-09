# Exploration: pagination-stats

## Problem Statement

Two admin-facing API endpoints perform unbounded `findMany` queries that fetch
ALL rows plus eager-loaded relations, with no `skip`/`take`. As the order and
CFDI tables grow this becomes a memory and latency problem. Additionally,
several frontend admin components compute aggregate KPIs (total sales, order
count, ticket average) from the fetched arrays — so naive pagination breaks
those components unless aggregates move to a dedicated stats endpoint.

## Current State — Verified File:Line Map

### Backend — unbounded queries

| Service | Method | Line | Endpoint (controller) | Nested includes |
|---------|--------|------|-----------------------|-----------------|
| `electric-kar/src/orders/orders.service.ts` | `findAll()` | 176–181 | `GET /api/orders/all` (RolesGuard: ADMIN, SUPER, VENDEDOR) | `lineas.producto`, `cliente` |
| `electric-kar/src/cfdi/cfdi.service.ts` | `findAll()` | 144–148 | `GET /api/cfdi` (RolesGuard: CONTADOR, ADMIN, SUPER) | `lineas`, `complementos`, `pedido` |
| `electric-kar/src/clientes/clientes.service.ts` | `findAll()` | 78–83 | `GET /api/clientes` (RolesGuard) | none (select projection only) |

### Existing pagination reference (REUSE THIS)

`electric-kar/src/products/products.service.ts:25–56` already implements offset
pagination with `skip`/`take` + `$transaction([findMany, count])` and returns
`{ data, meta: { total, page, limit, pages } }`. The `Paginated<T>` interface is
defined in `electric-kar-front/src/app/core/models.ts:34–37`. This is the
pattern to follow — zero new conventions.

### Prisma indexes on Pedido (schema.prisma 333–336)

`@@index([clienteId])`, `@@index([estado])`, `@@index([cuponId])`,
`@@index([metodoPagoId])`. **Missing `@@index([creadoEn])`** — the list orders
by `creadoEn desc`; `skip/take` + sort will sequential-scan at scale. A migration
adding it should be part of this change.

Note: `Pedido` has two DateTime fields — `fecha` (313) and `creadoEn` (330). The
service orders by `creadoEn`; the frontend `PedidoAdmin` uses `creadoEn`.
Canonical for ordering = `creadoEn`.

## Frontend Consumer Map (complete)

### `AdminService.pedidos()` → `GET /api/orders/all` returning `PedidoAdmin[]`

| Component | File | Usage |
|-----------|------|-------|
| `PedidosComponent` | `admin/pedidos.component.ts:68` | Full list in `<table>`, client-side filter by `estado` |
| `DashboardComponent` | `admin/dashboard.component.ts:98` | `reduce` total ventas KPI, `slice(0,6)` recent, `.length` count |
| `ReportesComponent` | `admin/reportes.component.ts:158` | `reduce` ventas total, `.length`, ticket promedio |
| `CfdiComponent` | `admin/cfdi.component.ts:151` | Populates `<select>` to pick a pedido to invoice |

### `AdminService.cfdis()` → `GET /api/cfdi` returning `CfdiAdmin[]`

| Component | File | Usage |
|-----------|------|-------|
| `CfdiComponent` | `admin/cfdi.component.ts:202` | Full CFDI list in `<table>`, timbrar/cancelar inline |

### `AdminService.clientes()` → `GET /api/clientes` returning `ClienteAdmin[]`

| Component | File | Usage |
|-----------|------|-------|
| `DashboardComponent` | `admin/dashboard.component.ts:104` | `.length` count KPI |
| `ReportesComponent` | `admin/reportes.component.ts:159` | `.length` count, sort+slice top-5 by `totalGastado` |
| `ClientesComponent` | `admin/clientes.component.ts:62` | Full list table, inline segmento change |

### Key finding — ReportesComponent KPIs

"Real" KPIs: (1) `ventas` = sum of all `total`; (2) `pedidos().length`;
(3) `ticket` = ventas/count (derived); (4) `clientes().length`. The
`ventasMes`/`metodos`/`categorias` charts are **hardcoded demo data**, not API.
`topClientes` uses the denormalized `Cliente.totalGastado` (updated in
`orders.service.ts:checkout()` 122–127) — so it does NOT need to aggregate
`Pedido.total`; a `GET /clientes/top?limit=5` with `orderBy: { totalGastado }`
covers it.

## KPIs that need a stats endpoint

`GET /api/orders/stats` for reportes + dashboard:

| KPI | Aggregate | Prisma |
|-----|-----------|--------|
| Total ventas | `SUM(total)` | `pedido.aggregate({ _sum: { total: true } })` |
| Pedidos count | `COUNT(*)` | `pedido.count()` |
| Ticket promedio | derived | none |

## Approach Comparison

| Approach | Pros | Cons |
|----------|------|------|
| **A — Offset (skip/take + count)** | Exact page numbers (admin expectation); matches existing products pattern; simple to test; OK at thousands of rows | Deep-offset degradation; not for real-time feeds |
| **B — Cursor/keyset** | Stable under concurrent inserts; O(1) seek | No page numbers; bigger migration; no benefit at SME scale |
| **C — Offset + dedicated stats endpoints** | Clean separation; O(1) aggregates vs O(N) fetch; stats cacheable later | Two endpoints per resource; new frontend service method |

## Recommendation

**Approach C** — offset pagination for list endpoints + dedicated `stats`
aggregate endpoints. Matches the existing `products` pattern, solves the KPI
breakage cleanly via `prisma.aggregate`, and avoids cursor complexity that buys
nothing at this scale.

## Scope Boundary

**In scope:**
- `GET /api/orders/all` → `?page&limit&estado` paginated + new `GET /api/orders/stats`
- `GET /api/cfdi` → `?page&limit` paginated (no stats — no CFDI-derived KPIs)
- Frontend: `AdminService.pedidos()`/`cfdis()` + new `ordersStats()`; update
  `PedidosComponent`, `DashboardComponent`, `ReportesComponent`, `CfdiComponent`
- Migration: `@@index([creadoEn])` on `Pedido`

**Out of scope (flag/defer):**
- `GET /api/clientes` pagination (lean select; breaks `topClientes` → needs
  `GET /clientes/top`). Decide in proposal.
- `GET /api/auditoria` already bounded (`take: 200`).
- Small lookup tables (cupones, users, sesiones).
- CfdiComponent pedido selector redesign (search-as-you-type) — future.

## Open Questions for Proposal

1. Default page size — 20 (products) or 50 for denser admin lists?
2. Clientes pagination — include now or defer?
3. Orders stats — total-ever only, or date-range filtering from day 1?
4. CfdiComponent pedido selector — accept page-1 high-limit load, or redesign?
5. `GET /orders/all` path — keep `all` or rename `admin`?

## Risks

- Breaking change `T[]` → `{ data, meta }` — all 4 pedidos consumers + 1 cfdi
  consumer must update atomically (same PR/deploy).
- Missing `@@index([creadoEn])` — include the migration.
- CfdiComponent dropdown won't show orders beyond page 1 if naively paginated.
