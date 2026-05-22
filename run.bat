@echo off
title Ecommerce Order and Inventory System - Startup Launcher
echo ============================================================
echo   Starting E-commerce System (Frontend + Backend + Browser)
echo ============================================================
echo.

rem 1. Start backend in a new window
echo [1/3] Starting backend Flask server...
start "Ecommerce Backend (Port 3000)" cmd /c "%~dp0run_backend.bat"

rem 2. Start frontend in a new window
echo [2/3] Starting frontend Vite server...
start "Ecommerce Frontend (Port 5173)" cmd /c "%~dp0run_frontend.bat"

rem 3. Wait for services to initialize, then open the browser
echo [3/3] Waiting for services to initialize (3 seconds)...
timeout /t 3 /nobreak >nul

echo.
echo [i] Opening system browser...
start http://localhost:5173

echo.
echo ============================================================
echo   All services started successfully!
echo   - Backend API: http://localhost:3000/api
echo   - Frontend:    http://localhost:5173
echo.
echo   [Note] To stop the system, close the two popped-up windows.
echo ============================================================
timeout /t 5
