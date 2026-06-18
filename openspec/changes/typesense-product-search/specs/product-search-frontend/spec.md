# Product Search Frontend Specification

## Purpose

Defines the frontend behavior for the new Typesense-backed search: the header
search box and the `/busqueda` page switch to `GET /api/products/search` with
debounced (~250 ms) as-you-type search, consuming the `{data, meta}` + facet
payload. Scope is intentionally limited to the header search and `/busqueda`;
the `/tienda` catalog stays on the existing `/products` endpoint for this change.

---

## Requirements

### Requirement: Search Service Calls the Search Endpoint

The frontend products service MUST expose a `search()` method that calls
`GET /api/products/search` with the query string and supported params
(`categoriaId`, `marcaId`, `etiquetas`, `sort`, `page`, `perPage`) and parses the
`{data, meta}` + facet-counts response. It MUST NOT route header/`busqueda`
search through the legacy `/products` listing endpoint.

#### Scenario: search() hits the search endpoint

- GIVEN the products service `search()` method
- WHEN it is invoked with `q = "bateria"`
- THEN it issues a request to `GET /api/products/search?q=bateria`
- AND it returns the parsed `{ data, meta }` plus facet counts

---

### Requirement: Debounced As-You-Type on Header Search

The header search box MUST perform as-you-type search with a debounce of
approximately 250 ms. While the user types, the component MUST NOT issue a
request on every keystroke; it MUST wait until input has settled (~250 ms) before
calling `search()`. Rapid consecutive keystrokes MUST collapse into a single
request for the final value.

#### Scenario: Rapid typing collapses to one request

- GIVEN the header search box
- WHEN the user types "b", "a", "t" within ~250 ms of each other
- THEN no request is sent for the intermediate values
- AND exactly one `GET /api/products/search` request is sent for the settled value "bat"

#### Scenario: Pausing triggers a search

- GIVEN the header search box with text already entered
- WHEN the user stops typing for ~250 ms
- THEN a single `search()` call is made with the current query

---

### Requirement: Debounced As-You-Type on /busqueda Page

The `/busqueda` page MUST consume `GET /api/products/search` with the same
~250 ms debounced as-you-type behavior, render the returned `data`, and be
capable of displaying the facet counts (category/brand/tags) from the response.
It MUST handle an empty query (browse) and a no-results state without runtime
errors.

#### Scenario: busqueda renders search results

- GIVEN the `/busqueda` page is loaded
- WHEN the user types a query and input settles
- THEN a single debounced `search()` request is issued
- AND the returned `data` items are rendered without runtime errors

#### Scenario: No-results state handled

- GIVEN a query that matches no published products
- WHEN the debounced search resolves with an empty `data` array
- THEN the page renders an empty/no-results state without errors

#### Scenario: Degraded fallback still renders

- GIVEN the backend fell back to Prisma (facet counts empty/absent)
- WHEN the `/busqueda` page receives the `{data, meta}` response
- THEN it renders the `data` results without errors despite missing facets

---

### Requirement: Tienda Catalog Stays on /products (Out of Scope)

The `/tienda` catalog MUST continue to use the existing `GET /api/products`
endpoint for this change. It MUST NOT be migrated to the search endpoint as part
of this scope.

#### Scenario: Tienda unchanged

- GIVEN the `/tienda` catalog page
- WHEN it loads products
- THEN it calls `GET /api/products` (the legacy listing path)
- AND its behavior is unchanged by this change
