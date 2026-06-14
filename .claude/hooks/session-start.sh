#!/bin/bash
# SessionStart hook — prepara el entorno para Claude Code on the web.
# Instala dependencias de ambos proyectos (pnpm) y genera el cliente Prisma
# del backend para que tests y linters funcionen desde el inicio de la sesión.
set -euo pipefail

# Solo en el entorno remoto (web); en local no tocamos nada.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# pnpm vía corepack si no está disponible.
if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi

echo "[session-start] Backend (electric-kar): instalando dependencias…"
cd "$ROOT/electric-kar"
pnpm install --prefer-offline
echo "[session-start] Backend: generando cliente Prisma…"
pnpm prisma:generate

echo "[session-start] Frontend (electric-kar-front): instalando dependencias…"
cd "$ROOT/electric-kar-front"
pnpm install --prefer-offline

echo "[session-start] Entorno listo."
