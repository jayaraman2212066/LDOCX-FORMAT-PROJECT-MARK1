@echo off
title Stop LDOC Living Document Studio
echo Stopping all running instances of ldoc-server.exe...
taskkill /F /IM ldoc-server.exe >nul 2>&1
echo Done. LDOC Server stopped.
timeout /t 2 >nul
exit /b 0
