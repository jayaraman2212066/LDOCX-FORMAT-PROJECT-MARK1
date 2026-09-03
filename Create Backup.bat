@echo off
title LDOCX Project Backup
powershell.exe -NoProfile -ExecutionPolicy Bypass -File %~dp0LDOC_TOOLS\Create-Backup.ps1
pause
