# Design: Paginate admin order/CFDI lists with dedicated stats endpoint

## Technical Approach

Approach C (offset pagination + dedicated stats). Reuse the EXACT products
pattern: `$transaction([findMany, count])` returning `{ data, meta: { total,
page, limit, pages } }` (the `Paginated<T>` envelope already in `models.ts:34`).
Zero new conventions. KPIs move off the full array onto an O(1)
`prisma.pedido.aggregate` endpoint. Ship backend + 5 frontend consumers in one
PR (breaking `T[]` → `{data,meta}`).

## Pattern to copy faithfully

Backend (`products.service.ts:25-56`):

```ts
const page = query.page ?? 1;
const limit = query.limit ?? 20;
const [data, total] = await this.prisma.$transaction([
  this.prisma.producto.findMany({ where, skip: (page - 1) * limit, take: limit,
    orderBy: { creadoEn: 'desc' }, include: { ... } }),
  this.prisma.producto.count({ where }),
]);
return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
```

Parse/clamp is done by `QueryProductDto` (`@Type(()=>Number) @IsInt() @Min(1)`
for page; `@Min(1) @Max(100)` for limit). The controller takes `@Query() dto`.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|----------|--------|-----------------------|-----------|
| Pagination style | Offset (skip/take + count) | Cursor/keyset | Matches products; admin needs page numbers; trivial scale |
| Query parsing | New `QueryOrdersDto`/`QueryCfdiDto` mirroring `QueryProductDto` | Inline `@Query('page')` + manual parse | Keeps class-validator clamp (`@Max(100)`), Swagger docs, one convention |
| Stats shape | Separate `GET /orders/stats` | Embed totals in list `meta` | List meta is page-scoped; stats are total-ever and O(1) |
| `estado` filter | Server-side via `where` | Keep client-side `filter()` | Client filter breaks once list is paginated |
| Decimal `_sum` → JSON | `(_sum.total ?? new Prisma.Decimal(0)).toFixed(2)` → string | `.toNumber()` | Codebase serializes Decimal as string (`models.ts:2`); avoids float loss |
| Cfdi selector source | Reuse `pedidos({limit:100, page:1})` | New search endpoint | Selector redesign is an explicit non-goal |

## Data Flow

    Admin UI ──GET /orders/all?page&limit&estado──▶ OrdersController
                                                        │ @Query() QueryOrdersDto (clamped)
                                                        ▼
                                              OrdersService.findAll ──$transaction([findMany, count])──▶ PG (Pedido_creadoEn_idx)
                                                        ▼
                                              { data, meta } ──▶ Paginated<PedidoAdmin>

    Dashboard / Reportes ──GET /orders/stats──▶ OrdersService.stats ──aggregate+count──▶ { ventasTotal, pedidosCount, ticketPromedio }

## Backend contracts

```ts
// orders.service.ts — keep existing pedidoInclude
async findAll(page = 1, limit = 20, estado?: EstadoPedido) {
  const take = Math.min(limit, 100);                 // safety net; DTO also clamps
  const where = estado ? { estado } : {};
  const [data, total] = await this.prisma.$transaction([
    this.prisma.pedido.findMany({ where, skip: (page - 1) * take, take,
      orderBy: { creadoEn: 'desc' }, include: pedidoInclude }),
    this.prisma.pedido.count({ where }),
  ]);
  return { data, meta: { total, page, limit: take, pages: Math.ceil(total / take) } };
}

async stats() {
  const [agg, pedidosCount] = await this.prisma.$transaction([
    this.prisma.pedido.aggregate({ _sum: { total: true } }),
    this.prisma.pedido.count(),
  ]);
  const ventas = agg._sum.total ?? new Prisma.Decimal(0);     // Decimal | null
  const ticket = pedidosCount > 0 ? ventas.div(pedidosCount) : new Prisma.Decimal(0);
  return {
    ventasTotal: ventas.toFixed(2),                            // string, 2dp
    pedidosCount,
    ticketPromedio: ticket.toFixed(2),                         // string, 2dp
  };
}
```

`CfdiService.findAll(page, limit)` — identical shape, keep `cfdiInclude`, keep
`orderBy: { fecha: 'desc' }` (CFDI has no `creadoEn`; `fecha` is its sort field).
No new index needed for CFDI (out of scope; low volume).

Controllers: add `findAll(@Query() dto: QueryOrdersDto)` and a new
`@Get('stats')` under the SAME guard stack. Order routes carefully — `@Get('stats')`
and `@Get('all')` are static and already precede `@Get(':id')`, so no shadowing.

## Migration (manual workflow — `migrate dev` is interactive here)

Schema edit (`schema.prisma`, Pedido block):

```diff
   @@index([cuponId])
   @@index([metodoPagoId])
+  @@index([creadoEn])
```

Hand-write `prisma/migrations/<ts>_pedido_creadoen_idx/migration.sql`:

```sql
-- Index Pedido.creadoEn: serves the admin list ORDER BY creadoEn DESC + skip/take.
CREATE INDEX "Pedido_creadoEn_idx" ON "Pedido"("creadoEn");
```

Then `pnpm prisma:deploy` + `pnpm prisma:generate`.

## Frontend changes

`admin.service.ts`:
- `pedidos(q?: {page?;limit?;estado?})` → `Observable<Paginated<PedidoAdmin>>` (HttpParams like `productos()`).
- `cfdis(q?: {page?;limit?})` → `Observable<Paginated<CfdiAdmin>>`.
- add `ordersStats()` → `Observable<{ventasTotal:string; pedidosCount:number; ticketPromedio:string}>`.

Consumer deltas:
- **PedidosComponent**: server-side paginator + `estado` filter; drop client `filtrados` filter; read `r.data`/`r.meta`.
- **CfdiComponent**: selector load `pedidos({limit:100,page:1})` → `.data`; list `cfdis()` → `.data`.
- **DashboardComponent**: KPIs from `ordersStats()` (`ventasTotal`, `pedidosCount`); recent-orders list from `pedidos({limit:6})`.
- **ReportesComponent** (trickiest) BEFORE/AFTER:

```ts
// BEFORE: derived from full pedidos() array
this.admin.pedidos().subscribe(l => this.pedidos.set(l));
value: this.fmt(this.ventas())           // ventas = reduce(sum total)
value: String(this.pedidos().length)
// ticket = ventas / pedidos.length
```
```ts
// AFTER: KPI source = ordersStats(); pedidos() no longer fuels KPIs
this.admin.ordersStats().subscribe(s => this.stats.set(s));
value: this.fmt(+this.stats().ventasTotal)
value: String(this.stats().pedidosCount)
value: this.fmt(+this.stats().ticketPromedio)   // server-computed, no client divide
```
`topClientes` keeps using `clientes()` + denormalized `totalGastado` (untouched).

## Gotchas

- **Field ordering**: keep static routes (`/all`, `/stats`) before `:id` — already true.
- **Decimal**: aggregate `_sum.total` is `Decimal | null`; coalesce then `.toFixed(2)` → string. Never `.toNumber()` (float drift on money). Frontend does `+stats().ventasTotal` only for `Intl` formatting.
- **SSR**: admin routes are CSR/guarded; no SSR prefetch impact. `ordersStats()` is a plain authenticated GET, safe under existing `adminContext`.
- **Divide-by-zero**: `ticketPromedio` guarded when `pedidosCount === 0`.
- **`limit` echo**: meta echoes the clamped `take`, not the raw request, so the FE paginator stays consistent.

## Non-goals honored

No `/clientes` pagination, no `/clientes/top`, no date-range stats, no CFDI stats, no selector redesign, no route rename, hardcoded demo charts untouched.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `stats()` divide-by-zero + Decimal→string; `findAll` clamp/meta | service spec, mocked Prisma |
| Integration | `/orders/stats` matches `SUM`; list returns `{data,meta}`; guard intact | e2e with seed |
| FE | KPIs equal pre-change totals; paginator + estado filter | component spec |

## Open Questions

- None blocking.
