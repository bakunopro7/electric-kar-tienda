# Spec: backend-functional-tests

## Change

`backend-functional-tests`

## Capabilities

| Capability | Type | Spec File |
|-----------|------|-----------|
| `backend-functional-tests` | New | `specs/backend-functional-tests/spec.md` |

## Summary

This change introduces one new capability — `backend-functional-tests` — covering:

1. **Test harness**: `createTestApp()` replicates `main.ts` bootstrap (global prefix + ValidationPipe); `truncateAll()` resets state between tests; `generateToken()` issues signed JWTs for cliente and staff roles; `jest-functional.json` includes the Prisma ESM `moduleNameMapper` fix; `test:functional` script with `--runInBand`.
2. **Isolated test database**: All tests run against `electrickar_test`; `prisma migrate deploy` initializes it; the dev database is never touched.
3. **Auth functional tests**: Register (201 / 409 / 400), cliente login (200 / 401 / normalization), staff login via `/auth/staff/login` (200 / 401), and `GET /auth/me` (200 valid token / 401 no or invalid token — no 403 on this route).
4. **Products functional tests**: `GET /products` pagination shape + param handling, `GET /products/:id` (200 / 404), `POST /products` RBAC (201 ADMIN / 401 no token / 403 cliente / 400 invalid body).
5. **CI integration**: `backend-functional` job in `.github/workflows/ci.yml` with `postgres:16` service (`electrickar_test`), migrate deploy, and `pnpm test:functional`; gates the build.

## Non-Goals

- Orders / checkout functional tests
- Clientes endpoint functional tests
- Cupones validation functional tests
- CFDI functional tests
- Stripe / Payments (raw-body signature verification deferred)
- Google OAuth (`verifyIdToken` deferred)
- Uploads, auditoria, sesiones, menu CRUD functional tests

## Spec Dependency

Full scenarios are in `specs/backend-functional-tests/spec.md`.
