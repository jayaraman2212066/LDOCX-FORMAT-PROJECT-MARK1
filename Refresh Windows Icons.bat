@echo off
title Refreshing Windows Icon Cache
echo Closing Windows Explorer...
taskkill /f /im explorer.exe >nul 2>&1
ping -n 2 127.0.0.1 >nul

echo Deleting cached icon and thumbnail databases...
del /f /q "%localappdata%\IconCache.db" >nul 2>&1
del /f /q "%localappdata%\Microsoft\Windows\Explorer\iconcache*.db" >nul 2>&1
del /f /q "%localappdata%\Microsoft\Windows\Explorer\thumbcache*.db" >nul 2>&1
rd /s /q "%localappdata%\LDOCStudio\AppProfile" >nul 2>&1

echo Restarting Windows Explorer...
start explorer.exe

echo Updating desktop shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Create-Desktop-Shortcut.ps1"

echo Done! The icons have been refreshed.
