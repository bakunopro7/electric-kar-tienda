# Archive Report: backend-functional-tests

**Status:** SHIPPED & ARCHIVED · PR #9 merged to `develop`.

## What shipped (slice 1)

A third test tier — API functional tests — running real HTTP through the full
`AppModule` against a dedicated `electrickar_test` Postgres, between mocked unit
tests and Playwright UI e2e.

- `test/jest-functional.json` + `test:functional` script (with the scoped
  `moduleNameMapper` for Prisma 7 `.js` imports and `--experimental-vm-modules`
  for the WASM query compiler).
- Helpers: `createTestApp()` (replicates `main.ts` — `/api` prefix + global
  ValidationPipe), `truncateAll()` (FK-safe reset), `generateToken()` (real JWTs,
  correct cliente/staff claim shapes), `seedBaseline()` (bcrypt-hashed fixtures).
- **auth** functional spec (13 tests): register 201/409/400, login cliente
  200/401 + email normalization, staff login, `GET /me` 200/401.
- **products** functional spec (9 tests): pagination `{ data, meta }` with an
  exact page-2 assertion, get/404, RBAC 201/401/403/400.
- New `backend-functional` CI job (Postgres service `electrickar_test`).
- Production change: `@HttpCode(200)` on login endpoints (was NestJS-default 201;
  200 is correct for authentication — verified safe via the Playwright e2e).

## Final verification

- Functional: **22/22 green** against real Postgres.
- Unit (regression): **74/74 green**. Build: clean.
- CI on PR head: **all 4 jobs green** (backend, backend-functional, frontend,
  e2e) — the e2e confirms the login-200 change doesn't break the frontend.

## Verify findings (resolved)

- **W-01** — weak products pagination test — RESOLVED: now seeds 5 products and
  asserts exactly 2 items on page 2 with derived `meta.pages`.
- **W-02** — design doc had the broad `moduleNameMapper` pattern — RESOLVED:
  design corrected to the scoped relative-only pattern.
- **S-01** — no explicit "no prefix → 404" test — accepted (covered implicitly).

## Non-goals (deferred to later slices)

- **orders / checkout** functional spec (the inventory + coupon transaction —
  highest-value next slice), clientes, cupones, CFDI functional specs.
- payments / Stripe webhook, Google OAuth integration tests.

## Note

The functional-test INFRASTRUCTURE is complete and proven. Adding further
endpoint coverage is now incremental — copy the helper pattern and write
scenarios; no new strategy or harness work needed.
