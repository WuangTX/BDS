@echo off
chcp 65001 >nul
title Cap Nhat Ma Nguon & Giao Dien Moi Len GitHub
cd /d "%~dp0"

echo ====================================================================
echo   DANG DONG BO GIAO DIEN & BAO MAT MOI NHAT LEN GITHUB...
echo ====================================================================
echo.

git add -A
git commit -m "Cap nhat giao dien da thiet bi, sua Header & chong cache CSS cu"
git push

echo.
echo ====================================================================
echo   HOAN TAT! Cho ~25 giay de GitHub Actions cap nhat xong,
echo   sau do bam Ctrl + F5 tren trinh duyet de xem giao dien moi!
echo ====================================================================
pause
