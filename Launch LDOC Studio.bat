@echo off
setlocal
title LDOC Living Document Studio
cd /d "%~dp0"

:: Check if native exe exists
if exist "LDOC-Studio.exe" (
    start "" "LDOC-Studio.exe"
    exit /b 0
)

:: Fallback if exe missing
set APP_DIR=%~dp0app
set SERVER_EXE=%APP_DIR%\ldoc-server.exe
if not exist "%SERVER_EXE%" (
    echo [ERROR] Server executable not found at: "%SERVER_EXE%"
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%SERVER_EXE%' -WorkingDirectory '%APP_DIR%' -WindowStyle Hidden"
timeout /t 1 /nobreak >nul
start msedge.exe --app="http://127.0.0.1:8080/" --user-data-dir="%LOCALAPPDATA%\LDOCStudio\AppProfile" --window-size=1440,900
exit /b 0
