// Memulihkan akses Admin bila kata sandinya lupa. Hanya bisa dijalankan langsung di laptop server
// (butuh akses ke folder LMS), jadi aman: orang lain lewat HP/jaringan tidak bisa memakainya.
// Kata sandi akun admin dikembalikan ke "admin123" dan wajib diganti saat masuk berikutnya.
'use strict';
const path = require('path');
const readline = require('readline');
process.env.LMS_DATA_DIR = process.env.LMS_DATA_DIR || path.join(__dirname, 'data');
const fs = require('fs');

const tulis = (t = '') => process.stdout.write(t + '\n');
function tanya(soal) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => rl.question(soal, (j) => { rl.close(); r(String(j || '').trim()); }));
}

(async () => {
  tulis(); tulis('  RESET KATA SANDI ADMIN - LMS IPAS'); tulis();
  if (!fs.existsSync(path.join(process.env.LMS_DATA_DIR, 'lms.db'))) {
    tulis('  Data LMS belum ada. Jalankan LMS sekali dulu (ikon LMS IPAS di Desktop).');
    await tanya('\n  Tekan Enter untuk menutup...'); process.exit(1);
  }
  const db = require(path.join(__dirname, 'src', 'db'));
  db.open();
  const admin = db.get(`SELECT * FROM users WHERE role = 'admin' ORDER BY (username = 'admin') DESC, id LIMIT 1`);
  if (!admin) { tulis('  Tidak ada akun admin di LMS ini.'); await tanya('\n  Tekan Enter untuk menutup...'); process.exit(1); }
  tulis(`  Akun yang akan direset : ${admin.username} (${admin.nama})`);
  tulis('  Kata sandi baru        : admin123  (wajib diganti saat masuk)');
  tulis('  Data lain (materi, soal, akun guru) TIDAK berubah.');
  const j = await tanya('\n  Ketik Y lalu Enter untuk melanjutkan (Enter saja = batal): ');
  if (j.toLowerCase() !== 'y') { tulis('\n  Dibatalkan.'); await tanya('\n  Tekan Enter untuk menutup...'); process.exit(0); }
  db.run('UPDATE users SET pass_hash = ?, harus_ganti = 1, aktif = 1 WHERE id = ?', db.hashPassword('admin123'), admin.id);
  tulis(`\n  BERHASIL. Masuk dengan: ${admin.username} / admin123, lalu ganti kata sandinya.`);
  await tanya('\n  Tekan Enter untuk menutup...');
  process.exit(0);
})().catch(async (e) => { tulis('\n  Gagal: ' + e.message); await tanya('\n  Tekan Enter untuk menutup...'); process.exit(1); });
