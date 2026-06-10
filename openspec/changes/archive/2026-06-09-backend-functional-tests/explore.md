# Exploration: backend-functional-tests

## Problem Statement

The NestJS backend has two test layers: mocked unit specs (no DB) and a default
scaffold e2e test that exercises nothing real. Every cross-layer behavior —
guard resolution, the global ValidationPipe, the checkout transaction,
pagination/stats SQL, 409 conflicts against the real unique constraint, the
`@db.VarChar` caps — is invisible to CI. Goal: a third tier — real HTTP through
the full AppModule against a real Postgres test DB — sitting between mocked unit
tests and Playwright UI e2e.

## Current State (file:line)

- `test/app.e2e-spec.ts` — default scaffold: `GET /` → `"Hello World!"`. Calls
  `app.init()` but does NOT apply `setGlobalPrefix('api')` or `useGlobalPipes`,
  so it hits the wrong path and bypasses validation. Not a usable base.
- `test/jest-e2e.json` — `testRegex: .e2e-spec.ts$`. **Missing `moduleNameMapper`**
  that the unit jest config has (`"^(.+)\\.js$": "$1"`, added in the
  input-validation change) to resolve Prisma 7's `.js`-style ESM imports under
  ts-jest. Without it the functional runner fails to import the Prisma client.
- 10 unit spec files all mock `PrismaService` (`useValue`) → the real DB is
  untested in CI.
- `test:e2e` script = `jest --config ./test/jest-e2e.json`.

## App bootstrap & config (what tests must replicate)

- `src/main.ts`: `NestFactory.create(AppModule, { rawBody: true })`,
  `app.setGlobalPrefix('api')`, `app.useGlobalPipes(new ValidationPipe({ whitelist,
  forbidNonWhitelisted, transform }))`. A `createTestApp()` helper MUST replicate
  these (static assets + Swagger can be skipped).
- `src/app.module.ts`: `ConfigModule.forRoot({ isGlobal: true })` reads
  `process.env`. `PrismaService` uses `config.getOrThrow('DATABASE_URL')` with NO
  fallback → **setting `DATABASE_URL` in the test process env is enough to point
  the whole suite at a separate test DB; no code change to PrismaService.**
- `AuthModule` needs `JWT_SECRET` + `JWT_EXPIRES_IN` at bootstrap. Tests provide a
  static `test-secret` / `1d`.

## Migrations — NOT a blocker (verified)

`prisma/migrations/` IS committed: 7 migrations (`20260604134036_init` …
`20260609170000_input_validation_varchar`) + `migration_lock.toml`, tracked in
git and present on `origin/develop`. `prisma migrate deploy` works (the CI e2e
job already uses it and passes). So a fresh `electrickar_test` DB can be created
via `migrate deploy` with no prerequisite work. (An earlier audit pass wrongly
flagged this as missing — corrected here.)

## Endpoint coverage (priority)

All routes prefixed `/api`. Guards: `JwtAuthGuard`, `ClienteGuard`
(`user.tipo==='cliente'`), `RolesGuard` (`user.tipo==='usuario'` + role).

- **P1 Auth**: register (201 / 409 dup / 400), login cliente + staff (200+JWT /
  401), email normalization, `GET /me` (200/401/403).
- **P1 Products**: `GET /products` (pagination shape, filters), `GET /products/:id`
  (200/404), `POST /products` (201 ADMIN / 401 / 403 cliente / 400).
- **P2 Orders**: checkout (stock validation, coupon, folio, stock decrement +
  cart emptied), `GET /orders` (paginated, own only), `GET /orders/all` (staff /
  403 cliente), `GET /orders/stats`.
- **P2 Clientes**: `GET /clientes` paginated, `/clientes/top`, `/clientes/stats`,
  guards.
- **P3 Cupones**: validate + apply-in-checkout. **P3 CFDI**: emitir/listar.
- **Deferred**: Payments/Stripe (needs keys / raw-body signature), Google OAuth
  (`verifyIdToken`), uploads, auditoria/sesiones/menu CRUD.

## Test DB strategy — recommendation

**Option (a): dedicated `electrickar_test` DB + `migrate deploy` once + truncate
between tests, jest `--runInBand`.**

- (b) per-test transaction rollback — BLOCKED: the checkout flow runs its own
  `prisma.$transaction()`; an outer wrapping transaction can't roll it back.
- (c) testcontainers — overkill; CI already has a Postgres service.
- (d) pg-mem — incompatible with Prisma 7's `@prisma/adapter-pg` (raw pg protocol).

Reset between tests: `TRUNCATE <all tables> RESTART IDENTITY CASCADE` via a
`db.ts` helper (discover tables from `information_schema` or hardcode in FK-safe
order; CASCADE handles FKs). `--runInBand` is mandatory to avoid workers racing
on the shared test DB.

## Fixtures

`beforeAll`: `migrate deploy` (idempotent) + minimal baseline (reuse `seed.ts`
upserts: SUPER admin, cliente, products). `afterEach`: truncate. Per-test factory
helpers for special states (`createProductWithZeroStock()`, `createExpiredCoupon()`).
`test/functional/helpers/auth.ts` exports `generateToken(payload)` using
`JwtService.sign()` with the test secret for `Authorization: Bearer` headers.

## CI integration

Add a standalone `backend-functional` job (needs `backend`) with a `postgres:16`
service (DB `electrickar_test`), `DATABASE_URL`/`JWT_SECRET`/`JWT_EXPIRES_IN`
env, `prisma:generate` + `prisma:deploy`, then `pnpm test:functional`. Runs in
parallel with the existing `e2e` Playwright job. New `test:functional` script +
`test/jest-functional.json` (clone of jest-e2e with the missing
`moduleNameMapper` and `testRegex: .functional-spec.ts$`).

## Open questions for proposal

1. Stripe (`PaymentsModule`) + Google OAuth (`verifyIdToken`) in functional
   tests: override at module level (`overrideProvider`) or exclude from slice 1?
2. `--runInBand` (simple, slower) vs per-file entity isolation (faster) — pick.
3. Separate DB (`electrickar_test`) vs separate schema (`?schema=test`) — DB is
   cleaner; schema is one-DB-simpler in CI.

## Scope boundary

**First slice**: jest-functional config + `test:functional` script; `helpers/`
(`app.ts`, `auth.ts`, `db.ts`); **auth** functional spec + **products** functional
spec; the `backend-functional` CI job. **Deferred**: orders/checkout, clientes,
cupones, cfdi functional specs (later slices); payments/Stripe; Google OAuth.

## Risks
- `jest-e2e.json` missing `moduleNameMapper` → silent Prisma import failure;
  the functional config must include it.
- Bootstrap gap: scaffold omits prefix + pipes; specs must use `createTestApp()`.
- External-service env at compile time (`JWT_SECRET` getOrThrow; Stripe keys) —
  provide test env or override providers, else the app crashes at bootstrap.
- FK-aware truncation (use CASCADE).
- `--runInBand` required for the shared test DB.
