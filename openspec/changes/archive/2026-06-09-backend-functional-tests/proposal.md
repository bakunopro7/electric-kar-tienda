# Proposal: Backend Functional Tests (First Slice)

## Intent

The NestJS backend has unit specs but **no test exercises the real HTTP stack against a real database**. Controllers, the global `ValidationPipe`, JWT guards, `RolesGuard`, and Prisma queries are never validated together, so regressions in routing, auth, validation, or SQL only surface in production. This slice establishes a **functional-test harness** (full `AppModule` boot + real Postgres) and proves it with two representative resources (auth, products), plus a CI job so the gap closes permanently.

## Scope

### In Scope
- `test/jest-functional.json`: clone of `jest-e2e.json` + the missing `moduleNameMapper` `{"^(.+)\\.js$": "$1"}` + `testRegex: ".functional-spec.ts$"`.
- `test:functional` script: `jest --config ./test/jest-functional.json --runInBand`.
- `test/functional/helpers/`: `app.ts` (`createTestApp()` replicating `main.ts` — `setGlobalPrefix('api')` + the global `ValidationPipe`), `auth.ts` (`generateToken()` via `JwtService`), `db.ts` (`truncateAll()` via `TRUNCATE ... RESTART IDENTITY CASCADE`).
- **auth.functional-spec.ts**: register (201/409/400), `POST /auth/login` cliente (200/401), `POST /auth/staff/login` staff (200/401), email normalization, `GET /auth/me` (200/401).
- **products.functional-spec.ts**: `GET /products` pagination shape, `GET /products/:id` (200/404), `POST /products` (201 ADMIN / 401 no token / 403 cliente / 400 invalid body).
- New `backend-functional` CI job: `postgres:16` service, DB `electrickar_test`, `migrate deploy` + `generate`, runs `test:functional`. Parallel with the existing e2e job, both depending on `backend`.

### Out of Scope (Non-Goals)
- Functional specs for orders/checkout, clientes, cupones, cfdi (later slices).
- Payments/Stripe and Google OAuth endpoints (excluded; lazy at bootstrap, so no `overrideProvider`).
- Per-test parallelism / sharded DBs (deferred; `--runInBand` is intentional).
- `GET /auth/me` 403 case — that route has no role guard, so only 200/401 apply.

## Capabilities

### New Capabilities
- `backend-functional-testing`: a real-HTTP + real-DB test harness (config, helpers, seed/truncate lifecycle) and CI execution, proven by auth and products specs.

### Modified Capabilities
- None. No application behavior changes; this is test infrastructure only.

## Approach

`createTestApp()` boots the **unmodified `AppModule`** (the CI e2e job proves Stripe/Google are lazy and do not throw with only `DATABASE_URL` + `JWT_SECRET`) and replicates `main.ts` setup (`api` prefix, `ValidationPipe`). Specs hit endpoints via `supertest`. Isolation = `--runInBand` + `truncateAll()` between tests using `TRUNCATE ... RESTART IDENTITY CASCADE` (FK-safe in one statement). Tokens are minted directly with `JwtService` to avoid login round-trips. A dedicated database `electrickar_test` keeps functional runs off dev data; CI provisions it as the Postgres service DB. Migrations are already committed (7), so `migrate deploy` is sufficient.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `test/jest-functional.json` | New | Jest config for `.functional-spec.ts` |
| `package.json` (scripts) | Modified | Add `test:functional` |
| `test/functional/helpers/` | New | `app.ts`, `auth.ts`, `db.ts` |
| `test/functional/*.functional-spec.ts` | New | auth + products specs |
| CI workflow (`.github/workflows/*`) | New job | `backend-functional` job |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing `moduleNameMapper` (absent in `jest-e2e.json`, present in root `jest`) breaks `.js` ESM-style imports | High | Explicitly add it to the new config; root `package.json` jest block confirms the exact mapping |
| `createTestApp()` drifts from `main.ts` (prefix/pipe) → false specs | Med | Replicate `setGlobalPrefix('api')` + `ValidationPipe` exactly; review against `main.ts` |
| `TRUNCATE ... CASCADE` misses a table or violates FK order | Med | Single `RESTART IDENTITY CASCADE` statement is FK-safe; truncate all app tables together |
| `--runInBand` slower as suites grow | Low | Acceptable for first slice; parallelism is a documented later slice |
| CI e2e workflow file not found at default path | Med | Spec/tasks phase must locate the actual workflow before adding the job |

## Rollback Plan

Pure additive infra. Revert by deleting `test/jest-functional.json`, `test/functional/`, the `test:functional` script, and the `backend-functional` CI job. No application code, schema, or migrations are touched, so nothing else is affected.

## Dependencies

- Existing committed migrations (7) — present; `migrate deploy` works.
- `DATABASE_URL` (pointing at `electrickar_test`) + `JWT_SECRET` available locally and in CI.

## Success Criteria

- [ ] `pnpm test:functional` passes locally against `electrickar_test`.
- [ ] Both specs exercise the full HTTP stack (routing + `ValidationPipe` + guards + Prisma) against a real DB.
- [ ] Tests are isolated: each runs against a truncated DB, order-independent.
- [ ] `backend-functional` CI job runs in parallel with e2e and is green on a clean checkout.
