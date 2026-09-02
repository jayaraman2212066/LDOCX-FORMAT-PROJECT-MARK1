@echo off
title Create LDOC Studio Desktop Shortcut
echo.
echo ============================================================
echo   Creating Desktop Shortcut for LDOC Living Document Studio
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Create-Desktop-Shortcut.ps1"

echo.
timeout /t 3 >nul
exit /b 0
