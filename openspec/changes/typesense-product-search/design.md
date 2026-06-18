# Design: Typesense Product Search Engine

## Technical Approach

Add Typesense as a **derived, fully rebuildable** search index alongside the existing
NestJS 11 + Prisma 7 + PostgreSQL backend. PostgreSQL stays the single source of truth
("todo desde la DB"); Typesense holds a denormalized, flattened copy of each `Producto`
that can be dropped and rebuilt from Postgres at any time with zero data loss.

The change is **additive and isolated** inside a new `search/` folder under
`src/products/`. Two providers are introduced:

- `TypesenseService` — thin client wrapper. Owns the Typesense Node client, reads
  `TYPESENSE_*` from `ConfigService`, bootstraps the collection schema on module init,
  and **degrades gracefully** (never throws on boot) if Typesense is unreachable.
- `ProductIndexService` — domain-aware indexing. Flattens a `Producto` (+ `marca`,
  `categoria`) into the Typesense document shape and performs best-effort
  `upsert`/`delete`. Also exposes the public search call (with the mandatory
  `estado = PUBLICADO` filter) and the bulk import used by the reindex command.

`ProductsService` gets **write-through best-effort** hooks: after each successful Prisma
`create`/`update`/`remove` (outside the transaction, wrapped in try/catch + log), it
fires the corresponding index op. A new `GET /api/products/search` controller route
proxies to Typesense and maps hits → the existing `{data, meta}` shape **plus**
`facet_counts`. When Typesense is down at query time, the proxy **falls back to the
current Prisma `contains` search** so the storefront never fully breaks. A standalone
`pnpm search:reindex` command streams all rows from Postgres and bulk-imports them —
bootstrap mechanism + drift self-healer.

Frontend: `ProductosService` gains a `search()` method hitting `/products/search`; the
header search box and `/busqueda` page switch to ~250 ms **debounced as-you-type**.
`/tienda` stays on `/products` (out of scope).

This realizes proposal §Approach 1-6 and the locked decisions verbatim.

## Architecture Decisions

### Decision: Two providers — `TypesenseService` (transport) vs `ProductIndexService` (domain)

**Choice**: Split the search concern into a transport-level client wrapper and a
domain-level indexing service, both living in `src/products/search/`.

**Alternatives considered**: A single monolithic `SearchService`; or a top-level
`SearchModule` shared across domains.

**Rationale**: `TypesenseService` knows nothing about `Producto` — it knows hosts, keys,
collection bootstrap, health, and raw search/import. `ProductIndexService` owns the
flatten mapping (`Decimal → number`, epoch conversion, null handling) and the
`estado = PUBLICADO` policy. This is the same separation the codebase already favors
(thin `PrismaService` transport vs domain services). A top-level `SearchModule` is
premature — only products are indexed today; keeping it under `products/` keeps the
blast radius small and matches the "additive, isolated" rollback plan. Promote to a
shared module only if a second domain needs indexing.

### Decision: Write-through best-effort sync, outside the Prisma transaction

**Choice**: After a successful Prisma write in `create`/`update`/`remove`, call
`ProductIndexService.upsert(...)` / `.delete(...)` wrapped in try/catch; log failures;
never block or fail the HTTP response. Index calls run **outside** any DB transaction.

**Alternatives considered**: (b) reindex-only (no real-time); (c) outbox/queue/CDC for
durable exactly-once eventing.

**Rationale**: An external HTTP call cannot be transactional with Prisma anyway, and the
source of truth (Postgres) must win — a Typesense outage during a write must NOT roll
back or 500 the product write. Idempotency is free: Typesense `upsert` is keyed by `id`,
delete-of-missing is a no-op. The drift this introduces is repaired by the idempotent
reindex (the safety net). Outbox/CDC (option c) is real infrastructure (worker/broker)
and overkill at this scale — explicitly deferred. **Locked decision 1.**

### Decision: New `GET /products/search` proxy; existing `/products` untouched

**Choice**: Add a dedicated Typesense-backed route. Admin grids and `/tienda` keep using
Prisma-backed `GET /products`.

**Alternatives considered**: Replacing the `findAll` search branch with Typesense.

**Rationale**: `/products` listing relies on Prisma exactness, full record shape, and
DB-truth ordering; swapping its search path risks admin regressions and couples listing
to the index. A separate endpoint isolates the new capability and makes rollback a route
deletion. **Locked decisions 2 + 6.**

### Decision: NestJS proxy holds the admin key; no browser key now

**Choice**: The backend reads `TYPESENSE_API_KEY` via `ConfigService` and queries
Typesense server-side. The browser never sees a Typesense key or host.

**Alternatives considered**: A scoped, search-only key shipped to the browser for direct
InstantSearch-style queries.

**Rationale**: One controlled API surface (same origin/CORS/rate-limit/logging), the key
never leaves the server, and the backend can enforce the mandatory `estado = PUBLICADO`
filter centrally and reshape to `{data, meta}`. A scoped browser key is a second public
surface to secure — deferred. **Locked decisions 3 + 8.**

### Decision: Query-time fallback to Prisma `contains`

**Choice**: In the search proxy, if Typesense is unreachable/unhealthy, fall back to the
existing Prisma `OR: [{nombre contains}, {sku contains}]` search and return the same
`{data, meta}` shape (with empty `facets`).

**Alternatives considered**: Return a 503 / clear error to the client.

**Rationale**: Storefront search degrading (losing typo-tolerance/facets) beats breaking.
The fallback reuses `ProductsService.findAll`'s where-clause logic, so the contract holds.
**Locked decision 4.**

### Decision: `Decimal → float`, `creadoEn → int64` epoch in the flatten step

**Choice**: Cast Prisma `Decimal precio` to a JS `number` (`Number(p.precio)` /
`p.precio.toNumber()`) → Typesense `float`. Convert `creadoEn` to epoch millis
(`p.creadoEn.getTime()`) → Typesense `int64`. `existencias` → `int32`.

**Alternatives considered**: Storing `precio` as string; storing `creadoEn` as ISO
string and sorting lexicographically.

**Rationale**: Typesense needs numeric types for range filters and sorts. Decimal
serializes to a string by default — passing it raw would break `sort_by: precio` and
price range filters (proposal Risk: Decimal→float). Epoch `int64` gives a correct default
recency sort (`creadoEn:desc`) without string-date pitfalls. **Locked decision per
explore §3.**

### Decision: Disable typo-tolerance on `sku` / `codigoBarras`

**Choice**: Use `num_typos: 1` overall but disable typos on part-number fields so SKUs /
barcodes match exactly. Implemented per-query via `num_typos` field overrides
(e.g. `num_typos: "1,1,1,1,0,1,1,0"` aligned to `query_by`, or equivalent
`typo_tokens_threshold`/`drop_tokens_threshold` tuning) so a typo never silently maps a
part number to a different product.

**Alternatives considered**: Global default typo tolerance on all fields.

**Rationale**: Part numbers are identifiers — a "fuzzy" SKU match is wrong, not helpful.
Names/descriptions still get fuzzy matching. **Locked decision per explore §3.**

### Decision: Schema migration via recreate + alias swap (zero-downtime rebuild)

**Choice**: Public queries target a **collection alias** (`productos`), not the physical
collection. On schema change or full rebuild, the reindex command creates a fresh
versioned collection (e.g. `productos_v2`), bulk-imports into it, then atomically points
the alias at the new collection and drops the old one. Write-through ops also resolve
through the alias.

**Alternatives considered**: Mutating the live collection in place with `action: upsert`;
deleting + recreating the live collection (search down during rebuild).

**Rationale**: Typesense collection schemas are largely immutable for typed fields;
changing field types requires a new collection. The alias indirection gives zero-downtime
rebuilds and a clean migration story. For routine drift-repair (no schema change) the
command can simply `action: upsert` into the live collection — the alias swap is reserved
for schema changes / full rebuilds. **Locked decisions 1 + 7.**

### Decision: Graceful boot when Typesense is absent

**Choice**: `TypesenseService.onModuleInit()` attempts the collection bootstrap inside
try/catch. On failure it logs a warning and sets an internal `ready=false` flag; it does
NOT throw. Every method checks readiness/health and short-circuits (index ops become
no-ops + log; search signals the proxy to use the Prisma fallback).

**Alternatives considered**: Hard dependency — fail app boot if Typesense is down.

**Rationale**: New required infra must not block local dev / deploys. Backend boots, the
storefront degrades gracefully, and the next successful op or `search:reindex` heals the
index. **Locked decision per proposal Success Criteria.**

## Data Flow

### Write path (write-through, best-effort)

    POST/PATCH/DELETE /api/products
            │
            ▼
    ProductsController (JwtAuthGuard + RolesGuard ADMIN/SUPER)
            │
            ▼
    ProductsService.create/update/remove
            │  1. Prisma write  ── COMMIT ──►  PostgreSQL (source of truth)
            │
            │  2. AFTER commit, OUTSIDE txn, try/catch + log:
            ▼
    ProductIndexService.upsert(producto) / .delete(id)
            │       (flatten: Decimal→float, creadoEn→epoch, denormalize marca/categoria)
            ▼
    TypesenseService → Typesense collection (alias: productos)
            (on failure: log, swallow — response still 200/201; drift repaired by reindex)

### Read path (public search + fallback)

    GET /api/products/search?q=&categoriaId=&marcaId=&etiquetas=&sort=&page=&perPage=
            │
            ▼
    ProductsController.search()
            │
            ▼
    ProductIndexService.search(dto)
            │   inject filter_by: estado:=PUBLICADO  (+ category/brand/tags filters)
            │   query_by + weights, facet_by, num_typos overrides
            ├──► TypesenseService.search()  ──►  Typesense  ──►  hits + facet_counts
            │                                                         │
            │                                          map → { data, meta, facets }
            │
            └── (Typesense down/unhealthy) ──► Prisma fallback ──► PostgreSQL
                                                 reuse findAll where-clause +
                                                 force estado=PUBLICADO
                                                 → { data, meta, facets: {} }

### Reindex path (bootstrap + drift self-heal)

    pnpm search:reindex  (standalone, dotenv/config like seed.ts)
            │
            ▼
    stream all Producto rows  (include: { marca, categoria })  in batches
            │
            ▼
    flatten each (same mapper as write-through)
            │
            ▼
    Typesense bulk import  (action: upsert into live collection)
       └─ OR fresh collection + alias swap when schema changed (zero-downtime)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `docker-compose.yml` | Modify | Add pinned `typesense/typesense:27.1` service (port 8108, `--enable-cors`, healthcheck) + named volume `electric_kar_typesense` |
| `electric-kar/.env.example` | Modify | Add `TYPESENSE_HOST`, `TYPESENSE_PORT=8108`, `TYPESENSE_PROTOCOL=http`, `TYPESENSE_API_KEY=dev_local_key` |
| `electric-kar/.env` | Modify | Same vars with local values |
| `electric-kar/package.json` | Modify | Add `typesense` client dep; add `"search:reindex": "tsx prisma/reindex.ts"` (or `src/products/search/reindex.ts`) script |
| `electric-kar/src/products/search/typesense.service.ts` | Create | Client wrapper: ConfigService-driven client, `onModuleInit` collection bootstrap, health/readiness flag, raw `search`/`import`/`upsertDocument`/`deleteDocument`, alias helpers — degrades gracefully if absent |
| `electric-kar/src/products/search/product-index.service.ts` | Create | `flatten(producto)`, `upsert`, `delete`, `search(dto)` (injects `estado=PUBLICADO`, maps hits→`{data,meta,facets}`, Prisma fallback), `reindexAll()` bulk import |
| `electric-kar/src/products/search/product-document.ts` | Create | `ProductDocument` type + collection schema definition (fields/types/facets/default_sorting_field) |
| `electric-kar/src/products/dto/search-product.dto.ts` | Create | Query DTO: `q`, `categoriaId`, `marcaId`, `etiquetas`, `sort`, `page`, `perPage` (mirrors `QueryProductDto` validation style) |
| `electric-kar/src/products/search/reindex.ts` (or `prisma/reindex.ts`) | Create | Standalone reindex command — Prisma stream → flatten → bulk import (alias swap on rebuild) |
| `electric-kar/src/products/products.service.ts` | Modify | Inject `ProductIndexService`; write-through hooks in `create`/`update`/`remove` (outside txn, try/catch+log); `searchPublic()` proxy + Prisma fallback |
| `electric-kar/src/products/products.controller.ts` | Modify | Add public `GET /products/search` (declared BEFORE `GET /:id` to avoid route shadowing) |
| `electric-kar/src/products/products.module.ts` | Modify | Register `TypesenseService` + `ProductIndexService` providers; `ConfigModule` is already global |
| `electric-kar-front/src/app/core/productos.service.ts` | Modify | Add `search(query)` hitting `/products/search`; add facet types to response model |
| `electric-kar-front/src/app/tienda/catalogo/busqueda/busqueda.component.ts` | Modify | ~250 ms debounced as-you-type via signal + `debounceTime`; parse `{data, meta, facets}` |
| header search component | Modify | Same debounced as-you-type → `/busqueda`/search endpoint |

## Interfaces / Contracts

### Collection schema (`productos`)

```ts
{
  name: 'productos_v1',                 // physical; alias 'productos' points here
  default_sorting_field: 'creadoEn',
  enable_nested_fields: false,
  fields: [
    { name: 'id',               type: 'string'   },
    { name: 'nombre',           type: 'string'                    },
    { name: 'sku',              type: 'string'                    },
    { name: 'codigoBarras',     type: 'string',  optional: true   },
    { name: 'descripcionCorta', type: 'string',  optional: true   },
    { name: 'descripcion',      type: 'string',  optional: true   },
    { name: 'etiquetas',        type: 'string[]', facet: true     },
    { name: 'marcaNombre',      type: 'string',  optional: true, facet: true },
    { name: 'categoriaNombre',  type: 'string',  optional: true, facet: true },
    { name: 'marcaId',          type: 'string',  optional: true, facet: true },
    { name: 'categoriaId',      type: 'string',  optional: true, facet: true },
    { name: 'estado',           type: 'string',  facet: true      },
    { name: 'precio',           type: 'float'                     },  // Decimal → number
    { name: 'existencias',      type: 'int32'                     },
    { name: 'creadoEn',         type: 'int64'                     },  // epoch millis
  ],
}
```

### Search query params (Typesense)

```ts
{
  q,
  query_by: 'nombre,etiquetas,marcaNombre,categoriaNombre,sku,descripcionCorta,descripcion',
  query_by_weights: '6,4,3,3,5,2,1',     // favor nombre + exact sku
  num_typos: '1,1,1,1,0,1,1',            // 0 for sku → exact part-number match
  filter_by: 'estado:=PUBLICADO' (+ ' && categoriaId:=… && marcaId:=… && etiquetas:=[…]'),
  facet_by: 'categoriaId,marcaId,etiquetas,marcaNombre,categoriaNombre',
  sort_by: '_text_match:desc,creadoEn:desc'  // or precio:asc/desc when sort=precio
  page, per_page,
}
```

### Flatten mapper (Decimal/date handling)

```ts
function flatten(p: ProductoWithRelations): ProductDocument {
  return {
    id: p.id,
    nombre: p.nombre,
    sku: p.sku,
    codigoBarras: p.codigoBarras ?? undefined,
    descripcionCorta: p.descripcionCorta ?? undefined,
    descripcion: p.descripcion ?? undefined,
    etiquetas: p.etiquetas ?? [],
    marcaNombre: p.marca?.nombre ?? undefined,
    categoriaNombre: p.categoria?.nombre ?? undefined,
    marcaId: p.marcaId ?? undefined,
    categoriaId: p.categoriaId ?? undefined,
    estado: p.estado,
    precio: Number(p.precio),          // Prisma Decimal → JS number (float)
    existencias: p.existencias,        // int32
    creadoEn: p.creadoEn.getTime(),    // epoch millis → int64
  };
}
```

### Proxy response (unchanged frontend shape + facets)

```ts
{
  data: Producto[],                              // hits.document, reshaped to Producto-like
  meta: { total, page, limit, pages },           // from found / page / per_page
  facets: { categoriaId: {value,count}[], marcaId: […], etiquetas: […] }  // from facet_counts
}
```

### NestJS wiring (ProductsModule)

```ts
@Module({
  controllers: [ProductsController],
  providers: [ProductsService, TypesenseService, ProductIndexService],
  exports: [ProductsService],
})
export class ProductsModule {}
```
`TypesenseService` reads config via the already-global `ConfigService`
(`config.get('TYPESENSE_HOST')`, etc.) — no extra `ConfigModule.forRoot` needed
(see `app.module.ts` L25: `ConfigModule.forRoot({ isGlobal: true })`).

### Docker Compose service

```yaml
  typesense:
    image: typesense/typesense:27.1
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
      # OJO: la imagen typesense/typesense:27.1 NO trae curl/wget. Usar bash /dev/tcp.
      test: ['CMD', 'bash', '-c', 'exec 3<>/dev/tcp/localhost/8108 && printf "GET /health HTTP/1.0\r\n\r\n" >&3 && grep -q ok <&3']
      interval: 5s
      timeout: 5s
      retries: 10
# under top-level volumes:
#   electric_kar_typesense:
#     name: electric_kar_typesense
```

### ProductsService write-through hook (illustrative)

```ts
async create(dto: CreateProductDto) {
  let producto;
  try { producto = await this.prisma.producto.create({ data: dto }); }
  catch (e) { throw this.handleKnownErrors(e); }
  await this.indexSafe(() => this.productIndex.upsert(producto));  // best-effort
  return producto;
}
private async indexSafe(op: () => Promise<unknown>) {
  try { await op(); }
  catch (e) { this.logger.warn(`Typesense sync failed: ${e}`); }  // never rethrow
}
```
Note: current `create` returns the bare row (no relations). For an accurate
`marcaNombre`/`categoriaNombre` on write-through, re-read via `findOne(id)` (which
already `include`s `categoria`/`marca`) before flattening, or accept that names land on
the next reindex (drift is accepted per locked decision 7).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `flatten()` mapper | Jest: Decimal→number exactness, `creadoEn`→epoch int64, null `marcaId`/`categoriaId`/optional text → omitted, `etiquetas` default `[]` |
| Unit | `ProductIndexService.search` filter injection | Assert `estado:=PUBLICADO` always present; category/brand/tags appended; sort/typo overrides correct |
| Unit | Graceful degradation | Mock `TypesenseService.ready=false` → `upsert`/`delete` no-op (no throw); `search` returns Prisma fallback shape |
| Unit | `ProductsService` write-through | Mock `ProductIndexService` throwing → `create`/`update`/`remove` still resolve (Postgres wins, error logged) |
| Integration | Reindex command | Against a live/test Typesense: seed N rows → `reindexAll` → assert doc count == row count, idempotent on re-run |
| Integration | `GET /products/search` | Typo query returns ranked hits; `facet_counts` present; BORRADOR/PROGRAMADO never surface |
| Integration | Fallback path | Point client at dead host → endpoint returns Prisma-backed `{data, meta, facets:{}}` (degraded, 200) |
| E2E (manual) | Network check | Verify no Typesense key/host in browser network traffic (Success Criteria) |

## Migration / Rollout

- **Schema migration**: collection schemas are immutable for typed fields. Field changes →
  reindex into a fresh `productos_vN` then alias-swap `productos` (zero downtime). Routine
  drift-repair uses `action: upsert` into the live collection.
- **Bootstrap**: on deploy/seed run `pnpm prisma:deploy && pnpm db:seed && pnpm search:reindex`.
  First boot auto-creates the collection via `TypesenseService.onModuleInit`; `search:reindex`
  populates it.
- **Rollback** (additive): remove the `GET /products/search` route + the write-through hooks;
  `GET /products` Prisma path is untouched. Frontend reverts to `/products`. Stop/remove the
  `typesense` service + volume — Postgres unaffected (Typesense holds no source-of-truth data).
- **No data migration** on Postgres. No `Producto` schema change.

## Open Questions

- [ ] Write-through accuracy of `marcaNombre`/`categoriaNombre`: re-read via `findOne` after
      write (1 extra query) vs accept names-on-next-reindex drift. Leaning re-read on
      `create`/`update` since `findOne` already includes relations; cheap and avoids visible
      stale labels. (Does not block design — locked decision 7 permits either.)
- [ ] Exact `query_by_weights` / `num_typos` per-field tuning is best finalized empirically
      against seed data during implementation; values above are the starting point.
- [ ] Standalone reindex entry point location: `prisma/reindex.ts` (mirrors `seed.ts`,
      simplest) vs a Nest `CommandModule`/standalone app context to reuse the DI providers.
      `prisma/reindex.ts` reusing the shared `flatten` mapper is the low-friction choice.
