# Backend Functional Tests Specification

## Purpose

Defines a third test tier — real HTTP through the full NestJS AppModule against a dedicated Postgres test database — that sits between mocked unit tests and Playwright UI e2e. Covers the first slice: test harness infrastructure, auth endpoints, and products endpoints.

---

## Requirements

### Requirement: Functional Test Harness — App Bootstrap

The `createTestApp()` helper MUST boot the full `AppModule` with `setGlobalPrefix('api')` and the same global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` as `main.ts`. Static assets and Swagger bootstrap MUST be omitted. The helper MUST read `DATABASE_URL`, `JWT_SECRET`, and `JWT_EXPIRES_IN` from the test process environment without code changes to `PrismaService` or `AuthModule`.

#### Scenario: App boots with validation pipe active

- GIVEN `DATABASE_URL` points to `electrickar_test` and `JWT_SECRET`/`JWT_EXPIRES_IN` are set
- WHEN `createTestApp()` is called
- THEN the NestJS app starts without error
- AND a POST to `/api/auth/register` with an oversized `correo` (255 chars) returns 400

#### Scenario: Global prefix is applied

- GIVEN the test app is running
- WHEN a request is made to `/auth/register` (no prefix)
- THEN the response is 404 (route not found, confirming prefix is enforced)

---

### Requirement: Functional Test Harness — Isolated Test Database

All functional tests MUST run against the `electrickar_test` database, never the development `electrickar_db`. The test database MUST be prepared via `prisma migrate deploy` before the suite runs. Tests MUST run with `--runInBand` to prevent concurrent writes on the shared test database.

#### Scenario: Suite targets the test database

- GIVEN `DATABASE_URL=...electrickar_test...` is set in the test process env
- WHEN any functional test makes a write operation
- THEN the write is visible only in `electrickar_test`
- AND `electrickar_db` is unmodified

---

### Requirement: Functional Test Harness — Table Truncation Between Tests

A `truncateAll()` helper MUST reset all tables between tests using `TRUNCATE ... RESTART IDENTITY CASCADE`, preserving FK integrity. The truncation MUST leave the schema intact and not drop any tables.

#### Scenario: Truncation resets state

- GIVEN a user was created in a previous test
- WHEN `truncateAll()` is called in `afterEach`
- THEN a subsequent registration with the same email returns 201 (no conflict from prior test)

---

### Requirement: Functional Test Harness — JWT Token Generation

A `generateToken(payload)` helper MUST issue valid JWTs signed with the test `JWT_SECRET` for both `cliente` and `staff` (usuario) roles. Tokens MUST be accepted by `JwtAuthGuard` on the running test app.

#### Scenario: Token accepted by auth guard

- GIVEN a token generated via `generateToken({ sub: userId, tipo: 'usuario' })`
- WHEN `POST /api/products` is called with `Authorization: Bearer <token>`
- THEN the request passes `JwtAuthGuard` (status is not 401)

---

### Requirement: Jest Functional Runner Config

A `test/jest-functional.json` config MUST exist with `testRegex: .functional-spec.ts$` and MUST include the `moduleNameMapper` (`"^(.+)\\.js$": "$1"`) required to resolve Prisma 7's ESM-style imports under ts-jest. A `test:functional` npm script MUST invoke `jest --config ./test/jest-functional.json --runInBand`.

#### Scenario: Prisma client imports resolve

- GIVEN `jest-functional.json` includes the moduleNameMapper
- WHEN the functional suite is started
- THEN no `Cannot find module` error for Prisma `.js` imports is thrown

---

### Requirement: Auth — Registration

`POST /api/auth/register` MUST create a new cliente and return 201 on valid input. It MUST return 409 when the normalized email already exists. It MUST return 400 when any DTO constraint is violated (missing required field, `correo` > 254 chars, `password` > 72 chars).

#### Scenario: Valid registration → 201 + user persisted

- GIVEN no user exists with `correo` = `"nuevo@x.com"`
- WHEN `POST /api/auth/register` is called with valid `correo` and `password`
- THEN the response status is 201
- AND querying the database confirms a user row with normalized `correo` = `"nuevo@x.com"`

#### Scenario: Duplicate email → 409

- GIVEN a user already exists with `correo` = `"existe@x.com"`
- WHEN `POST /api/auth/register` is called with `correo` = `"existe@x.com"`
- THEN the response status is 409

#### Scenario: Email exceeds 254 chars → 400

- GIVEN no pre-existing user
- WHEN `POST /api/auth/register` is called with a 255-character email
- THEN the response status is 400

#### Scenario: Missing required field → 400

- GIVEN no pre-existing user
- WHEN `POST /api/auth/register` is called without the `password` field
- THEN the response status is 400

---

### Requirement: Auth — Cliente Login with Email Normalization

`POST /api/auth/login` MUST return 200 + a JWT on correct credentials. It MUST return 401 on wrong password. It MUST accept mixed-case or whitespace-padded email as equivalent to the stored normalized email (200 response).

#### Scenario: Correct credentials → 200 + JWT

- GIVEN a user exists with `correo` = `"user@x.com"` and known password
- WHEN `POST /api/auth/login` is called with those credentials
- THEN the response status is 200
- AND the response body contains a `token` (or `access_token`) field

#### Scenario: Wrong password → 401

- GIVEN a user exists with `correo` = `"user@x.com"`
- WHEN `POST /api/auth/login` is called with an incorrect password
- THEN the response status is 401

#### Scenario: Mixed-case email → 200 (normalization)

- GIVEN a user exists with `correo` = `"user@x.com"`
- WHEN `POST /api/auth/login` is called with `correo` = `"  USER@X.COM  "` and correct password
- THEN the response status is 200

---

### Requirement: Auth — Staff Login

`POST /api/auth/staff/login` MUST return 200 + a JWT for valid staff credentials. It MUST return 401 for wrong credentials. This endpoint is separate from the cliente login route.

#### Scenario: Valid staff credentials → 200 + JWT

- GIVEN a staff user (tipo = `usuario`) exists with known credentials
- WHEN `POST /api/auth/staff/login` is called with those credentials
- THEN the response status is 200
- AND the response body contains a token

#### Scenario: Wrong staff password → 401

- GIVEN a staff user exists
- WHEN `POST /api/auth/staff/login` is called with an incorrect password
- THEN the response status is 401

---

### Requirement: Auth — GET /api/auth/me

`GET /api/auth/me` is protected by `JwtAuthGuard` only. It MUST return 200 with the caller's identity when a valid JWT is provided. It MUST return 401 when no token or an invalid token is provided. There is no 403 on this route.

#### Scenario: Valid token → 200 + identity

- GIVEN a valid JWT for an existing user
- WHEN `GET /api/auth/me` is called with `Authorization: Bearer <token>`
- THEN the response status is 200
- AND the response body contains the user's identity (e.g., `correo` or `id`)

#### Scenario: No token → 401

- GIVEN no Authorization header
- WHEN `GET /api/auth/me` is called
- THEN the response status is 401

#### Scenario: Invalid token → 401

- GIVEN an `Authorization: Bearer invalid.token.here` header
- WHEN `GET /api/auth/me` is called
- THEN the response status is 401

---

### Requirement: Products — List with Pagination

`GET /api/products` MUST return 200 with a response body matching `{ data: [...], meta: { total, page, limit, pages } }`. Pagination query params (`page`, `limit`) MUST be honored. The shape MUST hold against seeded data.

#### Scenario: Default pagination shape

- GIVEN the database contains at least 3 seeded products
- WHEN `GET /api/products` is called without query params
- THEN the response status is 200
- AND the body contains `data` (array) and `meta.total`, `meta.page`, `meta.limit`, `meta.pages`

#### Scenario: Pagination params honored

- GIVEN the database contains 5 products
- WHEN `GET /api/products?page=2&limit=2` is called
- THEN the response status is 200
- AND `meta.page` = 2, `meta.limit` = 2
- AND `data` contains at most 2 items

---

### Requirement: Products — Get by ID

`GET /api/products/:id` MUST return 200 with the product for a known ID. It MUST return 404 for an unknown or non-existent ID.

#### Scenario: Known product ID → 200

- GIVEN a product with a known `id` exists
- WHEN `GET /api/products/:id` is called with that ID
- THEN the response status is 200
- AND the body contains the product data

#### Scenario: Unknown ID → 404

- GIVEN no product exists with ID `"00000000-0000-0000-0000-000000000000"`
- WHEN `GET /api/products/00000000-0000-0000-0000-000000000000` is called
- THEN the response status is 404

---

### Requirement: Products — Create (Role-Gated)

`POST /api/products` MUST return 201 when called with a valid body and a JWT belonging to a staff user with the ADMIN role. It MUST return 401 when called with no token. It MUST return 403 when called with a valid cliente token. It MUST return 400 when the body fails DTO validation.

#### Scenario: ADMIN token → 201

- GIVEN a valid ADMIN JWT and a well-formed product payload
- WHEN `POST /api/products` is called
- THEN the response status is 201

#### Scenario: No token → 401

- GIVEN no Authorization header
- WHEN `POST /api/products` is called
- THEN the response status is 401

#### Scenario: Cliente token → 403

- GIVEN a valid JWT for a user with `tipo` = `"cliente"`
- WHEN `POST /api/products` is called
- THEN the response status is 403

#### Scenario: Invalid body → 400

- GIVEN a valid ADMIN JWT
- WHEN `POST /api/products` is called with a missing required field (e.g., no `nombre`)
- THEN the response status is 400

---

### Requirement: CI — backend-functional Job

A `backend-functional` job MUST exist in `.github/workflows/ci.yml`. It MUST declare a `postgres:16` service with database `electrickar_test`. It MUST set `DATABASE_URL`, `JWT_SECRET`, and `JWT_EXPIRES_IN` environment variables. It MUST run `prisma:generate` + `prisma:deploy` (migrate deploy) before running `pnpm test:functional`. The job MUST gate the build (i.e., CI fails if functional tests fail).

#### Scenario: CI job provisions test database and runs suite

- GIVEN `.github/workflows/ci.yml` contains the `backend-functional` job
- WHEN the CI pipeline runs
- THEN the `postgres:16` service is started with `POSTGRES_DB: electrickar_test`
- AND `prisma migrate deploy` runs successfully against `electrickar_test`
- AND `pnpm test:functional` exits 0 for all passing tests

#### Scenario: Functional test failure blocks CI

- GIVEN a functional test fails
- WHEN the `backend-functional` job runs
- THEN the job exits non-zero
- AND downstream jobs that depend on it are blocked

---

## Non-Functional Requirements

- NFR-1: Tests MUST run with `--runInBand`; parallel workers racing on the shared test DB are prohibited (MUST).
- NFR-2: `truncateAll()` MUST complete in under 2 seconds so per-test teardown does not dominate suite runtime (SHOULD).
- NFR-3: `beforeAll` migrations via `migrate deploy` MUST be idempotent — running them multiple times MUST NOT fail (MUST).

---

## Out of Scope (First Slice)

- Orders / checkout functional tests
- Clientes endpoint functional tests
- Cupones validation functional tests
- CFDI functional tests
- Stripe payments (requires raw-body signature; deferred)
- Google OAuth (`verifyIdToken`; deferred)
- Uploads, auditoria, sesiones, menu CRUD
