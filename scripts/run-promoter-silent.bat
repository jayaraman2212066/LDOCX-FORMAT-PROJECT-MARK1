@echo off
cd /d "d:\ANDROID_STD\PROJECT_CUSTOMER_WEBSITE\LDOCX-FORMAT-PROJECT-MARK1"
if not exist "logs" mkdir "logs"
"C:\Program Files\nodejs\node.exe" "scripts\auto-ad-scheduler.js" --post-next >> "logs\ad-scheduler.log" 2>&1
