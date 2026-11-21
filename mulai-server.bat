@echo off
chcp 65001 >nul
title LMS IPAS SDN Cipinang II - JANGAN DITUTUP selama LMS dipakai
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js belum terpasang di laptop ini.
  echo   Pasang Node.js versi LTS, lalu jalankan berkas ini lagi. Lihat PANDUAN.md bagian 2.
  echo.
  pause
  exit /b 1
)
set PORT=3000
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"
node server.js
echo.
echo   Server berhenti.
pause
