@echo off
REM LDOC — Windows Release Build Script
REM Produces release binaries in dist\windows\

setlocal

set TARGET=x86_64-pc-windows-msvc
set DIST=dist\windows

echo [LDOC] Building release binaries for %TARGET%...
cargo build --release --target %TARGET% --target-dir target_fresh

if %ERRORLEVEL% neq 0 (
    echo [LDOC] Build FAILED
    exit /b 1
)

echo [LDOC] Copying binaries to %DIST%...
if not exist %DIST% mkdir %DIST%

copy /Y target_fresh\%TARGET%\release\ldoc.exe         %DIST%\ldoc.exe
copy /Y target_fresh\%TARGET%\release\ldoc-view.exe    %DIST%\ldoc-view.exe
copy /Y target_fresh\%TARGET%\release\ldoc-server.exe  %DIST%\ldoc-server.exe
copy /Y target_fresh\%TARGET%\release\ldoc-runtime.exe %DIST%\ldoc-runtime.exe

echo [LDOC] Running tests...
cargo test --target %TARGET% --target-dir target_fresh

if %ERRORLEVEL% neq 0 (
    echo [LDOC] Tests FAILED
    exit /b 1
)

echo.
echo [LDOC] Build complete. Binaries in %DIST%\
echo   ldoc.exe         — CLI (pack, validate, inspect, view, edit)
echo   ldoc-view.exe    — Viewer
echo   ldoc-server.exe  — REST API server (port 8080)
echo   ldoc-runtime.exe — Runtime CLI

endlocal
