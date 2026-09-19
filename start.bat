@echo off
title RIDDIM VAULT
color 0A

echo.
echo  ██████  ██ ██████  ██████  ██ ███    ███     ██    ██  █████  ██    ██ ██      ████████
echo  ██   ██ ██ ██   ██ ██   ██ ██ ████  ████     ██    ██ ██   ██ ██    ██ ██         ██
echo  ██████  ██ ██   ██ ██   ██ ██ ██ ████ ██     ██    ██ ███████ ██    ██ ██         ██
echo  ██   ██ ██ ██   ██ ██   ██ ██ ██  ██  ██      ██  ██  ██   ██ ██    ██ ██         ██
echo  ██   ██ ██ ██████  ██████  ██ ██      ██       ████   ██   ██  ██████  ████████   ██
echo.

echo [*] Backend baslatiliyor (Port 5000)...
start "Riddim Vault - Backend" cmd /k "cd /d "%~dp0server" && npm.cmd install --silent && node index.js"

timeout /t 3 /nobreak > nul

echo [*] Frontend baslatiliyor (Port 5173)...
start "Riddim Vault - Frontend" cmd /k "cd /d "%~dp0" && npm.cmd install --silent && npm.cmd run dev"

timeout /t 4 /nobreak > nul

echo.
echo [OK] Riddim Vault aciliyor: http://localhost:5173
echo.
start "" "http://localhost:5173"

pause
