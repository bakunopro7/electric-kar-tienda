# Tasks: Paginate admin order/CFDI lists with dedicated stats endpoint

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550–700 |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR by explicit decision |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

**size:exception rationale**: backend + frontend MUST land together; `T[]` → `{data,meta}` is a breaking shape change across 5 consumers. Splitting creates a window where backend ships but frontend is broken. Single PR is the safer delivery boundary here. Maintainer approval required.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All backend + frontend + tests | PR 1 | Feature branch off `develop`; full vertical slice |

---

## Phase 1: Branch + Migration

- [x] 1.1 **Branch**: `git checkout develop && git checkout -b feature/pagination-stats` — all work for this change lives here.
- [x] 1.2 **Schema edit**: add `@@index([creadoEn])` to the `Pedido` block in `electric-kar/prisma/schema.prisma` (after existing `@@index([metodoPagoId])`).
- [x] 1.3 **Migration SQL**: create `electric-kar/prisma/migrations/<timestamp>_pedido_creadoen_idx/migration.sql` with `CREATE INDEX "Pedido_creadoEn_idx" ON "Pedido"("creadoEn");`.
- [x] 1.4 **Apply migration**: run `pnpm prisma:deploy` then `pnpm prisma:generate` in `electric-kar/`. Verify `Pedido_creadoEn_idx` appears in DB (`\d "Pedido"`).

---

## Phase 2: Backend — Orders (TDD)

- [x] 2.1 **RED — `QueryOrdersDto`**: create `electric-kar/src/orders/dto/query-orders.dto.ts`; write a unit test in `electric-kar/src/orders/orders.service.spec.ts` that fails because the DTO does not yet exist. DTO mirrors `QueryProductDto`: `@Type(()=>Number) @IsInt() @Min(1) page?`, `@Min(1) @Max(100) limit?`, optional `estado?: EstadoPedido`.
- [x] 2.2 **GREEN — `QueryOrdersDto`**: implement the DTO so the import resolves and the test passes.
- [x] 2.3 **RED — `findAll` pagination**: in `orders.service.spec.ts` add tests: (a) default page/limit returns `{data,meta}`; (b) `limit=200` is clamped to 100; (c) `estado` filter passes correct `where`; (d) empty page returns `data:[]` with correct `meta.total`. All fail because `OrdersService.findAll` still returns `T[]`.
- [x] 2.4 **GREEN — `OrdersService.findAll`**: refactor `electric-kar/src/orders/orders.service.ts` — replace unbounded `findMany` with `$transaction([findMany({skip,take,where,orderBy:{creadoEn:'desc'},include:pedidoInclude}), count({where})])`, return `{data, meta:{total,page,limit:take,pages}}`. All 2.3 tests must go green.
- [x] 2.5 **RED — `stats()`**: in `orders.service.spec.ts` add tests: (a) 3 orders totaling 600 → `{ventasTotal:"600.00", pedidosCount:3, ticketPromedio:"200.00"}`; (b) 0 orders → all fields are `"0.00"` / `0`; (c) `ventasTotal` is a string (not a number). All fail.
- [x] 2.6 **GREEN — `OrdersService.stats`**: implement `stats()` in `orders.service.ts` using `$transaction([aggregate({_sum:{total:true}}), count()])`, coalesce with `new Prisma.Decimal(0)`, guard divide-by-zero, return `{ventasTotal, pedidosCount, ticketPromedio}` as strings via `.toFixed(2)`. All 2.5 tests green.
- [x] 2.7 **Controller wiring**: update `electric-kar/src/orders/orders.controller.ts` — `findAll(@Query() dto: QueryOrdersDto)` passes `dto.page, dto.limit, dto.estado`; add `@Get('stats') getStats()` above `@Get(':id')` under the same guard stack. Add `QueryOrdersDto` to `@ApiQuery` decorators.

---

## Phase 3: Backend — CFDI (TDD)

- [x] 3.1 **RED — `QueryCfdiDto`**: create `electric-kar/src/cfdi/dto/query-cfdi.dto.ts`; write `electric-kar/src/cfdi/cfdi.service.spec.ts` with a failing import test. DTO: `page?` and `limit?` only (no `estado`), same decorators as orders.
- [x] 3.2 **GREEN — `QueryCfdiDto`**: implement the DTO; import test passes.
- [x] 3.3 **RED — `CfdiService.findAll` pagination**: add tests in `cfdi.service.spec.ts`: (a) default returns `{data,meta}`; (b) `limit=500` clamped to 100; (c) empty page returns `data:[]`; (d) `orderBy` is `{fecha:'desc'}`. All fail.
- [x] 3.4 **GREEN — `CfdiService.findAll`**: refactor `electric-kar/src/cfdi/cfdi.service.ts` — replace unbounded `findMany` with `$transaction([findMany({skip,take,orderBy:{fecha:'desc'},include:cfdiInclude}), count()])`, return `Paginated<CfdiAdmin>`. All 3.3 tests green.
- [x] 3.5 **Controller wiring**: update `electric-kar/src/cfdi/cfdi.controller.ts` — `findAll(@Query() dto: QueryCfdiDto)` passes `dto.page, dto.limit`.

---

## Phase 4: Frontend — AdminService + Models

- [x] 4.1 **`AdminService` signatures**: update `electric-kar-front/src/app/core/admin.service.ts` — `pedidos(q?:{page?;limit?;estado?})` returns `Observable<Paginated<PedidoAdmin>>`; `cfdis(q?:{page?;limit?})` returns `Observable<Paginated<CfdiAdmin>>`; add `ordersStats()` returning `Observable<{ventasTotal:string; pedidosCount:number; ticketPromedio:string}>`. Build `HttpParams` the same way `produtos()` does.

---

## Phase 5: Frontend — Component Consumers

- [x] 5.1 **`PedidosComponent`** (`electric-kar-front/src/app/admin/pedidos.component.ts`): subscribe to `pedidos({page,limit,estado})`, read `.data` for rows and `.meta` for paginator; add server-side paginator controls; drop client-side `filtrados` computed filter.
- [x] 5.2 **`DashboardComponent`** (`electric-kar-front/src/app/admin/dashboard.component.ts`): call `ordersStats()` for `ventasTotal` and `pedidosCount` KPIs; call `pedidos({limit:6})` for recent-orders list using `.data`. Remove any array-reduce for KPI derivation.
- [x] 5.3 **`ReportesComponent`** (`electric-kar-front/src/app/admin/reportes.component.ts`): replace `pedidos()` array-reduce KPIs with `ordersStats()` signal (`stats.set(s)`); bind `ventasTotal`, `pedidosCount`, `ticketPromedio` from `stats()`. `topClientes` stays on `clientes()` — untouched.
- [x] 5.4 **`CfdiComponent`** (`electric-kar-front/src/app/admin/cfdi.component.ts`): pedido selector uses `pedidos({page:1,limit:100})` → `.data`; CFDI list uses `cfdis()` → `.data`; timbrar/cancelar actions unchanged.

---

## Phase 6: Frontend Unit Tests (TDD)

- [x] 6.1 **RED — `PedidosComponent` spec**: create/extend `pedidos.component.spec.ts`; test that table renders `data` rows from a `Paginated` stub; test fails before component update from 5.1.
- [x] 6.2 **GREEN — `PedidosComponent` spec**: after 5.1, all assertions pass; add `meta.total` assertion.
- [x] 6.3 **RED — `DashboardComponent` spec**: test KPIs come from `ordersStats()` stub, not from array reduce; test fails before 5.2.
- [x] 6.4 **GREEN — `DashboardComponent` spec**: after 5.2, KPI values match stub; recent-orders rendered from `.data`.
- [x] 6.5 **RED — `ReportesComponent` spec**: test `ventasTotal`, `pedidosCount`, `ticketPromedio` come from `ordersStats()` stub; test fails before 5.3.
- [x] 6.6 **GREEN — `ReportesComponent` spec**: after 5.3, all three values match stub.
- [x] 6.7 **RED — `CfdiComponent` spec**: test selector populated from `pedidos({page:1,limit:100}).data` stub and list from `cfdis().data`; fails before 5.4.
- [x] 6.8 **GREEN — `CfdiComponent` spec**: after 5.4, selector and list assertions pass.

---

## Phase 7: E2E Coverage (Playwright)

- [x] 7.1 **Extend `electric-kar-front/e2e/critical-flows.spec.ts`** (or add `admin-pagination.spec.ts`): test that `GET /api/orders/all` as ADMIN returns `{data,meta}` shape (intercept + assert); test `meta.total ≥ 0` and `data` is an array.
- [x] 7.2 **Stats e2e**: assert `GET /api/orders/stats` returns `{ventasTotal, pedidosCount, ticketPromedio}` with no runtime error on the Dashboard KPI block.
- [x] 7.3 **CFDI e2e**: assert `GET /api/cfdi` as ADMIN returns `{data,meta}` shape; CFDI list renders rows from `.data`.
- [x] 7.4 **Role guard e2e**: assert `GET /api/orders/all` with no JWT → 401; `GET /api/orders/stats` with CLIENTE role → 403.

---

## Phase 8: Verification

- [x] 8.1 **Backend tests**: `cd electric-kar && pnpm test` — all service specs (orders, cfdi) green; zero regressions in existing suites. (3 suites, 16 tests pass)
- [x] 8.2 **Frontend build**: `cd electric-kar-front && pnpm build` — zero TypeScript errors; no runtime `undefined.data` or shape mismatches in compiled output.
- [x] 8.3 **E2E**: `pnpm playwright test` in `electric-kar-front/` — all e2e scenarios from Phase 7 pass. (16 total tests, 9 new + 7 existing, all pass)
- [ ] 8.4 **Manual smoke**: start backend (`pnpm start:prod`) and frontend (`pnpm start`); log in as `admin@electrick-kar.mx`; verify Pedidos paginator, Dashboard KPIs, Reportes KPIs, and CfdiComponent selector all render without console errors.
