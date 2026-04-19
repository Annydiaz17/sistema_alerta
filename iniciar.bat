@echo off
echo ============================================
echo   SaberAnalitica -- Iniciando servidor...
echo ============================================
echo.
echo Abre tu navegador en: http://localhost:8000
echo.
cd /d "%~dp0"
uvicorn backend.main:app --reload --port 8000 --host 0.0.0.0
pause
