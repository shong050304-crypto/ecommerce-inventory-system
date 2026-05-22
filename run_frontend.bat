@echo off
title Ecommerce System - Frontend Server
echo ============================================================
echo   Starting Vite/React Frontend Server...
echo ============================================================
echo.

rem Navigate to the frontend directory
cd %~dp0frontend

echo [i] Starting Vite dev server...
npm run dev

echo.
echo ============================================================
echo   Frontend server stopped.
echo ============================================================
pause
