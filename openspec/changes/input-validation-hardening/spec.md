# Spec: input-validation-hardening

## Change

`input-validation-hardening`

## Capabilities

| Capability | Type | Spec File |
|-----------|------|-----------|
| `input-validation` | New | `specs/input-validation/spec.md` |

## Summary

This change introduces one new capability — `input-validation` — covering:

1. **Length caps**: `@MaxLength` on every flagged DTO field; oversized payloads return HTTP 400.
2. **Email normalization**: `LowerTrim` transform on all `correo` fields plus read-side lowercase
   on auth service queries; mixed-case duplicate registrations blocked.
3. **UUID tightening**: `@IsUUID()` on `EmitirCfdiDto.pedidoId` and `CancelarCfdiDto.uuidSustituye`.
4. **DB safety net**: `@db.VarChar(n)` on key columns with `n >= DTO @MaxLength`; hand-written
   migration applies without truncation on the populated database.
5. **No regression**: existing valid inputs, guards, and role checks remain unchanged.

## Non-Goals

- Frontend `maxlength` attributes
- CORS lockdown
- Slug normalization / `@Matches` on category/marca slugs
- Rate limiting on auth endpoints
- Bulk backfill of existing mixed-case email rows

## Spec Dependency

Full scenarios are in `specs/input-validation/spec.md`.
