# Exploration — Typesense Product Search Engine

## Context

Backend: NestJS 11 + Prisma 7 + PostgreSQL (`electric-kar/`). Frontend: Angular 21 (`electric-kar-front/`).
Today product search is plain Prisma `contains` (ILIKE, `mode:'insensitive'`) over ONLY
`Producto.nombre` and `Producto.sku`, exposed through `GET /api/products`
(`src/products/products.service.ts` `findAll`, `products.controller.ts`). The query accepts
`search`, `categoriaId`, `marcaId`, `page`, `limit`; ordering is hardcoded `creadoEn desc` and
price sort is done client-side. No typo tolerance, no relevance ranking, no facets, no search on
`descripcion`/`etiquetas`/brand/category names, no as-you-type.

Goal: add **Typesense** as a dedicated product search engine — fast, typo-tolerant, faceted,
relevance-ranked search — WITHOUT making it the system of record. User principle: **"todo desde
la DB"** → Postgres stays the single source of truth; Typesense is a DERIVED, rebuildable index.

## Current State — Evidence

- `ProductsService.findAll` (`electric-kar/src/products/products.service.ts` L25-57): builds a
  Prisma `where` with `OR: [{nombre contains}, {sku contains}]`, `orderBy: {creadoEn:'desc'}`,
  `include: {categoria, marca}`, paginates via `skip/take`, returns `{data, meta:{total,page,limit,pages}}`.
- `ProductsService.create/update/remove` (L17-83): the single write path through which any index
  sync would have to hook. `update` and `remove` already call `findOne` first.
- `ProductsController` (`products.controller.ts`): `GET /products` (public), `GET /products/:id`
  (public), `POST/PATCH/DELETE` guarded by `JwtAuthGuard + RolesGuard` (ADMIN/SUPER).
- `ProductsModule` (`products.module.ts`): minimal — only declares the controller/service and
  exports the service. A new search/index provider would be wired here.
- `Producto` model (`electric-kar/prisma/schema.prisma`): indexable text → `nombre`, `sku`,
  `codigoBarras?`, `descripcion?`, `descripcionCorta?`, `etiquetas String[]`; relations
  `marca` / `categoria` (each has `.nombre`). Facet/sort candidates → `categoriaId?`, `marcaId?`,
  `estado (EstadoProducto: BORRADOR/...)`, `precio Decimal`, `existencias Int`, `creadoEn`.
  Note `categoriaId`/`marcaId` are NULLABLE (`onDelete: SetNull`). PK `id` is a `uuid` string.
- `docker-compose.yml` (repo root): single `postgres:16-alpine` service with named volume
  `electric_kar_pgdata` and a `pg_isready` healthcheck. Typesense would be added as a sibling service.
- Frontend: header search box → `/busqueda?q=`; `busqueda.component.ts` and `/tienda` both call
  `productos.service.ts` → `/api/products`. Submit-based, no debounced as-you-type.

## 1. Running Typesense (Docker Compose)

Add a sibling service to the existing `postgres` in the repo-root `docker-compose.yml`:

```yaml
  typesense:
    image: typesense/typesense:27.1   # pin a version, do not use :latest
    container_name: electric-kar-search
    restart: unless-stopped
    command: '--data-dir /data --api-key=${TYPESENSE_API_KEY:-dev_local_key} --enable-cors'
    environment:
      TYPESENSE_API_KEY: ${TYPESENSE_API_KEY:-dev_local_key}
    ports:
      - "8108:8108"
    volumes:
      - electric_kar_typesense:/data
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:8108/health || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 10
# volumes:
#   electric_kar_typesense:
#     name: electric_kar_typesense
```

- Port `8108` (HTTP). Data persisted in named volume so the index survives restarts (but is always
  rebuildable from Postgres — see §2).
- **Key management (dev):** a single bootstrap/admin `TYPESENSE_API_KEY` lives in
  `electric-kar/.env` (add `TYPESENSE_*` to `.env.example`). The NestJS backend reads it via
  `ConfigService`. Default `dev_local_key` for local dev so `docker compose up` works out of the box.
  `--enable-cors` is only relevant if the browser were to hit Typesense directly — NOT recommended
  (see §5). New env: `TYPESENSE_HOST`, `TYPESENSE_PORT=8108`, `TYPESENSE_PROTOCOL=http`,
  `TYPESENSE_API_KEY`.

## 2. THE KEY DECISION — Postgres → Typesense Sync Strategy

Postgres is the source of truth; Typesense is a derived index that must be (a) kept current and
(b) fully rebuildable. Three approaches:

**(a) Write-through sync in `ProductsService`.** After each successful `create/update/remove`,
upsert/delete the corresponding Typesense document. Pros: near-real-time, simple mental model,
single code path (all writes already funnel through this service). Cons: couples the write to an
external system. **Failure handling is the crux:** if Typesense is down during a write, the Postgres
write MUST still succeed (source of truth wins) — so the index call is best-effort + logged, never
in the same DB transaction (it's an external HTTP call; can't be transactional with Prisma anyway).
That introduces drift, which the reindex command (b) repairs. Idempotent because Typesense
`upsert` keyed by `id` is naturally idempotent; delete-of-missing is a no-op.

**(b) Reindex / backfill command.** A Nest standalone command / `pnpm` script
(e.g. `pnpm search:reindex`) that streams all `Producto` rows from Postgres (with `marca`/`categoria`
included), flattens them, and bulk-imports into Typesense (`action: upsert`, or create a fresh
collection + alias-swap for zero-downtime rebuild). Pros: the recovery/seed mechanism, deterministic,
idempotent, runs after `db:seed`. Cons: not real-time on its own. **Required regardless** — it's
how you bootstrap the index and self-heal drift from (a).

**(c) Outbox / queue or DB-trigger / CDC.** An outbox table written in the same Prisma transaction
as the product write, drained by a worker that pushes to Typesense; or Postgres LISTEN/NOTIFY /
logical-replication CDC (e.g. Debezium). Pros: durable, exactly-once-ish, decoupled, survives
Typesense downtime without losing events. Cons: real infrastructure (worker, broker, or CDC stack) —
overkill for this project's scale and team size.

**Recommendation — (a) write-through, best-effort + (b) reindex command as the safety net.**
Wrap index calls in try/catch so a Typesense outage degrades gracefully (write succeeds, error
logged, index repaired by next `search:reindex`). Make (b) idempotent and run it on seed/deploy.
Defer (c) until scale demands durable eventing. This honors "todo desde la DB": the index can be
dropped and rebuilt from Postgres at any time with zero data loss.

## 3. Collection Schema (denormalized product document)

A Typesense doc is a **flattened** product — relations are denormalized in (no joins at query time),
so brand/category names must be re-synced when a `Marca`/`Categoria` is renamed (a reindex covers it;
note as an open question whether brand/category renames trigger product re-sync).

| Field | Type | Role | Notes |
|---|---|---|---|
| `id` | `string` | doc id | `Producto.id` (uuid) |
| `nombre` | `string` | search (weight high) | primary match |
| `sku` | `string` | search | exact-ish |
| `codigoBarras` | `string` (optional) | search | |
| `descripcionCorta` | `string` (optional) | search (medium) | |
| `descripcion` | `string` (optional) | search (low) | long text |
| `etiquetas` | `string[]` | search + facet | tags |
| `marcaNombre` | `string` (optional, facet) | search + facet | denormalized from `marca.nombre` |
| `categoriaNombre` | `string` (optional, facet) | search + facet | denormalized from `categoria.nombre` |
| `marcaId` | `string` (optional, facet) | **facet/filter** | nullable |
| `categoriaId` | `string` (optional, facet) | **facet/filter** | nullable |
| `estado` | `string` (facet) | filter | hide non-publicados in public search |
| `precio` | `float` | sort/filter | from `Decimal` → cast to number |
| `existencias` | `int32` | filter/sort | |
| `creadoEn` | `int64` | sort | epoch for default recency sort |

- **`query_by` order / weights:** `nombre, etiquetas, marcaNombre, categoriaNombre, sku,
  descripcionCorta, descripcion` with `query_by_weights` favoring `nombre` and exact `sku`.
- **Typo tolerance:** Typesense default (1 typo ≤8 chars, 2 typos ≥9). Consider `num_typos: 1` and
  disabling typos on `sku`/`codigoBarras` (`typo_tokens_threshold`) so part numbers match exactly.
- **Facets:** `categoriaId`, `marcaId` (+ optionally `marcaNombre`/`categoriaNombre` for label
  display), `etiquetas`. Public search should filter `estado` to published only.
- **Decimal note:** Prisma `Decimal` must be serialized to JS `number`/`float` for Typesense.

## 4. Search API Design

**Recommendation: keep `GET /api/products` for listing/filtering (unchanged) and ADD a
Typesense-backed `GET /api/products/search`.** Rationale: `/products` listing/admin grids rely on
Prisma exactness, full record shape, and DB-truth ordering; swapping its search path risks regressions
and couples admin listing to the index. A dedicated search endpoint isolates the new capability.

- New `GET /api/products/search?q=&categoriaId=&marcaId=&etiquetas=&sort=&page=&perPage=` →
  backend proxies to Typesense, maps the Typesense response back to the **same `{data, meta}` shape**
  the frontend already consumes, so `busqueda.component.ts` / `productos.service.ts` need minimal
  changes (point search calls at `/products/search`, parse facet counts).
- Returns hits + `facet_counts` so the catalog can render category/brand facet sidebars with counts —
  a capability the current Prisma path lacks.
- **Frontend:** header search and `/busqueda` switch to `/products/search`. `/tienda` catalog can
  adopt it for faceted filtering. Recommend adding **debounced (≈250-300 ms) as-you-type** search
  (Angular signal + `toObservable`/`debounceTime` or a manual signal debounce) to leverage Typesense
  latency — high UX payoff, low cost once the endpoint exists.

## 5. Auth / Security

**NEVER ship the Typesense admin/bootstrap key to the browser.** Two options:

- **(a) Proxy through NestJS (RECOMMENDED).** Backend holds the admin key, exposes
  `GET /api/products/search`, and queries Typesense server-side. Pros: one API surface (same origin,
  same CORS/rate-limit/logging story as the rest of the app), key never leaves the server, full
  control to inject mandatory filters (e.g. `estado = PUBLICADO` for public search), shape the
  response to `{data, meta}`, and swap the search backend later without touching the frontend.
  Cons: one extra hop (negligible — backend and Typesense are co-located in Docker).
- **(b) Scoped search-only key to the browser** for direct Typesense queries. Typesense supports
  generating a scoped, read-only key (optionally with embedded filters) from the admin key. Pros:
  lowest latency, offloads the backend, enables InstantSearch-style widgets. Cons: exposes Typesense
  host/port to the public, a second public surface to secure/rate-limit, and embeds search logic in
  the client.

**Recommend (a) proxy** for this project: keeps a single controlled API surface, hides Typesense
entirely, and lets the backend enforce the public-vs-admin `estado` filter centrally. Revisit (b)
only if search latency/throughput at scale justifies direct client access.

## Affected Areas (file paths)

- `docker-compose.yml` — add `typesense` service + volume.
- `electric-kar/.env.example`, `electric-kar/.env` — `TYPESENSE_*` vars.
- `electric-kar/package.json` — `typesense` client dep + `search:reindex` script.
- `electric-kar/src/products/` — NEW: `search/typesense.service.ts` (client wrapper + schema bootstrap),
  `search/product-index.service.ts` (flatten + upsert/delete), reindex command; MODIFY
  `products.service.ts` (write-through hooks in create/update/remove), `products.controller.ts`
  (add `GET /products/search`), `products.module.ts` (register providers, config).
- (Possibly) `electric-kar/src/marcas/`, `categorias/` — re-sync affected products on rename (open Q).
- `electric-kar-front/src/app/.../productos.service.ts` — add `search()` hitting `/products/search`.
- `electric-kar-front/src/app/pages/busqueda/busqueda.component.ts` and the `/tienda` catalog —
  consume search endpoint + optional debounced as-you-type + facet UI.

## Risks

1. **Index drift** if write-through fails silently and reindex isn't run — mitigate with logging,
   a health/consistency check, and scheduled/seed-time reindex.
2. **Decimal → float** precision/serialization bugs (price filter/sort).
3. **Nullable `categoriaId`/`marcaId`** — faceting/optional fields must handle nulls.
4. **Brand/category rename** not propagating to denormalized `marcaNombre`/`categoriaNombre` until reindex.
5. **`estado` filter leak** — forgetting the public filter would surface BORRADOR products in storefront search.
6. **Dev onboarding friction** — a new required Docker service; backend must boot/degrade gracefully if Typesense is absent.
7. **Pinning** — avoid `typesense:latest`; collection schema migrations need a documented re-create/alias-swap path.

## Open Questions (decide before proposal)

1. Sync strategy confirmed = write-through (best-effort) + reindex command? Any appetite for outbox later?
2. On `Marca`/`Categoria` rename, do we trigger product re-sync now, or rely on periodic reindex?
3. Public search filter: enforce `estado = PUBLICADO` (need the exact published enum value) — confirm.
4. New endpoint `GET /api/products/search` vs replacing `/products` search path — confirm endpoint shape `{data, meta}` + facet payload.
5. As-you-type debounced search in the frontend now, or submit-based first and instant later?
6. Backend behavior when Typesense is unavailable at query time — fall back to Prisma `contains`, or return a clear error?
7. Schema-change/migration policy for the Typesense collection (recreate + alias swap)?
8. Should `/tienda` catalog also move to the search endpoint for faceting, or stay on `/products` initially?
