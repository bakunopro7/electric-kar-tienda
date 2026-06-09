# Archive Report: input-validation-hardening

**Status:** SHIPPED & ARCHIVED · PR #7 merged to `develop` (merge commit 30d8b76).

## What shipped

Closes the HIGH + MEDIUM findings of the input-handling security audit.

**Backend (only)**
- `src/common/transforms.ts` — shared `Trim()` / `LowerTrim()` class-transformer
  decorators, guarded against non-string values (safe above `@IsOptional()`).
- DTO length caps via `@MaxLength`: email 254, login password 72, reset token 256,
  google idToken 4096, product search 200, `etiquetas[]` item 100, `imagenes[]`
  item 512.
- Email normalization (`@LowerTrim`) on all `correo` fields (login, register,
  forgot-password, create-user).
- `@IsUUID()` on `EmitirCfdiDto.pedidoId` and `CancelarCfdiDto.uuidSustituye`.
- `auth.service.ts` — read-side email lowercasing on all five lookup paths
  (login cliente + usuario, forgot, register existence check, googleLogin) so
  legacy mixed-case rows keep authenticating; clean HTTP 409 on duplicate emails.
- `schema.prisma` — `@db.VarChar(n)` on 10 key columns (n ≥ DTO cap) + a
  hand-written migration `20260609170000_input_validation_varchar` applied via
  the manual workflow.

## Final verification

- Backend tests: **74/74 green** (10 suites). Includes the W-01 follow-up test
  covering googleLogin email normalization.
- Backend build: clean (exit 0).
- DB: all 10 columns confirmed `character varying(n)` via psql; pre-flight
  `max(length)` confirmed no existing row exceeds any cap.
- CI (GitHub Actions) on the PR head: **backend + frontend + e2e all green**.

## Verify findings (resolved / accepted)

- **W-01** (googleLogin normalization untested) — RESOLVED: test added, 74/74.
- **S-01** — `Direccion.cp` already had `@MaxLength(10)`; VarChar net added, no DTO
  change needed (scope confirmation, no action).
- **S-02** — googleLogin auto-creates clients with `nombre = email` fallback;
  pre-existing behavior, flagged as a future UX follow-up.

## Non-goals (deferred)

- Frontend `maxlength` attributes (UX only).
- CORS lockdown (`enableCors()` → restrict origin).
- Slug normalization / `@Matches` for category & marca slugs.
- Rate limiting on auth endpoints.
- Bulk backfill/normalization of existing email rows (needs collision check).
