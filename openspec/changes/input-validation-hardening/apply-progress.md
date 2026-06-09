# Apply Progress: input-validation-hardening

**Change**: input-validation-hardening
**Mode**: Strict TDD
**Artifact store**: openspec
**Status**: ALL TASKS COMPLETE (24/24)
**PR**: https://github.com/bakunopro7/electric-kar-tienda/pull/7

---

## TDD Cycle Evidence

| Task | RED (test written + fails) | GREEN (impl passes) | Notes |
|------|---------------------------|---------------------|-------|
| 1.2 | `transforms.spec.ts` — cannot find module `./transforms` | 1.3: transforms.ts created, 12/12 pass | |
| 2.1 | `auth-dto-validation.spec.ts` — 5 failures (missing caps, no LowerTrim) | 2.2–2.6: DTOs updated, 10/10 pass | |
| 3.1 | 3 spec files — 6 failures (CreateUserDto no LowerTrim, EmitirCfdiDto/CancelarCfdiDto no IsUUID, array caps missing) | 3.2–3.6: DTOs updated, 14/14 pass | |
| 4.1 | `auth.service.spec.ts` — 5 failures (service not lowercasing) | 4.2–4.3: service updated, 6/6 pass | google-auth-library mocked with jest.mock() at module level to avoid bignumber.js moduleNameMapper issue |

---

## Completed Tasks

### Phase 1: Foundation
- [x] 1.1 Committed openspec artifacts
- [x] 1.2 RED: transforms.spec.ts (12 tests, all failed — file missing)
- [x] 1.3 GREEN: src/common/transforms.ts created

### Phase 2: Auth DTOs
- [x] 2.1 RED: auth-dto-validation.spec.ts (10 tests, 5 failed)
- [x] 2.2 GREEN: login.dto.ts — @LowerTrim(), @MaxLength(254) on correo; @MaxLength(72) on password
- [x] 2.3 GREEN: register.dto.ts — @LowerTrim() + @MaxLength(254) on correo; @Trim() on nombre
- [x] 2.4 GREEN: forgot-password.dto.ts — @LowerTrim() + @MaxLength(254) on correo
- [x] 2.5 GREEN: reset-password.dto.ts — @MaxLength(256) on token
- [x] 2.6 GREEN: google-login.dto.ts — @MaxLength(4096) on idToken

### Phase 3: Users, CFDI, Products DTOs
- [x] 3.1 RED: users/cfdi/products spec files (14 tests, 6 failed)
- [x] 3.2 GREEN: create-user.dto.ts — @LowerTrim() + @MaxLength(254) on correo
- [x] 3.3 GREEN: emitir-cfdi.dto.ts — @IsUUID() on pedidoId (replaces @IsString())
- [x] 3.4 GREEN: cancelar-cfdi.dto.ts — @IsUUID() on uuidSustituye (replaces @IsString(), keeps @IsOptional())
- [x] 3.5 GREEN: query-product.dto.ts — @Trim() + @MaxLength(200) on search
- [x] 3.6 GREEN: create-product.dto.ts — @MaxLength(100, {each:true}) on etiquetas; @MaxLength(512, {each:true}) on imagenes

### Phase 4: Auth Service
- [x] 4.1 RED: auth.service.spec.ts (6 tests, 5 failed)
- [x] 4.2 GREEN: registerCliente — correo = dto.correo.toLowerCase() before findUnique + store; throws ConflictException on duplicate
- [x] 4.3 GREEN: loginCliente, loginUsuario, forgotPassword, googleLogin — .toLowerCase() on lookup email

### Phase 5: Schema + Migration
- [x] 5.1 Pre-flight: max(length) verified for all 10 columns — all within caps
- [x] 5.2 Migration written: prisma/migrations/20260609170000_input_validation_varchar/migration.sql
- [x] 5.3 schema.prisma updated: @db.VarChar on 10 columns (actual table names: Cfdi not Comprobante, Direccion not DireccionEnvio)
- [x] 5.4 pnpm prisma:deploy — applied cleanly, no truncation errors
- [x] 5.5 pnpm prisma:generate — Prisma client regenerated

### Phase 6: Verification
- [x] 6.1 Full test suite: 72/72 pass (10 suites)
- [x] 6.2 Build: zero TypeScript errors
- [x] 6.3 VarChar invariant spot-checked: n >= m for all mapped fields
- [x] 6.4 Committed and PR opened: https://github.com/bakunopro7/electric-kar-tienda/pull/7

---

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `electric-kar/src/common/transforms.ts` | Created | Trim() and LowerTrim() decorator factories with non-string guard |
| `electric-kar/src/common/transforms.spec.ts` | Created | 12 unit tests for Trim/LowerTrim |
| `electric-kar/src/auth/dto/login.dto.ts` | Modified | @LowerTrim + @MaxLength(254) on correo; @MaxLength(72) on password |
| `electric-kar/src/auth/dto/register.dto.ts` | Modified | @LowerTrim + @MaxLength(254) on correo; @Trim on nombre |
| `electric-kar/src/auth/dto/forgot-password.dto.ts` | Modified | @LowerTrim + @MaxLength(254) on correo |
| `electric-kar/src/auth/dto/reset-password.dto.ts` | Modified | @MaxLength(256) on token |
| `electric-kar/src/auth/dto/google-login.dto.ts` | Modified | @MaxLength(4096) on idToken |
| `electric-kar/src/auth/dto/auth-dto-validation.spec.ts` | Created | 10 DTO validation tests for auth DTOs |
| `electric-kar/src/users/dto/create-user.dto.ts` | Modified | @LowerTrim + @MaxLength(254) on correo |
| `electric-kar/src/users/dto/users-dto-validation.spec.ts` | Created | 2 tests for CreateUserDto correo |
| `electric-kar/src/cfdi/dto/emitir-cfdi.dto.ts` | Modified | @IsUUID() on pedidoId (replaces @IsString()) |
| `electric-kar/src/cfdi/dto/cancelar-cfdi.dto.ts` | Modified | @IsUUID() on uuidSustituye (replaces @IsString()) |
| `electric-kar/src/cfdi/dto/cfdi-dto-validation.spec.ts` | Created | 5 tests for EmitirCfdiDto/CancelarCfdiDto UUID |
| `electric-kar/src/products/dto/query-product.dto.ts` | Modified | @Trim() + @MaxLength(200) on search |
| `electric-kar/src/products/dto/create-product.dto.ts` | Modified | @MaxLength(100,each) on etiquetas; @MaxLength(512,each) on imagenes |
| `electric-kar/src/products/dto/products-dto-validation.spec.ts` | Created | 7 tests for QueryProductDto/CreateProductDto |
| `electric-kar/src/auth/auth.service.ts` | Modified | .toLowerCase() on all email lookup/store paths; HTTP 409 on duplicate |
| `electric-kar/src/auth/auth.service.spec.ts` | Created | 6 service tests for email normalization + 409 conflict |
| `electric-kar/prisma/schema.prisma` | Modified | @db.VarChar on 10 columns (Cliente, Usuario, Producto, Cupon, Cfdi, Direccion) |
| `electric-kar/prisma/migrations/20260609170000_input_validation_varchar/migration.sql` | Created | 10 ALTER TABLE statements for varchar caps |
| `openspec/changes/input-validation-hardening/tasks.md` | Modified | All tasks marked [x] |

---

## Deviations from Design

1. **Table names**: Design used `Comprobante` and `DireccionEnvio` in migration/schema snippets, but actual Prisma models and DB tables are `Cfdi` and `Direccion`. Migration and schema updated with correct names.
2. **google-auth-library mock**: `jest.mock('google-auth-library', ...)` added at top of `auth.service.spec.ts` to avoid `bignumber.js` `moduleNameMapper` resolution failure — this is a test-file-only workaround, production code unchanged.

## Remaining Tasks

None — all 24 tasks complete.
