# Verify Report: backend-functional-tests

**Verdict**: PASS WITH WARNINGS
**Date**: 2026-06-09
**Branch**: feature/ssr-storefront (commit 97ac274)
**Artifact store**: openspec

---

## Task Completion

All tasks checked as complete in `apply-progress.md`. Verified against filesystem.

| Phase | Tasks | Status |
|-------|-------|--------|
| 1 — Git staging | 1.1 | DONE |
| 2 — Jest config + script | 2.1, 2.2 | DONE |
| 3 — Harness helpers | 3.1–3.5 | DONE |
| 4 — Auth functional spec | 4.1–4.6 | DONE |
| 5 — Products functional spec | 5.1–5.5 | DONE |
| 6 — CI job | 6.1 | DONE |
| 7 — Verification | 7.1–7.5 | DONE |

All 18 task items checked. No unchecked implementation tasks.

---

## Build / Test Evidence (real execution)

| Command | Result |
|---------|--------|
| `pnpm test:functional` (electrickar_test) | **2 suites, 22 tests, 0 failures** — EXIT 0 |
| `pnpm test` (unit regression) | **10 suites, 74 tests, 0 failures** — EXIT 0 |
| `pnpm build` | **EXIT 0** — no TypeScript errors |

---

## Spec Compliance Matrix

### Harness Requirements

| Scenario | Covered by Test | Status |
|----------|-----------------|--------|
| App boots with ValidationPipe active (400 on oversized correo) | auth spec: `correo > 254 chars → 400` | PASS |
| Global prefix enforced (404 without /api) | Implicit — all tests use `/api/...` prefix | PASS (implicit) |
| Suite targets test DB, dev DB unmodified | env isolation by DATABASE_URL override | PASS |
| truncateAll resets state between tests | `beforeEach` in both spec files | PASS |
| generateToken accepted by JwtAuthGuard | products spec: ADMIN token → 201 | PASS |
| jest-functional.json with moduleNameMapper | File verified + suite runs without Prisma import errors | PASS |
| test:functional script with --runInBand | `package.json` confirmed | PASS |

### Auth Requirements

| Scenario | Spec Status | Test Status |
|----------|-------------|-------------|
| Register valid → 201 + DB row | REQUIRED | PASS (test line 33) |
| Register duplicate → 409 | REQUIRED | PASS (test line 46) |
| Register correo > 254 chars → 400 | REQUIRED | PASS (test line 55) |
| Register missing password → 400 | REQUIRED | PASS (test line 65) |
| Login correct credentials → 200 + JWT | REQUIRED | PASS (test line 79) |
| Login wrong password → 401 | REQUIRED | PASS (test line 88) |
| Login mixed-case email → 200 (normalization) | REQUIRED | PASS (test line 96) |
| Staff login valid → 200 + JWT | REQUIRED | PASS (test line 111) |
| Staff login wrong password → 401 | REQUIRED | PASS (test line 119) |
| GET /me valid token → 200 + identity | REQUIRED (staff + cliente) | PASS (test lines 133, 153) |
| GET /me no token → 401 | REQUIRED | PASS (test line 170) |
| GET /me invalid token → 401 | REQUIRED | PASS (test line 175) |

Auth: 12/12 spec scenarios covered and passing. No 403 on /me route — correct per spec.

### Products Requirements

| Scenario | Spec Status | Test Status |
|----------|-------------|-------------|
| GET /products default → 200 + meta shape | REQUIRED | PASS (test line 33) |
| GET /products paginated (spec: `page=2&limit=2`, 5 products) | REQUIRED | WARNING — see below |
| GET /products/:id known → 200 | REQUIRED | PASS (test line 62) |
| GET /products/:id unknown UUID → 404 | REQUIRED | PASS (test line 68) |
| POST /products ADMIN → 201 | REQUIRED | PASS (test line 83) |
| POST /products no token → 401 | REQUIRED | PASS (test line 109) |
| POST /products cliente token → 403 | REQUIRED | PASS (test line 117) |
| POST /products invalid body → 400 | REQUIRED | PASS (test line 133) |

Products: 8/9 spec scenarios fully matched; 1 WARNING (see below).

### CI Requirement

| Check | Status |
|-------|--------|
| `backend-functional` job exists | PASS |
| `needs: [backend]` | PASS |
| `postgres:16` service with `POSTGRES_DB: electrickar_test` | PASS |
| `DATABASE_URL`/`JWT_SECRET`/`JWT_EXPIRES_IN` env set | PASS |
| `prisma:generate` + `prisma:deploy` before `test:functional` | PASS |
| No reference to `electrickar_db` in functional job | PASS |

---

## Issues

### WARNING — Pagination scenario: fixture count and query params diverge from spec

**Spec** (§Products—List, Scenario "Pagination params honored"):
- GIVEN the database contains **5 products**
- WHEN `GET /api/products?page=2&limit=2`
- THEN `meta.page=2`, `meta.limit=2`, `data` contains at most 2 items

**Implementation**:
- `seedBaseline()` creates only **2 products** (Prod A + Prod B)
- Test calls `GET /api/products?page=2&limit=1` (not `?page=2&limit=2`)
- Assertion: `meta.page=2`, `meta.limit=1`, `data.length <= 1` — uses a looser bound

**Why it still passes**: With 2 products and `limit=1`, page 2 returns exactly 1 item (or 0 if the endpoint treats page 2 as empty). `toBeLessThanOrEqual(1)` accepts either case.

**Risk**: The spec intended to verify that with 5 products the second page of a limit-2 query returns exactly 2 items (non-empty page). The current test does not prove that case. A regression where page 2 always returns empty would still pass.

**Recommendation**: Either update the spec to match the implemented fixture count and params, or add 3 more products to `seedBaseline` (total 5) and adjust the test to match the spec's original intent (`?page=2&limit=2`, assert `data.length === 2`).

---

### WARNING — `jest-functional.json` moduleNameMapper deviates from design spec

**Design spec** stated: `"^(.+)\\.js$": "$1"` (broad pattern, all packages).

**Implementation uses**: `"^(\\.{1,2}/.+)\\.js$": "$1"` (scoped to relative imports only).

**Assessment**: The implementation is CORRECT and BETTER than the design spec. The broad pattern breaks `bignumber.js` and other third-party packages under ts-jest. The scoped pattern is the right fix. The design spec was wrong; the implementation caught it.

**Action**: Update the design artifact to reflect the correct final pattern. No code change needed.

---

### SUGGESTION — Global prefix scenario has no explicit test

The spec includes a scenario: "WHEN a request is made to `/auth/register` (no prefix) → THEN 404". No test explicitly issues a request to `/auth/register` without the `/api` prefix to confirm 404. All existing tests use the `/api` prefix correctly; this scenario is verified implicitly but not by a dedicated assertion.

**Impact**: Very low. The prefix is enforced by `setGlobalPrefix('api')`, which is a NestJS-core behavior and well-covered by existing tests.

---

## @HttpCode(200) on Login Endpoints — Assessment and Recommendation

**The change**: `auth.controller.ts` login endpoints (`POST /auth/login` and `POST /auth/staff/login`) were annotated with `@HttpCode(200)`. Without this decorator, NestJS defaults all POST endpoints to 201.

**Spec alignment**: The spec (`§Auth—Cliente Login`, `§Auth—Staff Login`) explicitly requires 200 for login responses. The `@HttpCode(200)` decorator is spec-correct.

**Semantic correctness**: Login is not resource creation — it is an authentication verification that returns a token. HTTP 200 is the correct status code. The 201 default exists because NestJS was designed to handle REST CRUD, where POST creates. Login is a command, not a create. Using 201 for login is semantically wrong and would be confusing to clients.

**Frontend impact**: Angular `HttpClient` treats all 2xx responses as success (observable resolves). The service (`auth.service.ts`) does NOT assert on any specific 2xx status code. The `login()` and `register()` methods only inspect the response body via `tap((res) => this.store(res))`. The 201→200 change is transparent to the Angular client.

**Playwright e2e**: No Playwright test was run for this verification (the e2e + SSR front startup exceeds the scope of this phase and requires the full Stripe/Google OAuth environment). However, static analysis of `auth.service.ts` + `acceso.component.ts` confirms NO status code assertion anywhere in the login flow. The frontend is safe.

**RECOMMENDATION**: KEEP `@HttpCode(200)`. The change is spec-aligned, semantically correct, and carries zero risk for the Angular frontend.

---

## Summary

| Category | Count |
|----------|-------|
| CRITICAL | 0 |
| WARNING | 2 |
| SUGGESTION | 1 |

**Verdict: PASS WITH WARNINGS**

- Functional suite: 22/22 PASS (2 suites: auth 13, products 9)
- Unit regression: 74/74 PASS (10 suites) — no regressions
- Backend build: EXIT 0
- `@HttpCode(200)`: spec-aligned, safe — KEEP

The two warnings are a fixture/param mismatch in one pagination scenario (test passes but does not fully exercise the spec's stated preconditions) and a design-doc drift in `moduleNameMapper` (the implementation is correct, the design doc needs updating). Neither blocks archive.

**Next recommended**: `sdd-archive`
