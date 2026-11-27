# Membuat paket pemasangan Windows untuk sekolah lain:
#   dist\LMS-IPAS.zip        -> Extract All, lalu klik dua kali PASANG-LMS.bat (selalu lolos Smart App Control)
#   dist\LMS-IPAS-Setup.exe  -> installer berjendela (bisa diblokir Smart App Control karena belum bertanda tangan digital)
# Isi: aplikasi LMS + Node.js portabel (runtime\node.exe). Data sekolah (folder data\) TIDAK ikut.
# Jalankan dari folder proyek:  pwsh -File tools\buat-installer.ps1
# Butuh: Node.js 22.13+ terpasang (node.exe-nya ikut dikemas) dan .NET Framework 4 (bawaan Windows 10/11).
param([string]$NodeExe = '')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
$paket = Join-Path $dist 'paket'
Set-Location $root

Write-Host '1/5 Menyiapkan folder paket...'
if (Test-Path $paket) { Remove-Item -Recurse -Force $paket }
New-Item -ItemType Directory -Force $paket | Out-Null

foreach ($f in 'server.js', 'package.json', 'mulai-server.bat', 'izinkan-akses-jaringan.bat', 'PANDUAN.md', 'README.md') {
  Copy-Item (Join-Path $root $f) $paket
}
foreach ($d in 'src', 'public', 'seed') { Copy-Item -Recurse (Join-Path $root $d) (Join-Path $paket $d) }
# Buku panduan guru juga diletakkan langsung di folder paket agar mudah ditemukan
if (Test-Path (Join-Path $root 'public\panduan-guru.pdf')) { Copy-Item (Join-Path $root 'public\panduan-guru.pdf') (Join-Path $paket 'Buku Panduan Guru LMS IPAS.pdf') }
# node_modules tanpa alat uji (playwright-core)
Copy-Item -Recurse (Join-Path $root 'node_modules') (Join-Path $paket 'node_modules')
foreach ($x in 'node_modules\playwright-core', 'node_modules\.bin\playwright*') {
  Get-Item (Join-Path $paket $x) -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
}

Write-Host '2/5 Menyertakan Node.js portabel...'
if (-not $NodeExe) { $NodeExe = (& node -e "process.stdout.write(process.execPath)") }
$ver = (& $NodeExe -v)
if ([version]($ver.TrimStart('v')) -lt [version]'22.13.0') { throw "Node.js $ver terlalu lama. Butuh 22.13 atau lebih baru." }
New-Item -ItemType Directory -Force (Join-Path $paket 'runtime') | Out-Null
Copy-Item $NodeExe (Join-Path $paket 'runtime\node.exe')
Write-Host "    Node.js $ver dari $NodeExe"

Write-Host '3/5 Membuat ikon dan petunjuk...'
Add-Type -AssemblyName System.Drawing
function Gambar-Ikon([int]$n) {
  $bmp = New-Object System.Drawing.Bitmap $n, $n
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'
  $r = [single]($n * 0.22); $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $w = [single]($n - 1)
  $p.AddArc(0, 0, $r, $r, 180, 90); $p.AddArc($w - $r, 0, $r, $r, 270, 90)
  $p.AddArc($w - $r, $w - $r, $r, $r, 0, 90); $p.AddArc(0, $w - $r, $r, $r, 90, 90); $p.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 118, 110))), $p)
  $pena = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(230, 255, 255, 255)), ([single]($n * 0.045))
  $c = $n / 2; $ex = $n * 0.36; $ey = $n * 0.14
  foreach ($sudut in 0, 60, 120) {
    $st = $g.Save(); $g.TranslateTransform($c, $c); $g.RotateTransform($sudut)
    $g.DrawEllipse($pena, [single](-$ex), [single](-$ey), [single](2 * $ex), [single](2 * $ey)); $g.Restore($st)
  }
  $inti = $n * 0.1
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(250, 204, 21))), [single]($c - $inti), [single]($c - $inti), [single](2 * $inti), [single](2 * $inti))
  $g.Dispose(); $ms = New-Object System.IO.MemoryStream; $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  return , $ms.ToArray()
}
# Berkas .ico berisi gambar PNG (didukung Windows Vista ke atas)
$ukuran = 256, 48, 32, 16
$gambar = @(); foreach ($u in $ukuran) { $gambar += , (Gambar-Ikon $u) }
$ico = New-Object System.IO.MemoryStream; $bw = New-Object System.IO.BinaryWriter $ico
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$ukuran.Count)
$offset = 6 + 16 * $ukuran.Count
for ($i = 0; $i -lt $ukuran.Count; $i++) {
  $u = $ukuran[$i]; $b = if ($u -ge 256) { 0 } else { $u }
  $bw.Write([byte]$b); $bw.Write([byte]$b); $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$gambar[$i].Length); $bw.Write([uint32]$offset)
  $offset += $gambar[$i].Length
}
foreach ($d in $gambar) { $bw.Write($d) }
$bw.Flush(); [System.IO.File]::WriteAllBytes((Join-Path $paket 'lms.ico'), $ico.ToArray())
$logo = Join-Path $dist 'logo.png'
[System.IO.File]::WriteAllBytes($logo, $gambar[0])

# Kompilasi installer C# dengan csc.exe bawaan .NET Framework 4
$fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
if (-not (Test-Path (Join-Path $fw 'csc.exe'))) { $fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319' }
$csc = Join-Path $fw 'csc.exe'
function Kompilasi([string]$keluar, [string[]]$resource) {
  if (Test-Path $keluar) { Remove-Item -Force $keluar }
  $argumen = @('/nologo', '/target:winexe', '/optimize+', '/codepage:65001', "/out:$keluar", "/win32icon:$(Join-Path $paket 'lms.ico')",
    "/r:$(Join-Path $fw 'System.IO.Compression.dll')", "/r:$(Join-Path $fw 'System.IO.Compression.FileSystem.dll')", '/r:System.Windows.Forms.dll', '/r:System.Drawing.dll')
  foreach ($r in $resource) { $argumen += "/resource:$r" }
  $argumen += (Join-Path $PSScriptRoot 'installer\Pemasang.cs')
  & $csc @argumen
  if ($LASTEXITCODE -ne 0) { throw "Kompilasi $keluar gagal." }
}
# Penghapus (uninstall) dijalankan oleh runtime\node.exe yang bertanda tangan resmi (lolos Smart App Control)
Copy-Item (Join-Path $PSScriptRoot 'hapus-lms.js') $paket
# Pemasang untuk paket ZIP (jalur yang selalu lolos Smart App Control)
Copy-Item (Join-Path $PSScriptRoot 'pasang-lms.js') $paket
# Pemulih akses Admin bila kata sandinya lupa (hanya bisa dijalankan di laptop server)
Copy-Item (Join-Path $PSScriptRoot 'reset-sandi-admin.js') $paket
$batReset = "@echo off`r`nchcp 65001 >nul`r`ntitle Reset kata sandi Admin LMS IPAS`r`ncd /d `"%~dp0`"`r`n`"%~dp0runtime\node.exe`" `"%~dp0reset-sandi-admin.js`"`r`n"
[System.IO.File]::WriteAllText((Join-Path $paket 'reset-sandi-admin.bat'), $batReset, (New-Object System.Text.ASCIIEncoding))
$bat = "@echo off`r`nchcp 65001 >nul`r`ntitle Pasang LMS IPAS`r`n`"%~dp0runtime\node.exe`" `"%~dp0pasang-lms.js`" %*`r`n"
[System.IO.File]::WriteAllText((Join-Path $paket 'PASANG-LMS.bat'), $bat, (New-Object System.Text.ASCIIEncoding))

$versi = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
@"
LMS IPAS (bagian IPA) Kelas 4-6 - versi $versi
=================================================

MEMBUKA LMS
  Klik dua kali pintasan "LMS IPAS" di Desktop (atau mulai-server.bat di folder ini).
  Jendela hitam = server. JANGAN DITUTUP selama LMS dipakai.
  Browser terbuka otomatis ke http://localhost:3000

MASUK PERTAMA KALI (wajib ganti kata sandi)
  Admin : admin / admin123
  Guru  : guru / guru123

MEMBUKA DARI HP / LAPTOP LAIN / SMARTBOARD (tanpa internet)
  1. Sambungkan semua perangkat ke Wi-Fi sekolah atau hotspot HP yang SAMA.
  2. Di Beranda LMS, klik "Buka di HP atau perangkat lain", lalu pindai kode QR.
  3. Jika tidak bisa dibuka: klik dua kali izinkan-akses-jaringan.bat, lalu klik Yes.
     Wi-Fi kampus/kantor sering memblokir antarperangkat; pakai hotspot HP.

MENGHAPUS (UNINSTALL)
  Settings > Apps > Installed apps > LMS IPAS > Uninstall  (atau Start Menu > Hapus LMS IPAS).
  Data sekolah disimpan, kecuali Anda mengetik HAPUS DATA.

INTERNET hanya dibutuhkan untuk fitur "Buat soal dengan AI".
Panduan bergambar untuk guru (cara pakai, pencegahan, kalau ada masalah, FAQ):
  Buku Panduan Guru LMS IPAS.pdf  (juga ada di LMS: menu Panduan Singkat)
"@ | Set-Content -Encoding UTF8 (Join-Path $paket 'BACA-DULU.txt')

Write-Host '4/5 Memadatkan paket (zip)...'
$zip = Join-Path $dist 'paket.zip'
if (Test-Path $zip) { Remove-Item -Force $zip }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($paket, $zip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Write-Host '5/5 Mengompilasi installer...'
$exe = Join-Path $dist 'LMS-IPAS-Setup.exe'
Kompilasi $exe @("$zip,paket.zip", "$logo,logo.png")
Remove-Item -Force $zip, $logo
Write-Host '    + paket ZIP...'
$zipBagi = Join-Path $dist 'LMS-IPAS.zip'
if (Test-Path $zipBagi) { Remove-Item -Force $zipBagi }
$arsip = [System.IO.Compression.ZipFile]::Open($zipBagi, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem $paket -Recurse -File | ForEach-Object {
    $rel = 'LMS-IPAS/' + $_.FullName.Substring($paket.Length + 1).Replace('\', '/')
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($arsip, $_.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal)
  }
} finally { $arsip.Dispose() }

$mb = [math]::Round((Get-Item $exe).Length / 1MB, 1)
$mbZip = [math]::Round((Get-Item $zipBagi).Length / 1MB, 1)
Write-Host ''
Write-Host "Selesai:"
Write-Host "  $zipBagi ($mbZip MB)  <- kirim yang ini (paling aman)"
Write-Host "  $exe ($mb MB)"
Write-Host 'Kirim lewat Google Drive / WhatsApp dokumen / flashdisk.'
