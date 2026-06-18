# Tasks: Typesense Product Search Engine

Ordered top-to-bottom so an implementer (sdd-apply) can pick tasks up sequentially.
Dependencies flow: infra -> deps/config -> document shape/DTO -> transport provider ->
domain index provider -> write-through hooks -> endpoint -> reindex command -> frontend -> tests/docs.

Tasks marked **[parallel]** can be done concurrently with their sibling once the
phase's prerequisites exist. Tasks marked **[sequential]** must follow the prior task.

---

## Phase 1: Infrastructure & Configuration

- [x] 1.1 [sequential] In repo-root `docker-compose.yml`, add a pinned `typesense` service
  (`image: typesense/typesense:27.1`, `container_name: electric-kar-search`,
  `restart: unless-stopped`, `command: '--data-dir /data --api-key=${TYPESENSE_API_KEY:-dev_local_key} --enable-cors'`,
  `ports: ["8108:8108"]`, healthcheck `curl -sf http://localhost:8108/health` with
  `interval: 5s / timeout: 5s / retries: 10`). Use the exact YAML in design.md "Docker Compose service".
- [x] 1.2 [sequential] In `docker-compose.yml` top-level `volumes:`, add the named volume
  `electric_kar_typesense` (`name: electric_kar_typesense`) and mount it at `/data` in the service.
- [x] 1.3 [parallel] In `electric-kar/.env.example`, add `TYPESENSE_HOST`, `TYPESENSE_PORT=8108`,
  `TYPESENSE_PROTOCOL=http`, `TYPESENSE_API_KEY=dev_local_key`.
- [x] 1.4 [parallel] In `electric-kar/.env`, add the same four `TYPESENSE_*` vars with local values
  (`TYPESENSE_HOST=localhost`, `TYPESENSE_PORT=8108`, `TYPESENSE_PROTOCOL=http`, `TYPESENSE_API_KEY=dev_local_key`).
- [x] 1.5 [parallel] In `electric-kar/package.json`, add the `typesense` Node client to `dependencies`
  and `tsx` to `devDependencies` if not already present; run the package manager install to update the lockfile.
- [x] 1.6 [sequential] In `electric-kar/package.json` `scripts`, add
  `"search:reindex": "tsx prisma/reindex.ts"` (mirrors the existing `seed.ts` standalone pattern).
- [x] 1.7 [parallel] Verify `app.module.ts` has `ConfigModule.forRoot({ isGlobal: true })` (it does, ~L25)
  so `ConfigService` is injectable in the search providers — no extra `ConfigModule.forRoot` needed.

## Phase 2: Document Shape, Schema & DTO (Foundation)

- [x] 2.1 [sequential] Create `electric-kar/src/products/search/product-document.ts` exporting:
  (a) a `ProductDocument` TS type with all fields from design.md "Collection schema" and
  (b) a `productsCollectionSchema` constant (`default_sorting_field: 'creadoEn'`,
  `enable_nested_fields: false`, the full `fields` array with correct Typesense types:
  `precio: float`, `existencias: int32`, `creadoEn: int64`, `etiquetas: string[]`,
  and `optional: true` on `codigoBarras`, `descripcionCorta`, `descripcion`,
  `marcaNombre`, `categoriaNombre`, `marcaId`, `categoriaId`; `facet: true` on
  `etiquetas`, `marcaNombre`, `categoriaNombre`, `marcaId`, `categoriaId`, `estado`).
  Define the physical name as `productos_v1` and the alias name as `productos`.
- [x] 2.2 [parallel] Create `electric-kar/src/products/dto/search-product.dto.ts` mirroring the
  validation style of the existing `QueryProductDto`: `q?` (string, optional), `categoriaId?`,
  `marcaId?`, `etiquetas?`, `sort?`, `page?` (default 1, min 1), `perPage?`
  (sensible default e.g. 20, upper bound e.g. 100). NOTE: do NOT expose an `estado` param —
  the public filter is enforced server-side only.

## Phase 3: Transport Provider — TypesenseService

- [x] 3.1 [sequential] Create `electric-kar/src/products/search/typesense.service.ts` with an
  injectable `TypesenseService` that builds the Typesense Node client from `ConfigService`
  (`TYPESENSE_HOST/PORT/PROTOCOL/API_KEY`). It knows NOTHING about `Producto`.
- [x] 3.2 [sequential] Implement `onModuleInit()`: inside try/catch, ensure the physical collection
  (`productos_v1`) exists from `productsCollectionSchema`, then ensure the alias `productos` -> physical.
  On ANY failure log a warning and set internal `ready = false`; **MUST NOT throw** (graceful boot —
  spec "Graceful Degradation When Typesense Absent at Boot").
- [x] 3.3 [sequential] Add a `ready`/`isHealthy()` accessor and thin raw methods that all check
  readiness and short-circuit when not ready: `upsertDocument(doc)`, `deleteDocument(id)`,
  `search(collection, params)`, `import(collection, docs, action)`, plus alias helpers
  (`createCollection`, `upsertAlias`, `dropCollection`) used by reindex.

## Phase 4: Domain Index Provider — ProductIndexService

- [x] 4.1 [sequential] Create `electric-kar/src/products/search/product-index.service.ts` with an
  injectable `ProductIndexService` that depends on `TypesenseService` and `PrismaService`.
- [x] 4.2 [sequential] Implement `flatten(producto)` per design.md "Flatten mapper":
  `precio: Number(p.precio)` (Decimal -> JS number/float), `creadoEn: p.creadoEn.getTime()`
  (epoch millis -> int64), `existencias` as int32, `etiquetas: p.etiquetas ?? []`,
  nullable `marcaId`/`categoriaId` -> `?? undefined` (omitted), denormalize
  `marcaNombre: p.marca?.nombre ?? undefined` and `categoriaNombre: p.categoria?.nombre ?? undefined`.
- [x] 4.3 [sequential] Implement `upsert(producto)` and `delete(id)` delegating to
  `TypesenseService` (upsert flattens first). Both are no-ops when Typesense not ready;
  `delete` of a missing doc is treated as a no-op (idempotent, never throws) —
  spec "Delete of a document missing from the index is a no-op".
- [x] 4.4 [sequential] Implement `search(dto)` that:
  builds `filter_by` ALWAYS starting with `estado:=PUBLICADO` (then appends
  `categoriaId`/`marcaId`/`etiquetas` filters from the DTO — never an `estado` from the client);
  sets `query_by`/`query_by_weights`/`num_typos` overrides (0 for `sku`) and
  `facet_by: categoriaId,marcaId,etiquetas,marcaNombre,categoriaNombre`;
  picks `sort_by` (`_text_match:desc,creadoEn:desc`, or `precio:asc/desc` when `sort=precio`);
  maps Typesense `hits[].document` + `found`/`page`/`per_page` -> `{ data, meta:{total,page,limit,pages} }`
  and `facet_counts` -> `facets`.
- [x] 4.5 [sequential] Implement `reindexAll()` used by the reindex command: stream all `Producto`
  rows `include:{ marca, categoria }` in batches, `flatten` each, and bulk `import` with
  `action: 'upsert'` (live collection); expose an option/branch to do fresh-collection +
  alias-swap when a schema rebuild is required. MUST be idempotent.

## Phase 5: Write-Through Hooks in ProductsService

- [x] 5.1 [sequential] In `electric-kar/src/products/products.service.ts`, inject `ProductIndexService`
  and add a private `indexSafe(op)` helper that runs the op in try/catch and only `logger.warn`s on
  failure (never rethrows) — design.md "ProductsService write-through hook".
- [x] 5.2 [sequential] In `create`: AFTER the successful Prisma commit and OUTSIDE any transaction,
  call `indexSafe(() => productIndex.upsert(producto))`. **KNOWN FINDING:** `create` returns the
  BARE row (no `marca`/`categoria`) -> re-read via `findOne(id)` (already `include`s relations)
  before flattening so `marcaNombre`/`categoriaNombre` are accurate. (Leaning re-read per design
  Open Question; accepting drift is permitted by locked decision 7 if re-read is rejected — pick one
  and document it.)
- [x] 5.3 [sequential] In `update`: after commit, best-effort `indexSafe(() => productIndex.upsert(...))`.
  Same BARE-row caveat as 5.2 -> re-read with relations (or reuse the existing `findOne`) before flatten.
- [x] 5.4 [sequential] In `remove`: after the Prisma delete commits, best-effort
  `indexSafe(() => productIndex.delete(id))`. The Postgres delete result is returned regardless of
  index outcome (spec "Write-Through Best-Effort Index Delete on Remove").
- [x] 5.5 [sequential] Add `searchPublic(dto)` to `ProductsService` that calls
  `productIndex.search(dto)` when Typesense is healthy, and on Typesense unavailable/error FALLS BACK
  to the existing Prisma `contains` (`OR:[{nombre contains},{sku contains}]`, `mode:'insensitive'`).
  **CRITICAL:** the Prisma fallback where-clause MUST force `estado = PUBLICADO` (no BORRADOR/PROGRAMADO
  leak) and return the same `{ data, meta, facets:{} }` envelope (spec "Query-Time Fallback to Prisma").

## Phase 6: Endpoint & Module Wiring

- [x] 6.1 [sequential] In `electric-kar/src/products/products.controller.ts`, add a public
  `GET /products/search` handler taking `SearchProductDto` (`@Query`) and returning
  `ProductsService.searchPublic(dto)`. **CRITICAL ROUTE ORDER:** declare this route BEFORE
  `GET /:id` (otherwise `/search` is captured by the `:id` param route — route shadowing).
- [x] 6.2 [sequential] In `electric-kar/src/products/products.module.ts`, register
  `TypesenseService` and `ProductIndexService` in `providers` (keep `exports: [ProductsService]`).
  `ConfigService` is already global (see 1.7).

## Phase 7: Reindex Standalone Command

- [x] 7.1 [sequential] Create `electric-kar/prisma/reindex.ts` following the `prisma/seed.ts` pattern
  (tsx standalone, `dotenv/config`, instantiate Prisma with the PrismaPg adapter exactly as seed.ts does).
- [x] 7.2 [sequential] In `reindex.ts`, construct a Typesense client (same `TYPESENSE_*` env),
  ensure the collection/alias exist, then stream all `Producto` rows `include:{ marca, categoria }`,
  reuse the SAME `flatten` mapper as the write-through path (import it, do not duplicate), and bulk
  `import` with `action:'upsert'`. Log the imported/failed counts and exit non-zero on fatal errors.
  (Flatten extracted to a shared `flatten()` in `product-document.ts`; `ProductIndexService` and
  `reindex.ts` both import it — single source of truth.)
- [x] 7.3 [sequential] Make the command idempotent (re-runs converge index count == Postgres
  `Producto` count, no dupes) and add the documented branch for fresh-collection + alias-swap when a
  schema migration is needed (recreate `productos_vN` -> import -> atomically repoint alias `productos`
  -> drop old). VERIFICADO EN VIVO (2026-06-18): `pnpm search:reindex` importó 2/2, convergencia
  Postgres=2|Typesense=2, idempotente al re-correr. El modo `--rebuild` (drop+create+import+swap)
  PODA huérfanos; el default (upsert) NO poda y exige convergencia exacta (falla si hay huérfanos).
  Flags reales: `--rebuild`, `--target=productos_vN`.

## Phase 8: Frontend

- [x] 8.1 [sequential] In `electric-kar-front/src/app/core/productos.service.ts`, add a `search(params)`
  method that issues `GET /api/products/search` with `q`/`categoriaId`/`marcaId`/`etiquetas`/`sort`/
  `page`/`perPage`, and add response types for the `{ data, meta }` + `facets` payload. Do NOT route
  this through the legacy `/products` endpoint (spec "Search Service Calls the Search Endpoint").
- [x] 8.2 [sequential] Update the `/busqueda` page component
  (`electric-kar-front/src/app/tienda/catalogo/busqueda/busqueda.component.ts`) to call `search()` with
  ~250 ms debounced as-you-type (Angular signal + `toObservable`/`debounceTime`, or equivalent signal
  debounce). Collapse rapid keystrokes into a single request for the settled value
  (spec "Debounced As-You-Type on /busqueda Page").
- [x] 8.3 [sequential] Render facet counts (category/brand/tags) on `/busqueda`, and handle the
  empty-query (browse), no-results, and degraded-fallback (facets empty/absent) states without runtime
  errors (spec scenarios "No-results state handled", "Degraded fallback still renders").
- [x] 8.4 [sequential] Wire the header search box to the same debounced (~250 ms) as-you-type behavior
  routing to `/busqueda`/the search endpoint (spec "Debounced As-You-Type on Header Search").
- [x] 8.5 [parallel] Confirm `/tienda` catalog STILL calls `GET /api/products` (legacy path) and is NOT
  migrated — explicitly out of scope (spec "Tienda Catalog Stays on /products").
  (Verified: `tienda.component.ts` uses `ProductosService.list()` -> `/products`; left untouched.)

## Phase 9: Tests

- [x] 9.1 [parallel] Unit test `flatten()` (`product-index.service.spec.ts`): Decimal `1499.99` ->
  number `1499.99` (not string/Decimal); `creadoEn` -> epoch int64; null `marcaId`/`categoriaId` and
  optional text fields omitted; `etiquetas` defaults to `[]`.
- [x] 9.2 [parallel] Unit test `ProductIndexService.search` filter injection: `estado:=PUBLICADO`
  ALWAYS present; category/brand/tags appended from DTO; a client-supplied `estado` is ignored;
  sort/typo (`sku` num_typos 0) overrides correct.
- [x] 9.3 [parallel] Unit test graceful degradation: with `TypesenseService.ready=false`,
  `upsert`/`delete` are no-ops (no throw) and `search` returns the Prisma-fallback `{data,meta,facets:{}}`
  shape still enforcing `estado=PUBLICADO`.
- [x] 9.4 [parallel] Unit test `ProductsService` write-through: mock `ProductIndexService` throwing ->
  `create`/`update`/`remove` still resolve and return the Postgres result; failure is logged; no
  exception propagates (spec "Typesense down during create/update/remove does not fail the write").
- [x] 9.5 [sequential] Integration test `search:reindex` against a live/test Typesense: seed N rows ->
  `reindexAll` -> assert doc count == row count; re-run is idempotent (no dupes).
  VERIFICADO EN VIVO (2026-06-18): `test/search-reindex.e2e-spec.ts` pasa con `RUN_SEARCH_INTEGRATION=1`.
- [x] 9.6 [sequential] Integration test `GET /products/search`: typo query returns ranked hits;
  `facet_counts` present; BORRADOR/PROGRAMADO never surface in `data`, `facets`, or `meta.total`;
  SKU exact-ish query ranks the matching product first.
  VERIFICADO EN VIVO (2026-06-18): `test/products-search.e2e-spec.ts` pasa (3/3) contra infra real.
- [x] 9.7 [sequential] Integration test fallback path: point the client at a dead Typesense host ->
  endpoint returns 200 with Prisma-backed `{data, meta, facets:{}}`, still excluding non-PUBLICADO.
  NOTA: cubierto como UNIT test de degradación (`product-index.service.spec.ts`, 9.3) en vez de un
  e2e dedicado con host muerto. La lógica de fallback está testeada; falta el e2e con host caído real
  si se quiere fidelidad total al plan.

## Phase 10: Documentation & Onboarding

- [x] 10.1 [parallel] Update `electric-kar/.env.example` comments (if any) and the README onboarding
  flow to document the new `typesense` Docker service and `docker compose up`.
  (Done: `.env.example` ya documentaba las vars; README §Búsqueda (Typesense) + §Requisitos +
  §Puesta en marcha; INSTALL.md §3 Opción Docker + tabla de servicios.)
- [x] 10.2 [parallel] Document the bootstrap/deploy order in the README:
  `pnpm prisma:deploy && pnpm db:seed && pnpm search:reindex`.
  (Done: README §Puesta en marcha + §Búsqueda; INSTALL.md §4.3; comentario en docker-compose.yml.)
- [x] 10.3 [parallel] Document the schema-migration policy (recreate `productos_vN` + alias swap for
  field-type changes; `action: upsert` for routine drift repair) near the reindex command / README,
  per design.md "Schema migration via recreate + alias swap".
  (Done: README §Búsqueda (Typesense) -> "Política de migración de schema".)
- [~] 10.4 [parallel] Manual E2E security check: inspect browser network traffic for the search call and
  confirm NO Typesense admin key/host appears in any response body or headers
  (spec "Typesense Admin Key Never Reaches the Browser").
  (DOCUMENTADO como checklist en README §Búsqueda -> "Verificación de seguridad (manual)" e
  INSTALL.md §6.6. LADO API VERIFICADO EN VIVO (2026-06-18): `GET /api/products/search?q=bateira`
  responde 200 con `{data,meta,facets}`, tolerancia a typos OK, y auditoría de la respuesta
  (headers+body) = 0 coincidencias de `dev_local_key`/`8108`/`TYPESENSE`/`x-typesense`. PENDIENTE
  solo la inspección en el navegador (pestaña Network) con el front corriendo.)

---

## Hallazgos y fixes durante la verificación en vivo (2026-06-18)

Bugs reales que solo aparecieron al levantar la infra y correr los tests/comandos por primera vez:

1. **Healthcheck de Typesense roto** — la imagen `typesense/typesense:27.1` NO trae `curl` (ni `wget`,
   ni `/dev/tcp` en su `sh`/dash), así que el `curl -sf .../health` marcaba el contenedor `unhealthy`
   aunque el servicio respondía `{"ok":true}`. FIX: healthcheck con `bash /dev/tcp` (la imagen sí trae
   bash). Aplicado en `docker-compose.yml` y `design.md`.
2. **`jest-e2e.json` sin `moduleNameMapper`** — el cliente Prisma 7 generado importa `./internal/class.js`
   (estilo ESM) y jest no resolvía el `.ts`. FIX: agregado `"^(\\.{1,2}/.*)\\.js$": "$1"` (mismo patrón
   que `jest-functional.json`).
3. **`test:e2e` sin `--experimental-vm-modules`** — el cliente Prisma 7 carga su compilador WASM con
   `import()` dinámico; jest plano fallaba. FIX: script alineado con `test:functional`
   (`node --experimental-vm-modules node_modules/jest/bin/jest.js ...`).
4. **`search-reindex.e2e-spec.ts` no cargaba `.env`** — armaba el módulo con `ConfigService` pelado.
   FIX: `imports: [ConfigModule.forRoot({ isGlobal: true })]`.
5. **Drift por borrados / footgun del reindex** — los e2e limpiaban Postgres pero NO el índice, dejando
   docs huérfanos; y el `search:reindex` default (upsert) NO poda y exige convergencia exacta, así que
   tras los tests FALLABA hasta hacer `--rebuild`. FIX: ambos `afterAll` ahora hacen `index.delete(id)`;
   además `search-reindex` llama `typesense.onModuleInit()` en el `beforeAll` para setear `ready=true`
   (sin eso `delete` es no-op porque `.compile()` no dispara los lifecycle hooks). Verificado: tras los
   e2e el índice converge solo (Postgres=2 | Typesense=2). Documentado el matiz upsert-no-poda en
   README/INSTALL.
