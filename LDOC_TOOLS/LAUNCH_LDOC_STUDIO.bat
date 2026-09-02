@echo off
REM LDOC Studio - Windows Desktop App Launcher
REM Starts the server and opens the application

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
set "SERVER_EXE=%SCRIPT_DIR%..\app\ldoc-server.exe"
set "ICON=%SCRIPT_DIR%..\app\viewer\icon.ico"

REM Check if server exists
if not exist "%SERVER_EXE%" (
    echo LDOC Server not found at: %SERVER_EXE%
    echo Please ensure the application is properly installed.
    pause
    exit /b 1
)

REM Kill any existing server instances
taskkill /IM ldoc-server.exe /F >nul 2>&1

REM Start the server in background (hidden window)
start /b "" "%SERVER_EXE%"

REM Wait for server to start
timeout /t 2 /nobreak >nul

REM Open the application in browser using Windows registry for a better experience
REM Create a VBScript to open in default browser with better window title
powershell -Command "Start-Process 'http://127.0.0.1:8080/' -WindowStyle Maximized"

REM Keep launcher running to handle cleanup on exit
:wait_for_close
timeout /t 30 >nul
tasklist /FI "IMAGENAME eq ldoc-server.exe" 2>nul | find /I /N "ldoc-server.exe">nul
if "%ERRORLEVEL%"=="0" goto wait_for_close

REM Cleanup when app closes
taskkill /IM ldoc-server.exe /F >nul 2>&1
exit /b 0
