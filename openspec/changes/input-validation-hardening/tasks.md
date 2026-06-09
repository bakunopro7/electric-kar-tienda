# Tasks: Input Validation Hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~220–280 (mostly decorator lines across 10 files + migration SQL) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All validation hardening (transforms + DTOs + service + schema + migration) | PR 1 (single) | feat/input-validation-hardening → main; tests included |

---

## Phase 1: Foundation — Commit Artifacts + Shared Transform Helpers (TDD)

- [x] 1.1 **Commit untracked openspec artifacts.** `git add openspec/changes/input-validation-hardening/` and commit with message `chore(sdd): add sdd artifacts for input-validation-hardening`. Req: N/A (housekeeping).

- [x] 1.2 **RED — Write failing unit tests for `Trim()` and `LowerTrim()`.** Create `electric-kar/src/common/transforms.spec.ts`. Tests: `Trim` trims whitespace; `LowerTrim` trims + lowercases; both are no-ops on `undefined`, `null`, and non-string values. Run `PATH="$HOME/.local/bin:$PATH" pnpm test` — all new tests must fail (file does not exist yet). Req: Non-regression + Email Normalization.

- [x] 1.3 **GREEN — Create `electric-kar/src/common/transforms.ts`.** Export `Trim(): PropertyDecorator` and `LowerTrim(): PropertyDecorator`, each wrapping `@Transform` with a `typeof value === 'string'` guard. Run tests — all pass. Req: Email Normalization (spec §Trim/LowerTrim).

---

## Phase 2: Auth DTOs — Caps + Normalization (TDD)

- [x] 2.1 **RED — Write DTO unit tests for auth DTOs.** Create `electric-kar/src/auth/dto/auth-dto-validation.spec.ts`. Use `plainToInstance` + `validate` (no server needed). Scenarios: `LoginDto.correo` > 254 chars → errors; `LoginDto.correo` = `"  ADMIN@X.COM "` → transformed to `"admin@x.com"`; `LoginDto.password` 73 chars → errors; `RegisterDto.correo` 255 chars → errors; `ForgotPasswordDto.correo` untrimmed uppercase → normalized; `ResetPasswordDto.token` 257 chars → errors; `GoogleLoginDto.idToken` 4097 chars → errors. Run tests — all new tests fail. Req: DTO Length Caps + Email Normalization.

- [x] 2.2 **GREEN — Update `electric-kar/src/auth/dto/login.dto.ts`.** Add `@LowerTrim()`, `@MaxLength(254)` on `correo`; add `@MaxLength(72)` on `password`. Import `LowerTrim` from `../../common/transforms`. Run tests — pass. Req: DTO Length Caps §Login + Email Normalization.

- [x] 2.3 **GREEN — Update `electric-kar/src/auth/dto/register.dto.ts`.** Add `@LowerTrim()`, `@MaxLength(254)` on `correo`; add `@Trim()` on `nombre` (cap already present). Import `LowerTrim`, `Trim`. Run tests — pass. Req: DTO Length Caps §Register + Email Normalization.

- [x] 2.4 **GREEN — Update `electric-kar/src/auth/dto/forgot-password.dto.ts`.** Add `@LowerTrim()`, `@MaxLength(254)` on `correo`. Import `LowerTrim`. Run tests — pass. Req: Email Normalization.

- [x] 2.5 **GREEN — Update `electric-kar/src/auth/dto/reset-password.dto.ts`.** Add `@MaxLength(256)` on `token`. Run tests — pass. Req: DTO Length Caps §ResetPasswordDto.

- [x] 2.6 **GREEN — Update `electric-kar/src/auth/dto/google-login.dto.ts`.** Add `@MaxLength(4096)` on `idToken`. Run tests — pass. Req: DTO Length Caps §GoogleLoginDto.

---

## Phase 3: Users, CFDI, Products DTOs (TDD)

- [x] 3.1 **RED — Write DTO unit tests for users/cfdi/products DTOs.** Create `electric-kar/src/users/dto/users-dto-validation.spec.ts`, `electric-kar/src/cfdi/dto/cfdi-dto-validation.spec.ts`, `electric-kar/src/products/dto/products-dto-validation.spec.ts`. Scenarios: `CreateUserDto.correo` > 254 → errors; `CreateUserDto.correo` uppercase → lowercased; `EmitirCfdiDto.pedidoId = "not-a-uuid"` → errors; `EmitirCfdiDto.pedidoId` valid UUID v4 → no errors; `CancelarCfdiDto.uuidSustituye = "abc-123"` → errors; `CancelarCfdiDto.uuidSustituye` absent → no errors (optional); `QueryProductDto.search` 201 chars → errors; `CreateProductDto.etiquetas` item 101 chars → errors; `CreateProductDto.imagenes` item 513 chars → errors. Run tests — all fail. Req: DTO Length Caps + UUID Tightening.

- [x] 3.2 **GREEN — Update `electric-kar/src/users/dto/create-user.dto.ts`.** Add `@LowerTrim()`, `@MaxLength(254)` on `correo`. Import `LowerTrim`. Run tests — pass. Req: Email Normalization.

- [x] 3.3 **GREEN — Update `electric-kar/src/cfdi/dto/emitir-cfdi.dto.ts`.** Replace `@IsString()` with `@IsUUID()` on `pedidoId`. Update import. Run tests — pass. Req: UUID Tightening.

- [x] 3.4 **GREEN — Update `electric-kar/src/cfdi/dto/cancelar-cfdi.dto.ts`.** Replace `@IsString()` with `@IsUUID()` on `uuidSustituye` (keep `@IsOptional()`). Update import (drop `IsString`). Run tests — pass. Req: UUID Tightening.

- [x] 3.5 **GREEN — Update `electric-kar/src/products/dto/query-product.dto.ts`.** Add `@Trim()`, `@MaxLength(200)` on `search`. Import `Trim`, `MaxLength`. Run tests — pass. Req: DTO Length Caps §QueryProductDto.

- [x] 3.6 **GREEN — Update `electric-kar/src/products/dto/create-product.dto.ts`.** Add `@MaxLength(100, { each: true })` on `etiquetas`; add `@MaxLength(512, { each: true })` on `imagenes`. Run tests — pass. Req: DTO Length Caps §CreateProductDto arrays.

---

## Phase 4: Auth Service — Read-Side Normalization + HTTP 409 (TDD)

- [x] 4.1 **RED — Write service unit tests for `auth.service.ts`.** Create or extend `electric-kar/src/auth/auth.service.spec.ts`. Scenarios: `registerCliente` with duplicate normalized email (`ADMIN@X.COM` when `admin@x.com` exists) → throws conflict (HTTP 409); `loginCliente` with uppercase email → calls `prisma.cliente.findUnique` with lowercased value; `loginUsuario` with uppercase email → calls `prisma.usuario.findUnique` with lowercased value; `forgotPassword` with uppercase → lowercased lookup; `googleLogin` with mixed-case payload email → lowercased lookup + store. Mock `PrismaService`. Run tests — all fail. Req: Email Normalization + Duplicate-by-case blocked (HTTP 409).

- [x] 4.2 **GREEN — Update `electric-kar/src/auth/auth.service.ts`: `registerCliente`.** Extract `correo = dto.correo.toLowerCase()`. Perform `findUnique({ where: { correo } })` BEFORE insert. If found → throw `ConflictException` (HTTP 409, message `'Email already registered'`). On create, store normalized `correo`. Run tests — pass. Req: Email Normalization + No duplicate-by-case.

- [x] 4.3 **GREEN — Update `auth.service.ts`: `loginCliente`, `loginUsuario`, `forgotPassword`, `googleLogin`.** Add `.toLowerCase()` on the email value used in each `findUnique` query. In `googleLogin`, normalize `payload?.email?.toLowerCase()` right after extraction so both lookup and create use the normalized value. Run tests — pass. Req: Email Normalization (read-side).

---

## Phase 5: Schema VarChar + Hand-Written Migration

> No unit tests for schema/migration steps — validation is the successful `pnpm prisma:deploy` run and a pre-flight SQL check.

- [x] 5.1 **Pre-flight: verify no existing row exceeds chosen caps.** Connect to `electrickar_db` and run `max(length(...))` queries for `Cliente.correo`, `Cliente.nombre`, `Usuario.correo`, `Usuario.nombre`, `Producto.nombre`, `Producto.sku`, `Cupon.codigo`, `Comprobante.receptorRfc`, `Comprobante.receptorCp`, `DireccionEnvio.cp`. Confirm every result is within the cap. Req: DB Safety Net (no truncation on ALTER).

- [x] 5.2 **Write hand-written migration.** Create `electric-kar/prisma/migrations/20260609170000_input_validation_varchar/migration.sql` with 10 `ALTER TABLE ... ALTER COLUMN ... TYPE VARCHAR(n)` statements (see design Component 4). Req: DB Safety Net.

- [x] 5.3 **Update `electric-kar/prisma/schema.prisma`.** Add `@db.VarChar(n)` to the 10 columns listed in design Component 4. Do NOT change any other field. Req: DB Safety Net (VarChar invariant).

- [x] 5.4 **Run `PATH="$HOME/.local/bin:$PATH" pnpm prisma:deploy` in `electric-kar/`.** Confirm migration applies cleanly with no truncation errors. Req: DB Safety Net §Migration applies.

- [x] 5.5 **Run `PATH="$HOME/.local/bin:$PATH" pnpm prisma:generate` in `electric-kar/`.** Confirm Prisma client regenerates without errors. Req: DB Safety Net.

---

## Phase 6: Full Test Pass + Build Verification

- [x] 6.1 **Run full test suite.** `PATH="$HOME/.local/bin:$PATH" pnpm test` in `electric-kar/`. All tests (existing + new) must pass. Req: No Regression.

- [x] 6.2 **Run build.** `PATH="$HOME/.local/bin:$PATH" pnpm build` in `electric-kar/`. Confirm zero TypeScript errors. Req: No Regression.

- [x] 6.3 **Spot-check VarChar invariant.** Manually verify in `schema.prisma` that every DTO `@MaxLength(m)` maps to `@db.VarChar(n)` with `n >= m`. Req: DB Safety Net §VarChar invariant.

- [ ] 6.4 **Commit and open PR.** Stage all changed files. Commit with `feat(validation): add input validation hardening — length caps, email normalization, UUID tightening, varchar safety net`. Push `feat/input-validation-hardening` and open PR targeting `main`. Req: All.
