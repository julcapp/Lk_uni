@echo off
setlocal
cd /d "%~dp0"
echo ВНИМАНИЕ: демонстрационные данные будут удалены.
choice /C YN /M "Продолжить"
if errorlevel 2 exit /b 0
docker compose -f docker-compose.demo.yml down -v --remove-orphans
if errorlevel 1 (
  echo Не удалось удалить демонстрационное окружение.
  pause
  exit /b 1
)
docker compose -f docker-compose.demo.yml up -d
if errorlevel 1 (
  echo Не удалось повторно запустить Lk_uni Demo.
  pause
  exit /b 1
)
echo Демонстрационная база создана заново.
start "" http://localhost:3000/health
endlocal
