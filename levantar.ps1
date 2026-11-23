# Levanta electrick-Kar desde cero en Windows.
#   .\levantar.bat              -> reinicio completo (BORRA los datos de la BD y del buscador)
#   .\levantar.bat -Conservar   -> recrea los contenedores pero conserva los datos
param([switch]$Conservar)

$ErrorActionPreference = 'Continue'
$raiz = $PSScriptRoot

function Paso($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Revisar($texto) {
  if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en: $texto" -ForegroundColor Red; exit 1 }
}

Paso 'Verificando Docker'
docker info *> $null
if ($LASTEXITCODE -ne 0) { Write-Host 'Docker no responde. Abre Docker Desktop y vuelve a ejecutar.' -ForegroundColor Red; exit 1 }

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Paso 'Instalando pnpm'
  npm install -g pnpm; Revisar 'instalar pnpm'
}

Paso 'Quitando contenedores antiguos'
Set-Location $raiz
if ($Conservar) { docker compose down --remove-orphans } else { docker compose down -v --remove-orphans }
docker rm -f electric-kar-db electric-kar-search *> $null
if (-not $Conservar) { docker volume rm electric_kar_pgdata electric_kar_typesense *> $null }

Paso 'Levantando PostgreSQL y Typesense'
docker compose up -d --force-recreate --wait; Revisar 'docker compose up'

Paso 'Backend: dependencias'
Set-Location "$raiz\electric-kar"
pnpm install; Revisar 'pnpm install (backend)'

Paso 'Backend: Prisma, datos demo e indice de busqueda'
pnpm prisma:generate; Revisar 'prisma:generate'
pnpm prisma:deploy;   Revisar 'prisma:deploy'
if (-not $Conservar) { pnpm db:seed; Revisar 'db:seed' }
pnpm search:reindex --rebuild; Revisar 'search:reindex'

Paso 'Frontend: dependencias'
Set-Location "$raiz\electric-kar-front"
pnpm install; Revisar 'pnpm install (frontend)'

Paso 'Arrancando API y tienda en ventanas nuevas'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$raiz\electric-kar'; pnpm start:dev"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$raiz\electric-kar-front'; `$env:NG_CLI_ANALYTICS='false'; pnpm exec ng serve --port 4300 --no-hmr"

Set-Location $raiz
Write-Host "`nListo:" -ForegroundColor Green
Write-Host '  API      http://localhost:3100/api   (Swagger: http://localhost:3100/docs)'
Write-Host '  Tienda   http://localhost:4300'
Write-Host '  Panel    http://localhost:4300/admin   admin@electrick-kar.mx / admin123'
