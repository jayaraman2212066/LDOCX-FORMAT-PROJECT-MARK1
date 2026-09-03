@echo off
title LDOCX Safe Rollback & Restore
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0LDOC_TOOLS\Restore-Backup.ps1"
pause
