# Tasks: Pagination Slice 2 — Client Orders & Admin Clientes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550–700 (additions + deletions) |
| 400-line budget risk | High |
| Chained PRs recommended | No — atomic shape-change contract requires backend + frontend together |
| Suggested split | Single PR `feat/pagination-slice-2` → develop |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

**size:exception rationale**: The `T[]` → `Paginated<T>` shape change on `/api/clientes` and `/api/orders` would leave four frontend consumers broken in any intermediate state. Backend and frontend are a single atomic unit — no slice boundary exists that keeps the app functional. Splitting into chained PRs would require a version-negotiation shim that adds more complexity than the exception saves.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All tasks | PR 1 | Single PR; size:exception approved |

---

## Phase 1: Commit Planning Artifacts

- [x] 1.1 `git add openspec/changes/pagination-slice-2/` — stage `proposal.md`, `spec.md`, `tasks.md`, and both delta specs so planning artifacts travel with the branch.

---

## Phase 2: Backend — Client Order Pagination (TDD)

- [x] 2.1 **RED** — In `electric-kar/src/orders/orders.service.spec.ts`, add `describe('OrdersService.findAllForCliente')` with tests for: default pagination (20 items, meta.total=35, meta.pages=2), page 2 navigation (15 items), limit clamped to 100, page beyond range (empty data), client isolation (clienteId filter stays in `where`). Run `pnpm test` — confirm new tests fail.
- [x] 2.2 **GREEN** — In `electric-kar/src/orders/orders.service.ts`, rewrite `findAllForCliente(clienteId, page=1, limit=20)`: `take = Math.min(limit, 100)`, `$transaction([findMany({ where: {clienteId}, skip, take, orderBy: {creadoEn:'desc'}, include: pedidoInclude }), count({where: {clienteId}})])`, return `{ data, meta: {total, page, limit: take, pages: Math.ceil(total/take)||1} }`. Run `pnpm test` — confirm all pass.
- [x] 2.3 Create `electric-kar/src/orders/dto/query-client-orders.dto.ts` — `page` and `limit` fields, same class-validator decorators as `QueryOrdersDto` (no `estado` field). Keep in parity with `QueryOrdersDto`.
- [x] 2.4 In `electric-kar/src/orders/orders.controller.ts`, update `myOrders` handler: accept `@Query() dto: QueryClientOrdersDto`, pass `dto.page, dto.limit` to `findAllForCliente`. No role change.

---

## Phase 3: Backend — Admin Clientes Pagination + Aggregates (TDD)

- [x] 3.1 Create `electric-kar/src/clientes/clientes.service.spec.ts` — add `describe('ClientesService.findAll')` with tests for: default pagination (20/55 items), page 3 navigation (15 items), limit clamped to 100, page beyond range (empty data). Add `describe('ClientesService.findTop')` with tests for: returns top-N by `totalGastado` desc (uses `findMany` orderBy, not aggregation), limit defaults to 5, limit clamped to 50. Add `describe('ClientesService.stats')` with tests for: `{ total: 42 }` from `prisma.cliente.count()`, returns `{ total: 0 }` when empty. Run `pnpm test` — confirm new tests fail.
- [x] 3.2 Create `electric-kar/src/clientes/dto/query-clientes.dto.ts` — `page` and `limit` fields (same class-validator pattern as `QueryOrdersDto`).
- [x] 3.3 **GREEN** — In `electric-kar/src/clientes/clientes.service.ts`, rewrite `findAll(page=1, limit=20)` to use `$transaction([findMany({skip, take, orderBy:{creadoEn:'desc'}, select: clienteSelect}), count()])`, return `Paginated<ClienteAdmin>` shape. Run `pnpm test`.
- [x] 3.4 **GREEN** — Add `findTop(limit=5)` to `clientes.service.ts`: `take = Math.min(limit, 50)`, `findMany({ select: clienteSelect, orderBy: { totalGastado: 'desc' }, take })`. Returns `ClienteAdmin[]` — no envelope. Run `pnpm test`.
- [x] 3.5 **GREEN** — Add `stats()` to `clientes.service.ts`: `return { total: await this.prisma.cliente.count() }`. Run `pnpm test` — all pass.
- [x] 3.6 **ROUTE ORDER GOTCHA** — In `electric-kar/src/clientes/clientes.controller.ts`, add `GET /clientes/top` and `GET /clientes/stats` handlers BEFORE the existing `GET /clientes/:id` handler. NestJS resolves routes top-to-bottom; declaring `top`/`stats` after `:id` causes NestJS to match "top" and "stats" as `:id` values (404 or wrong data). Correct declaration order: `GET /`, `GET /top`, `GET /stats`, `GET /:id`. Update `GET /` to accept `@Query() dto: QueryClientesDto`, pass to `findAll`. Add `@Get('top')` for `findTop(limit)`, `@Get('stats')` for `stats()` — both guarded by `Roles(ADMIN, SUPER)` + `RolesGuard`. No change to existing `/:id` and `/:id/segmento` handlers.

---

## Phase 4: Frontend — Service Signatures

- [x] 4.1 In `electric-kar-front/src/app/core/cliente.service.ts`: change `pedidos(page=1, limit=20)` return type to `Observable<Paginated<PedidoCliente>>`; add `Paginated` import from `./models`; update HTTP call to pass `?page&limit` query params via `HttpParams`. Keep `PedidoCliente` interface unchanged.
- [x] 4.2 In `electric-kar-front/src/app/core/admin.service.ts`: change `clientes(q?: {page?:number; limit?:number})` signature and return type to `Observable<Paginated<ClienteAdmin>>`; pass `page`/`limit` params. Add `clientesTop(limit?: number): Observable<ClienteAdmin[]>` method hitting `GET /clientes/top?limit=`. Add `clientesStats(): Observable<{ total: number }>` method hitting `GET /clientes/stats`.

---

## Phase 5: Frontend — Consumer Updates

- [x] 5.1 In `electric-kar-front/src/app/pages/cuenta/cuenta.component.ts`: change `pedidos` signal type to `signal<PedidoCliente[]>([])` (keep internal signal as array); add `pedidosMeta` signal for `meta`. In constructor subscription: `next: (r) => { this.pedidos.set(r.data); this.pedidosMeta.set(r.meta); this.loading.set(false); }`. Replace `pedidos().length` in the count badge (resumen section) with `pedidosMeta()?.total ?? 0`. Existing `pedidos()` template iteration over `.data` items (recently-ordered slice uses `pedidos().slice(0,3)`) — already uses the `pedidos` array signal, so it continues to work after `.data` extraction. Verify no use of raw `response.length`.
- [x] 5.2 In `electric-kar-front/src/app/admin/clientes.component.ts`: change `clientes` signal to `signal<ClienteAdmin[]>([])` (store `.data` array); add `clientesMeta` signal. Update constructor subscription to `next: (r) => { this.clientes.set(r.data); this.clientesMeta.set(r.meta); ... }`. Add a paginator UI binding if `clientesMeta().pages > 1` (simple page buttons with `currentPage` signal, re-calls `admin.clientes({page})` on change).
- [x] 5.3 In `electric-kar-front/src/app/admin/reportes.component.ts`: add `clientesStats = signal<{total:number}>({total:0})`; add `topClientes = signal<ClienteAdmin[]>([])`. In constructor, replace the `admin.clientes()` call with two new calls: `admin.clientesTop(5).subscribe(...)` → `topClientes.set(list)`, and `admin.clientesStats().subscribe(...)` → `clientesStats.set(s)`. Update `kpis` computed: replace `this.clientes().length` with `this.clientesStats().total`. Remove `topClientes` computed (was sorting the full list); it is now a signal fed directly from `clientesTop`. Remove unused `clientes` signal.
- [x] 5.4 In `electric-kar-front/src/app/admin/dashboard.component.ts`: add `clientesStats = signal<{total:number}>({total:0})`. Replace the `admin.clientes()` subscription (which was reading `.length`) with `admin.clientesStats().subscribe(s => this.clientesStats.set(s))`. Update `kpis` computed: replace `this.totalClientes()` with `this.clientesStats().total`. Remove `totalClientes` signal.

---

## Phase 6: Frontend Unit Tests (RED → GREEN)

- [x] 6.1 **RED** — Create `electric-kar-front/src/app/pages/cuenta/cuenta.component.spec.ts`. Tests: badge uses `meta.total` not `data.length` (mock returns 5 items, meta.total=42 → badge=42); recent orders renders `data`; empty state renders gracefully. Mock `ClienteService.pedidos()` to return `of(Paginated<PedidoCliente>)`. Run `pnpm exec vitest run` — confirm fail.
- [x] 6.2 **RED** — Create `electric-kar-front/src/app/admin/clientes.component.spec.ts`. Tests: table renders `data` rows; paginator reflects `meta.total` and `meta.page`. Mock `AdminService.clientes()` with paginated stub. Run `pnpm exec vitest run` — confirm fail.
- [x] 6.3 **RED** — Update `electric-kar-front/src/app/admin/reportes.component.spec.ts`. Add tests: `topClientes()` comes from `clientesTop()` (spy on `clientesTop`, assert signal length); `clientesStats().total` comes from `clientesStats()` (spy, assert value); `admin.clientes()` is NOT called (assert spy never called). Run — confirm fail.
- [x] 6.4 **RED** — Update `electric-kar-front/src/app/admin/dashboard.component.spec.ts`. Add test: `clientesStats().total` comes from `clientesStats()` not from `clientes().length` — mock `clientesStats` returning `{total:23}`, mock `clientes` returning paginated stub, assert KPI value is 23. Add spy assertion that `admin.clientes()` is NOT called. Run — confirm fail.
- [x] 6.5 **GREEN** — Verify all four unit spec files pass after Phase 5 changes: `pnpm exec vitest run` in `electric-kar-front/`. Fix any compilation or assertion issues.

---

## Phase 7: Playwright E2E Extension

- [x] 7.1 In `electric-kar-front/e2e/admin-pagination.spec.ts`, add `describe('GET /api/orders — client-facing paginated shape')`: login as `cliente@example.com`, call `GET /api/orders`, assert 200 + `{data:[...], meta:{total, page, limit, pages}}` shape; call with `?page=1&limit=5`, assert `meta.limit===5`; call without JWT → 401.
- [x] 7.2 In `electric-kar-front/e2e/admin-pagination.spec.ts`, add `describe('GET /api/clientes — admin paginated shape')`: login as admin, call `GET /api/clientes`, assert 200 + `{data:[...], meta:{total,page,limit,pages}}`; call as CLIENTE → 403.
- [x] 7.3 In `electric-kar-front/e2e/admin-pagination.spec.ts`, add `describe('GET /api/clientes/top — top clientes')`: login as admin, call `GET /api/clientes/top`, assert 200 + array; call `?limit=3`, assert array length ≤ 3; call as CLIENTE → 403.
- [x] 7.4 In `electric-kar-front/e2e/admin-pagination.spec.ts`, add `describe('GET /api/clientes/stats — clientes aggregate')`: login as admin, assert 200 + `{total: number}` with `total >= 0`; call as CLIENTE → 403.

---

## Phase 8: Verification

- [x] 8.1 Run `pnpm test` in `electric-kar/` — all backend Jest tests pass (no regressions on orders, clientes, products suites).
- [x] 8.2 Run `pnpm exec vitest run` in `electric-kar-front/` — all frontend unit tests pass.
- [x] 8.3 Build backend: `pnpm build` in `electric-kar/` — TypeScript compiles without errors.
- [x] 8.4 Build frontend: `pnpm build` in `electric-kar-front/` — Angular build completes without errors or type errors.
- [x] 8.5 Run `pnpm exec playwright test` in `electric-kar-front/` against live backend/frontend — all e2e tests in `admin-pagination.spec.ts` pass including the new slice-2 suites.
