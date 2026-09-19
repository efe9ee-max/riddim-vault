@echo off
title GitHub'a Yukle - Riddim Vault
color 0B
echo.
echo ========================================================
echo   Riddim Vault - GitHub'a Yukleniyor...
echo ========================================================
echo.
echo Tarayicinizda GitHub onay penceresi acilirsa "Sign in" tiklayin.
echo.
set "PATH=C:\Program Files\Git\cmd;%PATH%"
cd /d "%~dp0"
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    color 0A
    echo [BASARILI] Projeniz GitHub'a basariyla yuklendi!
) else (
    color 0C
    echo [HATA] Yukleme sirasinda bir sorun olustu.
)
echo.
pause
