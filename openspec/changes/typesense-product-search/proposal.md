# Proposal: Typesense Product Search Engine

## Intent

Public product search today is plain Prisma `contains` (ILIKE, `mode:'insensitive'`) over **only**
`Producto.nombre` and `Producto.sku`, served by `GET /api/products` (`ProductsService.findAll`).
It has **no typo tolerance, no relevance ranking, no facets**, no search over
`descripcion`/`descripcionCorta`/`etiquetas`/brand/category names, and no as-you-type. Ordering is
hardcoded `creadoEn desc` and price sorting is done client-side.

We want fast, typo-tolerant, faceted, relevance-ranked product search — **without** making the search
engine a system of record. Guiding principle: **"todo desde la DB"**. PostgreSQL stays the single
source of truth; Typesense is a **derived, fully rebuildable index** that can be dropped and
reconstructed from Postgres at any time with zero data loss.

## Scope

### In Scope
- Add **Typesense** as a sibling Docker Compose service (pinned image `typesense/typesense:27.1`,
  port `8108`, persisted named volume `electric_kar_typesense`) to the repo-root `docker-compose.yml`.
- New backend env vars `TYPESENSE_HOST` / `TYPESENSE_PORT` / `TYPESENSE_PROTOCOL` / `TYPESENSE_API_KEY`
  in `electric-kar/.env` and `.env.example` (default `dev_local_key` for local dev). The admin/bootstrap
  key lives **only** on the server.
- Typesense client dependency + an idempotent `search:reindex` script in `electric-kar/package.json`.
- A denormalized (flattened) product collection in Typesense and a backend client wrapper that
  bootstraps the collection schema and degrades gracefully if Typesense is absent at boot.
- **Write-through, best-effort** index sync in `ProductsService.create/update/remove`: index calls
  are best-effort + logged, run **outside** the Postgres transaction, and **never block or fail** the
  Postgres write (source of truth wins).
- An idempotent `search:reindex` command that streams all `Producto` rows (with `marca`/`categoria`)
  from Postgres and bulk-imports them into Typesense — the bootstrap mechanism and the safety net that
  self-heals any write-through drift.
- New endpoint **`GET /api/products/search`** that proxies to Typesense, enforces the public filter
  `estado = PUBLICADO` centrally, and maps the Typesense response to the **same `{data, meta}` shape**
  the frontend already consumes, **plus facet counts** (category/brand/tags).
- **Query-time fallback**: if Typesense is unavailable at search time, fall back to the current Prisma
  `contains` (ILIKE) search. Search degrades (no typo-tolerance/facets) but never fully breaks.
- Frontend: header search box and the `/busqueda` page switch to `/api/products/search` with
  **debounced (~250 ms) as-you-type** search.

### Out of Scope (deferred / future work)
- **Faceted `/tienda` catalog.** `/tienda` STAYS on the existing `/products` endpoint for now.
  Migrating the catalog to the search endpoint for faceted filtering is explicitly deferred.
- **Existing `/api/products` search path is NOT changed.** Admin grids and listing keep relying on
  Prisma exactness, full record shape, and DB-truth ordering.
- **Immediate re-sync on Marca/Categoria rename.** We do NOT re-sync affected products when a brand or
  category is renamed; the periodic / seed-time `search:reindex` repairs the denormalized
  `marcaNombre`/`categoriaNombre`. Temporary drift is accepted (see Risks).
- **Scoped search-only browser key / direct client-to-Typesense queries** (InstantSearch-style). All
  traffic goes through the NestJS proxy.
- **Outbox / queue / CDC eventing** for durable sync. Write-through + reindex is sufficient at this
  scale; revisit only if scale demands durable exactly-once eventing.
- **Typesense collection schema migration tooling** (recreate + alias-swap automation) beyond a
  documented manual path — to be detailed in design.

## Approach

1. **Run Typesense as derived infra.** Pinned Docker Compose sibling service with a persisted volume.
   The index is always rebuildable from Postgres, so persistence is a cache, not a source of record.
2. **Sync = write-through best-effort + reindex safety net.** All product writes funnel through
   `ProductsService`; after a successful Postgres `create/update/remove`, fire a best-effort Typesense
   upsert/delete wrapped in try/catch and logged. The HTTP call is **outside** the Prisma transaction
   and never blocks the write. Idempotency comes for free: Typesense `upsert` is keyed by `id`,
   delete-of-missing is a no-op. The idempotent `search:reindex` command bootstraps the index and
   self-heals any drift; it runs on seed/deploy.
3. **Search via NestJS proxy.** A new `GET /api/products/search` holds the admin key server-side,
   injects the mandatory public filter `estado = PUBLICADO`, queries Typesense, and reshapes hits to
   `{data, meta}` + facet counts. Single controlled API surface; the Typesense key never reaches the
   browser; the backend can swap the search engine later without touching the frontend.
4. **Graceful degradation.** Backend boots even if Typesense is absent. At search time, if Typesense
   is unreachable, fall back to the current Prisma `contains` search so storefront search never fully
   breaks (it loses typo-tolerance/facets only).
5. **Frontend as-you-type.** Header search and `/busqueda` call `/products/search` with a ~250 ms
   debounce (Angular signal + `debounceTime` or equivalent), parsing the `{data, meta}` + facet payload.
6. **Public visibility.** Only `estado = PUBLICADO` surfaces in public search
   (enum `EstadoProducto = PUBLICADO | BORRADOR | PROGRAMADO`); the filter is enforced centrally in the
   proxy, not in the client.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docker-compose.yml` | Modified | Add pinned `typesense` service (`:27.1`, port 8108) + named volume |
| `electric-kar/.env.example`, `electric-kar/.env` | Modified | Add `TYPESENSE_HOST/PORT/PROTOCOL/API_KEY` |
| `electric-kar/package.json` | Modified | Add `typesense` client dep + `search:reindex` script |
| `electric-kar/src/products/search/typesense.service.ts` | New | Client wrapper + collection schema bootstrap + graceful absence handling |
| `electric-kar/src/products/search/product-index.service.ts` | New | Flatten product (denormalize marca/categoria) + best-effort upsert/delete |
| `electric-kar/src/products/` (reindex command) | New | Idempotent `search:reindex` standalone command — stream Postgres → bulk import |
| `electric-kar/src/products/products.service.ts` | Modified | Write-through best-effort index hooks in `create/update/remove`; Prisma fallback for search |
| `electric-kar/src/products/products.controller.ts` | Modified | Add `GET /products/search` |
| `electric-kar/src/products/products.module.ts` | Modified | Register search providers + config |
| `electric-kar-front/src/app/.../productos.service.ts` | Modified | Add `search()` hitting `/products/search` |
| `electric-kar-front/src/app/pages/busqueda/busqueda.component.ts` + header search | Modified | Consume `/products/search` with ~250 ms debounced as-you-type |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **Index drift** if write-through fails silently and reindex isn't run | Med | Log all best-effort failures; run idempotent `search:reindex` on seed/deploy; consider a consistency/health check |
| **Decimal → float** precision/serialization bug on `precio` (filter/sort) | Med | Explicitly cast Prisma `Decimal` to JS `number` when flattening; cover with tests at spec/design phase |
| **Nullable `categoriaId`/`marcaId`** breaking facets/optional fields | Med | Treat fields as optional in the collection schema; handle nulls in flatten + faceting |
| **Marca/Categoria rename drift** — denormalized `marcaNombre`/`categoriaNombre` stale until reindex | Med | Accepted limitation; periodic / seed-time `search:reindex` repairs it (no immediate re-sync) |
| **`estado` leak** — BORRADOR/PROGRAMADO products surfacing in public search | High impact | Enforce `estado = PUBLICADO` filter centrally in the proxy; never trust the client |
| **Dev onboarding friction** — new required Docker service | Med | Default `dev_local_key`; backend boots/degrades gracefully if Typesense absent; document `docker compose up` flow |
| **Version pinning / schema migration** — `:latest` drift, collection schema changes | Low | Pin `:27.1`; document a recreate/alias-swap migration path |

## Rollback Plan

- **Backend:** the new code paths are additive. Disabling search = remove/disable the
  `GET /products/search` route and the write-through hooks in `ProductsService`; the existing
  `GET /api/products` Prisma search is untouched and remains fully functional.
- **Frontend:** revert header + `/busqueda` to call `/api/products` (the prior behavior).
- **Infra:** stop and remove the `typesense` Docker service and its volume. Postgres is unaffected —
  no data loss because Typesense holds no source-of-truth data (it is fully derived).
- The query-time Prisma fallback means even a partial/failed rollout degrades gracefully rather than
  breaking storefront search.

## Dependencies

- Typesense server (Docker Compose `typesense/typesense:27.1`, port 8108) reachable by the backend.
- Typesense Node client library added to `electric-kar`.
- `TYPESENSE_*` env vars configured (defaults provided for local dev).
- Existing `Producto` model fields (`nombre`, `sku`, `codigoBarras`, `descripcion`,
  `descripcionCorta`, `etiquetas`, `precio`, `existencias`, `estado`, `marca`/`categoria`, `creadoEn`).

## Success Criteria

- [ ] `GET /api/products/search?q=` returns typo-tolerant, relevance-ranked results in the
      `{data, meta}` shape **plus** facet counts (category/brand/tags).
- [ ] Only `estado = PUBLICADO` products appear in public search results.
- [ ] Creating/updating/deleting a product reflects in search results (write-through), and a Typesense
      outage during a write does **not** fail the Postgres write.
- [ ] `pnpm search:reindex` rebuilds the index idempotently from Postgres and repairs any drift.
- [ ] With Typesense down at search time, `/api/products/search` falls back to Prisma `contains`
      and still returns results (degraded, not broken).
- [ ] The Typesense admin/bootstrap key is never sent to the browser (verified in network traffic).
- [ ] Header search and `/busqueda` perform debounced (~250 ms) as-you-type search via the new endpoint.
- [ ] Backend boots successfully even when Typesense is unavailable.
