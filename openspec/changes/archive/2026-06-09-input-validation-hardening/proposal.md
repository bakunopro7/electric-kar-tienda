# Proposal: Input Validation Hardening

## Intent

Backend text-input handling has gaps that create real risk: unbounded `LoginDto.password` and all `correo` fields enable an allocation/bcrypt DoS on public unauthenticated endpoints, and case-sensitive, untrimmed emails allow a duplicate-identity bypass (`ADMIN@X.COM` != `admin@x.com`). The schema has zero `@db.VarChar`, so DTOs are the only length gate. This change closes the HIGH + MEDIUM audit findings with length caps, input normalization, type tightening, and a DB safety net.

## Scope

### In Scope
- DTO length caps (`@MaxLength`) on every flagged field: email 254, password 72, reset token 256, google idToken 4096, product search 200, item `etiquetas` 100, item `imagenes` 512.
- Shared transform helper `src/common/transforms.ts` exposing `Trim()` and `LowerTrim()` to avoid repeating `@Transform` logic.
- Normalization: `LowerTrim()` on ALL `correo` fields (incl. `LoginDto.correo`); `Trim()` on generic free-text where sensible.
- Auth service read-side: lowercase email on lookup queries so existing mixed-case rows keep authenticating without a backfill.
- Type tightening: `@IsUUID()` on `EmitirCfdiDto.pedidoId` and `CancelarCfdiDto.uuidSustituye`.
- `@db.VarChar(n)` on key columns + hand-written migration (caps >= DTO `@MaxLength`, written defensively against populated columns).

### Out of Scope (non-goals)
- Frontend `maxlength` attributes (UX only; backend is the gate).
- CORS lockdown (separate hardening change).
- Slug normalization / `@Matches` on category/marca slugs.
- Rate limiting on auth endpoints.
- Bulk email backfill of existing rows (follow-up with collision check).

## Capabilities

### New Capabilities
- `input-validation`: length caps, normalization (trim/lowercase), and type tightening for backend DTOs, plus DB-level `@db.VarChar` safety net.

### Modified Capabilities
- None.

## Approach

1. Add `src/common/transforms.ts` with `Trim()` / `LowerTrim()` class-decorator wrappers over `@Transform`.
2. Apply caps + transforms across `auth`, `users`, `cfdi`, `products` DTOs.
3. Normalize email on the auth service read side (lowercase the lookup value) so storage-vs-input mismatch never breaks login during the no-backfill window.
4. Add `@db.VarChar(n)` to key columns; ship a hand-written `migration.sql` (`prisma:deploy`, since `migrate dev` fails in this env). Caps chosen >= DTO caps and >= longest existing value.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/common/transforms.ts` | New | Shared `Trim()` / `LowerTrim()` helpers |
| `src/auth/dto/*.dto.ts` | Modified | Caps + `LowerTrim`/`Trim` on email, password, token, idToken |
| `src/users/dto/create-user.dto.ts` | Modified | Email cap + `LowerTrim` |
| `src/cfdi/dto/{emitir,cancelar}-cfdi.dto.ts` | Modified | `@IsUUID()` on id fields |
| `src/products/dto/{query,create}-product.dto.ts` | Modified | search cap; per-item caps on arrays |
| `src/auth/*.service.ts` | Modified | Lowercase email on lookup queries |
| `prisma/schema.prisma` | Modified | `@db.VarChar(n)` on key columns |
| `prisma/migrations/<ts>_input_validation_varchar/migration.sql` | New | Hand-written `ALTER COLUMN ... TYPE varchar(n)` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Login breaks if storage normalized but lookup uses raw input | High | Apply `LowerTrim` to `LoginDto.correo` AND lowercase on the service-side query; no reliance on storage normalization alone |
| `ALTER COLUMN TYPE varchar(n)` fails on populated column exceeding cap | Med | Pick caps >= longest existing value AND >= DTO cap; write migration defensively |
| Valid input truncated by DB cap | Low | `@db.VarChar(n)` >= corresponding DTO `@MaxLength` |
| New signup collides with old differently-cased email | Low | Out-of-scope backfill noted; unique constraint still rejects at insert; documented as follow-up |

## Rollback Plan

Single PR on `feat/input-validation-hardening`; revert the merge commit. DTO/code changes revert cleanly. For the schema: ship a down migration reverting `varchar(n)` back to `text` (always safe — widening, never truncates). No data is mutated by this change.

## Dependencies

- `class-transformer` `@Transform` (already present via NestJS validation stack).
- Migration applied via `pnpm prisma:deploy` + `pnpm prisma:generate` (env-specific; `migrate dev` is interactive and fails here).

## Success Criteria

- [ ] Every flagged field has a `@MaxLength`; oversized payloads return 400.
- [ ] All `correo` inputs are trimmed + lowercased; mixed-case duplicates are blocked.
- [ ] Existing mixed-case users still log in (read-side lowercase verified).
- [ ] `@IsUUID()` rejects malformed CFDI ids with 400.
- [ ] Migration applies on the populated DB without truncation errors.
