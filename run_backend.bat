@echo off
title Ecommerce System - Backend Server
echo ============================================================
echo   Starting Flask Backend Server...
echo ============================================================
echo.

rem Navigate to the backend directory
cd /d "%~dp0backend"

rem Detect and activate virtual environment
if exist venv\Scripts\activate.bat (
    echo [i] Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo [!] No virtual environment [venv] found, using system python.
)

echo.
echo [i] Running app.py...
python app.py

echo.
echo ============================================================
echo   Backend server stopped.
echo ============================================================
pause
