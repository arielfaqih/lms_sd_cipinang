// Pemasang LMS IPAS dari paket ZIP. Dijalankan oleh PASANG-LMS.bat memakai runtime\node.exe bawaan paket
// (bertanda tangan resmi OpenJS), sehingga tetap jalan di Windows 11 yang Smart App Control-nya aktif,
// berbeda dengan installer .exe buatan sendiri yang tidak bertanda tangan.
// Pilihan baris perintah:  --diam [folder]  (tanpa pertanyaan, tanpa firewall, tanpa menjalankan LMS)
'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execFileSync, spawn } = require('child_process');

const SUMBER = __dirname;
const KUNCI = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\LMS-IPAS';
const ATURAN = 'LMS IPAS (port 3000)';
const diam = process.argv.includes('--diam');
const folderArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const W = { hijau: '\x1b[32m', merah: '\x1b[31m', kuning: '\x1b[33m', biru: '\x1b[36m', tebal: '\x1b[1m', redup: '\x1b[90m', biasa: '\x1b[0m' };
const tulis = (t = '') => process.stdout.write(t + '\n');
const ok = (t) => tulis(`  ${W.hijau}✓${W.biasa} ${t}`);

function tanya(soal) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => rl.question(soal, (j) => { rl.close(); r(String(j || '').trim()); }));
}
function jalankan(cmd, args) { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }); } catch (e) { return ''; } }
const ps = (perintah) => jalankan('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', perintah]);
const kutip = (s) => "'" + String(s).replace(/'/g, "''") + "'";

function folderBawaan() { return path.join((process.env.SystemDrive || 'C:') + '\\', 'LMS-IPAS'); }

function hentikanServer(folder) {
  const nodeTujuan = path.join(folder, 'runtime', 'node.exe').toLowerCase();
  const out = ps("Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | ForEach-Object { \"$($_.ProcessId)|$($_.ExecutablePath)\" }");
  for (const baris of out.split(/\r?\n/)) {
    const [pid, exe] = baris.split('|');
    if (pid && Number(pid) !== process.pid && exe && exe.toLowerCase() === nodeTujuan) { try { process.kill(Number(pid)); } catch (e) { /* */ } }
  }
}

function salin(dari, ke) {
  fs.mkdirSync(ke, { recursive: true });
  for (const nama of fs.readdirSync(dari)) {
    if (nama.toLowerCase() === 'data') continue; // data sekolah tidak pernah ditimpa
    fs.cpSync(path.join(dari, nama), path.join(ke, nama), { recursive: true, force: true });
  }
}

function ukuranKb(folder) {
  let t = 0;
  const jalan = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) jalan(p); else t += fs.statSync(p).size; } };
  try { jalan(folder); } catch (e) { /* */ }
  return Math.round(t / 1024);
}

function daftarkan(folder) {
  const versi = (() => { try { return require(path.join(folder, 'package.json')).version; } catch (e) { return '1.0.0'; } })();
  const hapus = `"${path.join(folder, 'runtime', 'node.exe')}" "${path.join(folder, 'hapus-lms.js')}"`;
  const nilai = [['DisplayName', 'REG_SZ', 'LMS IPAS (LMS IPA SD Kelas 4-6)'], ['DisplayVersion', 'REG_SZ', versi], ['Publisher', 'REG_SZ', 'SDN Cipinang II'],
    ['DisplayIcon', 'REG_SZ', path.join(folder, 'lms.ico')], ['InstallLocation', 'REG_SZ', folder], ['UninstallString', 'REG_SZ', hapus],
    ['QuietUninstallString', 'REG_SZ', hapus + ' --diam'], ['NoModify', 'REG_DWORD', '1'], ['NoRepair', 'REG_DWORD', '1'],
    ['EstimatedSize', 'REG_DWORD', String(ukuranKb(folder))], ['InstallDate', 'REG_SZ', new Date().toISOString().slice(0, 10).replace(/-/g, '')]];
  for (const [n, t, v] of nilai) jalankan('reg', ['add', KUNCI, '/v', n, '/t', t, '/d', v, '/f']);
}

function buatPintasan(folder, desktop) {
  const node = path.join(folder, 'runtime', 'node.exe');
  const ikon = path.join(folder, 'lms.ico');
  const satu = (tempat, nama, target, argumen, ket) => `$s=$w.CreateShortcut((Join-Path ([Environment]::GetFolderPath('${tempat}')) ${kutip(nama + '.lnk')}));` +
    `$s.TargetPath=${kutip(target)};$s.Arguments=${kutip(argumen)};$s.WorkingDirectory=${kutip(folder)};$s.Description=${kutip(ket)};$s.IconLocation=${kutip(ikon + ',0')};$s.Save();`;
  let cmd = '$w=New-Object -ComObject WScript.Shell;';
  if (desktop) cmd += satu('Desktop', 'LMS IPAS', path.join(folder, 'mulai-server.bat'), '', 'Jalankan server LMS IPAS');
  cmd += satu('Programs', 'LMS IPAS', path.join(folder, 'mulai-server.bat'), '', 'Jalankan server LMS IPAS');
  cmd += satu('Programs', 'Hapus LMS IPAS', node, `"${path.join(folder, 'hapus-lms.js')}"`, 'Hapus (uninstall) LMS IPAS');
  ps(cmd);
}

async function main() {
  tulis();
  tulis(`${W.tebal}${W.biru}  ==============================================${W.biasa}`);
  tulis(`${W.tebal}     PASANG LMS IPAS  (LMS IPA SD Kelas 4-6)${W.biasa}`);
  tulis(`${W.redup}     Berjalan tanpa internet${W.biasa}`);
  tulis(`${W.tebal}${W.biru}  ==============================================${W.biasa}`);
  tulis();

  let folder = folderArg || folderBawaan();
  if (!diam) {
    tulis(`  LMS akan dipasang ke: ${W.tebal}${folder}${W.biasa}`);
    tulis(`  ${W.redup}(hindari folder OneDrive, Desktop, atau Documents agar basis data tidak rusak)${W.biasa}`);
    const j = await tanya(`\n  Tekan ${W.tebal}Enter${W.biasa} untuk memasang di sana, atau ketik folder lain: `);
    if (j) folder = path.resolve(j.replace(/^"|"$/g, ''));
    if (/onedrive/i.test(folder)) {
      const y = await tanya(`  ${W.kuning}Folder ini ada di OneDrive dan bisa merusak basis data. Tetap lanjut? (y/N): ${W.biasa}`);
      if (y.toLowerCase() !== 'y') { tulis('  Dibatalkan.'); await tanya('\n  Tekan Enter untuk menutup...'); return 0; }
    }
    tulis();
  }
  const perbarui = fs.existsSync(path.join(folder, 'data'));
  const diTempat = path.resolve(folder).toLowerCase() === path.resolve(SUMBER).toLowerCase();

  hentikanServer(folder);
  if (!diTempat) { tulis('  Menyalin berkas (sekitar 1 menit)...'); salin(SUMBER, folder); }
  // Lepas tanda "diunduh dari internet" agar mulai-server.bat tidak memunculkan peringatan setiap dibuka
  ps(`Get-ChildItem -LiteralPath ${kutip(folder)} -Recurse -File | Unblock-File -ErrorAction SilentlyContinue`);
  ok(perbarui ? 'Berkas aplikasi diperbarui (data sekolah tetap aman)' : 'Berkas aplikasi terpasang');
  daftarkan(folder); ok('Terdaftar di Settings > Apps (bisa di-uninstall)');
  buatPintasan(folder, true); ok('Pintasan "LMS IPAS" di Desktop dan Start Menu');
  if (!diam) {
    tulis(`  ${W.redup}Membuka izin firewall: klik ${W.biasa}${W.tebal}Yes${W.biasa}${W.redup} jika Windows meminta izin...${W.biasa}`);
    ps(`try { Start-Process netsh -ArgumentList 'advfirewall firewall delete rule name="${ATURAN}"' -Verb RunAs -WindowStyle Hidden -Wait; ` +
      `Start-Process netsh -ArgumentList 'advfirewall firewall add rule name="${ATURAN}" dir=in action=allow protocol=TCP localport=3000 profile=any' -Verb RunAs -WindowStyle Hidden -Wait } catch {}`);
    ok('Izin agar HP, laptop lain, dan smartboard bisa membuka LMS');
  }

  tulis();
  tulis(`  ${W.tebal}${W.hijau}LMS IPAS berhasil ${perbarui ? 'diperbarui' : 'dipasang'} di ${folder}${W.biasa}`);
  tulis();
  if (!perbarui) {
    tulis('  Masuk pertama kali (kata sandi wajib diganti):');
    tulis(`    Admin : ${W.tebal}admin${W.biasa} / ${W.tebal}admin123${W.biasa}`);
    tulis(`    Guru  : ${W.tebal}guru${W.biasa}  / ${W.tebal}guru123${W.biasa}`);
    tulis();
  }
  tulis('  Membuka LMS berikutnya: klik dua kali "LMS IPAS" di Desktop.');
  tulis('  Jendela hitam server JANGAN DITUTUP selama LMS dipakai.');
  tulis('  Menghapus LMS: Settings > Apps > LMS IPAS > Uninstall.');
  if (!diam) {
    if (!diTempat) tulis(`\n  ${W.redup}Folder hasil ekstrak ZIP ini boleh dihapus sekarang.${W.biasa}`);
    await tanya(`\n  Tekan ${W.tebal}Enter${W.biasa} untuk menjalankan LMS sekarang...`);
    spawn('cmd.exe', ['/d', '/c', `start "" "${path.join(folder, 'mulai-server.bat')}"`], { cwd: folder, detached: true, stdio: 'ignore', windowsVerbatimArguments: true }).unref();
  }
  return 0;
}

main().then((k) => process.exit(k)).catch(async (e) => {
  tulis(`\n  ${W.merah}Pemasangan gagal: ${e.message}${W.biasa}`);
  if (/EBUSY|EPERM/.test(e.code || '')) tulis('  Tutup dulu jendela hitam server LMS yang masih terbuka, lalu jalankan PASANG-LMS.bat lagi.');
  if (!diam) await tanya('\n  Tekan Enter untuk menutup...');
  process.exit(1);
});
