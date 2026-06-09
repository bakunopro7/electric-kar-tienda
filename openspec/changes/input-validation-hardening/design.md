# Design: Input Validation Hardening

## Architecture Approach

This is a **defense-in-depth, layered hardening** of the existing NestJS validation
stack. No new patterns or modules are introduced — we extend the layer that already
exists (`class-validator`/`class-transformer` DTOs behind the global `ValidationPipe`)
and add a DB-level safety net (`@db.VarChar`). Three enforcement layers, each
independently effective:

1. **Transform layer** (`class-transformer` `@Transform`) — normalizes input
   (trim, lowercase) BEFORE validators run.
2. **Validation layer** (`class-validator` `@MaxLength`/`@IsUUID`) — rejects oversized
   or malformed input with HTTP 400.
3. **Persistence layer** (`@db.VarChar(n)`) — last-resort cap if a DTO ever ships
   without a cap or is bypassed.

The global pipe is already `ValidationPipe({ whitelist: true, forbidNonWhitelisted:
true, transform: true })` at `electric-kar/src/main.ts:23`. Because `transform: true`
is already enabled, `@Transform` decorators run automatically — **no pipe change is
required**. This is the key enabler and the reason the shared-helper approach is safe.

### Transform-vs-Validation ordering (critical gotcha)

`class-transformer` runs the plaintToClass conversion (including `@Transform`)
**before** `class-validator` runs the constraint checks, when used through Nest's
`ValidationPipe` with `transform: true`. Therefore:

- `LowerTrim()` runs first → `"  ADMIN@X.COM "` becomes `"admin@x.com"`.
- THEN `@IsEmail()` / `@MaxLength(254)` validate the already-normalized value.

This ordering is what we want: a value that is valid only after trimming (e.g. a
pasted email with a trailing space) passes, and `@MaxLength` measures the trimmed
length. We rely on this ordering; do not reorder by moving the cap into the transform.

## Component 1 — Shared Transform Helpers

**New file:** `electric-kar/src/common/transforms.ts`

These are decorator factories that wrap `@Transform` so each DTO field stays a
one-liner and the normalization logic lives in exactly one place. Both guard against
non-string and `undefined`/`null` values so they are safe on optional fields (the
transform must be a no-op when the field is absent, otherwise we would coerce
`undefined` into a string or crash on `.trim()`).

```typescript
import { Transform } from 'class-transformer';

/**
 * Trims surrounding whitespace from a string value.
 * No-op for non-string values (undefined/null/optional fields), so it is safe
 * to stack above @IsOptional() without coercing absent fields.
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

/**
 * Trims and lowercases a string value. Use on every `correo`/email field to make
 * the case-sensitive Postgres unique index behave case-insensitively and to block
 * the duplicate-identity bypass (ADMIN@X.COM vs admin@x.com).
 * No-op for non-string values.
 */
export function LowerTrim(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
```

**Decision:** factories returning `PropertyDecorator` (not bare `@Transform` calls)
so the call site reads `@LowerTrim()` — consistent with how `class-validator`
decorators are invoked. **Rejected:** exporting raw transform functions and calling
`@Transform(trimFn)` at each site — leaks `class-transformer` import into every DTO
and is noisier.

## Component 2 — Per-DTO Change Table

Decorator **order convention:** `@ApiProperty` → `@IsOptional` (if optional) →
transform (`@Trim`/`@LowerTrim`) → type/format validator (`@IsEmail`/`@IsString`/
`@IsUUID`) → length validators (`@MinLength`/`@MaxLength`). Listing the transform
above the validators documents intent; actual run order is enforced by
`class-transformer` running before `class-validator` regardless of decorator order.

### 2.1 `src/auth/dto/login.dto.ts`

```typescript
// BEFORE
import { IsEmail, IsString, MinLength } from 'class-validator';
  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(6)
  password: string;
```

```typescript
// AFTER
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { LowerTrim } from '../../common/transforms';
  @LowerTrim()
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;
```

### 2.2 `src/auth/dto/register.dto.ts`

`password`, `nombre`, `telefono`, `rfc` already have `@MaxLength`. Add email cap +
normalization and trim the free-text `nombre`.

```typescript
// BEFORE
  @IsEmail()
  correo: string;

  @IsString()
  @MaxLength(120)
  nombre: string;
```

```typescript
// AFTER  (add import { LowerTrim, Trim } from '../../common/transforms';)
  @LowerTrim()
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @Trim()
  @IsString()
  @MaxLength(120)
  nombre: string;
```

(`telefono`/`rfc` keep their existing caps; optionally add `@Trim()` — low value, leave as-is to keep diff tight.)

### 2.3 `src/auth/dto/forgot-password.dto.ts`

```typescript
// BEFORE
import { IsEmail } from 'class-validator';
  @IsEmail()
  correo: string;
```

```typescript
// AFTER
import { IsEmail, MaxLength } from 'class-validator';
import { LowerTrim } from '../../common/transforms';
  @LowerTrim()
  @IsEmail()
  @MaxLength(254)
  correo: string;
```

### 2.4 `src/auth/dto/reset-password.dto.ts`

```typescript
// BEFORE
  @IsString()
  token: string;
```

```typescript
// AFTER
  @IsString()
  @MaxLength(256)
  token: string;
```

(`token` is a `randomUUID()` (36 chars) in current code; 256 is generous headroom for any future token scheme. `password` already capped at 72.)

### 2.5 `src/auth/dto/google-login.dto.ts`

```typescript
// BEFORE
import { IsString } from 'class-validator';
  @IsString()
  idToken: string;
```

```typescript
// AFTER
import { IsString, MaxLength } from 'class-validator';
  @IsString()
  @MaxLength(4096)
  idToken: string;
```

(Google ID tokens are JWTs typically ~1–2 KB; 4096 covers real tokens while blocking a multi-MB DoS payload before it reaches `verifyIdToken`.)

### 2.6 `src/users/dto/create-user.dto.ts`

```typescript
// BEFORE
  @IsEmail()
  correo: string;
```

```typescript
// AFTER  (add import { LowerTrim } from '../../common/transforms';)
  @LowerTrim()
  @IsEmail()
  @MaxLength(254)
  correo: string;
```

(`nombre` already capped at 120 — optionally add `@Trim()`. `password` already 72.)

### 2.7 `src/cfdi/dto/emitir-cfdi.dto.ts`

```typescript
// BEFORE
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
  @IsString()
  pedidoId: string;
```

```typescript
// AFTER
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
  @IsUUID()
  pedidoId: string;
```

(`pedidoId` is a Prisma `@default(uuid())` id; `@IsUUID()` both validates format AND implicitly bounds length — no `@MaxLength` needed. Other fields already capped.)

### 2.8 `src/cfdi/dto/cancelar-cfdi.dto.ts`

```typescript
// BEFORE
import { IsEnum, IsOptional, IsString } from 'class-validator';
  @IsOptional()
  @IsString()
  uuidSustituye?: string;
```

```typescript
// AFTER
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
  @IsOptional()
  @IsUUID()
  uuidSustituye?: string;
```

(`uuidSustituye` is a CFDI folio fiscal UUID. `@IsString` is dropped — `@IsUUID` subsumes it. Keep `@IsOptional` first so absent values pass.)

### 2.9 `src/products/dto/query-product.dto.ts`

```typescript
// BEFORE
  @IsOptional()
  @IsString()
  search?: string;
```

```typescript
// AFTER  (add MaxLength to class-validator import; import { Trim } from '../../common/transforms';)
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  search?: string;
```

(Bounds the value that feeds the Prisma `contains` filter. `Trim` avoids leading/trailing-space mismatches in search.)

### 2.10 `src/products/dto/create-product.dto.ts`

Per-item caps on the two string arrays. `@MaxLength(n, { each: true })` applies the
cap to **each element**, not the array length.

```typescript
// BEFORE
  @IsArray()
  @IsString({ each: true })
  etiquetas?: string[];

  @IsArray()
  @IsString({ each: true })
  imagenes?: string[];
```

```typescript
// AFTER  (MaxLength already imported)
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  etiquetas?: string[];

  @IsArray()
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  imagenes?: string[];
```

(Tags are short labels → 100; image URLs can be long signed/CDN URLs → 512. `@IsOptional` already present on both.)

## Component 3 — Read-Side Email Normalization

**File:** `electric-kar/src/auth/auth.service.ts`

`LoginDto.correo` and the other email DTOs now arrive **already lowercased+trimmed**
(Component 2). But existing DB rows may be mixed-case/untrimmed (no backfill — see
non-goals). To guarantee both new normalized input AND legacy mixed-case rows
authenticate during the no-backfill window, the service must lowercase the lookup
value itself. We do NOT depend on the DTO transform alone because (a) `googleLogin`
receives `correo` from the Google payload, not a DTO, so no transform runs there, and
(b) belt-and-suspenders: lowercasing on the query side is idempotent for
already-lowercased DTO input.

> Gotcha — partial match only: lowercasing the **lookup** fixes "case in DB". It does
> NOT fix a legacy row stored as `Admin@X.com` when the input is `admin@x.com`,
> because Postgres `findUnique` on a case-sensitive unique column matches the stored
> bytes, not a lowercased projection. Full case-insensitive matching of legacy rows
> requires the deferred backfill (or a `citext`/functional index), which is a
> documented non-goal. What read-side lowercasing DOES guarantee: input is normalized
> consistently so new-vs-new and new-vs-already-lowercased-legacy logins work, and
> the duplicate-identity bypass is closed for all new writes.

### 3.1 `registerCliente` — existence check

```typescript
// BEFORE
  async registerCliente(dto: RegisterDto) {
    const existing = await this.prisma.cliente.findUnique({
      where: { correo: dto.correo },
    });
    ...
    const cliente = await this.prisma.cliente.create({
      data: { correo: dto.correo, ... },
    });
```

```typescript
// AFTER
  async registerCliente(dto: RegisterDto) {
    const correo = dto.correo.toLowerCase();
    const existing = await this.prisma.cliente.findUnique({
      where: { correo },
    });
    ...
    const cliente = await this.prisma.cliente.create({
      data: { correo, ... },          // store normalized
    });
```

(DTO already lowercases via `@LowerTrim`; the explicit `.toLowerCase()` makes the
service self-consistent and ensures the stored value is normalized even if the DTO
contract changes.)

### 3.2 `loginCliente`

```typescript
// BEFORE
    const cliente = await this.prisma.cliente.findUnique({
      where: { correo: dto.correo },
    });
```

```typescript
// AFTER
    const cliente = await this.prisma.cliente.findUnique({
      where: { correo: dto.correo.toLowerCase() },
    });
```

### 3.3 `forgotPassword`

```typescript
// BEFORE
  async forgotPassword(correo: string) {
    const cliente = await this.prisma.cliente.findUnique({ where: { correo } });
```

```typescript
// AFTER
  async forgotPassword(correo: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { correo: correo.toLowerCase() },
    });
```

### 3.4 `googleLogin` — lookup + create

```typescript
// BEFORE
    correo = payload?.email;
    ...
    let cliente = await this.prisma.cliente.findUnique({ where: { correo } });
    if (!cliente) {
      ...
      cliente = await this.prisma.cliente.create({
        data: { correo, nombre: nombre ?? correo, password },
      });
    }
```

```typescript
// AFTER
    correo = payload?.email?.toLowerCase();      // normalize the Google-provided email
    ...
    let cliente = await this.prisma.cliente.findUnique({ where: { correo } });
    if (!cliente) {
      ...
      cliente = await this.prisma.cliente.create({
        data: { correo, nombre: nombre ?? correo, password },
      });
    }
```

(Normalizing `correo` once right after extraction covers both the lookup and the
auto-create, keeping the Google path identical to the DTO paths.)

### 3.5 `loginUsuario` (panel)

```typescript
// BEFORE
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo },
    });
```

```typescript
// AFTER
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo.toLowerCase() },
    });
```

(Panel users (`Usuario`) created via `CreateUserDto` now store lowercased emails;
lowercasing the lookup keeps any pre-existing panel rows working too.)

## Component 4 — Schema `@db.VarChar(n)` + Migration

**File:** `electric-kar/prisma/schema.prisma`

The DB safety net. Caps chosen `>= corresponding DTO @MaxLength` AND comfortably
`>= any realistic existing value` so the `ALTER COLUMN ... TYPE varchar(n)` never
truncates a populated row (a populated value exceeding `n` makes the ALTER fail with
`ERROR: value too long for type character varying(n)`).

### Columns to cap

| Model | Column | Cap | Rationale (>= DTO cap, >= realistic value) |
|-------|--------|-----|---------------------------------------------|
| `Cliente` | `correo` | 254 | RFC 5321 max; matches DTO 254 |
| `Cliente` | `nombre` | 120 | matches `RegisterDto.nombre` cap |
| `Usuario` | `correo` | 254 | matches `CreateUserDto` cap |
| `Usuario` | `nombre` | 120 | matches `CreateUserDto.nombre` cap |
| `Producto` | `nombre` | 150 | matches `CreateProductDto.nombre` cap |
| `Producto` | `sku` | 60 | matches `CreateProductDto.sku` cap |
| `Cupon` | `codigo` | 40 | coupon codes are short; `> DEMO10` headroom |
| `Comprobante` | `receptorRfc` | 13 | RFC max length (matches DTO 13) |
| `Comprobante` | `receptorCp` | 10 | matches DTO cap |
| `DireccionEnvio` | `cp` | 10 | MX postal code = 5; 10 is safe headroom |

> SKU/codigo/correo/sku are `@unique` columns; capping the type does not affect the
> unique index (Postgres preserves it on an in-place type change).

### Columns deliberately NOT capped (free-text / internal)

- `Producto.descripcion` — long marketing copy; DTO already caps at 4000, keep `text`.
- `RegistroActividad.descripcion` — audit messages, internal, variable length → `text`.
- `Sesion.dispositivo` / `ip`, `RegistroActividad.ip` — user-agent strings vary wildly; leave `text`.
- `password` / hashes / tokens — bcrypt hash is fixed-ish but capping buys nothing and risks an ALTER failure on legacy data; leave `text`.

Over-tight caps on free-text invite future ALTER failures and truncation bugs for
zero security benefit (these are not DoS vectors — the DTO already bounds inbound
size where one exists). Keep the safety net on identity/index columns only.

### Schema snippet (BEFORE → AFTER)

```prisma
// BEFORE
model Cliente {
  nombre        String
  correo        String          @unique
}
model Usuario {
  nombre       String
  correo       String              @unique
}
model Producto {
  nombre            String
  sku               String         @unique
}
model Cupon {
  codigo           String      @unique
}
model Comprobante {
  receptorRfc       String
  receptorCp        String
}
model DireccionEnvio {
  cp        String
}
```

```prisma
// AFTER
model Cliente {
  nombre        String          @db.VarChar(120)
  correo        String          @unique @db.VarChar(254)
}
model Usuario {
  nombre       String              @db.VarChar(120)
  correo       String              @unique @db.VarChar(254)
}
model Producto {
  nombre            String         @db.VarChar(150)
  sku               String         @unique @db.VarChar(60)
}
model Cupon {
  codigo           String      @unique @db.VarChar(40)
}
model Comprobante {
  receptorRfc       String             @db.VarChar(13)
  receptorCp        String             @db.VarChar(10)
}
model DireccionEnvio {
  cp        String             @db.VarChar(10)
}
```

### Hand-written migration

**New file:** `electric-kar/prisma/migrations/<timestamp>_input_validation_varchar/migration.sql`
(use a timestamp newer than `20260609120000_pedido_creadoen_idx`, e.g.
`20260609170000_input_validation_varchar`).

```sql
-- Cap identity/index columns with varchar(n) as a DB-level safety net.
-- All caps are >= the corresponding DTO @MaxLength and >= any realistic value,
-- so these ALTERs do not truncate populated rows.
ALTER TABLE "Cliente"        ALTER COLUMN "nombre"      TYPE VARCHAR(120);
ALTER TABLE "Cliente"        ALTER COLUMN "correo"      TYPE VARCHAR(254);
ALTER TABLE "Usuario"        ALTER COLUMN "nombre"      TYPE VARCHAR(120);
ALTER TABLE "Usuario"        ALTER COLUMN "correo"      TYPE VARCHAR(254);
ALTER TABLE "Producto"       ALTER COLUMN "nombre"      TYPE VARCHAR(150);
ALTER TABLE "Producto"       ALTER COLUMN "sku"         TYPE VARCHAR(60);
ALTER TABLE "Cupon"          ALTER COLUMN "codigo"      TYPE VARCHAR(40);
ALTER TABLE "Comprobante"    ALTER COLUMN "receptorRfc" TYPE VARCHAR(13);
ALTER TABLE "Comprobante"    ALTER COLUMN "receptorCp"  TYPE VARCHAR(10);
ALTER TABLE "DireccionEnvio" ALTER COLUMN "cp"          TYPE VARCHAR(10);
```

> Confirm exact table/column casing against the existing baseline migration
> (`20260604134036_init/migration.sql`) before applying — Prisma quotes
> PascalCase identifiers. The names above follow the schema model/field names.

### Apply workflow (this env)

`prisma migrate dev` is interactive and fails in non-interactive shells here. Manual
workflow (per `CLAUDE.local.md`):

1. Write `electric-kar/prisma/migrations/<ts>_input_validation_varchar/migration.sql` by hand.
2. Edit `schema.prisma` (`@db.VarChar(n)` annotations above).
3. `pnpm prisma:deploy` (runs `migrate deploy` — non-interactive).
4. `pnpm prisma:generate` (regenerate the client into `src/generated/prisma`).

### Pre-flight check (recommended before deploy)

Because an ALTER fails if any existing value exceeds the cap, optionally verify first
(read-only, safe):

```sql
SELECT max(length("correo")) FROM "Cliente";
SELECT max(length("correo")) FROM "Usuario";
SELECT max(length("nombre")) FROM "Cliente";
-- ...repeat per capped column; each result must be <= chosen n.
```

If any `max(length)` exceeds the chosen cap, raise that cap (it must stay
`>= DTO @MaxLength`) or clean the data before deploying. This env's seed data is well
within all caps, so the ALTERs are expected to succeed cleanly.

## ADR Decisions

### ADR-1: Shared transform helpers as decorator factories
- **Decision:** `Trim()` / `LowerTrim()` in `src/common/transforms.ts`, each guarding non-string values.
- **Why:** DRY; single source for normalization; safe on optional fields.
- **Rejected:** inline `@Transform` per field (repetitive, error-prone), and a global interceptor that trims all strings (too broad — would silently mutate fields that must preserve whitespace, and is invisible at the DTO).

### ADR-2: Read-side lowercasing in the service, not reliance on storage normalization
- **Decision:** lowercase the lookup value in every email query (`loginCliente`, `loginUsuario`, `forgotPassword`, `registerCliente`, `googleLogin`).
- **Why:** Google path has no DTO; guarantees consistency during the no-backfill window; idempotent for DTO-normalized input. Closes the bypass for all new writes.
- **Rejected:** relying solely on `@LowerTrim` DTO storage normalization (misses the Google payload path, and a future caller bypassing the DTO would break).
- **Known limitation:** does not retroactively match legacy mixed-case rows (deferred backfill / `citext` — non-goal).

### ADR-3: `@IsUUID()` instead of `@IsString()` + `@MaxLength` for CFDI ids
- **Decision:** `@IsUUID()` on `pedidoId` and `uuidSustituye`.
- **Why:** these are UUIDs; `@IsUUID` validates format AND implicitly bounds length, so no separate cap is needed. Stronger guarantee than a length cap.
- **Rejected:** `@IsString` + `@MaxLength(36)` — accepts non-UUID garbage of the right length.

### ADR-4: Cap only identity/index columns at the DB; leave free-text as `text`
- **Decision:** `@db.VarChar` on correo/nombre/sku/codigo/rfc/cp; keep descriptions, audit text, IPs, hashes as `text`.
- **Why:** the safety net matters most on identity/unique columns; tight caps on free-text invite ALTER failures and truncation bugs with zero security upside (DTOs already bound inbound payloads).
- **Rejected:** capping every string column (high ALTER-failure risk on populated/variable columns, no benefit).

### ADR-5: No pipe change
- **Decision:** leave `ValidationPipe` as-is.
- **Why:** `transform: true` is already set, so `@Transform` runs automatically. Changing the pipe would be out of scope and risk regressions elsewhere.

## Risks & Gotchas Summary

| Risk / Gotcha | Mitigation |
|---------------|------------|
| Transform must run before validation | Guaranteed by `class-transformer` ordering under `transform: true`; cap stays in `@MaxLength`, not in the transform |
| Optional fields passed through transforms | `Trim`/`LowerTrim` are no-ops for non-string (undefined/null) — verified in helper code |
| `ALTER COLUMN TYPE varchar(n)` fails on oversized populated value | Caps chosen `>= DTO cap` and `>= realistic value`; optional pre-flight `max(length)` query |
| Read-side lowercasing does NOT match legacy mixed-case rows | Documented; full fix is the deferred backfill / `citext` (non-goal) |
| Google path has no DTO transform | Explicit `.toLowerCase()` on `payload.email` |
| `migrate dev` fails in this env | Manual workflow: hand-written `migration.sql` → `prisma:deploy` → `prisma:generate` |
| Dropping `@IsString` on `uuidSustituye` | `@IsUUID` subsumes it; `@IsOptional` kept first so absent values pass |

## Non-Goals Honored
- No frontend `maxlength` (backend is the gate).
- No CORS lockdown.
- No slug normalization / `@Matches` on slugs.
- No auth rate limiting.
- No bulk email backfill of existing rows (documented follow-up; unique constraint still rejects collisions at insert).
