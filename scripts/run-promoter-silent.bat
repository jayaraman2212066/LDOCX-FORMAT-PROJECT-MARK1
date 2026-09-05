@echo off
cd /d "d:\ANDROID_STD\PROJECT_CUSTOMER_WEBSITE\LDOCX-FORMAT-PROJECT-MARK1"
if not exist "logs" mkdir "logs"
node "scripts\daily-promoter.js" >> "logs\daily-promotions.log" 2>&1
