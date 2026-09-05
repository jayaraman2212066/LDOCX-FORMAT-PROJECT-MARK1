@echo off
title LDOC Daily Promotion Engine
cd /d "%~dp0"
echo ============================================================
echo      LIVING DOCUMENT FORMAT (.ldocx) DAILY PROMOTER
echo ============================================================
echo.
echo Select an option:
echo [1] Preview Today's Campaign (Safe, No API calls)
echo [2] Publish Today's Campaign (Dev.to + Social Links)
echo [3] View Campaign Status & History
echo [4] Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    node scripts/daily-promoter.js --preview
    pause
    goto end
)
if "%choice%"=="2" (
    node scripts/daily-promoter.js
    pause
    goto end
)
if "%choice%"=="3" (
    node scripts/daily-promoter.js --status
    pause
    goto end
)

:end
