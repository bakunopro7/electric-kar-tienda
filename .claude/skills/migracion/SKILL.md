---
name: migracion
description: Crea y aplica una migración de Prisma en este repo cuando `prisma migrate dev` no puede correr (entorno no interactivo). Úsala tras editar electric-kar/prisma/schema.prisma. Acepta el nombre de la migración como argumento.
---

# Migración Prisma (entorno no interactivo)

`prisma migrate dev` es interactivo y **falla** en shells no interactivos. Sigue este flujo manual para aplicar un cambio de `electric-kar/prisma/schema.prisma`.

Nombre de la migración: `$ARGUMENTS` (si está vacío, deriva uno corto en snake_case del cambio, p.ej. `add_resena`).

## Pasos

1. **Asegura el cambio en el schema** ya hecho en `electric-kar/prisma/schema.prisma`.

2. **Genera el timestamp** y la carpeta de migración:
   ```bash
   cd electric-kar
   TS=$(date +%Y%m%d%H%M%S)
   NAME="$ARGUMENTS"   # o el que derivaste
   mkdir -p "prisma/migrations/${TS}_${NAME}"
   ```

3. **Escribe `migration.sql`** dentro de esa carpeta con el DDL que corresponde al cambio del schema, siguiendo las convenciones de Prisma/PostgreSQL ya usadas en el repo (identificadores entre comillas dobles, `CREATE TABLE "X" (...)`, índices `CREATE INDEX/UNIQUE INDEX`, `ALTER TABLE "X" ADD COLUMN ...`). Mira migraciones previas en `prisma/migrations/` como referencia del estilo exacto. Tipos comunes: `TEXT`, `BOOLEAN ... DEFAULT`, `INTEGER`, `TIMESTAMP(3)`, `DECIMAL(12,2)`, `TEXT[]`.

4. **Aplica y regenera** (pnpm vive en `~/.local/bin`):
   ```bash
   ~/.local/bin/pnpm exec prisma migrate deploy
   ~/.local/bin/pnpm exec prisma generate
   ```

5. **Verifica** que compila: `~/.local/bin/pnpm run build`. Si tocaste el modelo, actualiza el seed (`prisma/seed.ts`, corre con `tsx`) si hace falta.

## Notas
- Si el cambio añade un índice `@unique` sobre datos existentes, valida que no haya duplicados antes (los `NULL` no chocan en Postgres).
- Reinicia el backend para que use el cliente nuevo: `fuser -k 3000/tcp` y `~/.local/bin/pnpm run start:prod`.
