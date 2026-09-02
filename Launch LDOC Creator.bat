@echo off
setlocal
title LDOC Document Creator
cd /d "%~dp0"

if exist "LDOC-Creator.exe" (
    start "" "LDOC-Creator.exe"
    exit /b 0
)

if exist "LDOC-Studio.exe" (
    start "" "LDOC-Studio.exe" --creator
    exit /b 0
)

start msedge.exe --app="http://127.0.0.1:8080/creator.html" --user-data-dir="%LOCALAPPDATA%\LDOCStudio\AppProfile" --window-size=1440,900
exit /b 0
