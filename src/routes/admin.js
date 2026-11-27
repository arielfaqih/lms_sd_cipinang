// Admin: pengguna (F2), backup & restore (F12), pengaturan sistem (F13)
'use strict';
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const AdmZip = require('adm-zip');
const db = require('../db');
const ai = require('../ai');
const net = require('../net');
const { html, page, pageHead, icon } = require('../html');
const { cariSoffice, konversiTertunda } = require('./media');
const pasang = require('../pasang');

const r = express.Router();
const toInt = (v) => parseInt(v, 10) || 0;
const go = (res, url, pesan, k = 'pesan') => res.redirect(url + '?' + k + '=' + encodeURIComponent(pesan));

r.get('/', (req, res) => {
  const n = (sql) => db.get(sql).n;
  const body = html`
  ${pageHead({ title: 'Admin', desc: 'Pengaturan sekolah. Hanya akun Admin yang melihat menu ini.' })}
  <div class="shortcuts">
    <a class="sc" href="/admin/pengguna">${icon('user')}<b>Pengguna</b><small>${n('SELECT COUNT(*) AS n FROM users')} akun · buat akun guru, nonaktifkan, reset sandi</small></a>
    <a class="sc" href="/admin/backup">${icon('upload')}<b>Backup &amp; Restore</b><small>Simpan semua data ke flashdisk. Lakukan seminggu sekali.</small></a>
    <a class="sc" href="/admin/pengaturan">${icon('gear')}<b>Pengaturan</b><small>Kunci API AI, batas harian, nama sekolah, info sistem</small></a>
    <a class="sc" href="/admin/log">${icon('list')}<b>Catatan</b><small>${n('SELECT COUNT(*) AS n FROM error_log')} kesalahan · ${n('SELECT COUNT(*) AS n FROM ai_log')} permintaan AI</small></a>
  </div>`;
  res.send(page({ title: 'Admin', user: req.user, body, active: 'admin' }));
});

// ---------- Pengguna ----------
r.get('/pengguna', (req, res) => {
  const list = db.all('SELECT * FROM users ORDER BY role DESC, nama');
  const body = html`
  <div class="page-head"><div><p class="crumb"><a href="/admin">Admin</a> ›</p><h1>Pengguna</h1><p class="muted">Siswa tidak memiliki akun. Untuk ahli materi/media, buat akun Guru sementara lalu nonaktifkan setelah validasi.</p></div></div>
  <div class="grid-edit">
    <section class="card">
      <table class="tbl">
        <thead><tr><th>Nama</th><th>Pengguna</th><th>Peran</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${list.map((u) => html`<tr class="${u.aktif ? '' : 'off'}">
          <td>${u.nama}</td><td>@${u.username}</td><td>${u.role === 'admin' ? 'Admin' : 'Guru'}</td>
          <td>${u.aktif ? 'Aktif' : 'Nonaktif'}${u.harus_ganti ? html`<br><small class="muted">harus ganti sandi</small>` : ''}</td>
          <td class="row">
            ${u.id !== req.user.id ? html`<form method="post" action="/admin/pengguna/${u.id}/status"><button class="btn small">${u.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button></form>` : html`<span class="muted small">(Anda)</span>`}
            <form method="post" action="/admin/pengguna/${u.id}/reset" class="row" data-confirm="Reset kata sandi ${u.nama}?"><input name="sandi" placeholder="Sandi sementara" minlength="6" required size="12" aria-label="Sandi sementara"><button class="btn small">Reset</button></form>
          </td></tr>`)}</tbody>
      </table>
    </section>
    <section class="card">
      <h2>Tambah akun</h2>
      <form method="post" action="/admin/pengguna" class="stack">
        <label>Nama lengkap<input name="nama" required></label>
        <label>Nama pengguna <small class="muted">(huruf/angka, tanpa spasi)</small><input name="username" pattern="[A-Za-z0-9._\-]{3,30}" required></label>
        <label>Peran<select name="role"><option value="guru">Guru</option><option value="admin">Admin</option></select></label>
        <label>Kata sandi sementara<input name="sandi" minlength="6" required></label>
        <p class="muted small">Pengguna wajib mengganti kata sandi saat pertama masuk.</p>
        <button class="btn primary">Buat akun</button>
      </form>
    </section>
  </div>`;
  res.send(page({ title: 'Pengguna', user: req.user, body, active: 'admin', pesan: req.query.pesan, galat: req.query.galat }));
});
r.post('/pengguna', (req, res) => {
  const nama = String(req.body.nama || '').trim();
  const username = String(req.body.username || '').trim();
  const role = req.body.role === 'admin' ? 'admin' : 'guru';
  const sandi = String(req.body.sandi || '');
  if (!nama || !/^[A-Za-z0-9._-]{3,30}$/.test(username) || sandi.length < 6) return go(res, '/admin/pengguna', 'Data belum lengkap atau nama pengguna tidak valid.', 'galat');
  if (db.get('SELECT id FROM users WHERE username = ?', username)) return go(res, '/admin/pengguna', 'Nama pengguna sudah dipakai.', 'galat');
  db.run('INSERT INTO users (username, nama, role, pass_hash, harus_ganti) VALUES (?, ?, ?, ?, 1)', username, nama, role, db.hashPassword(sandi));
  go(res, '/admin/pengguna', `Akun @${username} dibuat.`);
});
r.post('/pengguna/:id/status', (req, res) => {
  const u = db.get('SELECT * FROM users WHERE id = ?', toInt(req.params.id));
  if (!u || u.id === req.user.id) return res.redirect('/admin/pengguna');
  if (u.aktif && u.role === 'admin' && db.get(`SELECT COUNT(*) AS n FROM users WHERE role='admin' AND aktif=1`).n <= 1) return go(res, '/admin/pengguna', 'Minimal harus ada satu admin aktif.', 'galat');
  db.run('UPDATE users SET aktif = ? WHERE id = ?', u.aktif ? 0 : 1, u.id);
  if (u.aktif) db.run('DELETE FROM sessions WHERE user_id = ?', u.id);
  go(res, '/admin/pengguna', `Akun ${u.nama} ${u.aktif ? 'dinonaktifkan' : 'diaktifkan'}.`);
});
r.post('/pengguna/:id/reset', (req, res) => {
  const u = db.get('SELECT * FROM users WHERE id = ?', toInt(req.params.id));
  const sandi = String(req.body.sandi || '');
  if (!u || sandi.length < 6) return go(res, '/admin/pengguna', 'Sandi sementara minimal 6 karakter.', 'galat');
  db.run('UPDATE users SET pass_hash = ?, harus_ganti = 1 WHERE id = ?', db.hashPassword(sandi), u.id);
  db.run('DELETE FROM sessions WHERE user_id = ?', u.id);
  go(res, '/admin/pengguna', `Kata sandi ${u.nama} direset. Ia wajib menggantinya saat masuk.`);
});

// ---------- Backup & restore ----------
function buatBackup() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const tmpDb = path.join(db.TMP_DIR, `snap-${Date.now()}.db`);
  db.raw.exec(`VACUUM INTO '${tmpDb.replace(/'/g, "''")}'`);
  { // sesi login tidak ikut dicadangkan
    const { DatabaseSync } = require('node:sqlite');
    const snap = new DatabaseSync(tmpDb);
    snap.exec('DELETE FROM sessions; VACUUM;');
    snap.close();
  }
  const zip = new AdmZip();
  zip.addLocalFile(tmpDb, '', 'lms.db');
  zip.addLocalFolder(db.MEDIA_DIR, 'media');
  zip.addFile('INFO.txt', Buffer.from(`Backup LMS IPAS ${db.setting('nama_sekolah')}\nWaktu: ${new Date().toLocaleString('id-ID')}\nVersi: ${require('../../package.json').version}\n`));
  const nama = `backup-lms-ipa-${stamp}.zip`;
  const out = path.join(db.BACKUP_DIR, nama);
  zip.writeZip(out);
  fs.rmSync(tmpDb, { force: true });
  // simpan maksimal 10 backup terbaru di laptop
  const lama = fs.readdirSync(db.BACKUP_DIR).filter((f) => f.endsWith('.zip')).sort().reverse().slice(10);
  lama.forEach((f) => fs.rmSync(path.join(db.BACKUP_DIR, f), { force: true }));
  return { nama, out };
}

r.get('/backup', (req, res) => {
  const files = fs.readdirSync(db.BACKUP_DIR).filter((f) => f.endsWith('.zip')).sort().reverse()
    .map((f) => ({ f, size: fs.statSync(path.join(db.BACKUP_DIR, f)).size }));
  const drives = os.platform() === 'win32' ? 'mis. E:\\ atau F:\\' : 'mis. /media/usb';
  const body = html`
  <div class="page-head"><div><p class="crumb"><a href="/admin">Admin</a> ›</p><h1>Backup & Restore</h1><p class="muted">Backup berisi basis data (materi, soal, akun) dan seluruh folder media dalam satu berkas .zip.</p></div></div>
  <div class="grid2">
    <section class="card stack">
      <h2>1. Buat backup</h2>
      <form method="post" action="/admin/backup"><button class="btn primary big">Buat & unduh backup</button></form>
      <form method="post" action="/admin/backup/salin" class="stack">
        <label>Atau simpan langsung ke folder flashdisk/hard disk <small class="muted">(${drives})</small><input name="tujuan" placeholder="${os.platform() === 'win32' ? 'E:\\' : '/media/usb'}" required></label>
        <button class="btn">Simpan ke folder</button>
      </form>
      <p class="muted small">Lakukan backup minimal seminggu sekali dan setelah menambah banyak materi.</p>
    </section>
    <section class="card stack">
      <h2>2. Restore dari backup</h2>
      <div class="flash warn">Restore akan <b>mengganti seluruh data saat ini</b>. Sistem otomatis membuat backup data sekarang sebelum restore.</div>
      <form method="post" action="/admin/restore" enctype="multipart/form-data" class="stack" data-upload data-confirm="Ganti semua data dengan isi berkas backup ini?">
        <label>Berkas backup (.zip)<input type="file" name="berkas" accept=".zip" required></label>
        <button class="btn danger">Restore</button>
        <progress hidden max="100" value="0"></progress>
      </form>
    </section>
  </div>
  <section class="card">
    <h2>Backup tersimpan di laptop ini</h2>
    ${files.length ? html`<ul class="files">${files.map((x) => html`<li><a href="/admin/backup/unduh/${encodeURIComponent(x.f)}">${x.f}</a> <span class="muted small">${(x.size / 1048576).toFixed(1)} MB</span></li>`)}</ul>` : html`<p class="muted">Belum ada.</p>`}
    <p class="muted small">Lokasi: ${db.BACKUP_DIR}</p>
  </section>`;
  res.send(page({ title: 'Backup', user: req.user, body, active: 'admin', pesan: req.query.pesan, galat: req.query.galat }));
});
r.post('/backup', (req, res, next) => {
  try { const { nama, out } = buatBackup(); res.download(out, nama); } catch (e) { next(e); }
});
r.post('/backup/salin', (req, res) => {
  const tujuan = String(req.body.tujuan || '').trim();
  try {
    if (!tujuan || !fs.existsSync(tujuan) || !fs.statSync(tujuan).isDirectory()) throw new Error('Folder tujuan tidak ditemukan. Pastikan flashdisk terpasang dan alamatnya benar.');
    const { nama, out } = buatBackup();
    fs.copyFileSync(out, path.join(tujuan, nama));
    go(res, '/admin/backup', `Backup disimpan ke ${path.join(tujuan, nama)}`);
  } catch (e) { go(res, '/admin/backup', e.message, 'galat'); }
});
r.get('/backup/unduh/:f', (req, res) => {
  const f = path.basename(req.params.f);
  const p = path.join(db.BACKUP_DIR, f);
  if (!f.endsWith('.zip') || !fs.existsSync(p)) return res.redirect('/admin/backup');
  res.download(p, f);
});

const uploadZip = multer({ dest: db.TMP_DIR, limits: { fileSize: 8 * 1024 * 1024 * 1024 } });
r.post('/restore', uploadZip.single('berkas'), (req, res) => {
  if (!req.file) return go(res, '/admin/backup', 'Pilih berkas backup.', 'galat');
  const tmpDir = path.join(db.TMP_DIR, 'restore-' + Date.now());
  try {
    const zip = new AdmZip(req.file.path);
    const entries = zip.getEntries();
    if (!entries.some((e) => e.entryName === 'lms.db')) throw new Error('Berkas ini bukan backup LMS (lms.db tidak ditemukan).');
    for (const e of entries) {
      const n = path.normalize(e.entryName);
      if (n.startsWith('..') || path.isAbsolute(n)) throw new Error('Isi berkas backup tidak aman.');
    }
    zip.extractAllTo(tmpDir, true);
    // uji basis data hasil backup
    const { DatabaseSync } = require('node:sqlite');
    const test = new DatabaseSync(path.join(tmpDir, 'lms.db'));
    const admins = test.prepare(`SELECT COUNT(*) AS n FROM users WHERE role='admin' AND aktif=1`).get().n;
    test.close();
    if (!admins) throw new Error('Backup tidak memiliki akun admin aktif.');

    const pengaman = buatBackup();
    db.close();
    for (const ext of ['', '-wal', '-shm']) fs.rmSync(db.DB_FILE + ext, { force: true });
    fs.copyFileSync(path.join(tmpDir, 'lms.db'), db.DB_FILE);
    fs.rmSync(db.MEDIA_DIR, { recursive: true, force: true });
    fs.mkdirSync(db.MEDIA_DIR, { recursive: true });
    const mediaSrc = path.join(tmpDir, 'media');
    if (fs.existsSync(mediaSrc)) fs.cpSync(mediaSrc, db.MEDIA_DIR, { recursive: true });
    db.open();
    try { require('../seed').perbaruiMateri(); } catch (e) { db.logError('pembaruan materi setelah restore', e); }
    go(res, '/masuk', `Restore berhasil. Data lama diamankan di ${pengaman.nama}. Silakan masuk lagi.`);
  } catch (e) {
    if (!db.raw) db.open();
    db.logError('restore', e);
    go(res, '/admin/backup', 'Restore gagal: ' + e.message, 'galat');
  } finally {
    fs.rmSync(req.file.path, { force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------- Pengaturan ----------
// Langkah aktivasi fitur yang butuh internet: Buat Soal AI (kunci Gemini) dan konversi PPT (LibreOffice).
const langkah = (ok, judul, isi) => html`<li class="lk ${ok ? 'ok' : ''}"><span class="lk-ic">${ok ? '✓' : ''}</span><div><b>${judul}</b>${isi ? html`<div class="lk-isi">${isi}</div>` : ''}</div></li>`;
const NOTICE_INTERNET = (online, apa) => html`<div class="net-note ${online ? 'on' : 'off'}">
  <span class="net-dot"></span>
  <div>${online
    ? html`<b>Laptop server tersambung ke internet.</b> ${apa} bisa dilakukan sekarang.`
    : html`<b>Hubungkan laptop server ke internet dulu.</b> ${apa} membutuhkan internet. Sambungkan ke Wi-Fi yang ada internetnya atau nyalakan hotspot HP, lalu klik <b>Periksa ulang</b>.`}</div>
  <a class="btn small" href="/admin/pengaturan?cek=1">Periksa ulang</a>
</div>`;

r.get('/pengaturan', async (req, res) => {
  if (req.query.cek) net.resetOnlineCache();
  const st = ai.status();
  const key = db.setting('gemini_api_key');
  const online = await net.isOnline();
  const soffice = cariSoffice();
  const tes = db.setting('ai_tes_status'); // 'ok' | 'gagal' | ''
  const aiAktif = !!key && tes === 'ok';
  const ps = pasang.state;
  const bisaWinget = pasang.adaWinget();
  const body = html`
  ${pageHead({ crumb: html`<a href="/admin">Admin</a>`, title: 'Pengaturan sistem', desc: 'Aktifkan fitur tambahan dan atur sistem. Bagian bertanda internet hanya perlu disambungkan ke internet saat diaktifkan atau dipakai.' })}

  <div class="grid2 fitur-net">
    <section class="card stack" id="ai">
      <div class="fn-head"><h2>${icon('spark')}Buat Soal dengan AI</h2><span class="tag ${aiAktif ? 'terbit' : 'draf'}">${aiAktif ? 'Aktif' : 'Belum aktif'}</span></div>
      <p class="muted small">AI (Google Gemini) menyusun draf soal dari teks materi. Fitur ini <b>selalu butuh internet</b> setiap kali membuat soal; fitur lain tetap jalan tanpa internet.</p>
      ${NOTICE_INTERNET(online, 'Mengaktifkan dan memakai AI')}
      <ol class="langkah-list">
        ${langkah(online, 'Sambungkan laptop server ke internet', online ? 'Sudah tersambung.' : 'Belum tersambung.')}
        ${langkah(!!key, 'Buat kunci API Gemini (gratis)', html`Buka <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> (butuh internet), masuk dengan akun Google sekolah, klik <b>Create API key</b>, lalu salin kuncinya.`)}
        ${langkah(aiAktif, 'Tempel kunci di bawah, lalu klik Simpan & tes', tes === 'gagal' ? html`<span class="err-txt">Tes terakhir gagal: ${db.setting('ai_tes_pesan')}</span>` : (aiAktif ? html`Kunci valid · model <b>${st.model}</b> · dites ${db.setting('ai_tes_waktu')}` : 'Sistem langsung memeriksa kunci saat disimpan.'))}
      </ol>
      <form method="post" action="/admin/pengaturan/ai" class="stack" data-loading="Menyimpan dan mengetes kunci ke Google…">
        <label>Kunci API Gemini <small class="muted">(hanya disimpan di laptop server, tidak pernah dikirim ke HP/browser)</small>
          <input name="gemini_api_key" type="password" autocomplete="off" placeholder="${key ? 'Tersimpan: ••••' + key.slice(-4) + ' (kosongkan bila tidak diubah)' : 'Tempel kunci API di sini, contoh: AIza…'}"></label>
        <div class="grid2">
          <label>Nama model<input name="gemini_model" value="${db.setting('gemini_model')}"></label>
          <label>Batas permintaan per hari<input type="number" name="ai_batas_harian" min="0" max="500" value="${db.setting('ai_batas_harian')}"></label>
        </div>
        <p class="small muted">Hari ini terpakai ${st.pakai} dari ${st.batas} permintaan. Satu permintaan menghasilkan sampai 10 soal.</p>
        <div class="row">
          <button class="btn primary" name="aksi" value="simpan">${online ? 'Simpan & tes kunci' : 'Simpan kunci (tes nanti saat online)'}</button>
          ${key ? html`<button class="btn" name="aksi" value="tes" ${online ? '' : 'disabled'}>Tes ulang</button>
            <button class="btn danger" name="aksi" value="hapus" data-confirm="Hapus kunci API? Fitur Buat Soal AI akan nonaktif.">Hapus kunci</button>` : ''}
        </div>
      </form>
    </section>

    <section class="card stack" id="ppt">
      <div class="fn-head"><h2>${icon('media')}Konversi PPT → PDF</h2><span class="tag ${soffice ? 'terbit' : 'draf'}">${soffice ? 'Aktif' : (ps.status === 'proses' ? 'Sedang dipasang…' : 'Belum aktif')}</span></div>
      <p class="muted small">Agar berkas PowerPoint (.ppt/.pptx) bisa ditayangkan, laptop server butuh program gratis <b>LibreOffice</b>. Internet hanya dibutuhkan <b>sekali saat memasang</b> (unduhan ±350 MB); setelah itu konversi berjalan tanpa internet.</p>
      ${soffice ? html`<div class="net-note on"><span class="net-dot"></span><div><b>LibreOffice sudah terpasang.</b> Setiap PPT yang diunggah otomatis diubah menjadi PDF. Tidak perlu internet lagi.<br><small class="muted">${soffice}</small></div></div>`
        : html`${NOTICE_INTERNET(online, 'Memasang LibreOffice')}
      <ol class="langkah-list">
        ${langkah(online, 'Sambungkan laptop server ke internet', online ? 'Sudah tersambung.' : 'Belum tersambung.')}
        ${langkah(ps.status === 'proses' || ps.status === 'ok', 'Klik Pasang LibreOffice otomatis', 'Jika Windows menampilkan jendela izin, klik Yes. Jangan matikan laptop selama pemasangan.')}
        ${langkah(false, 'Selesai', 'PPT yang sudah diunggah sebelumnya akan dikonversi otomatis.')}
      </ol>
      ${ps.status === 'proses' ? html`<div class="flash warn" data-autorefresh="15"><div class="spinner sm"></div> ${ps.pesan}<br><small>Halaman ini memperbarui diri setiap 15 detik. Mulai ${new Date(ps.mulai).toLocaleTimeString('id-ID')}.</small></div>` : ''}
      ${ps.status === 'gagal' ? html`<div class="flash err"><b class="flash-ic">!</b><span>${ps.pesan}</span></div>` : ''}
      <form method="post" action="/admin/pengaturan/pasang-libreoffice" class="row">
        <button class="btn primary" ${online && bisaWinget && ps.status !== 'proses' ? '' : 'disabled'}>${icon('upload')}Pasang LibreOffice otomatis</button>
        <a class="btn" href="https://www.libreoffice.org/download/download-libreoffice/" target="_blank" rel="noopener">Unduh manual</a>
      </form>
      ${!bisaWinget ? html`<p class="small muted">Pemasangan otomatis tidak tersedia di laptop ini (butuh Windows 10/11 dengan winget). Gunakan <b>Unduh manual</b>, pasang dengan pilihan bawaan, lalu muat ulang halaman ini.</p>` : ''}
      <p class="small muted">Tanpa LibreOffice pun guru tetap bisa menayangkan presentasi: di PowerPoint pilih <i>File → Save As → PDF</i>, lalu unggah PDF-nya.</p>`}
    </section>
  </div>

  <div class="grid2">
    <form method="post" action="/admin/pengaturan" class="card stack">
      <h2>Umum</h2>
      <label>Nama sekolah<input name="nama_sekolah" value="${db.setting('nama_sekolah')}" required></label>
      <label>Sesi berakhir otomatis setelah menganggur (menit)<input type="number" name="sesi_menit" min="10" max="720" value="${db.setting('sesi_menit')}"></label>
      <label class="switch"><input type="checkbox" name="hanya_jaringan_lokal" value="1" ${db.setting('hanya_jaringan_lokal') === '1' ? 'checked' : ''}> Hanya izinkan akses dari jaringan sekolah (IP lokal)</label>
      <button class="btn primary">Simpan pengaturan umum</button>
    </form>
    <section class="card">
      <h2>Info sistem</h2>
      <table class="tbl small">
        <tr><td>Versi LMS</td><td>${req.app.locals.VERSI}</td></tr>
        <tr><td>Node.js</td><td>${process.version}</td></tr>
        <tr><td>Sistem operasi</td><td>${os.type()} ${os.release()}</td></tr>
        <tr><td>Folder data</td><td>${db.DATA_DIR}</td></tr>
        <tr><td>Internet</td><td>${online ? 'Tersambung' : 'Tidak ada'}</td></tr>
        <tr><td>Konversi PPT</td><td>${soffice ? 'Aktif (LibreOffice)' : 'Belum aktif'}</td></tr>
        <tr><td>Alamat jaringan</td><td>${net.lanAddresses().map((a) => `${a.address}:${req.app.locals.PORT}`).join(', ') || '-'}</td></tr>
      </table>
    </section>
  </div>`;
  res.send(page({ title: 'Pengaturan', user: req.user, body, active: 'admin', pesan: req.query.pesan, galat: req.query.galat }));
});

r.post('/pengaturan', (req, res) => {
  const b = req.body;
  db.setSetting('nama_sekolah', String(b.nama_sekolah || '').trim() || 'SDN Cipinang II');
  db.setSetting('sesi_menit', Math.max(10, Math.min(720, toInt(b.sesi_menit) || 120)));
  db.setSetting('hanya_jaringan_lokal', b.hanya_jaringan_lokal ? '1' : '0');
  go(res, '/admin/pengaturan', 'Pengaturan umum disimpan.');
});

// Tes kunci ke Google. Bila model yang dipilih tidak tersedia, otomatis pilih model "flash" yang ada.
async function tesKunci() {
  const waktu = new Date().toLocaleString('id-ID');
  try {
    const models = await ai.daftarModel();
    let model = db.setting('gemini_model');
    let ganti = '';
    if (!models.includes(model)) {
      const pilih = models.find((m) => /^gemini-[\d.]+-flash$/.test(m)) || models.find((m) => /flash/.test(m) && !/lite|image|tts|live|audio|thinking|exp/.test(m));
      if (pilih) { ganti = ` Model diganti otomatis ke "${pilih}" karena "${model}" tidak tersedia.`; model = pilih; db.setSetting('gemini_model', pilih); }
    }
    db.setSetting('ai_tes_status', 'ok'); db.setSetting('ai_tes_waktu', waktu); db.setSetting('ai_tes_pesan', '');
    return { ok: true, pesan: `Kunci API valid. Buat Soal dengan AI sudah aktif (model ${model}).${ganti}` };
  } catch (e) {
    const teks = e.message + (e.cause ? ' ' + e.cause.code : '');
    const msg = /fetch failed|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|aborted|timeout/i.test(teks) ? 'Tidak ada koneksi internet (atau koneksi terlalu lambat).'
      : /API key not valid|API_KEY_INVALID|invalid api key/i.test(teks) ? 'Kunci API tidak valid. Salin ulang kuncinya dari aistudio.google.com/apikey (tanpa spasi).'
        : /permission|PERMISSION_DENIED|forbidden/i.test(teks) ? 'Kunci API tidak punya izin memakai Gemini. Buat kunci baru di aistudio.google.com/apikey.'
          : e.message;
    db.setSetting('ai_tes_status', 'gagal'); db.setSetting('ai_tes_waktu', waktu); db.setSetting('ai_tes_pesan', msg);
    return { ok: false, pesan: 'Tes kunci gagal: ' + msg };
  }
}

r.post('/pengaturan/ai', async (req, res) => {
  const b = req.body;
  if (b.aksi === 'hapus') {
    db.setSetting('gemini_api_key', ''); db.setSetting('ai_tes_status', '');
    return go(res, '/admin/pengaturan', 'Kunci API dihapus. Buat Soal dengan AI nonaktif.');
  }
  const kunci = String(b.gemini_api_key || '').trim();
  if (kunci) { db.setSetting('gemini_api_key', kunci); db.setSetting('ai_tes_status', ''); }
  if (b.gemini_model !== undefined) db.setSetting('gemini_model', String(b.gemini_model || 'gemini-flash-latest').trim().replace(/^models\//, '') || 'gemini-flash-latest');
  if (b.ai_batas_harian !== undefined) db.setSetting('ai_batas_harian', Math.max(0, Math.min(500, toInt(b.ai_batas_harian))));
  if (!db.setting('gemini_api_key')) return go(res, '/admin/pengaturan', 'Tempel kunci API Gemini dulu.', 'galat');
  net.resetOnlineCache();
  if (!(await net.isOnline())) return go(res, '/admin/pengaturan', 'Kunci disimpan, tetapi belum bisa dites karena laptop server tidak tersambung internet. Sambungkan ke internet dulu, lalu klik Tes ulang.', 'galat');
  const t = await tesKunci();
  go(res, '/admin/pengaturan', t.pesan, t.ok ? 'pesan' : 'galat');
});
r.post('/pengaturan/tes', async (req, res) => {
  const t = await tesKunci();
  go(res, '/admin/pengaturan', t.pesan, t.ok ? 'pesan' : 'galat');
});

r.post('/pengaturan/pasang-libreoffice', async (req, res) => {
  net.resetOnlineCache();
  if (!(await net.isOnline())) return go(res, '/admin/pengaturan', 'Laptop server belum tersambung internet. Sambungkan ke internet dulu untuk memasang LibreOffice.', 'galat');
  if (!pasang.adaWinget()) return go(res, '/admin/pengaturan', 'Pemasangan otomatis tidak tersedia di laptop ini. Gunakan tombol Unduh manual.', 'galat');
  pasang.mulai(cariSoffice, (ok) => { if (ok) konversiTertunda(); });
  go(res, '/admin/pengaturan', 'Pemasangan LibreOffice dimulai. Biarkan laptop tetap tersambung internet. Jika muncul jendela izin Windows, klik Yes.');
});

// ---------- Catatan kesalahan & AI ----------
r.get('/log', (req, res) => {
  const err = db.all('SELECT * FROM error_log ORDER BY id DESC LIMIT 100');
  const ailog = db.all('SELECT a.*, u.nama FROM ai_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 100');
  const body = html`
  <div class="page-head"><div><p class="crumb"><a href="/admin">Admin</a> ›</p><h1>Catatan</h1></div>
    <form method="post" action="/admin/log/bersihkan" data-confirm="Hapus semua catatan kesalahan?"><button class="btn small">Bersihkan catatan kesalahan</button></form></div>
  <section class="card"><h2>Permintaan AI</h2>
    <table class="tbl small"><thead><tr><th>Waktu</th><th>Guru</th><th>Parameter</th><th>Status</th><th>Hasil / pesan</th></tr></thead>
    <tbody>${ailog.map((a) => html`<tr><td>${a.waktu}</td><td>${a.nama || '-'}</td><td><code>${a.parameter_json}</code></td><td>${a.status}</td><td>${a.status === 'ok' ? `${a.jumlah} soal` : a.pesan}</td></tr>`)}</tbody></table>
    ${!ailog.length ? html`<p class="muted">Belum ada.</p>` : ''}</section>
  <section class="card"><h2>Kesalahan sistem</h2>
    ${err.length ? err.map((e) => html`<details class="log"><summary><b>${e.waktu}</b> · ${e.sumber}</summary><pre>${e.pesan}</pre></details>`) : html`<p class="muted">Tidak ada kesalahan tercatat.</p>`}</section>`;
  res.send(page({ title: 'Catatan', user: req.user, body, active: 'admin' }));
});
r.post('/log/bersihkan', (req, res) => { db.run('DELETE FROM error_log'); res.redirect('/admin/log'); });

module.exports = r;
