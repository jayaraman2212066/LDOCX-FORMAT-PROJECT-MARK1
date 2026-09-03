@echo off
title LDOCX Safe Rollback & Restore
echo ========================================================
echo   LDOCX ECOSYSTEM - SAFE ROLLBACK ENGINE
echo ========================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Restore-Backup.ps1"
pause
