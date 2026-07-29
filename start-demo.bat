@echo off
setlocal
cd /d "%~dp0"
where docker >nul 2>nul
if errorlevel 1 (
  echo Docker не найден. Установите и запустите Docker Desktop.
  pause
  exit /b 1
)
docker compose -f docker-compose.demo.yml up -d
if errorlevel 1 (
  echo Не удалось запустить Lk_uni Demo.
  pause
  exit /b 1
)
echo.
echo Lk_uni Demo запускается.
echo API: http://localhost:3000
echo Проверка: http://localhost:3000/health
echo.
start "" http://localhost:3000/health
endlocal
