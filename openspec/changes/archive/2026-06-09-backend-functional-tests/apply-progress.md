# Apply Progress: backend-functional-tests

**Status**: done
**Mode**: Standard (Strict TDD not active for this project)
**Batch**: 1 of 1 (all tasks)

## Completed Tasks

- [x] 1.1 Stage openspec artifacts
- [x] 2.1 Create jest-functional.json
- [x] 2.2 Add test:functional script to package.json
- [x] 3.1 Create helpers/app.ts (createTestApp)
- [x] 3.2 Create helpers/db.ts (truncateAll)
- [x] 3.3 Create helpers/auth.ts (generateToken)
- [x] 3.4 Create helpers/seed.ts (seedBaseline)
- [x] 3.5 Smoke test run and deleted
- [x] 4.1–4.6 Auth functional spec (13 tests, 0 failures)
- [x] 5.1–5.5 Products functional spec (9 tests, 0 failures)
- [x] 6.1 CI backend-functional job
- [x] 7.1–7.5 Verification complete

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `electric-kar/test/jest-functional.json` | Created | Functional jest config with moduleNameMapper scoped to relative paths (`^(\\.{1,2}/.+)\\.js$`) and `--experimental-vm-modules` support |
| `electric-kar/package.json` | Modified | Added `test:functional` script using `node --experimental-vm-modules` for Prisma 7 WASM compat |
| `electric-kar/test/functional/helpers/app.ts` | Created | `createTestApp()` — replicates main.ts globals |
| `electric-kar/test/functional/helpers/db.ts` | Created | `truncateAll()` — TRUNCATE CASCADE RESTART IDENTITY |
| `electric-kar/test/functional/helpers/auth.ts` | Created | `generateToken()` — signs JWTs via real JwtService |
| `electric-kar/test/functional/helpers/seed.ts` | Created | `seedBaseline()` — 1 cliente, 1 ADMIN staff, 1 cat, 1 marca, 2 productos |
| `electric-kar/test/functional/auth.functional-spec.ts` | Created | 13 auth tests: register, login cliente+staff, /me |
| `electric-kar/test/functional/products.functional-spec.ts` | Created | 9 products tests: list pagination, get by id, create RBAC |
| `electric-kar/src/auth/auth.controller.ts` | Modified | Added `@HttpCode(200)` to login and staff/login endpoints |
| `.github/workflows/ci.yml` | Modified | Added `backend-functional` CI job |
| `openspec/changes/backend-functional-tests/**` | Created | All SDD artifacts committed |

## Deviations from Design

1. **moduleNameMapper pattern**: Changed from `"^(.+)\\.js$": "$1"` (too broad, breaks `bignumber.js`) to `"^(\\.{1,2}/.+)\\.js$": "$1"` (scoped to relative imports only). This correctly resolves Prisma 7 ESM `.js` imports without interfering with third-party packages.

2. **test:functional script**: Changed from `jest --config ...` to `node --experimental-vm-modules node_modules/jest/bin/jest.js --config ...`. Required because Prisma 7 uses dynamic `import()` for its WASM query compiler, which Jest 30 + Node 24 blocks unless `--experimental-vm-modules` is active.

3. **@HttpCode(200) on auth controller login endpoints**: NestJS defaults POST to 201. The spec requires 200 for login. Added `@HttpCode(200)` to `POST /auth/login` and `POST /auth/staff/login`. This is spec-aligned and semantically correct (login is not resource creation).

4. **supertest import**: Used `const request = require('supertest')` instead of `import * as request from 'supertest'`. The `import *` form returns an object where the callable isn't `.default` under `--experimental-vm-modules` mode.

## Functional Test Results

```
Test Suites: 2 passed, 2 total
Tests:       22 passed, 22 total  (13 auth + 9 products)
Snapshots:   0 total
Time:        ~20s
```

## Verification Results

- `pnpm test:functional` → 22/22 PASS
- `pnpm test` (unit) → 74/74 PASS, 0 regressions
- `pnpm build` → exits 0
- `electrickar_db` → untouched (1 Cliente row unchanged)
- CI YAML → valid, backend-functional job confirmed correct

## Workload / PR Boundary

- Mode: single-pr with size:exception
- All tasks in one commit: `test(backend): add functional test harness and auth/products specs`
- Commit: `97ac274`
