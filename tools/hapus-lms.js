// Penghapus LMS IPAS (uninstall). Dijalankan oleh runtime\node.exe bawaan paket, yang bertanda tangan
// digital resmi, sehingga tidak diblokir Smart App Control Windows 11 (berbeda dengan .exe buatan sendiri).
// Dipanggil dari Settings → Apps → LMS IPAS → Uninstall, atau dari Start Menu "Hapus LMS IPAS".
// Pilihan baris perintah:  --diam (tanpa pertanyaan)   --data (ikut menghapus data sekolah)
'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execFileSync, spawn } = require('child_process');

const FOLDER = __dirname;
const KUNCI = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\LMS-IPAS';
const ATURAN = 'LMS IPAS (port 3000)';
const diam = process.argv.includes('--diam');
let hapusData = process.argv.includes('--data');

const W = { hijau: '\x1b[32m', merah: '\x1b[31m', kuning: '\x1b[33m', tebal: '\x1b[1m', redup: '\x1b[90m', biasa: '\x1b[0m' };
const tulis = (t = '') => process.stdout.write(t + '\n');

function tanya(soal) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((ok) => rl.question(soal, (j) => { rl.close(); ok(String(j || '').trim()); }));
}

function jalankan(cmd, args) { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }); } catch (e) { return ''; } }

// Lokasi Desktop & Start Menu yang sebenarnya (bisa dialihkan ke OneDrive), dibaca dari registri
function folderShell(nama) {
  const out = jalankan('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders', '/v', nama]);
  const m = out.match(/REG_(?:EXPAND_)?SZ\s+(.+)/);
  return m ? m[1].trim().replace(/%([^%]+)%/g, (_, v) => process.env[v] || '') : '';
}

function hentikanServer() {
  const nodeKita = path.join(FOLDER, 'runtime', 'node.exe').toLowerCase();
  const out = jalankan('powershell', ['-NoProfile', '-Command',
    "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | ForEach-Object { \"$($_.ProcessId)|$($_.ExecutablePath)\" }"]);
  let n = 0;
  for (const baris of out.split(/\r?\n/)) {
    const [pid, exe] = baris.split('|');
    if (!pid || Number(pid) === process.pid || !exe || exe.toLowerCase() !== nodeKita) continue;
    try { process.kill(Number(pid)); n++; } catch (e) { /* sudah berhenti */ }
  }
  return n;
}

function hapus(jalur) { try { fs.rmSync(jalur, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); return true; } catch (e) { return false; } }

async function main() {
  if (!fs.existsSync(path.join(FOLDER, 'server.js'))) { tulis('Folder ini bukan folder LMS IPAS: ' + FOLDER); return 1; }
  tulis(); tulis(`${W.tebal}${W.merah}  HAPUS LMS IPAS${W.biasa}`);
  tulis(`  Folder: ${FOLDER}`); tulis();

  if (!diam) {
    tulis('  Server LMS yang sedang berjalan akan dihentikan, lalu pintasan, izin firewall,');
    tulis('  dan berkas aplikasi dihapus.'); tulis();
    const lanjut = await tanya(`  Hapus LMS IPAS dari laptop ini? Ketik ${W.tebal}Y${W.biasa} lalu Enter (Enter saja = batal): `);
    if (lanjut.toLowerCase() !== 'y') { tulis('\n  Dibatalkan. Tidak ada yang dihapus.'); await tanya('\n  Tekan Enter untuk menutup...'); return 0; }
    tulis();
    tulis(`  ${W.kuning}Data sekolah${W.biasa} (akun guru, materi, soal, media yang diunggah) ada di folder "data".`);
    tulis(`  ${W.redup}Bila disimpan, data otomatis dipakai lagi saat LMS dipasang ke folder yang sama.${W.biasa}`);
    const d = await tanya(`  Ketik ${W.tebal}HAPUS DATA${W.biasa} untuk ikut menghapusnya, atau Enter saja untuk MENYIMPAN data: `);
    hapusData = d.toUpperCase() === 'HAPUS DATA';
    tulis();
  }

  const n = hentikanServer();
  tulis(`  ${W.hijau}✓${W.biasa} Server LMS dihentikan${n ? '' : ' (tidak sedang berjalan)'}`);

  for (const nama of ['Desktop', 'Programs']) {
    const f = folderShell(nama);
    for (const lnk of ['LMS IPAS.lnk', 'Hapus LMS IPAS.lnk']) if (f) hapus(path.join(f, lnk));
  }
  tulis(`  ${W.hijau}✓${W.biasa} Pintasan Desktop dan Start Menu dihapus`);

  if (!diam) {
    // Menutup izin firewall perlu izin Administrator (Windows akan bertanya)
    jalankan('powershell', ['-NoProfile', '-Command',
      `try { Start-Process netsh -ArgumentList 'advfirewall firewall delete rule name="${ATURAN}"' -Verb RunAs -WindowStyle Hidden -Wait } catch {}`]);
    tulis(`  ${W.hijau}✓${W.biasa} Izin firewall ditutup (jika diizinkan)`);
  }

  jalankan('reg', ['delete', KUNCI, '/f']);
  tulis(`  ${W.hijau}✓${W.biasa} Dihapus dari daftar Settings → Apps`);

  // Hapus semua isi folder kecuali runtime (sedang dipakai skrip ini) dan data (bila disimpan)
  for (const nama of fs.readdirSync(FOLDER)) {
    if (nama.toLowerCase() === 'runtime') continue;
    if (nama.toLowerCase() === 'data' && !hapusData) continue;
    hapus(path.join(FOLDER, nama));
  }
  // runtime\node.exe sedang berjalan: hapus setelah skrip ini selesai, lalu hapus folder bila kosong
  const sisa = `ping -n 3 127.0.0.1 >nul & rd /s /q "${path.join(FOLDER, 'runtime')}" & rd "${FOLDER}" 2>nul`;
  spawn('cmd.exe', ['/d', '/c', sisa], { cwd: path.dirname(FOLDER), detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true }).unref();
  tulis(`  ${W.hijau}✓${W.biasa} Berkas aplikasi dihapus`);
  tulis();
  if (hapusData) tulis(`  ${W.tebal}LMS IPAS dan semua data sekolah sudah dihapus.${W.biasa}`);
  else {
    tulis(`  ${W.tebal}LMS IPAS sudah dihapus.${W.biasa} Data sekolah tetap tersimpan di:`);
    tulis(`  ${path.join(FOLDER, 'data')}`);
  }
  if (!diam) await tanya('\n  Tekan Enter untuk menutup...');
  return 0;
}

main().then((k) => process.exit(k)).catch((e) => { tulis('Gagal menghapus: ' + e.message); process.exit(1); });
