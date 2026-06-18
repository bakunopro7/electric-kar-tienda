# Product Search Index Specification

## Purpose

Defines how the Typesense product index is kept in sync with PostgreSQL, the
single source of truth. Covers write-through best-effort sync on product
create/update/remove, the idempotent `search:reindex` backfill command, the
denormalized document shape (including `Decimal → float` price serialization and
nullable `categoriaId`/`marcaId` handling), and graceful degradation when
Typesense is absent at boot.

Guiding principle ("todo desde la DB"): Typesense is a DERIVED, fully rebuildable
index. A failure to index MUST NEVER fail or block the PostgreSQL write, and the
index MUST be reconstructable from Postgres at any time with zero data loss.

---

## Requirements

### Requirement: Write-Through Best-Effort Index Sync on Create

After `ProductsService.create` successfully commits a `Producto` to PostgreSQL,
the system MUST fire a best-effort Typesense upsert of the flattened product
document. The index call MUST run OUTSIDE the Prisma write transaction and MUST
be wrapped so that any Typesense error (timeout, connection refused, HTTP error)
is caught and logged WITHOUT propagating to the caller. The Postgres write
result MUST be returned to the caller regardless of the index outcome.

#### Scenario: Product created and indexed successfully

- GIVEN Typesense is reachable
- WHEN `ProductsService.create` commits a new `Producto`
- THEN the Postgres row is persisted
- AND a Typesense document keyed by `Producto.id` is upserted
- AND the created product is returned to the caller

#### Scenario: Typesense down during create does not fail the write

- GIVEN Typesense is unreachable (connection refused)
- WHEN `ProductsService.create` commits a new `Producto`
- THEN the Postgres row is persisted
- AND the created product is returned to the caller with a 2xx outcome
- AND the index failure is logged
- AND no exception propagates to the controller

---

### Requirement: Write-Through Best-Effort Index Sync on Update

After `ProductsService.update` successfully commits a `Producto` change to
PostgreSQL, the system MUST fire a best-effort Typesense upsert of the updated
flattened document, keyed by `Producto.id`. The call MUST run outside the Prisma
transaction, MUST be try/catch-wrapped and logged on failure, and MUST NOT fail
or block the Postgres write.

#### Scenario: Product updated and re-indexed

- GIVEN Typesense is reachable and a `Producto` already exists in the index
- WHEN `ProductsService.update` changes the product `nombre`
- THEN the Postgres row reflects the new `nombre`
- AND the Typesense document for that `id` is upserted with the new `nombre`

#### Scenario: Typesense error during update does not fail the write

- GIVEN Typesense returns a 5xx error
- WHEN `ProductsService.update` commits a `Producto` change
- THEN the Postgres update succeeds and is returned to the caller
- AND the index failure is logged
- AND no exception propagates to the caller

---

### Requirement: Write-Through Best-Effort Index Delete on Remove

After `ProductsService.remove` successfully deletes a `Producto` from
PostgreSQL, the system MUST fire a best-effort Typesense delete keyed by
`Producto.id`. Deleting a document that does not exist in Typesense MUST be
treated as a no-op (idempotent) and MUST NOT raise. The call MUST run outside
the Prisma transaction, be try/catch-wrapped and logged on failure, and MUST NOT
fail or block the Postgres delete.

#### Scenario: Product removed and de-indexed

- GIVEN Typesense is reachable and a `Producto` exists in the index
- WHEN `ProductsService.remove` deletes the product
- THEN the Postgres row is deleted
- AND the Typesense document for that `id` no longer exists

#### Scenario: Delete of a document missing from the index is a no-op

- GIVEN a `Producto` that was never indexed (e.g. created during a Typesense outage)
- WHEN `ProductsService.remove` deletes that product
- THEN the Postgres delete succeeds
- AND the missing-document delete is treated as a no-op
- AND no error propagates to the caller

#### Scenario: Typesense down during remove does not fail the delete

- GIVEN Typesense is unreachable
- WHEN `ProductsService.remove` deletes a `Producto`
- THEN the Postgres delete succeeds
- AND the index delete failure is logged
- AND no exception propagates to the caller

---

### Requirement: Flattened Product Document Shape

The system MUST denormalize a `Producto` (with its `marca` and `categoria`
relations) into a flat Typesense document before indexing. The document MUST use
`Producto.id` (uuid string) as the document `id` and MUST include the indexable
text fields `nombre`, `sku`, `codigoBarras`, `descripcionCorta`, `descripcion`,
and `etiquetas`, the denormalized `marcaNombre` and `categoriaNombre`, the
facet/filter fields `marcaId`, `categoriaId`, `etiquetas`, and `estado`, and the
numeric fields `precio`, `existencias`, and `creadoEn`.

#### Scenario: Full product flattened with relations

- GIVEN a `Producto` with a `marca` named "Bosch" and a `categoria` named "Baterías"
- WHEN the product is flattened for indexing
- THEN `marcaNombre` is "Bosch" and `categoriaNombre` is "Baterías"
- AND `marcaId` and `categoriaId` equal the related row ids
- AND `etiquetas` is preserved as a string array

---

### Requirement: Decimal Price Serialized to Float

When flattening a `Producto`, the system MUST cast the Prisma `Decimal` `precio`
to a JavaScript `number` (float) before indexing. The indexed `precio` MUST be a
numeric value (not a string and not a `Decimal` object), so that Typesense range
filters and numeric sorts on `precio` behave correctly.

#### Scenario: Decimal precio cast to float

- GIVEN a `Producto` with `precio` Decimal `1499.99`
- WHEN the product is flattened for indexing
- THEN the document `precio` field is the number `1499.99`
- AND it is NOT a string and NOT a Decimal object

#### Scenario: Price sort respects numeric ordering

- GIVEN indexed products with `precio` 99.90, 1000.00, and 250.50
- WHEN results are sorted by `precio` ascending
- THEN the order is 99.90, 250.50, 1000.00 (numeric, not lexicographic)

---

### Requirement: Nullable Category and Brand Handled

The flattening and collection schema MUST treat `categoriaId`, `marcaId`,
`categoriaNombre`, and `marcaNombre` as OPTIONAL. A `Producto` with a null
`categoriaId` and/or null `marcaId` (e.g. after `onDelete: SetNull`) MUST be
indexable without error, and faceting/filtering MUST NOT crash on the missing
values.

#### Scenario: Product with no category indexes cleanly

- GIVEN a `Producto` whose `categoriaId` is null and `marcaId` is null
- WHEN the product is flattened and indexed
- THEN the index call succeeds
- AND the `categoriaId` / `marcaId` / `categoriaNombre` / `marcaNombre` fields are omitted or empty
- AND the document is searchable by its text fields

#### Scenario: Facet counts tolerate missing category

- GIVEN an index containing products with and without a `categoriaId`
- WHEN a search requests `categoriaId` facet counts
- THEN the response returns counts for the present category ids without error
- AND products with a null `categoriaId` do not break the facet response

---

### Requirement: Idempotent Reindex / Backfill Command

The system MUST provide a standalone `search:reindex` command (runnable via the
project package script, e.g. `pnpm search:reindex`) that streams ALL `Producto`
rows from PostgreSQL (with `marca`/`categoria` included), flattens them, and bulk
imports them into Typesense using an upsert action. The command MUST be
idempotent: running it once or many times on the same Postgres data MUST converge
the index to the same state. It MUST bootstrap the Typesense collection schema if
the collection does not yet exist. It serves as the index bootstrap mechanism and
the safety net that self-heals any write-through drift, and is intended to run on
seed/deploy.

#### Scenario: Reindex bootstraps an empty index

- GIVEN an empty Typesense (collection does not exist) and N products in Postgres
- WHEN `search:reindex` runs
- THEN the product collection is created
- AND all N products are present in the index

#### Scenario: Reindex is idempotent on repeated runs

- GIVEN `search:reindex` has already populated the index from Postgres
- WHEN `search:reindex` runs a second time with unchanged Postgres data
- THEN the index document count equals the Postgres `Producto` count
- AND no duplicate documents are created (upsert keyed by `id`)

#### Scenario: Reindex self-heals write-through drift

- GIVEN a product was created in Postgres while Typesense was down (so it is missing from the index)
- WHEN `search:reindex` runs
- THEN the previously-missing product appears in the index
- AND denormalized `marcaNombre`/`categoriaNombre` reflect current Postgres values

---

### Requirement: Marca/Categoria Rename Repaired Only by Reindex

On `Marca` or `Categoria` rename, the system MUST NOT trigger an immediate
re-sync of affected products. The denormalized `marcaNombre`/`categoriaNombre`
in Typesense MAY be temporarily stale (name drift is accepted) and MUST be
repaired by the next `search:reindex` run.

#### Scenario: Brand rename leaves index stale until reindex

- GIVEN products indexed with `marcaNombre` "Bosch"
- WHEN the `Marca` is renamed to "Bosch Pro" in Postgres
- THEN no immediate product re-sync occurs
- AND the indexed `marcaNombre` may still read "Bosch" until `search:reindex` runs

#### Scenario: Reindex repairs the renamed brand

- GIVEN the `Marca` was renamed to "Bosch Pro" and the index still reads "Bosch"
- WHEN `search:reindex` runs
- THEN the indexed `marcaNombre` reads "Bosch Pro"

---

### Requirement: Graceful Degradation When Typesense Absent at Boot

The backend MUST start successfully even when Typesense is unavailable at
application boot. The Typesense client wrapper MUST NOT throw a fatal error
during module initialization if the collection cannot be reached or bootstrapped;
it MUST log the condition and allow the application to continue serving the
existing endpoints.

#### Scenario: Backend boots with Typesense down

- GIVEN Typesense is not running
- WHEN the NestJS application starts
- THEN the application boots and serves requests
- AND the Typesense-absent condition is logged
- AND existing endpoints (e.g. `GET /api/products`) function normally
