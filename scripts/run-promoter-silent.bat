@echo off
cd /d "d:\ANDROID_STD\PROJECT_CUSTOMER_WEBSITE\LDOCX-FORMAT-PROJECT-MARK1"
if not exist "logs" mkdir "logs"
echo [%date% %time%] Daily Promotion Runner triggered >> "logs\ad-scheduler.log"

rem Force clean switch to freemium-desktop-suite so uncommitted edits on other branches cannot block it
git checkout -f freemium-desktop-suite >> "logs\ad-scheduler.log" 2>&1

if not exist "scripts\auto-ad-scheduler.js" (
    echo [%date% %time%] ERROR: scripts\auto-ad-scheduler.js not found! >> "logs\ad-scheduler.log"
    exit /b 1
)

"C:\Program Files\nodejs\node.exe" "scripts\auto-ad-scheduler.js" --post-next >> "logs\ad-scheduler.log" 2>&1
echo [%date% %time%] Daily Promotion Runner finished with exit code %errorlevel% >> "logs\ad-scheduler.log"

