# Input Validation Specification

## Purpose

Closes HIGH and MEDIUM audit findings by adding length caps to every unbounded
DTO field, normalizing email inputs (trim + lowercase) at the DTO and read-query
layer, tightening UUID fields to `@IsUUID()`, and adding a `@db.VarChar(n)`
safety net in the Prisma schema so the DB can never silently accept what the DTO
would have rejected.

---

## Requirements

### Requirement: DTO Length Caps — Reject Oversized Inputs

Every flagged string field MUST declare `@MaxLength(n)` with the cap below.
The global `ValidationPipe` (whitelist + transform) MUST reject any request whose
field exceeds the cap with HTTP 400 before the handler is invoked.

| DTO | Field | Cap |
|-----|-------|-----|
| `RegisterDto` / `CreateUserDto` / `LoginDto` / `ForgotPasswordDto` | `correo` | 254 |
| `LoginDto` | `password` | 72 |
| `ResetPasswordDto` | `token` | 256 |
| `GoogleLoginDto` | `idToken` | 4096 |
| `QueryProductDto` | `search` | 200 |
| `CreateProductDto` | `etiquetas[]` (each item) | 100 |
| `CreateProductDto` | `imagenes[]` (each item) | 512 |

#### Scenario: Email exceeds cap → 400

- GIVEN a public endpoint that accepts a `correo` field
- WHEN a POST request is sent with `correo` set to a 255-character valid-format email address
- THEN the response status is 400
- AND the response body contains a validation error referencing `correo`

#### Scenario: Email at cap → accepted

- GIVEN a public endpoint that accepts a `correo` field
- WHEN a POST request is sent with `correo` set to exactly 254 characters (valid format)
- THEN the request passes DTO validation (status is not 400 due to length)

#### Scenario: Login password exceeds cap → 400

- GIVEN the `POST /api/auth/login` endpoint
- WHEN a request is sent with `password` set to a 73-character string
- THEN the response status is 400

#### Scenario: Login password at cap → accepted

- GIVEN the `POST /api/auth/login` endpoint
- WHEN a request is sent with `password` set to exactly 72 characters and valid credentials
- THEN the response status is not 400 due to length (auth proceeds normally)

#### Scenario: Reset token exceeds cap → 400

- GIVEN the `POST /api/auth/reset-password` endpoint
- WHEN a request is sent with `token` set to a 257-character string
- THEN the response status is 400

#### Scenario: Reset token at cap → accepted

- GIVEN the `POST /api/auth/reset-password` endpoint
- WHEN a request is sent with `token` set to exactly 256 characters
- THEN the request passes length validation

#### Scenario: Google idToken exceeds cap → 400

- GIVEN the `POST /api/auth/google-login` endpoint
- WHEN a request is sent with `idToken` set to a 4097-character string
- THEN the response status is 400

#### Scenario: Google idToken at cap → accepted

- GIVEN the `POST /api/auth/google-login` endpoint
- WHEN a request is sent with `idToken` set to exactly 4096 characters
- THEN the request passes length validation

#### Scenario: Product search exceeds cap → 400

- GIVEN the `GET /api/products` endpoint with a `search` query parameter
- WHEN a request is sent with `search` set to a 201-character string
- THEN the response status is 400

#### Scenario: Product search at cap → accepted

- GIVEN the `GET /api/products` endpoint
- WHEN a request is sent with `search` set to exactly 200 characters
- THEN the request passes length validation

#### Scenario: Product etiquetas item exceeds cap → 400

- GIVEN the `POST /api/products` endpoint
- WHEN a request is sent with `etiquetas` containing an item of 101 characters
- THEN the response status is 400

#### Scenario: Product imagenes item exceeds cap → 400

- GIVEN the `POST /api/products` endpoint
- WHEN a request is sent with `imagenes` containing an item of 513 characters
- THEN the response status is 400

---

### Requirement: Email Normalization — Trim and Lowercase

All `correo` fields in every auth and user DTO MUST apply a `LowerTrim`
transform (trim whitespace + lowercase) before validation runs. The `@Transform`
decorator MUST execute because `ValidationPipe` is configured with
`transform: true`.

The auth service read-side MUST also normalize (lowercase) the email value used
in database lookup queries, so that users whose stored email is already
lower-case can still authenticate during the window before a full backfill.

Duplicate detection MUST be case-insensitive: a registration attempt whose
normalized email matches an existing user's normalized email MUST be rejected.

#### Scenario: Registration normalizes email

- GIVEN no existing user with email `admin@x.com`
- WHEN `POST /api/auth/register` is called with `correo` = `"  ADMIN@X.COM "`
- THEN a user is created with `correo` stored as `"admin@x.com"` (or the request
  is processed as if the input were `"admin@x.com"`)

#### Scenario: Login with different case succeeds

- GIVEN a user exists with `correo` = `"admin@x.com"`
- WHEN `POST /api/auth/login` is called with `correo` = `"ADMIN@X.COM"` and
  the correct password
- THEN the response status is 200 and a valid token is returned

#### Scenario: Login with surrounding whitespace succeeds

- GIVEN a user exists with `correo` = `"admin@x.com"`
- WHEN `POST /api/auth/login` is called with `correo` = `"  admin@x.com  "` and
  the correct password
- THEN the response status is 200 and a valid token is returned

#### Scenario: Duplicate registration blocked regardless of case

- GIVEN a user already exists with `correo` = `"admin@x.com"`
- WHEN `POST /api/auth/register` is called with `correo` = `"ADMIN@X.COM"`
- THEN the response status is 409 (or the equivalent conflict error)
- AND no second user is created

---

### Requirement: UUID Type Tightening for CFDI DTOs

`EmitirCfdiDto.pedidoId` and `CancelarCfdiDto.uuidSustituye` MUST be decorated
with `@IsUUID()` (not merely `@IsString()`). Any value that is not a valid UUID
v4 string MUST cause HTTP 400.

#### Scenario: Non-UUID pedidoId → 400

- GIVEN an authenticated ADMIN user
- WHEN `POST /api/cfdi/emitir` is called with `pedidoId` = `"not-a-uuid"`
- THEN the response status is 400
- AND the error body references `pedidoId`

#### Scenario: Valid UUID pedidoId → passes validation

- GIVEN an authenticated ADMIN user
- WHEN `POST /api/cfdi/emitir` is called with `pedidoId` set to a valid UUID v4
- THEN the request passes DTO validation (status is not 400 due to format)

#### Scenario: Non-UUID uuidSustituye → 400

- GIVEN an authenticated ADMIN user
- WHEN `POST /api/cfdi/cancelar` is called with `uuidSustituye` = `"abc-123"`
- THEN the response status is 400
- AND the error body references `uuidSustituye`

---

### Requirement: Database VarChar Safety Net

Every key column that has a corresponding DTO `@MaxLength` MUST have a
`@db.VarChar(n)` attribute in `schema.prisma`, where `n` MUST be greater than or
equal to the DTO cap. This ensures the DB never silently accepts or truncates
data that the DTO would have rejected.

A hand-written migration (`ALTER COLUMN ... TYPE varchar(n)`) MUST apply without
error on the populated `electrickar_db` database, which means all chosen `n`
values MUST be greater than or equal to the longest existing value in that column.

This is expressed as a **static invariant** verified at review / CI time:

> For every DTO field with `@MaxLength(m)`, the corresponding Prisma column MUST
> declare `@db.VarChar(n)` with `n >= m`.

#### Scenario: Migration applies without truncation error

- GIVEN the production database contains existing rows
- WHEN the migration `<timestamp>_input_validation_varchar/migration.sql` is
  applied via `pnpm prisma:deploy`
- THEN the migration completes successfully with no truncation error
- AND no existing row is modified or deleted

#### Scenario: VarChar width invariant holds for all capped fields

- GIVEN the current `schema.prisma`
- WHEN each DTO `@MaxLength(m)` is compared to the corresponding `@db.VarChar(n)`
- THEN `n >= m` for every mapped field

---

### Requirement: Valid Inputs Are Not Rejected (No Regression)

Normal, valid inputs to all existing endpoints MUST continue to succeed.
Existing route guards, role checks, and other validations MUST remain unchanged.

#### Scenario: Normal registration still works

- GIVEN no conflicting user exists
- WHEN `POST /api/auth/register` is called with a typical email ≤ 254 chars and
  a password of 8–20 characters
- THEN the response status is 201 and a user is created

#### Scenario: Normal product search still works

- GIVEN the product catalog contains items
- WHEN `GET /api/products?search=motor` is called
- THEN the response status is 200 and matching products are returned

#### Scenario: Normal product creation still works

- GIVEN an authenticated ADMIN user and a valid product payload with short tags
  and image URLs
- WHEN `POST /api/products` is called
- THEN the response status is 201 and the product is persisted

#### Scenario: Unauthenticated CFDI attempt still yields 401 / 403

- GIVEN a request with no valid JWT
- WHEN `POST /api/cfdi/emitir` is called
- THEN the response status is 401 or 403 (role guard unchanged)
