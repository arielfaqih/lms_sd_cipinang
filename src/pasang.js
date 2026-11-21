// Pemasangan LibreOffice otomatis (untuk konversi PPT → PDF) di Windows.
// Butuh internet (unduhan ± 380 MB) dan mungkin muncul jendela izin Windows (UAC) di laptop server.
// Langkah 1: winget. Bila unduhan winget gagal (mis. galat sertifikat 0x80072f19 di jaringan sekolah),
// langkah 2: unduh installer resmi dengan curl, periksa tanda tangan digital, lalu pasang dengan msiexec.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const state = { status: 'idle', pesan: '', mulai: 0, selesai: 0, log: '' };
const simpan = (d) => { state.log = (state.log + d.toString()).slice(-6000); };

function adaWinget() {
  if (process.platform !== 'win32') return false;
  try { return spawnSync('winget', ['--version'], { windowsHide: true, timeout: 8000 }).status === 0; } catch (e) { return false; }
}

function jalankan(cmd, args) {
  return new Promise((resolve) => {
    let p;
    try { p = spawn(cmd, args, { windowsHide: true }); } catch (e) { simpan(e.message); return resolve(-1); }
    p.stdout.on('data', simpan);
    p.stderr.on('data', simpan);
    p.on('error', (e) => { simpan(e.message); resolve(-1); });
    p.on('close', (code) => resolve(code));
  });
}

async function cadanganMsi() {
  // Ambil alamat installer resmi dari keluaran winget; bila tidak ada, tanyakan ke winget.
  let m = state.log.match(/https:\/\/download\.documentfoundation\.org\/\S+?\.msi/);
  if (!m) {
    const info = spawnSync('winget', ['show', '--id', 'TheDocumentFoundation.LibreOffice', '-e', '--accept-source-agreements'], { windowsHide: true, encoding: 'utf8', timeout: 60000 });
    m = String(info.stdout || '').match(/https:\/\/download\.documentfoundation\.org\/\S+?\.msi/);
  }
  if (!m) throw new Error('Alamat installer LibreOffice tidak ditemukan.');
  const msi = path.join(os.tmpdir(), 'lms-libreoffice.msi');
  state.pesan = 'Mengunduh installer LibreOffice (± 380 MB)… jangan putuskan internet.';
  const kodeUnduh = await jalankan('curl.exe', ['-sS', '-L', '--fail', '--ssl-no-revoke', '-o', msi, m[0]]);
  if (kodeUnduh !== 0 || !fs.existsSync(msi)) throw new Error('Unduhan installer gagal. Periksa koneksi internet.');
  // Pastikan berkas benar-benar dari The Document Foundation
  const ttd = spawnSync('powershell.exe', ['-NoProfile', '-Command', `$s=Get-AuthenticodeSignature '${msi}'; "$($s.Status)|$($s.SignerCertificate.Subject)"`], { windowsHide: true, encoding: 'utf8', timeout: 60000 });
  if (!/^Valid\|.*The Document Foundation/m.test(String(ttd.stdout))) { fs.rmSync(msi, { force: true }); throw new Error('Tanda tangan digital installer tidak valid, pemasangan dibatalkan.'); }
  state.pesan = 'Memasang LibreOffice… Jika muncul jendela izin Windows di laptop server, klik Yes.';
  await jalankan('powershell.exe', ['-NoProfile', '-Command', `$p = Start-Process msiexec.exe -ArgumentList '/i "${msi}" /qn /norestart' -Verb RunAs -Wait -PassThru; exit $p.ExitCode`]);
  fs.rmSync(msi, { force: true });
}

// onSelesai(berhasil) dipanggil setelah pemasangan berakhir
function mulai(cariSoffice, onSelesai) {
  if (state.status === 'proses') return state;
  if (cariSoffice()) { Object.assign(state, { status: 'ok', pesan: 'LibreOffice sudah terpasang.' }); return state; }
  Object.assign(state, { status: 'proses', pesan: 'Mengunduh dan memasang LibreOffice… (bisa 5–20 menit, tergantung kecepatan internet)', mulai: Date.now(), selesai: 0, log: '' });
  (async () => {
    let galat = '';
    try {
      await jalankan('winget', ['install', '--id', 'TheDocumentFoundation.LibreOffice', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity']);
      if (!cariSoffice()) await cadanganMsi();
    } catch (e) { galat = e.message; simpan(e.message); }
    state.selesai = Date.now();
    const ok = !!cariSoffice();
    if (ok) Object.assign(state, { status: 'ok', pesan: 'LibreOffice berhasil dipasang. Konversi PPT → PDF sudah aktif.' });
    else Object.assign(state, { status: 'gagal', pesan: `Pemasangan belum berhasil${galat ? ': ' + galat : ''}. Pastikan laptop tersambung internet dan klik Yes pada jendela izin Windows, lalu coba lagi. Atau gunakan Unduh manual.` });
    try { onSelesai && onSelesai(ok); } catch (e) { /* abaikan */ }
  })();
  return state;
}

module.exports = { state, mulai, adaWinget };
