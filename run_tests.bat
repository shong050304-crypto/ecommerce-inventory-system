@echo off
title Ecommerce System - Automated Tests
echo ============================================================
echo   Starting Automated Test Suite (pytest)...
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
echo [i] Installing test dependencies...
python -m pip install pytest requests

echo.
echo [i] Running pytest tests...
python -m pytest tests/ -v -s

echo.
echo ============================================================
echo   Test suite execution complete.
echo   All test data has been automatically cleaned up.
echo ============================================================
pause
