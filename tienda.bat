@echo off
cd /d "%~dp0electric-kar-front"
set NG_CLI_ANALYTICS=false
pnpm exec ng serve --port 4300 --no-hmr
pause
