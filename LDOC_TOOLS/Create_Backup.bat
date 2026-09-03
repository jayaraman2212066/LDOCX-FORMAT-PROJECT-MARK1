@echo off
title LDOCX Project Backup
echo ========================================================
echo   LDOCX ECOSYSTEM - AUTOMATED BACKUP CHECKPOINT
echo ========================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File %~dp0Create-Backup.ps1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Backup process encountered an issue.
)
pause
