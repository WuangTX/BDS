@echo off
chcp 65001 >nul
title Ket Noi & Day Ma Nguon Lan Dau Len GitHub
cd /d "%~dp0"

echo ====================================================================
echo   KET NOI KHO LUU TRU GITHUB LAN DAU TIEN (CHI CAN CHAY 1 LAN!)
echo   Sau lan nay, moi du an moi deu tao & xuat ban ngay tren BDS Studio
echo   ma KHONG CAN dung git push nua!
echo ====================================================================
echo.
echo Buoc 1: Hay tao 1 Repository trong tren https://github.com/new
echo         (Vi du: https://github.com/ten-ban/bds-luxury.git)
echo.
set /p REPO_URL="Dan duong dan GitHub Repository cua ban vao day: "

if "%REPO_URL%"=="" (
  echo Ban chua nhap duong dan Repository.
  pause
  exit /b 1
)

git branch -M main
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git add -A
git commit -m "Khoi tao Website Bat Dong San Luxury & Ung dung BDS Studio" 2>nul
echo.
echo Dang day du lieu khoi tao len GitHub...
git push -u origin main

echo.
echo ====================================================================
echo   HOAN TAT! Tiep theo:
echo   1. Tren GitHub Repo, vao Settings -^> Pages -^> Source chon "GitHub Actions"
echo   2. Sau ~30 giay, truy cap Website va App Studio cua ban!
echo   3. Nhap Token 1 lan trong muc "Ket noi GitHub" cua BDS Studio de
echo      tu nay ve sau chi can bam 1 nut "Xuat ban len Website"!
echo ====================================================================
pause
