@echo off
chcp 65001 >nul
title BDS Luxury Website & Studio App (Local Server)
cd /d "%~dp0"

echo ==============================================================
echo   KHOI DONG WEBSITE BAT DONG SAN VA UNG DUNG BDS STUDIO
echo ==============================================================
echo.
echo   [+] Website gioi thieu BDS : http://localhost:8080/index.html
echo   [+] App Quan tri BDS Studio: http://localhost:8080/studio.html
echo.
echo   Dang mo trinh duyet... (Nhan Ctrl + C de tat may chu)
echo ==============================================================

start "" "http://localhost:8080/index.html"
start "" "http://localhost:8080/studio.html"

python -m http.server 8080
pause
