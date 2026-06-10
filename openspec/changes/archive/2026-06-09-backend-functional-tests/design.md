# Design: Backend Functional Tests (HTTP-through-AppModule against real Postgres)

## Technical Approach

Add a third test tier between mocked unit specs and Playwright UI e2e: real HTTP
requests through the **full `AppModule`** against a dedicated `electrickar_test`
Postgres DB. A `createTestApp()` helper replicates `main.ts` globals; a dedicated
`jest-functional.json` config (with the `moduleNameMapper` the e2e config omits)
runs `*.functional-spec.ts` files `--runInBand`. Reset is `TRUNCATE ... RESTART
IDENTITY CASCADE` between tests; a `seedBaseline()` helper creates the minimum
fixtures (one cliente, one ADMIN, two products) independent of the full
`prisma/seed.ts`. A new `backend-functional` CI job mirrors the existing `e2e`
job's conventions. First slice ships config + helpers + auth & products specs;
orders/clientes/cupones/cfdi specs and Stripe/Google are deferred (non-goals).

> Note: `proposal.md` is absent on disk; this design is grounded in `explore.md`
> plus verified source (see Risks).

## Architecture Decisions

| Decision | Choice | Rejected alternatives | Rationale |
|---|---|---|---|
| Test isolation | Dedicated `electrickar_test` DB + `TRUNCATE CASCADE` reset, `--runInBand` | (b) per-test tx rollback; (c) testcontainers; (d) pg-mem | Checkout runs its own `$transaction()` — an outer wrapping tx can't roll it back. CI already provides a Postgres service. pg-mem is incompatible with Prisma 7's raw-pg adapter. |
| App bootstrap | `createTestApp()` replicating `main.ts` (prefix `api` + ValidationPipe + `rawBody`) | Reuse scaffold `app.init()` | Scaffold omits prefix + pipes, so it hits the wrong path and bypasses validation — not a real exercise of the app. |
| DB pointer | Override `DATABASE_URL` in test env only | Change `PrismaService` | `PrismaService` reads `config.getOrThrow('DATABASE_URL')` with no fallback — env override is enough, zero code change. |
| Table enumeration | Dynamic query on `information_schema.tables` | Hardcode FK-ordered list | Survives schema drift; `CASCADE` handles FKs; one statement, no maintenance. |
| Token minting | Resolve real `JwtService` from the app and `.sign()` | Hand-roll JWT / hit login each time | Same secret + claim shape the real `JwtStrategy` validates; avoids per-test login round-trips for non-auth specs. |
| Jest config | Clone `jest-e2e.json` **+ `moduleNameMapper`** + `testRegex: .functional-spec.ts$` | Reuse `jest-e2e.json` as-is | e2e config lacks `moduleNameMapper` → silent Prisma `.js` ESM import failure. |

## Data Flow

    supertest(app) ──HTTP──> Nest pipeline (prefix /api + ValidationPipe)
         │                          │
         │                    Controller ──> Service ──> PrismaService
         │                                                    │
    Authorization: Bearer <token>                       electrickar_test (Postgres)
         │                                                    ▲
    generateToken(app) ── JwtService.sign() ─────────────────┘
    afterEach: truncateAll() + seedBaseline()

## File Changes

| File | Action | Description |
|---|---|---|
| `electric-kar/test/jest-functional.json` | Create | Functional jest config (see below). |
| `electric-kar/package.json` | Modify | Add `"test:functional"` script. |
| `electric-kar/test/functional/helpers/app.ts` | Create | `createTestApp()`. |
| `electric-kar/test/functional/helpers/db.ts` | Create | `truncateAll(prisma)`. |
| `electric-kar/test/functional/helpers/auth.ts` | Create | `generateToken(app, payload)`. |
| `electric-kar/test/functional/helpers/seed.ts` | Create | `seedBaseline(prisma)`. |
| `electric-kar/test/functional/auth.functional-spec.ts` | Create | Auth slice (deferred to tasks/apply). |
| `electric-kar/test/functional/products.functional-spec.ts` | Create | Products slice (deferred to tasks/apply). |
| `.github/workflows/ci.yml` | Modify | Add `backend-functional` job. |

## Interfaces / Contracts

### `test/jest-functional.json`
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".functional-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": { "^(\\.{1,2}/.+)\\.js$": "$1" }
}
```
`package.json` script:
```json
"test:functional": "jest --config ./test/jest-functional.json --runInBand"
```

### `test/functional/helpers/app.ts`
```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // Replicate src/main.ts globals (Swagger + static assets intentionally skipped).
  const app = moduleRef.createNestApplication({ rawBody: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}
```

### `test/functional/helpers/db.ts`
```ts
import { PrismaService } from '../../../src/prisma/prisma.service';

/** Wipe every table in the public schema (except Prisma's migration ledger). */
export async function truncateAll(prisma: PrismaService): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${list} RESTART IDENTITY CASCADE;`,
  );
}
```

### `test/functional/helpers/auth.ts`
```ts
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../../src/auth/strategies/jwt.strategy';

/** Sign a JWT with the app's real JwtService (same secret JwtStrategy validates). */
export function generateToken(app: INestApplication, payload: JwtPayload): string {
  return app.get(JwtService).sign(payload);
}

// Claim shapes (verified against auth.service.ts / jwt.strategy.ts):
//   cliente: { sub: cliente.id, correo, tipo: 'cliente' }            // NO rol
//   staff:   { sub: usuario.id, correo, tipo: 'usuario', rol: 'ADMIN' }
// Guards check tipo === 'cliente' (ClienteGuard) / tipo === 'usuario' + rol (RolesGuard).
```

### `test/functional/helpers/seed.ts`
```ts
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../src/prisma/prisma.service';

export const CLIENTE_PASSWORD = 'cliente123';
export const STAFF_PASSWORD = 'admin123';

/** Minimal baseline — NOT the full prisma/seed.ts. */
export async function seedBaseline(prisma: PrismaService) {
  // bcrypt.hash with the same SALT_ROUNDS (10) auth.service uses, so login compare passes.
  const clientePass = await bcrypt.hash(CLIENTE_PASSWORD, 10);
  const staffPass = await bcrypt.hash(STAFF_PASSWORD, 10);

  const cliente = await prisma.cliente.create({
    data: { nombre: 'Test Cliente', correo: 'cliente@test.mx', password: clientePass },
  });
  const staff = await prisma.usuario.create({
    data: { nombre: 'Test Admin', correo: 'admin@test.mx', password: staffPass, rol: 'ADMIN' },
  });
  const categoria = await prisma.categoria.create({
    data: { nombre: 'Test Cat', slug: 'test-cat' },
  });
  const marca = await prisma.marca.create({ data: { nombre: 'Test Marca', slug: 'test-marca' } });
  const productos = await Promise.all([
    prisma.producto.create({ data: { nombre: 'Prod A', sku: 'TST-A', precio: 100, existencias: 10, estado: 'PUBLICADO', categoriaId: categoria.id, marcaId: marca.id } }),
    prisma.producto.create({ data: { nombre: 'Prod B', sku: 'TST-B', precio: 200, existencias: 5, estado: 'PUBLICADO', categoriaId: categoria.id, marcaId: marca.id } }),
  ]);
  return { cliente, staff, categoria, marca, productos };
}
```

### `backend-functional` CI job (add to `.github/workflows/ci.yml`)
```yaml
  backend-functional:
    name: Backend (functional)
    runs-on: ubuntu-latest
    needs: [backend]
    defaults:
      run:
        working-directory: electric-kar
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: ek
          POSTGRES_PASSWORD: ek
          POSTGRES_DB: electrickar_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U ek"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 12
    env:
      DATABASE_URL: postgresql://ek:ek@localhost:5432/electrickar_test?schema=public
      JWT_SECRET: ci-test-secret
      JWT_EXPIRES_IN: 1d
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: electric-kar/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma:generate
      - run: pnpm prisma:deploy
      - run: pnpm test:functional
```

## Test Lifecycle (per spec file)

```
beforeAll:  app = await createTestApp(); prisma = app.get(PrismaService);
            // CI runs `prisma migrate deploy` before jest; locally schema must already exist.
beforeEach (or afterEach): await truncateAll(prisma); await seedBaseline(prisma);
afterAll:   await app.close();
```
- Seed **after** truncate so every test starts from the same known baseline.
- `--runInBand` is mandatory: all spec files share one `electrickar_test` DB;
  parallel jest workers would race on truncate/seed and corrupt each other's state.
- Special states (zero-stock product, expired coupon) are created inline per-test
  on top of the baseline, not added to `seedBaseline`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Functional (new) | Auth (register 201/409/400, login cliente+staff 200/401, `/me` 200/401), Products (list pagination, `:id` 200/404, `POST` 201 ADMIN / 401 / 403 cliente / 400) | supertest through `createTestApp()` against real DB |
| Unit (existing) | Service logic with mocked Prisma | Unchanged |
| E2E (existing) | UI flows | Playwright, unchanged |

## Migration / Rollout

No DB migration. `electrickar_test` is provisioned by the CI service + `prisma
migrate deploy`. Locally, the dev creates the DB once and runs `migrate deploy`.
Additive change: existing `backend`, `frontend`, `e2e` jobs untouched.

## Gotchas (must honor at apply time)

- **`moduleNameMapper` omission** → silent Prisma `.js` ESM import failure under
  ts-jest. `jest-functional.json` MUST include the mapper. Use the SCOPED pattern
  `{"^(\\.{1,2}/.+)\\.js$": "$1"}` (relative imports only) — the broad
  `^(.+)\\.js$` breaks `bignumber.js` inside `google-auth-library`. (W-2 fix.)
- **`createTestApp()` drift from `main.ts`** → must keep `rawBody`, `api` prefix,
  and the exact ValidationPipe flags in sync, or specs test a different app shape.
- **bcrypt hash matching** → seed cliente/staff passwords with `bcrypt.hash(pwd, 10)`
  (same `SALT_ROUNDS = 10` as `auth.service`) or login `bcrypt.compare` fails.
- **TRUNCATE CASCADE + RESTART IDENTITY** → CASCADE clears FK-linked rows; RESTART
  IDENTITY resets sequences so id-dependent assertions stay deterministic.
- **JWT claim shape** → staff uses `tipo: 'usuario'` (NOT `'staff'`) with `rol`;
  cliente uses `tipo: 'cliente'` with NO `rol`. Wrong shape silently 403s/401s.

## Open Questions

- [ ] Stripe/Google providers: `overrideProvider` vs exclude. First slice excludes
      those specs, so no override is needed yet (revisit when orders/payments land).
- [ ] Local DB bootstrap: document a `createdb electrickar_test` + `migrate deploy`
      step in the backend README (out of first-slice scope).
