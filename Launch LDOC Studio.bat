@echo off
REM LDOC Studio - Quick Launcher
REM Double-click this file to launch LDOC Studio as a Windows Application

cd /d "%~dp0"

REM Launch using PowerShell for better experience
powershell -NoProfile -ExecutionPolicy Bypass -File "LDOC_TOOLS\Launch-LDOC-Studio.ps1"

REM If PowerShell is unavailable, fallback to batch
REM LDOC_TOOLS\LAUNCH_LDOC_STUDIO.bat

pause
