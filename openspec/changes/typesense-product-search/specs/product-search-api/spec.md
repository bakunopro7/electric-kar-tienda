# Product Search API Specification

## Purpose

Defines the new public, Typesense-backed search endpoint
`GET /api/products/search`. Covers the query-parameter contract, the
`{data, meta}` + facet-counts response shape, typo tolerance and relevance
(including near-exact SKU matching), the mandatory `estado = PUBLICADO` public
filter, security (the Typesense admin key never reaches the browser), and the
query-time fallback to Prisma `contains` when Typesense is unavailable.

The existing `GET /api/products` listing path is NOT modified by this change.

---

## Requirements

### Requirement: Search Endpoint and Query Contract

The system MUST expose a new public endpoint
`GET /api/products/search` accepting the query parameters `q` (free-text query
string), `categoriaId`, `marcaId`, `etiquetas`, `sort`, `page`, and `perPage`.
`page` MUST default to 1 and `perPage` MUST have a sensible default and an upper
bound. Omitting `q` (or an empty `q`) MUST be valid and MUST return a
browse-style result set rather than an error. The endpoint MUST be additive: the
existing `GET /api/products` endpoint and its Prisma `contains` search path MUST
remain unchanged.

#### Scenario: Search with a query term

- GIVEN published products exist in the index
- WHEN `GET /api/products/search?q=bateria` is called
- THEN the response status is 200
- AND `data` contains products matching "bateria"

#### Scenario: Empty query browses results

- GIVEN published products exist in the index
- WHEN `GET /api/products/search` is called with no `q`
- THEN the response status is 200
- AND `data` is a (possibly paginated) list of published products

#### Scenario: Filter by category and brand

- GIVEN published products across multiple categories and brands
- WHEN `GET /api/products/search?categoriaId=C1&marcaId=M1` is called
- THEN `data` contains only products with `categoriaId === 'C1'` AND `marcaId === 'M1'`

#### Scenario: Existing listing endpoint unchanged

- GIVEN the search endpoint is deployed
- WHEN `GET /api/products?search=bateria` is called
- THEN it still uses the existing Prisma `contains` path and response shape
- AND its behavior is identical to before this change

---

### Requirement: Response Shape — data, meta, and facet counts

The search endpoint MUST return the SAME `{ data, meta }` envelope the frontend
already consumes from `/products`, where `meta` includes `total`, `page`,
`limit` (or `perPage`), and `pages`. In addition, the response MUST include
facet counts for at least `categoriaId`, `marcaId`, and `etiquetas`, so the UI
can render facet sidebars with counts. The `data` items MUST carry the product
fields the storefront needs (id, nombre, sku, precio as a number, marcaNombre,
categoriaNombre, etiquetas, etc.).

#### Scenario: Envelope matches the products shape plus facets

- GIVEN 30 published products matching the query
- WHEN `GET /api/products/search?q=...&perPage=20&page=1` is called
- THEN `data` contains at most 20 items
- AND `meta.total` is 30, `meta.page` is 1, `meta.pages` is 2
- AND the response includes facet counts for `categoriaId`, `marcaId`, and `etiquetas`

#### Scenario: Facet counts reflect the matched set

- GIVEN matched published products where 7 are in category "C1" and 3 in "C2"
- WHEN the search is executed
- THEN the `categoriaId` facet contains a count of 7 for "C1" and 3 for "C2"

#### Scenario: precio serialized as a number in results

- GIVEN a matched product with `precio` 1499.99
- WHEN it is returned in `data`
- THEN its `precio` field is the JSON number `1499.99` (not a string)

---

### Requirement: Public Search Returns Only PUBLICADO Products

The search endpoint MUST enforce the filter `estado = PUBLICADO` CENTRALLY in the
backend proxy for all public search requests. Products with `estado` of
`BORRADOR` or `PROGRAMADO` MUST NEVER appear in public search results, facet
counts, or `meta.total`. This filter MUST NOT be supplied or overridable by the
client.

#### Scenario: Draft and scheduled products excluded

- GIVEN 10 PUBLICADO, 4 BORRADOR, and 2 PROGRAMADO products all matching the query
- WHEN `GET /api/products/search?q=...` is called
- THEN `data` contains only PUBLICADO products
- AND `meta.total` is 10
- AND no BORRADOR or PROGRAMADO product appears in results or facet counts

#### Scenario: Client cannot override the estado filter

- GIVEN a client attempts to pass `estado=BORRADOR` (or any estado override) as a query param
- WHEN the search is executed
- THEN the override is ignored
- AND only PUBLICADO products are returned

---

### Requirement: Typo Tolerance and Relevance Ranking

The search endpoint MUST return typo-tolerant, relevance-ranked results. A query
with a small typo MUST still match the intended product. Relevance MUST weight
`nombre` highly, and `sku` (and `codigoBarras`) MUST match near-exactly so part
numbers are not fuzzed away — i.e. typo tolerance on `sku`/`codigoBarras` MUST be
restricted so exact-ish part-number matches rank correctly.

#### Scenario: Typo in query still matches

- GIVEN a published product named "Batería de Litio"
- WHEN `GET /api/products/search?q=bateira` (transposed letters) is called
- THEN the "Batería de Litio" product appears in `data`

#### Scenario: SKU exact-ish match ranks first

- GIVEN a published product with `sku` "ABC-12345"
- WHEN `GET /api/products/search?q=ABC-12345` is called
- THEN that product is the top-ranked result in `data`

#### Scenario: Name match outranks description-only match

- GIVEN product A with "cargador" in `nombre` and product B with "cargador" only in `descripcion`
- WHEN `GET /api/products/search?q=cargador` is called
- THEN product A ranks above product B

---

### Requirement: Query-Time Fallback to Prisma

If Typesense is UNAVAILABLE at search time (connection refused, timeout, or
error), the search endpoint MUST fall back to the existing Prisma `contains`
(ILIKE, case-insensitive) search over `nombre` and `sku`, still enforcing
`estado = PUBLICADO`, and MUST return results in the same `{data, meta}`
envelope. The fallback is DEGRADED — it MAY omit typo tolerance and facet counts
— but the endpoint MUST NOT return a hard failure solely because Typesense is
down.

#### Scenario: Typesense down at search time falls back

- GIVEN Typesense is unreachable
- WHEN `GET /api/products/search?q=bateria` is called
- THEN the response status is 200
- AND `data` contains published products matching "bateria" via Prisma `contains`
- AND the fallback path still excludes non-PUBLICADO products

#### Scenario: Fallback degrades gracefully (no facets / typo tolerance)

- GIVEN Typesense is unreachable and the endpoint falls back to Prisma
- WHEN the search is executed
- THEN results are returned without error
- AND facet counts MAY be empty/absent and typo tolerance is not applied
- AND a `meta` object is still present

---

### Requirement: Typesense Admin Key Never Reaches the Browser

All Typesense traffic MUST be proxied through the NestJS backend, which holds the
Typesense admin/bootstrap key server-side. The admin key MUST NEVER be included
in any HTTP response sent to the browser, nor exposed via the search endpoint
payload, headers, or any client-reachable configuration.

#### Scenario: Search response contains no admin key

- GIVEN the search endpoint is called from the browser
- WHEN the response is inspected (body and headers)
- THEN the Typesense admin/bootstrap API key is not present anywhere in the response

#### Scenario: Browser cannot reach Typesense directly through the app surface

- GIVEN the application's public API surface
- WHEN a client searches products
- THEN it does so only via `GET /api/products/search` (the NestJS proxy)
- AND no scoped or admin Typesense key is shipped to enable direct client-to-Typesense queries
