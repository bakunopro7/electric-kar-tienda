# Exploration: input-validation-hardening

## Problem Statement

A security audit of text-field input handling found the backend foundation is
solid, but several DTOs lack length caps and no input normalization exists.
This leaves auth endpoints open to DoS (unbounded password/email) and a
duplicate-identity bypass (case-sensitive emails, no trim/lowercase). Scope of
this change: the HIGH + MEDIUM findings (backend DTO validation + normalization
+ optional DB-level caps). LOW items are deferred.

## Current State (verified, file:line)

### Solid (do not touch)
- Global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` —
  `electric-kar/src/main.ts:23`. Extra fields rejected with 400.
- Every endpoint uses a typed DTO — no raw `@Body()`.
- No SQL injection: all access via Prisma; zero `$queryRawUnsafe`.
- No XSS in the Angular app: auto-escaping, zero `[innerHTML]`/`bypassSecurityTrust`.

### Gaps in scope

**HIGH**
- H1 — `LoginDto.password` (`src/auth/dto/login.dto.ts:11`) has `@MinLength(6)`
  but NO `@MaxLength`. Public, unauthenticated, no rate limit → bcrypt/alloc DoS.
- H2 — All `correo` fields use `@IsEmail()` without `@MaxLength`: `register.dto.ts:13`,
  `login.dto.ts:7`, `forgot-password.dto.ts:6`, `users/dto/create-user.dto.ts:19`.
  `@IsEmail()` checks format, not length — `a@` + megabytes passes.
- H3 — No `@Transform` anywhere → no trim, no email lowercasing. Postgres unique
  is case-sensitive, so `ADMIN@X.COM` ≠ `admin@x.com` → duplicate-identity bypass.

**MEDIUM**
- M1 — `ResetPasswordDto.token` (`reset-password.dto.ts:8`) `@IsString()` only, no cap.
- M2 — `GoogleLoginDto.idToken` (`google-login.dto.ts:6`) `@IsString()` only, no cap.
- M3 — `QueryProductDto.search` (`products/dto/query-product.dto.ts:13`) no cap;
  feeds a Prisma `contains` filter.
- M4 — `EmitirCfdiDto.pedidoId` (`cfdi/dto/emitir-cfdi.dto.ts:15`) and
  `CancelarCfdiDto.uuidSustituye` (`cfdi/dto/cancelar-cfdi.dto.ts:16`) use
  `@IsString()` for UUIDs → should be `@IsUUID()`.
- M5 — `CreateProductDto.etiquetas[]`/`imagenes[]` (`create-product.dto.ts:134-143`)
  `@IsString({ each: true })` with no per-item `@MaxLength`.
- M6 — Schema uses zero `@db.VarChar(n)` — all `String` → Postgres `text`
  (unbounded). DTO is the ONLY length defense; no DB safety net.

### Length question (core of the request)
Because every column is `text`, a field with no DTO `@MaxLength` is unbounded
end-to-end. Unbounded today: all emails, `LoginDto.password`,
`ResetPasswordDto.token`, `GoogleLoginDto.idToken`, `QueryProductDto.search`,
and array items in `etiquetas`/`imagenes`.

## Approach

1. **Length caps** — add `@MaxLength` to every flagged string field. Standard
   caps: email 254 (RFC 5321), password 72 (bcrypt), token 256, idToken 4096,
   search 200, array items 100/512.
2. **Normalization** — add `@Transform(({ value }) => value?.trim())` broadly and
   `.toLowerCase()` for email fields (a small shared transform helper to avoid
   repetition). Verify the auth service lookups still match (emails compared
   lowercased on read too, or rely on normalized storage going forward).
3. **Type tightening** — `@IsUUID()` on CFDI id fields.
4. **DB safety net (M6)** — add `@db.VarChar(n)` to key columns (correo, nombre,
   sku, codigo, cp, rfc, password-hash sized) + a hand-written migration
   (`ALTER TABLE ... ALTER COLUMN ... TYPE varchar(n)`). Decide caps that are ≥
   the DTO caps so valid input never truncates.

## Risks / Open Questions
- **Email normalization migration risk**: existing rows may have mixed-case or
  untrimmed emails. Lowercasing new input could let a new signup collide with an
  old differently-cased record (or vice versa). The proposal must decide whether
  to also backfill/normalize existing rows or only enforce going forward.
- `@db.VarChar` ALTER on a populated column fails if any existing value exceeds
  the cap. Migration must pick caps ≥ longest existing value (or the DTO cap).
- Login email lookup: if storage is normalized but the service queries by raw
  input, logins could break. Must normalize on the query side too (or via the
  same DTO transform on `LoginDto.correo`).

## Non-Goals (deferred — LOW)
- Frontend `maxlength` attributes (UX only; backend is the gate).
- CORS lockdown (`enableCors()` → restrict origin) — separate hardening change.
- Slug normalization/`@Matches` for category/marca slugs.
- Rate limiting on auth endpoints (related but separate concern).
