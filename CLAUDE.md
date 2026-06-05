# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo
- `electric-kar/` — backend API (**NestJS 11 + Prisma 7 + PostgreSQL**).
- `electric-kar-front/` — frontend (**Angular 21** standalone + signals + **Tailwind v4**).

Run commands from inside each project's folder. `@DOCUMENTACION.md` has the full architecture, entities and endpoints.

## pnpm
`pnpm` is installed at `~/.local/bin` and is **not on PATH** — invoke it as `~/.local/bin/pnpm`. For tools that shell out to `pnpm` (e.g. Angular CLI install steps), prefix `PATH="$HOME/.local/bin:$PATH"`.

## Commands
Backend (`electric-kar/`):
- Dev: `pnpm start` (nest start, port 3000, global prefix `/api`, Swagger at `/docs`). Prod: `pnpm build` then `pnpm start:prod`.
- DB: `pnpm prisma:generate` (run after **any** `schema.prisma` change), `pnpm prisma:migrate` (create+apply migration), `pnpm db:seed` (uses **tsx**, not ts-node), `pnpm prisma:studio`.
- Quality: `pnpm lint`, `pnpm format` (Prettier), `pnpm test` (Jest).

Frontend (`electric-kar-front/`): `pnpm start` (ng serve, port 4200), `pnpm build`, `pnpm test`.

## Prisma 7 (gotchas)
- Client is generated to `electric-kar/src/generated/prisma` with `moduleFormat = "cjs"`. Always `pnpm prisma:generate` after editing the schema.
- Connection uses a **driver adapter** (`@prisma/adapter-pg`); `PrismaService` builds it from `DATABASE_URL`.
- The seed runs with **tsx** because ts-node can't resolve Prisma 7's `.js`-extension imports.

## Conventions
- **Prisma schema is in Spanish** (`Producto`, `Pedido`, `Cliente`, enums like `EstadoPedido`). Frontend folders/routes are mostly English; newer entities are Spanish (`marcas`, `cupones`, `cfdi`, `blog`…).
- **Two auth principals** via the JWT `tipo` claim: `Cliente` (storefront) and `Usuario` (panel, with `Rol` SUPER/ADMIN/VENDEDOR/CONTADOR). Guards: `JwtAuthGuard`, `ClienteGuard`, `RolesGuard`.
- Frontend **admin** requests attach the staff token via `adminContext()` (HttpContext); storefront requests use the default (cliente) token.
- New native deps must be **direct dependencies** — pnpm doesn't expose transitive ones (e.g. `multer`, `stripe`).
- México: CFDI 4.0 timbrado is **simulated** (no PAC); Stripe/Google/SPEI use env-var placeholders until real keys exist.

## Git
GitFlow: `develop` is the default branch, `main` is protected (PR-only). Feature work goes on `feature/*` branches off `develop`.
