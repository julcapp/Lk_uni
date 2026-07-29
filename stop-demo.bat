@echo off
setlocal
cd /d "%~dp0"
docker compose -f docker-compose.demo.yml down
if errorlevel 1 (
  echo Не удалось остановить Lk_uni Demo.
  pause
  exit /b 1
)
echo Lk_uni Demo остановлен.
endlocal
