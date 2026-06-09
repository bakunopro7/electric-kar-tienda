# CFDI Pagination Specification

## Purpose

Replaces the unbounded `GET /api/cfdi` query with offset pagination so that the
CFDI admin list scales as the invoicing table grows.

---

## Requirements

### Requirement: Paginated CFDI List

The endpoint `GET /api/cfdi` MUST accept `page` (integer ≥ 1, default 1) and
`limit` (integer 1–100, default 20) query parameters.
It MUST return a `Paginated<CfdiAdmin>` envelope
`{ data: CfdiAdmin[], meta: { total, page, limit, pages } }`.
It MUST NOT perform an unbounded `findMany` — every query MUST include `skip`
and `take` derived from `page` and `limit`.
The single database round-trip MUST include the same eager relations as before
(`lineas`, `complementos`, `pedido`) with no additional joins (no N+1).
Existing role guard (CONTADOR, ADMIN, SUPER) MUST remain unchanged.

#### Scenario: Default pagination

- GIVEN an authenticated ADMIN user with 45 CFDI records in the database
- WHEN `GET /api/cfdi` is called with no query parameters
- THEN the response status is 200
- AND `data` contains exactly 20 items
- AND `meta.total` is 45, `meta.page` is 1, `meta.limit` is 20, `meta.pages` is 3

#### Scenario: Explicit page navigation

- GIVEN an authenticated ADMIN user with 45 CFDI records in the database
- WHEN `GET /api/cfdi?page=3&limit=20` is called
- THEN `data` contains exactly 5 items
- AND `meta.page` is 3 and `meta.pages` is 3

#### Scenario: Limit capped at 100

- GIVEN an authenticated ADMIN user
- WHEN `GET /api/cfdi?limit=500` is called
- THEN `limit` is clamped to 100
- AND `meta.limit` in the response is 100

#### Scenario: Page beyond range returns empty data

- GIVEN an authenticated ADMIN user with 8 CFDI records in the database
- WHEN `GET /api/cfdi?page=50` is called
- THEN the response status is 200
- AND `data` is an empty array
- AND `meta.total` is 8

#### Scenario: Role guard unchanged — unauthenticated request rejected

- GIVEN a request with no valid JWT
- WHEN `GET /api/cfdi` is called
- THEN the response status is 401

#### Scenario: Role guard unchanged — insufficient role rejected

- GIVEN an authenticated user with role VENDEDOR
- WHEN `GET /api/cfdi` is called
- THEN the response status is 403

---

### Requirement: Frontend CFDI Consumer Updated

`AdminService.cfdis()` MUST return `Observable<Paginated<CfdiAdmin>>`.
`CfdiComponent` MUST read `response.data` for the CFDI table rows.
`CfdiComponent` MUST render without runtime errors when the paginated response
shape is received.
No stats endpoint is needed for CFDI — there are no CFDI-derived KPIs in any
admin component.

#### Scenario: CfdiComponent renders paginated table

- GIVEN `AdminService.cfdis()` resolves with `{ data: [cfdi1, cfdi2], meta: { total: 2, page: 1, limit: 20, pages: 1 } }`
- WHEN `CfdiComponent` initializes
- THEN the CFDI table renders exactly 2 rows without runtime errors

#### Scenario: CfdiComponent timbrar/cancelar actions unaffected

- GIVEN `CfdiComponent` is rendered with a paginated CFDI list
- WHEN the user triggers a timbrar or cancelar action on a row
- THEN the action executes without runtime errors related to the pagination shape change
