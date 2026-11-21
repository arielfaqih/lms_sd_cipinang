@echo off
chcp 65001 >nul
title Izinkan akses LMS dari HP / laptop lain
rem Membuka port 3000 di Windows Firewall untuk SEMUA jenis jaringan (Private dan Public),
rem agar HP/laptop lain di Wi-Fi atau hotspot yang sama bisa membuka LMS tanpa internet.
rem Perlu izin Administrator (akan muncul pertanyaan "Izinkan aplikasi ini membuat perubahan?").

net session >nul 2>nul
if errorlevel 1 (
  echo   Meminta izin Administrator...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

netsh advfirewall firewall delete rule name="LMS IPAS (port 3000)" >nul 2>nul
netsh advfirewall firewall add rule name="LMS IPAS (port 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any >nul
if errorlevel 1 (
  echo.
  echo   GAGAL membuka port 3000. Coba klik kanan berkas ini, pilih "Run as administrator".
) else (
  echo.
  echo   BERHASIL. HP dan laptop lain di jaringan yang sama sekarang bisa membuka LMS.
  echo   Alamatnya tampil di jendela server dan di Beranda LMS, misalnya http://192.168.x.x:3000
  echo.
  echo   Jika masih tidak bisa: jaringan Wi-Fi kampus/kantor sering memblokir antarperangkat.
  echo   Pakai hotspot HP atau router Wi-Fi sekolah sendiri. Internet TIDAK diperlukan.
)
echo.
pause
