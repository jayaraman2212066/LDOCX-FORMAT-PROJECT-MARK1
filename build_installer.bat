@echo off
setlocal
title LDOC Studio — Build Installer

echo.
echo ============================================================
echo  LDOC Studio — Build + Package Installer
echo ============================================================
echo.

:: ── Step 1: Build Rust release ──────────────────────────────────────────────
echo [1/4] Building Rust release...
cd /d "%~dp0source"
cargo build --release --target x86_64-pc-windows-msvc
if errorlevel 1 (
    echo ERROR: Rust build failed.
    pause & exit /b 1
)
echo       Build OK.
echo.

:: ── Step 2: Copy fresh binaries ──────────────────────────────────────────────
echo [2/4] Copying binaries to app\...
set SRC=target\x86_64-pc-windows-msvc\release
set DST=%~dp0app

copy /Y "%SRC%\ldoc-launcher.exe"   "%DST%\ldoc-launcher.exe"   >nul
copy /Y "%SRC%\ldoc-server.exe"     "%DST%\ldoc-server.exe"     >nul
copy /Y "%SRC%\ldoc-mcp-ai.exe"     "%DST%\ldoc-mcp-ai.exe"     >nul
copy /Y "%SRC%\ldoc.exe"            "%DST%\ldoc.exe"            >nul
copy /Y "%SRC%\ldoc-view.exe"       "%DST%\ldoc-view.exe"       >nul
copy /Y "%SRC%\viewer\ai-brain.png" "%DST%\viewer\ai-brain.png" >nul 2>nul
echo       Binaries copied.
echo.

:: ── Step 3: Check prerequisites ──────────────────────────────────────────────
echo [3/4] Checking prerequisites...
cd /d "%~dp0"

:: Check vc_redist exists
if not exist "redist\vc_redist.x64.exe" (
    echo ERROR: redist\vc_redist.x64.exe not found.
    echo   Run this to download it:
    echo   powershell -command "Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vc_redist.x64.exe' -OutFile 'redist\vc_redist.x64.exe' -UseBasicParsing"
    pause & exit /b 1
)
echo       vc_redist.x64.exe OK.

:: Check NSIS
where makensis >nul 2>nul
if errorlevel 1 (
    :: Try common install paths
    if exist "C:\Program Files (x86)\NSIS\makensis.exe" (
        set "MAKENSIS=C:\Program Files (x86)\NSIS\makensis.exe"
    ) else if exist "C:\Program Files\NSIS\makensis.exe" (
        set "MAKENSIS=C:\Program Files\NSIS\makensis.exe"
    ) else (
        echo ERROR: NSIS not found.
        echo   Download from: https://nsis.sourceforge.io/Download
        echo   Also install EnVar plugin: https://nsis.sourceforge.io/EnVar_plug-in
        pause & exit /b 1
    )
) else (
    set "MAKENSIS=makensis"
)
echo       NSIS OK.
echo.

:: ── Step 4: Run NSIS ─────────────────────────────────────────────────────────
echo [4/4] Building installer with NSIS...
"%MAKENSIS%" installer.nsi
if errorlevel 1 (
    echo ERROR: NSIS packaging failed.
    pause & exit /b 1
)

echo.
echo ============================================================
echo  Done!  LDOC-Studio-Setup.exe is ready in the project root
echo ============================================================
echo.
pause
