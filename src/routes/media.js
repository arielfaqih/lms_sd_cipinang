// Pustaka media (F6) dan konversi PPT (bagian F11)
'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { spawn } = require('child_process');
const db = require('../db');
const { html, page, pageHead, icon, JENIS_MEDIA } = require('../html');
const { renderFigure, thumb } = require('../mediaview');

const r = express.Router();
const toInt = (v) => parseInt(v, 10) || 0;

const EXT_JENIS = {
  '.jpg': 'gambar', '.jpeg': 'gambar', '.png': 'gambar', '.webp': 'gambar', '.svg': 'gambar',
  '.gif': 'animasi', '.html': 'animasi', '.htm': 'animasi',
  '.mp4': 'video', '.webm': 'video', '.m4v': 'video',
  '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.m4a': 'audio',
  '.pdf': 'pdf', '.ppt': 'ppt', '.pptx': 'ppt',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: db.MEDIA_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 700 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // nama berkas dari browser dikirim sebagai latin1; kembalikan ke UTF-8
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ok = !!EXT_JENIS[path.extname(file.originalname).toLowerCase()];
    cb(ok ? null : new Error('JENIS_TIDAK_DIDUKUNG'), ok);
  },
});

// ---- konversi PPT → PDF dengan LibreOffice (bila terpasang) ----
function cariSoffice() {
  const kandidat = [
    process.env.SOFFICE_PATH,
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    '/usr/bin/soffice', '/usr/local/bin/soffice', '/usr/bin/libreoffice', '/snap/bin/libreoffice',
  ].filter(Boolean);
  return kandidat.find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } }) || null;
}

function konversiPpt(mediaId) {
  const m = db.get('SELECT * FROM media WHERE id = ?', mediaId);
  const soffice = cariSoffice();
  if (!m || !soffice) { if (m) db.run(`UPDATE media SET konversi = 'tidak-ada' WHERE id = ?`, m.id); return; }
  db.run(`UPDATE media SET konversi = 'proses' WHERE id = ?`, m.id);
  const outDir = fs.mkdtempSync(path.join(db.TMP_DIR, 'ppt-'));
  const profile = 'file:///' + path.join(db.TMP_DIR, 'lo-profile').replace(/\\/g, '/').replace(/^\//, '');
  const p = spawn(soffice, [`-env:UserInstallation=${profile}`, '--headless', '--convert-to', 'pdf', '--outdir', outDir, path.join(db.MEDIA_DIR, m.file)], { windowsHide: true });
  const timer = setTimeout(() => p.kill(), 180000);
  let err = '';
  p.stderr.on('data', (d) => { err += d; });
  p.on('error', (e) => { err += e.message; });
  p.on('close', () => {
    clearTimeout(timer);
    try {
      const pdf = fs.readdirSync(outDir).find((f) => f.toLowerCase().endsWith('.pdf'));
      if (!pdf) throw new Error('Hasil PDF tidak ditemukan. ' + err);
      const nama = m.file.replace(/\.pptx?$/i, '') + '.pdf';
      fs.copyFileSync(path.join(outDir, pdf), path.join(db.MEDIA_DIR, nama));
      db.run(`UPDATE media SET file_pdf = ?, konversi = 'ok' WHERE id = ?`, nama, m.id);
    } catch (e) {
      db.run(`UPDATE media SET konversi = 'gagal' WHERE id = ?`, m.id);
      db.logError('konversi PPT', e);
    } finally { fs.rmSync(outDir, { recursive: true, force: true }); }
  });
}

const fmtUkuran = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

r.get('/media', (req, res) => {
  const jenis = JENIS_MEDIA[req.query.jenis] ? req.query.jenis : '';
  const q = String(req.query.q || '').trim();
  const where = []; const p = [];
  if (jenis) { where.push('m.jenis = ?'); p.push(jenis); }
  if (q) { where.push('(m.judul LIKE ? OR m.nama_asli LIKE ? OR m.sumber LIKE ?)'); p.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const list = db.all(`SELECT m.*, (SELECT COUNT(*) FROM komponen k WHERE k.media_id = m.id) AS dipakai FROM media m ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY m.created_at DESC, m.id DESC`, ...p);
  const total = db.get('SELECT COALESCE(SUM(ukuran),0) AS n FROM media').n;
  const jumlah = Object.fromEntries(db.all('SELECT jenis, COUNT(*) AS n FROM media GROUP BY jenis').map((x) => [x.jenis, x.n]));
  const semua = Object.values(jumlah).reduce((a, b) => a + b, 0);
  const tabUrl = (j) => '/media' + (j || q ? '?' + new URLSearchParams({ ...(j ? { jenis: j } : {}), ...(q ? { q } : {}) }) : '');
  const body = html`
  ${pageHead({
    title: 'Pustaka Media',
    desc: html`${semua} media · ${fmtUkuran(total)}. Satu media bisa dipakai di banyak layar.`,
  })}
  <details class="card upload-card" id="unggah" ${req.query.unggah ? 'open' : ''}>
    <summary><b>${icon('upload')}Unggah media baru</b></summary>
    <form method="post" action="/media" enctype="multipart/form-data" class="stack" data-upload>
      <label>Berkas <small class="muted">(JPG/PNG/SVG, GIF, animasi .html, MP4 maks. 720p, MP3, PDF, PPT/PPTX)</small>
        <input type="file" name="berkas" required accept=".jpg,.jpeg,.png,.svg,.gif,.webp,.mp4,.webm,.m4v,.mp3,.wav,.ogg,.m4a,.pdf,.ppt,.pptx,.html,.htm"></label>
      <div class="grid2"><label>Judul<input name="judul" required></label><label>Sumber<input name="sumber" placeholder="mis. Foto sendiri, video buatan guru"></label></div>
      <label>Lisensi<input name="lisensi" placeholder="mis. Milik sekolah / CC BY 4.0"></label>
      <button class="btn primary">Unggah</button>
      <progress hidden max="100" value="0"></progress>
    </form>
    <p class="muted small">Hak cipta: utamakan media buatan sendiri atau berlisensi terbuka. Jangan menyematkan YouTube karena butuh internet.</p>
    ${cariSoffice() ? '' : html`<div class="net-note off"><span class="net-dot"></span><div><b>PPT belum bisa ditayangkan langsung.</b> Konversi PPT → PDF belum aktif. ${req.user.role === 'admin' ? html`Aktifkan di <a href="/admin/pengaturan#ppt">Admin → Pengaturan</a>, tetapi <b>hubungkan laptop server ke internet dulu</b> karena perlu mengunduh LibreOffice.` : 'Minta Admin mengaktifkannya (butuh internet sekali saat memasang).'} Sementara itu, unggah versi PDF (PowerPoint: <i>File → Save As → PDF</i>).</div></div>`}
  </details>
  <nav class="type-tabs" aria-label="Saring jenis media">
    <a href="${tabUrl('')}" class="${jenis ? '' : 'on'}">Semua (${semua})</a>
    ${Object.entries(JENIS_MEDIA).filter(([k]) => jumlah[k] || k === jenis).map(([k, v]) => html`<a href="${tabUrl(k)}" class="${k === jenis ? 'on' : ''}">${v} (${jumlah[k] || 0})</a>`)}
  </nav>
  <form class="row filter" method="get" style="margin-bottom:1rem">
    ${jenis ? html`<input type="hidden" name="jenis" value="${jenis}">` : ''}
    <input name="q" value="${q}" placeholder="Cari judul atau sumber media…" aria-label="Cari media">
    <button class="btn">Cari</button>
  </form>
  ${!list.length ? html`<div class="card empty">Belum ada media${jenis || q ? ' yang cocok' : ''}. <a href="/media?unggah=1#unggah">Unggah media</a>.</div>` : ''}
  <div class="media-grid">
    ${list.map((m) => html`<a class="media-card" href="/media/${m.id}">
      <span class="mc-thumb">${thumb(m)}${m.jenis === 'gambar' ? '' : html`<span class="mc-type">${JENIS_MEDIA[m.jenis]}</span>`}</span>
      <span class="mc-info"><b>${m.judul}</b><small>${m.dipakai ? `Dipakai di ${m.dipakai} layar` : 'Belum dipakai'}</small></span>
    </a>`)}
  </div>`;
  res.send(page({ title: 'Pustaka Media', user: req.user, body, active: 'media', pesan: req.query.pesan, galat: req.query.galat }));
});

r.post('/media', (req, res, next) => {
  upload.single('berkas')(req, res, (err) => {
    const kembali = req.body && toInt(req.body.pasang_ke) ? `/komponen/${toInt(req.body.pasang_ke)}/edit` : '/media';
    if (err) {
      const msg = err.message === 'JENIS_TIDAK_DIDUKUNG' ? 'Jenis berkas tidak didukung.' : (err.code === 'LIMIT_FILE_SIZE' ? 'Berkas terlalu besar (maks. 700 MB).' : 'Gagal mengunggah: ' + err.message);
      return res.redirect(kembali + '?galat=' + encodeURIComponent(msg));
    }
    if (!req.file) return res.redirect(kembali + '?galat=' + encodeURIComponent('Pilih berkas dulu.'));
    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const jenis = EXT_JENIS[ext];
      const judul = String(req.body.judul || '').trim() || path.basename(req.file.originalname, ext);
      const id = Number(db.run('INSERT INTO media (file, nama_asli, judul, jenis, mime, ukuran, sumber, lisensi) VALUES (?,?,?,?,?,?,?,?)',
        req.file.filename, req.file.originalname, judul, jenis, req.file.mimetype || '', req.file.size, String(req.body.sumber || '').trim(), String(req.body.lisensi || '').trim()).lastInsertRowid);
      if (jenis === 'ppt') konversiPpt(id);
      const kompId = toInt(req.body.pasang_ke);
      if (kompId && db.get('SELECT id FROM komponen WHERE id = ?', kompId)) {
        db.run('UPDATE komponen SET media_id = ? WHERE id = ?', id, kompId);
        return res.redirect(`/komponen/${kompId}/edit?pesan=` + encodeURIComponent('Media diunggah dan dipasang di layar ini.'));
      }
      res.redirect(`/media/${id}?pesan=` + encodeURIComponent(jenis === 'ppt' ? 'PPT diunggah. Konversi ke PDF sedang berjalan.' : 'Media diunggah.'));
    } catch (e) { next(e); }
  });
});

r.get('/media/:id', (req, res) => {
  const m = db.get('SELECT * FROM media WHERE id = ?', toInt(req.params.id));
  if (!m) return res.redirect('/media');
  const pakai = db.all(`SELECT k.id, k.judul, s.id AS sid, s.judul AS subbab, b.kelas_id FROM komponen k JOIN subbab s ON s.id = k.subbab_id JOIN bab b ON b.id = s.bab_id WHERE k.media_id = ? ORDER BY b.kelas_id, s.judul`, m.id);
  const body = html`
  ${pageHead({ crumb: html`<a href="/media">Pustaka Media</a>`, title: m.judul, desc: 'Pratinjau ini sama dengan tampilan media saat disajikan di kelas.' })}
  ${m.jenis === 'video' && m.ukuran > 150 * 1048576 ? html`<div class="flash warn">⚠️ Video ini berukuran <b>${fmtUkuran(m.ukuran)}</b>. Video sebesar ini bisa tersendat jika diputar di HP atau di banyak perangkat sekaligus. Sebaiknya kompres menjadi MP4 720p (misalnya dengan HandBrake, preset "Fast 720p30") lalu unggah ulang.</div>` : ''}
  <div class="grid-edit" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">
    <section class="media-view">${renderFigure(m)}</section>
    <section class="card">
      <h2>Keterangan media</h2>
      <form method="post" action="/media/${m.id}" class="stack">
        <label>Judul<input name="judul" value="${m.judul}" required></label>
        <label>Sumber<input name="sumber" value="${m.sumber}"></label>
        <label>Lisensi<input name="lisensi" value="${m.lisensi}"></label>
        <button class="btn primary">Simpan</button>
      </form>
      <hr>
      <p class="small muted">Jenis: ${JENIS_MEDIA[m.jenis]} · ${fmtUkuran(m.ukuran)} · Berkas asli: ${m.nama_asli} · Diunggah ${m.created_at}</p>
      ${m.jenis === 'ppt' ? html`<p class="small">Konversi ke PDF: <b>${{ ok: 'Berhasil', proses: 'Sedang berjalan…', gagal: 'Gagal', 'tidak-ada': 'Belum aktif (LibreOffice belum terpasang)' }[m.konversi] || '-'}</b></p>
        ${m.konversi === 'proses' ? html`<span data-autorefresh="5"></span>` : ''}
        ${!cariSoffice() ? html`<p class="small muted">${req.user.role === 'admin' ? html`Aktifkan konversi di <a href="/admin/pengaturan#ppt">Admin → Pengaturan</a> (hubungkan laptop server ke internet dulu).` : 'Minta Admin mengaktifkan konversi PPT (butuh internet sekali saat memasang).'}</p>`
          : (m.konversi !== 'proses' ? html`<form method="post" action="/media/${m.id}/konversi"><button class="btn small">Konversi ulang ke PDF</button></form>` : '')}` : ''}
      <h3>Dipakai di ${pakai.length} layar</h3>
      <ul>${pakai.map((p) => html`<li><a href="/komponen/${p.id}/edit">Kelas ${p.kelas_id} · ${p.subbab} › ${p.judul}</a></li>`)}</ul>
      <hr>
      <form method="post" action="/media/${m.id}/hapus" data-confirm="${pakai.length ? `Media ini dipakai di ${pakai.length} layar. Tetap hapus?` : 'Hapus media ini?'}"><button class="btn danger small">Hapus media</button></form>
    </section>
  </div>`;
  res.send(page({ title: m.judul, user: req.user, body, active: 'media', pesan: req.query.pesan }));
});

r.post('/media/:id', (req, res) => {
  const m = db.get('SELECT * FROM media WHERE id = ?', toInt(req.params.id));
  if (!m) return res.redirect('/media');
  db.run('UPDATE media SET judul = ?, sumber = ?, lisensi = ? WHERE id = ?', String(req.body.judul || m.judul).trim(), String(req.body.sumber || '').trim(), String(req.body.lisensi || '').trim(), m.id);
  res.redirect(`/media/${m.id}?pesan=` + encodeURIComponent('Disimpan.'));
});
r.post('/media/:id/konversi', (req, res) => {
  const m = db.get('SELECT * FROM media WHERE id = ?', toInt(req.params.id));
  if (m && m.jenis === 'ppt') konversiPpt(m.id);
  res.redirect(`/media/${toInt(req.params.id)}?pesan=` + encodeURIComponent('Konversi dimulai.'));
});
r.post('/media/:id/hapus', (req, res) => {
  const m = db.get('SELECT * FROM media WHERE id = ?', toInt(req.params.id));
  if (!m) return res.redirect('/media');
  db.run('DELETE FROM media WHERE id = ?', m.id);
  for (const f of [m.file, m.file_pdf].filter(Boolean)) fs.rm(path.join(db.MEDIA_DIR, f), { force: true }, () => {});
  res.redirect('/media?pesan=' + encodeURIComponent('Media dihapus.'));
});

module.exports = r;
module.exports.cariSoffice = cariSoffice;
module.exports.konversiPpt = konversiPpt;
// Setelah LibreOffice terpasang: ubah semua PPT yang belum punya PDF
module.exports.konversiTertunda = () => db.all("SELECT id FROM media WHERE jenis = 'ppt' AND (file_pdf IS NULL OR file_pdf = '') AND konversi != 'proses'").forEach((m) => konversiPpt(m.id));
