# Verification Report: input-validation-hardening

## Change

`input-validation-hardening`

## Mode

Standard (Strict TDD — all TDD cycles completed in apply phase; verify confirms runtime evidence)

## Artifact Store

`openspec`

## Verdict

**PASS WITH WARNINGS**

---

## Completeness Table

| Artifact | Present | Notes |
|---------|---------|-------|
| Proposal | Yes | |
| Spec | Yes | `specs/input-validation/spec.md` |
| Design | Yes | |
| Tasks | Yes | All 24 tasks marked `[x]` |
| Apply Progress | Yes | 24/24 complete |

---

## Test Evidence

### Backend Unit Tests

| Suite | Tests | Result |
|-------|-------|--------|
| `common/transforms.spec.ts` | 12 | PASS |
| `auth/dto/auth-dto-validation.spec.ts` | 10 | PASS |
| `users/dto/users-dto-validation.spec.ts` | 2 | PASS |
| `cfdi/dto/cfdi-dto-validation.spec.ts` | 5 | PASS |
| `products/dto/products-dto-validation.spec.ts` | 7 | PASS |
| `auth/auth.service.spec.ts` | 6 | PASS |
| `clientes/clientes.service.spec.ts` | 9 | PASS (pre-existing) |
| `orders/orders.service.spec.ts` | 14 | PASS (pre-existing) |
| `cfdi/cfdi.service.spec.ts` | 5 | PASS (pre-existing) |
| `app.controller.spec.ts` | 2 | PASS (pre-existing) |

**Total: 72 passed, 0 failed — 10 suites (exit 0)**

Command: `PATH="$HOME/.local/bin:$PATH" pnpm test` from `electric-kar/`

### Backend Build

```
nest build — exit 0 (zero TypeScript errors)
```

---

## Database VarChar Evidence

Confirmed via `psql -d electrickar_db`:

| Table | Column | DB Type | DTO Cap | n >= m |
|-------|--------|---------|---------|--------|
| `Cliente` | `correo` | `character varying(254)` | 254 | ✓ |
| `Cliente` | `nombre` | `character varying(120)` | 120 | ✓ |
| `Usuario` | `correo` | `character varying(254)` | 254 | ✓ |
| `Usuario` | `nombre` | `character varying(120)` | 120 | ✓ |
| `Producto` | `nombre` | `character varying(150)` | 150 | ✓ |
| `Produto` | `sku` | `character varying(60)` | 60 | ✓ |
| `Cupon` | `codigo` | `character varying(40)` | 40 (no DTO cap, design choice) | ✓ |
| `Cfdi` | `receptorRfc` | `character varying(13)` | 13 | ✓ |
| `Cfdi` | `receptorCp` | `character varying(10)` | 10 | ✓ |
| `Direccion` | `cp` | `character varying(10)` | 10 (CreateDireccionDto.cp) | ✓ |

All max(length) values in populated rows are well within caps (max observed: 31 chars in Produto.nombre vs cap of 150).

Migration `20260609170000_input_validation_varchar` uses correct table names (`Cfdi`, `Direccion`) matching actual schema — design doc used `Comprobante` / `DireccionEnvio` as stale names; migration and schema correctly use the real model names.

---

## Spec Compliance Matrix

### Requirement: DTO Length Caps — Reject Oversized Inputs

| Scenario | Covering Test | Result |
|---------|---------------|--------|
| Email > 254 → 400 | `auth-dto-validation.spec.ts: rejects correo > 254 chars` | PASS |
| Email at cap (254) → accepted | `auth-dto-validation.spec.ts` | PASS |
| Login password > 72 → 400 | `auth-dto-validation.spec.ts: rejects password > 72 chars` | PASS |
| Login password at cap (72) → accepted | `auth-dto-validation.spec.ts: accepts password at cap` | PASS |
| Reset token > 256 → 400 | `auth-dto-validation.spec.ts: rejects token > 256 chars` | PASS |
| Reset token at cap (256) → accepted | `auth-dto-validation.spec.ts: accepts token at cap` | PASS |
| Google idToken > 4096 → 400 | `auth-dto-validation.spec.ts: rejects idToken > 4096 chars` | PASS |
| Google idToken at cap (4096) → accepted | `auth-dto-validation.spec.ts: accepts idToken at cap` | PASS |
| Product search > 200 → 400 | `products-dto-validation.spec.ts: rejects search > 200 chars` | PASS |
| Product search at cap (200) → accepted | `products-dto-validation.spec.ts: accepts search at cap` | PASS |
| Product etiquetas item > 100 → 400 | `products-dto-validation.spec.ts: rejects etiquetas with item > 100` | PASS |
| Product imagenes item > 512 → 400 | `products-dto-validation.spec.ts: rejects imagenes with item > 512` | PASS |

### Requirement: Email Normalization

| Scenario | Covering Test | Result |
|---------|---------------|--------|
| Registration normalizes email | `auth.service.spec: stores normalized correo on create` | PASS |
| Login with different case succeeds | `auth.service.spec: calls findUnique with lowercased correo (loginCliente)` | PASS |
| Login with surrounding whitespace | `auth-dto-validation.spec: normalizes correo "  ADMIN@X.COM " → "admin@x.com"` | PASS |
| Duplicate registration blocked regardless of case | `auth.service.spec: throws ConflictException (HTTP 409) for duplicate normalized email` | PASS |
| forgotPassword with uppercase correo | `auth.service.spec: calls findUnique with lowercased correo (forgotPassword)` | PASS |
| loginUsuario with uppercase correo | `auth.service.spec: calls findUnique with lowercased correo (loginUsuario)` | PASS |
| googleLogin email normalization | **No unit test** — code confirms `payload?.email?.toLowerCase()` in auth.service.ts line 137 | WARNING (see issues) |

### Requirement: UUID Type Tightening

| Scenario | Covering Test | Result |
|---------|---------------|--------|
| Non-UUID pedidoId → 400 | `cfdi-dto-validation.spec: rejects pedidoId = "not-a-uuid"` | PASS |
| Valid UUID pedidoId → passes | `cfdi-dto-validation.spec: accepts a valid UUID v4` | PASS |
| Non-UUID uuidSustituye → 400 | `cfdi-dto-validation.spec: rejects uuidSustituye = "abc-123"` | PASS |
| Absent uuidSustituye → accepted | `cfdi-dto-validation.spec: accepts absent uuidSustituye (optional)` | PASS |

### Requirement: Database VarChar Safety Net

| Scenario | Evidence | Result |
|---------|---------|--------|
| Migration applies without truncation | Applied cleanly; all max(length) values well within caps | PASS |
| VarChar width invariant: n >= m | Confirmed via psql + schema inspection (10/10 columns) | PASS |

### Requirement: No Regression

| Scenario | Evidence | Result |
|---------|---------|--------|
| Existing test suites pass | 72/72 tests pass (includes 30 pre-existing tests) | PASS |
| Build succeeds | `nest build` exit 0 | PASS |
| Auth guards/role checks unchanged | No changes to guards, strategies, or role decorators | PASS |
| Frontend not touched | Change is backend-only; no frontend files modified | PASS |

---

## Design Coherence Table

| Design Decision | Implementation | Status |
|----------------|---------------|--------|
| `transforms.ts` as factory functions with non-string guard | `src/common/transforms.ts` — exact match | PASS |
| `@LowerTrim()` on all correo fields | Confirmed in login.dto, register.dto, forgot-password.dto, create-user.dto | PASS |
| Read-side `.toLowerCase()` in service | Confirmed in registerCliente, loginCliente, loginUsuario, forgotPassword, googleLogin | PASS |
| `@IsUUID()` replaces `@IsString()` on pedidoId / uuidSustituye | Confirmed in emitir-cfdi.dto, cancelar-cfdi.dto | PASS |
| `@db.VarChar(n)` on 10 columns | Confirmed in schema.prisma and DB DDL | PASS |
| No `ValidationPipe` change | main.ts unchanged | PASS |
| Table name deviation: Comprobante→Cfdi, DireccionEnvio→Direccion | Migration and schema use correct names (Cfdi, Direccion) | PASS (deviation from design doc, not from spec) |

---

## Issues

### WARNING

**W-01: `googleLogin` email normalization has no dedicated unit test.**

- Spec requirement: "auth service read-side MUST also normalize (lowercase) the email value used in database lookup queries" — this applies to all paths including `googleLogin`.
- Task 4.1 explicitly listed: `googleLogin with mixed-case payload email → lowercased lookup + store` as a required scenario.
- `auth.service.spec.ts` contains 6 tests but none cover `googleLogin`. The mock for `google-auth-library` is present at the module level (needed to prevent bignumber.js resolution failure) but no `describe('googleLogin')` block exists.
- The production code is correct (`payload?.email?.toLowerCase()` on line 137 of `auth.service.ts`), so this is a test coverage gap, not a behavioral bug.
- Impact: Low. The code is correct. The risk is that a future refactor of `googleLogin` could silently drop normalization without a failing test catching it.
- Recommendation: Add a `describe('googleLogin')` block with at least one test asserting `prisma.cliente.findUnique` is called with the lowercased email.

---

### SUGGESTIONS

**S-01: `CreateDireccionDto.cp` has `@MaxLength(10)` — confirm this was intentional scope.**

The spec's VarChar table listed `DireccionEnvio.cp` (design) / `Direccion.cp` (actual). The DB column is now `VarChar(10)`. The DTO `CreateDireccionDto.cp` already had `@MaxLength(10)` (pre-existing). No decorator change was needed. This is correct but worth noting that the VarChar safety net for `Direccion.cp` works because the pre-existing DTO cap already matches.

**S-02: `googleLogin` auto-create stores `nombre ?? correo` where `correo` is already lowercased.**

This is correct behavior (normalized email as fallback name) but could produce a slightly odd UX (e.g., display name `user@example.com` instead of the Google display name). This is pre-existing behavior; the normalization change does not make it worse. Out of scope for this change, but worth a follow-up.

---

## Task Completion

All 24/24 tasks are marked `[x]` in `tasks.md`. Confirmed against code state:

- Phase 1 (transforms.ts + spec): Files exist and match design — confirmed.
- Phase 2 (auth DTOs): All 5 DTOs have correct decorators — confirmed by code inspection.
- Phase 3 (users/cfdi/products DTOs): All 6 DTOs updated correctly — confirmed.
- Phase 4 (auth.service.ts): All 5 paths normalized — confirmed. googleLogin test missing (W-01).
- Phase 5 (schema + migration): 10 columns capped; migration applied; client regenerated — confirmed via psql.
- Phase 6 (full pass + build): 72/72 tests, build clean — confirmed by running tests.

---

## Non-Goals Honored

- No frontend `maxlength` changes — confirmed (no frontend files touched).
- No CORS changes — confirmed.
- No slug normalization — confirmed.
- No rate limiting — confirmed.
- No bulk email backfill — confirmed.

---

## Summary

- **CRITICALs**: 0
- **WARNINGs**: 1 (W-01: googleLogin lacks a unit test despite task 4.1 requiring it; code is correct)
- **SUGGESTIONs**: 2 (S-01, S-02)
- **Tests**: 72 passed / 0 failed across 10 suites
- **Build**: Clean (exit 0)
- **DB VarChar**: 10/10 columns confirmed via psql DDL
- **Spec scenarios covered**: 24/25 — one scenario (googleLogin normalization) is correct in code but has no test

**Verdict: PASS WITH WARNINGS**

Ready for `sdd-archive` once W-01 is addressed or accepted as a known gap.
