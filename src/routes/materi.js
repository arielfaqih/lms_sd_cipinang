// Struktur materi, kelola konten, penyaji, dan kegiatan kelas (F3–F5, F7, F11)
'use strict';
const express = require('express');
const db = require('../db');
const { html, raw, esc, page, pageHead, icon, sanitize, stripTags, JENIS_KOMPONEN, JENIS_MAP, JENIS_SOAL, JUMLAH_TEMPLAT, isiBawaan } = require('../html');
const { renderMedia, renderFigure, thumb } = require('../mediaview');

const r = express.Router();
const toInt = (v) => parseInt(v, 10) || 0;
const back = (res, url, pesan, k = 'pesan') => res.redirect(url + (url.includes('?') ? '&' : '?') + k + '=' + encodeURIComponent(pesan));

// ---------- pembantu urutan ----------
function rapikan(table, scopeCol, scopeVal) {
  const rows = db.all(`SELECT id FROM ${table} WHERE ${scopeCol} = ? ORDER BY urutan, id`, scopeVal);
  rows.forEach((row, i) => db.run(`UPDATE ${table} SET urutan = ? WHERE id = ?`, i + 1, row.id));
  return rows.map((x) => x.id);
}
function geser(table, scopeCol, id, arah) {
  const row = db.get(`SELECT ${scopeCol} AS scope FROM ${table} WHERE id = ?`, id);
  if (!row) return;
  db.tx(() => {
    const ids = rapikan(table, scopeCol, row.scope);
    const i = ids.indexOf(id);
    const j = arah === 'naik' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    db.run(`UPDATE ${table} SET urutan = ? WHERE id = ?`, j + 1, ids[i]);
    db.run(`UPDATE ${table} SET urutan = ? WHERE id = ?`, i + 1, ids[j]);
  });
}
const nextUrutan = (table, scopeCol, v) => (db.get(`SELECT COALESCE(MAX(urutan),0)+1 AS n FROM ${table} WHERE ${scopeCol} = ?`, v).n);

function getSubbab(id) {
  return db.get(`SELECT s.*, b.judul AS bab, b.kelas_id, b.id AS bab_id FROM subbab s JOIN bab b ON b.id = s.bab_id WHERE s.id = ?`, id);
}
function touch(subbabId) { db.run(`UPDATE subbab SET updated_at = datetime('now','localtime') WHERE id = ?`, subbabId); }

function buatSubbab(babId, judul, tujuan = '') {
  return db.tx(() => {
    const id = Number(db.run('INSERT INTO subbab (bab_id, judul, urutan, tujuan) VALUES (?, ?, ?, ?)', babId, judul, nextUrutan('subbab', 'bab_id', babId), tujuan).lastInsertRowid);
    JENIS_KOMPONEN.forEach((j, i) => db.run('INSERT INTO komponen (subbab_id, urutan, jenis, judul, isi_html) VALUES (?, ?, ?, ?, ?)', id, i + 1, j.key, j.label, isiBawaan(j.key)));
    return id;
  });
}

// ---------- F3/F4: halaman kelas ----------
r.get('/kelas/:id', (req, res) => {
  const kelas = db.get('SELECT * FROM kelas WHERE id = ?', toInt(req.params.id));
  if (!kelas) return res.redirect('/');
  const edit = req.query.atur === '1';
  const babs = db.all('SELECT * FROM bab WHERE kelas_id = ? ORDER BY urutan, id', kelas.id);
  const subs = db.all(`SELECT s.*, (SELECT COUNT(*) FROM soal q WHERE q.subbab_id = s.id AND q.status='disetujui') AS soal
    FROM subbab s JOIN bab b ON b.id = s.bab_id WHERE b.kelas_id = ? ORDER BY s.urutan, s.id`, kelas.id);
  const faseB = kelas.fase === 'B';
  const nUlang = faseB ? babs.filter((b) => b.atp_kelas === 3).length : 0;
  const body = html`
  <div class="kelas-hero k${kelas.id}">
    <span class="kelas-num">${kelas.id}</span>
    <div class="ph-text"><p class="crumb"><a href="/">Beranda</a> › Fase ${kelas.fase}</p><h1>Materi ${kelas.nama}</h1>
      <p class="ph-desc">${edit ? 'Mode mengatur: tambah, ganti nama, urutkan (▲▼), atau hapus bab dan subbab.' : 'Pilih subbab yang akan diajarkan, lalu klik Sajikan untuk menampilkannya di layar kelas.'}</p></div>
    <div class="row">
      ${edit ? html`<a class="btn primary" href="/kelas/${kelas.id}">${icon('check')}Selesai mengatur</a>` : html`<a class="btn" href="/kelas/${kelas.id}?atur=1">${icon('edit')}Atur bab & subbab</a>`}
    </div>
  </div>
  ${edit ? '' : html`<div class="legend" aria-label="Arti tombol">
    <span><span class="chip pri">▶ Sajikan</span> tampilkan ke siswa</span>
    <span><span class="chip">Edit</span> ubah isi &amp; media</span>
    <span><span class="chip">Soal</span> lihat soal subbab</span>
    <span><span class="chip">LKPD</span> cetak lembar kerja</span>
    <span><span class="tag draf">Draf</span> belum selesai disusun</span>
  </div>`}
  ${faseB ? html`<div class="atp-box">
    <b>Fase B mencakup kelas 3 dan 4.</b> CP tidak membagi topik per kelas; pembagiannya ditentukan oleh <b>ATP sekolah</b>.
    ${nUlang ? html`Menurut ATP yang ditandai, <b>${nUlang} bab</b> sudah diajarkan di kelas 3 sehingga di kelas 4 menjadi <b>pengulangan/penguatan</b>.` : 'Saat ini semua bab ditandai diajarkan di kelas 4.'}
    ${edit ? html`Atur di kolom <b>Menurut ATP sekolah</b> pada setiap bab di bawah.` : html`<a href="/kelas/${kelas.id}?atur=1">Cocokkan dengan ATP sekolah</a> · <a href="https://guru.kemendikdasmen.go.id/kurikulum/referensi-penerapan/capaian-pembelajaran/sd-sma/ilmu-pengetahuan-alam-dan-sosial-ipas/fase-b/" target="_blank" rel="noopener">Contoh ATP resmi (butuh internet) ↗</a>`}
  </div>` : ''}
  ${!babs.length ? html`<div class="card empty">Belum ada bab. ${edit ? '' : html`<a href="/kelas/${kelas.id}?atur=1">Tambahkan bab pertama</a>.`}</div>` : ''}
  ${babs.map((b, bi) => {
    const list = subs.filter((s) => s.bab_id === b.id);
    const ulang = faseB && b.atp_kelas === 3;
    return html`<section class="card bab ${ulang ? 'bab-ulang' : ''}">
      <div class="bab-head">
        <h2><span class="bab-no">Bab ${bi + 1}</span> ${b.judul}${ulang ? html` <span class="tag ulang" title="Menurut ATP sekolah, topik ini sudah diajarkan di kelas 3">↺ Pengulangan dari kelas 3</span>` : ''}</h2>
        ${edit && faseB ? html`<form method="post" action="/bab/${b.id}/atp" class="row atp-form">
          <label class="atp-lbl">Menurut ATP sekolah
            <select name="atp_kelas" onchange="this.form.submit()">
              <option value="" ${ulang ? '' : 'selected'}>Diajarkan di kelas 4</option>
              <option value="3" ${ulang ? 'selected' : ''}>Sudah di kelas 3 (pengulangan di kelas 4)</option>
            </select></label>
          <noscript><button class="btn small">Simpan</button></noscript>
        </form>` : ''}
        ${edit ? html`<div class="row tools">
          <form method="post" action="/bab/${b.id}/geser"><input type="hidden" name="arah" value="naik"><button class="btn icon" title="Naikkan" ${bi === 0 ? 'disabled' : ''}>▲</button></form>
          <form method="post" action="/bab/${b.id}/geser"><input type="hidden" name="arah" value="turun"><button class="btn icon" title="Turunkan" ${bi === babs.length - 1 ? 'disabled' : ''}>▼</button></form>
          <form method="post" action="/bab/${b.id}/ubah" class="row inline-edit"><input name="judul" value="${b.judul}" aria-label="Judul bab" required><button class="btn small">Ganti nama</button></form>
          <form method="post" action="/bab/${b.id}/hapus" data-confirm="Hapus bab “${b.judul}” beserta semua subbab, materi, dan soalnya?"><button class="btn small danger">Hapus</button></form>
        </div>` : ''}
      </div>
      <ol class="sub-list">
        ${list.map((s, si) => html`<li class="sub ${s.status}">
          <div class="sub-main">
            <span class="sub-idx" aria-hidden="true">${si + 1}</span>
            <span class="sub-txt">
              <span class="sub-title">${s.judul}</span>
              <span class="sub-meta">${s.status === 'draf' ? html`<span class="tag draf">Draf</span>` : html`<span class="tag terbit">Siap</span>`}<span>${s.soal} soal siap</span></span>
            </span>
          </div>
          <div class="sub-act">
            ${edit ? html`
              <form method="post" action="/subbab/${s.id}/geser"><input type="hidden" name="arah" value="naik"><button class="btn icon" ${si === 0 ? 'disabled' : ''} title="Naikkan">▲</button></form>
              <form method="post" action="/subbab/${s.id}/geser"><input type="hidden" name="arah" value="turun"><button class="btn icon" ${si === list.length - 1 ? 'disabled' : ''} title="Turunkan">▼</button></form>` : ''}
            <a class="btn small" href="/subbab/${s.id}/edit">${icon('edit')}Edit</a>
            <a class="btn small" href="/soal?subbab=${s.id}">${icon('quiz')}Soal</a>
            <a class="btn small" href="/subbab/${s.id}/lkpd" title="Cetak Lembar Kerja Peserta Didik">${icon('print')}LKPD</a>
            <a class="btn primary" href="/sajikan/${s.id}">${icon('play')}Sajikan</a>
          </div>
        </li>`)}
        ${!list.length ? html`<li class="sub"><span class="muted">Belum ada subbab di bab ini.${edit ? '' : html` <a href="/kelas/${kelas.id}?atur=1">Tambah subbab</a>.`}</span></li>` : ''}
      </ol>
      ${edit ? html`<form method="post" action="/subbab" class="row add-row"><input type="hidden" name="bab_id" value="${b.id}"><input name="judul" placeholder="Judul subbab baru" required><button class="btn small primary">+ Subbab</button></form>` : ''}
    </section>`;
  })}
  ${edit ? html`<form method="post" action="/bab" class="card row add-row"><input type="hidden" name="kelas_id" value="${kelas.id}"><input name="judul" placeholder="Judul bab baru" required><button class="btn primary">+ Tambah bab</button></form>` : ''}`;
  res.send(page({ title: kelas.nama, user: req.user, body, active: 'k' + kelas.id, pesan: req.query.pesan }));
});

r.post('/bab', (req, res) => {
  const kelasId = toInt(req.body.kelas_id);
  const judul = String(req.body.judul || '').trim();
  if (judul && db.get('SELECT id FROM kelas WHERE id = ?', kelasId)) db.run('INSERT INTO bab (kelas_id, judul, urutan) VALUES (?, ?, ?)', kelasId, judul, nextUrutan('bab', 'kelas_id', kelasId));
  res.redirect(`/kelas/${kelasId}?atur=1`);
});
r.post('/bab/:id/ubah', (req, res) => {
  const b = db.get('SELECT * FROM bab WHERE id = ?', toInt(req.params.id));
  if (!b) return res.redirect('/');
  const judul = String(req.body.judul || '').trim();
  if (judul) db.run('UPDATE bab SET judul = ? WHERE id = ?', judul, b.id);
  res.redirect(`/kelas/${b.kelas_id}?atur=1`);
});
// Penanda ATP sekolah untuk Fase B: bab sudah diajarkan di kelas 3 atau diajarkan di kelas 4
r.post('/bab/:id/atp', (req, res) => {
  const b = db.get('SELECT * FROM bab WHERE id = ?', toInt(req.params.id));
  if (!b) return res.redirect('/');
  db.run('UPDATE bab SET atp_kelas = ? WHERE id = ?', toInt(req.body.atp_kelas) === 3 ? 3 : null, b.id);
  back(res, `/kelas/${b.kelas_id}?atur=1`, `Bab “${b.judul}” ditandai: ${toInt(req.body.atp_kelas) === 3 ? 'sudah diajarkan di kelas 3 (pengulangan di kelas 4)' : 'diajarkan di kelas 4'}.`);
});
r.post('/bab/:id/geser', (req, res) => {
  const b = db.get('SELECT * FROM bab WHERE id = ?', toInt(req.params.id));
  if (!b) return res.redirect('/');
  geser('bab', 'kelas_id', b.id, req.body.arah);
  res.redirect(`/kelas/${b.kelas_id}?atur=1`);
});
r.post('/bab/:id/hapus', (req, res) => {
  const b = db.get('SELECT * FROM bab WHERE id = ?', toInt(req.params.id));
  if (!b) return res.redirect('/');
  db.run('DELETE FROM bab WHERE id = ?', b.id);
  back(res, `/kelas/${b.kelas_id}?atur=1`, 'Bab dihapus.');
});

r.post('/subbab', (req, res) => {
  const b = db.get('SELECT * FROM bab WHERE id = ?', toInt(req.body.bab_id));
  const judul = String(req.body.judul || '').trim();
  if (!b || !judul) return res.redirect('back');
  const id = buatSubbab(b.id, judul);
  back(res, `/subbab/${id}/edit`, `Subbab dibuat dengan templat ${JUMLAH_TEMPLAT} layar. Isi setiap layar secara berurutan.`);
});
r.post('/subbab/:id/geser', (req, res) => {
  const s = getSubbab(toInt(req.params.id));
  if (!s) return res.redirect('/');
  geser('subbab', 'bab_id', s.id, req.body.arah);
  res.redirect(`/kelas/${s.kelas_id}?atur=1`);
});
r.post('/subbab/:id/hapus', (req, res) => {
  const s = getSubbab(toInt(req.params.id));
  if (!s) return res.redirect('/');
  db.run('DELETE FROM subbab WHERE id = ?', s.id);
  back(res, `/kelas/${s.kelas_id}`, `Subbab “${s.judul}” dihapus.`);
});

// ---------- F11: edit subbab ----------
function cekTemplat(komps, mediaMap) {
  const ada = new Set(komps.map((k) => k.jenis));
  const kurang = JENIS_KOMPONEN.filter((j) => !ada.has(j.key)).map((j) => j.label);
  const kosong = komps.filter((k) => k.jenis !== 'penilaian' && !stripTags(k.isi_html) && !k.media_id && !k.kegiatan_json).map((k) => k.judul || JENIS_MAP[k.jenis].label);
  const adaVisual = komps.some((k) => k.media_id && mediaMap[k.media_id] && ['gambar', 'video', 'animasi'].includes(mediaMap[k.media_id].jenis)) || komps.some((k) => /<img\b/i.test(k.isi_html));
  const adaTeks = komps.some((k) => stripTags(k.isi_html).length > 0);
  const padat = komps.filter((k) => (k.isi_html.match(/<li\b/gi) || []).length > 4 || stripTags(k.isi_html).split(' ').length > 90).map((k) => k.judul);
  return { kurang, kosong, adaVisual, adaTeks, padat };
}

r.get('/subbab/:id/edit', (req, res) => {
  const s = getSubbab(toInt(req.params.id));
  if (!s) return res.redirect('/');
  const komps = db.all('SELECT * FROM komponen WHERE subbab_id = ? ORDER BY urutan, id', s.id);
  const mediaIds = komps.map((k) => k.media_id).filter(Boolean);
  const mediaMap = {};
  if (mediaIds.length) db.all(`SELECT * FROM media WHERE id IN (${mediaIds.map(() => '?').join(',')})`, ...mediaIds).forEach((m) => { mediaMap[m.id] = m; });
  const babs = db.all('SELECT * FROM bab WHERE kelas_id = ? ORDER BY urutan', s.kelas_id);
  const cek = cekTemplat(komps, mediaMap);
  const body = html`
  ${pageHead({
    crumb: html`<a href="/kelas/${s.kelas_id}">Kelas ${s.kelas_id}</a> › ${s.bab}`,
    title: html`${s.judul} ${s.status === 'draf' ? html`<span class="tag draf">Draf</span>` : html`<span class="tag terbit">Terbit</span>`}`,
    desc: 'Susun isi subbab ini. Setiap baris di kanan adalah satu layar yang akan tampil saat menyajikan.',
    actions: html`<a class="btn" href="/subbab/${s.id}/lkpd">${icon('print')}Cetak LKPD</a><a class="btn primary" href="/sajikan/${s.id}?dari=edit">${icon('play')}Pratinjau / Sajikan</a>`,
  })}
  <ol class="steps-bar" aria-label="Langkah menyusun">
    <li>Isi info &amp; tujuan</li><li>Klik <b>Edit</b> di tiap layar</li><li>Pratinjau</li><li>Ubah status ke <b>Terbit</b></li>
  </ol>
  <div class="grid-edit">
    <section class="card">
      <h2>Info subbab</h2>
      <form method="post" action="/subbab/${s.id}" class="stack">
        <label>Judul subbab<input name="judul" value="${s.judul}" required></label>
        <label>Bab<select name="bab_id">${babs.map((b) => html`<option value="${b.id}" ${b.id === s.bab_id ? 'selected' : ''}>${b.judul}</option>`)}</select></label>
        <label>Tujuan pembelajaran <small class="muted">(2–3 kalimat; juga dipakai AI saat membuat soal)</small><textarea name="tujuan" rows="4">${s.tujuan}</textarea></label>
        <fieldset class="seg"><legend>Status</legend>
          <label><input type="radio" name="status" value="draf" ${s.status === 'draf' ? 'checked' : ''}> Draf <small>(hanya terlihat sebagai draf)</small></label>
          <label><input type="radio" name="status" value="terbit" ${s.status === 'terbit' ? 'checked' : ''}> Terbit</label>
        </fieldset>
        <button class="btn primary">Simpan info</button>
      </form>
      <hr>
      <h3>Pemeriksaan templat</h3>
      <ul class="checks">
        <li class="${cek.kurang.length ? 'no' : 'yes'}">${cek.kurang.length ? `Komponen belum ada: ${cek.kurang.join(', ')}` : `Semua ${JUMLAH_TEMPLAT} layar templat ada`}</li>
        <li class="${cek.kosong.length ? 'no' : 'yes'}">${cek.kosong.length ? `Belum diisi: ${cek.kosong.join(', ')}` : 'Semua komponen sudah diisi'}</li>
        <li class="${cek.adaVisual ? 'yes' : 'no'}">Minimal satu media visual (gambar/video/animasi)</li>
        <li class="${cek.adaTeks ? 'yes' : 'no'}">Minimal satu teks singkat</li>
        <li class="${cek.padat.length ? 'no' : 'yes'}">${cek.padat.length ? `Terlalu padat (>4 poin atau teks panjang): ${cek.padat.join(', ')}` : 'Tiap layar tidak terlalu padat'}</li>
      </ul>
      <hr>
      <form method="post" action="/subbab/${s.id}/hapus" data-confirm="Hapus subbab ini beserta materi dan soalnya?"><button class="btn danger small">Hapus subbab</button></form>
    </section>

    <section class="card">
      <h2>Layar-layar materi (${komps.length})</h2>
      <p class="muted small">Urutan mengikuti templat: fenomena nyata → gambar/animasi → istilah. Gunakan ▲▼ untuk memindah urutan.</p>
      <ol class="komp-list">
        ${komps.map((k, i) => {
          const j = JENIS_MAP[k.jenis] || { label: k.jenis };
          const m = k.media_id ? mediaMap[k.media_id] : null;
          const teks = stripTags(k.isi_html);
          return html`<li class="komp">
            <div class="komp-thumb">${m ? thumb(m) : html`<span class="thumb-label">${i + 1}</span>`}</div>
            <div class="komp-body">
              <span class="tag j-${k.jenis}">${j.label}</span>
              <b>${k.judul}</b>
              <span class="muted small">${k.jenis === 'penilaian' ? 'Menampilkan soal yang disetujui dari bank soal' : (teks ? teks.slice(0, 110) + (teks.length > 110 ? '…' : '') : (m ? '' : 'Belum diisi'))}${k.kegiatan_json ? ' · ada kegiatan kelas' : ''}</span>
            </div>
            <div class="row komp-tools">
              <form method="post" action="/komponen/${k.id}/geser"><input type="hidden" name="arah" value="naik"><button class="btn icon" ${i === 0 ? 'disabled' : ''} title="Naikkan">▲</button></form>
              <form method="post" action="/komponen/${k.id}/geser"><input type="hidden" name="arah" value="turun"><button class="btn icon" ${i === komps.length - 1 ? 'disabled' : ''} title="Turunkan">▼</button></form>
              <a class="btn small primary" href="/komponen/${k.id}/edit">${icon('edit')}Edit</a>
              <form method="post" action="/komponen/${k.id}/hapus" data-confirm="Hapus komponen “${k.judul}”?"><button class="btn small danger" title="Hapus">✕</button></form>
            </div>
          </li>`;
        })}
      </ol>
      <form method="post" action="/subbab/${s.id}/komponen" class="row add-row">
        <select name="jenis" aria-label="Jenis komponen">${JENIS_KOMPONEN.map((j) => html`<option value="${j.key}">${j.label}</option>`)}</select>
        <button class="btn primary small">+ Tambah layar</button>
      </form>
      <p class="muted small">Tip: satu konsep per layar. Jika penjelasan konsep panjang, tambah layar “Penjelasan Konsep” kedua daripada memadatkan satu layar.</p>
    </section>
  </div>`;
  res.send(page({ title: 'Edit ' + s.judul, user: req.user, body, active: 'k' + s.kelas_id, pesan: req.query.pesan }));
});

r.post('/subbab/:id', (req, res) => {
  const s = getSubbab(toInt(req.params.id));
  if (!s) return res.redirect('/');
  const judul = String(req.body.judul || '').trim() || s.judul;
  const status = req.body.status === 'terbit' ? 'terbit' : 'draf';
  const bab = db.get('SELECT * FROM bab WHERE id = ? AND kelas_id = ?', toInt(req.body.bab_id), s.kelas_id);
  const babId = bab ? bab.id : s.bab_id;
  db.run(`UPDATE subbab SET judul = ?, tujuan = ?, status = ?, bab_id = ?, urutan = CASE WHEN bab_id = ? THEN urutan ELSE ? END, updated_at = datetime('now','localtime') WHERE id = ?`,
    judul, String(req.body.tujuan || '').trim(), status, babId, babId, nextUrutan('subbab', 'bab_id', babId), s.id);
  // Sinkronkan teks komponen "Tujuan" bila masih kosong
  const kt = db.get(`SELECT id, isi_html FROM komponen WHERE subbab_id = ? AND jenis = 'tujuan' ORDER BY urutan LIMIT 1`, s.id);
  if (kt && !stripTags(kt.isi_html) && req.body.tujuan) {
    db.run('UPDATE komponen SET isi_html = ? WHERE id = ?', `<p>${String(req.body.tujuan).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])).replace(/\n+/g, '</p><p>')}</p>`, kt.id);
  }
  back(res, `/subbab/${s.id}/edit`, 'Info subbab disimpan.');
});

r.post('/subbab/:id/komponen', (req, res) => {
  const s = getSubbab(toInt(req.params.id));
  if (!s) return res.redirect('/');
  const j = JENIS_MAP[req.body.jenis] ? req.body.jenis : 'penjelasan';
  // Sisipkan setelah komponen terakhir dengan jenis yang sama agar urutan templat terjaga
  const id = db.tx(() => {
    const ids = rapikan('komponen', 'subbab_id', s.id);
    const rows = db.all('SELECT id, jenis, urutan FROM komponen WHERE subbab_id = ? ORDER BY urutan', s.id);
    const orderIdx = JENIS_KOMPONEN.findIndex((x) => x.key === j);
    let pos = rows.length;
    for (let i = rows.length - 1; i >= 0; i--) {
      const oi = JENIS_KOMPONEN.findIndex((x) => x.key === rows[i].jenis);
      if (oi <= orderIdx) { pos = i + 1; break; }
      if (i === 0) pos = 0;
    }
    db.run('UPDATE komponen SET urutan = urutan + 1 WHERE subbab_id = ? AND urutan > ?', s.id, pos);
    return Number(db.run('INSERT INTO komponen (subbab_id, urutan, jenis, judul) VALUES (?, ?, ?, ?)', s.id, pos + 1, j, JENIS_MAP[j].label).lastInsertRowid) || ids.length;
  });
  touch(s.id);
  res.redirect(`/komponen/${id}/edit`);
});

// ---------- F11: editor komponen ----------
r.get('/komponen/:id/edit', (req, res) => {
  const k = db.get('SELECT * FROM komponen WHERE id = ?', toInt(req.params.id));
  if (!k) return res.redirect('/');
  const s = getSubbab(k.subbab_id);
  const semuaMedia = db.all('SELECT * FROM media ORDER BY created_at DESC');
  const gambar = semuaMedia.filter((m) => m.jenis === 'gambar');
  const media = k.media_id ? semuaMedia.find((m) => m.id === k.media_id) : null;
  const j = JENIS_MAP[k.jenis] || JENIS_MAP.penjelasan;
  let keg = {};
  try { keg = k.kegiatan_json ? JSON.parse(k.kegiatan_json) : {}; } catch (e) { keg = {}; }
  const adaKeg = !!k.kegiatan_json;
  const kegDefault = ['pengamatan', 'latihan'].includes(k.jenis);
  const posisi = db.all('SELECT id FROM komponen WHERE subbab_id = ? ORDER BY urutan, id', s.id).findIndex((x) => x.id === k.id);
  const groups = Object.entries({ gambar: 'Gambar', video: 'Video', animasi: 'Animasi', audio: 'Audio', pdf: 'PDF', ppt: 'PPT' });
  const body = html`
  ${pageHead({
    crumb: html`<a href="/kelas/${s.kelas_id}">Kelas ${s.kelas_id}</a> › <a href="/subbab/${s.id}/edit">${s.judul}</a>`,
    title: html`Layar ${posisi + 1}: ${k.judul}`,
    actions: html`<a class="btn" href="/subbab/${s.id}/edit">← Kembali ke daftar layar</a>`,
  })}
  <div class="hint-box"><b>${j.label}.</b> ${j.saran} <span class="muted">Dasar: ${j.dasar}.</span></div>

  ${k.jenis === 'penilaian' ? html`<section class="card">
    <p>Layar penilaian otomatis menampilkan soal <b>yang sudah disetujui</b> di bank soal untuk subbab ini. Guru bisa membuka jawaban satu per satu saat menyajikan.</p>
    <p class="row"><a class="btn primary" href="/soal?subbab=${s.id}">Buka bank soal subbab ini</a><a class="btn" href="/soal/buat?subbab=${s.id}">Buat soal dengan AI</a></p>
    <form method="post" action="/komponen/${k.id}" class="stack"><input type="hidden" name="jenis" value="penilaian"><label>Judul layar<input name="judul" value="${k.judul}"></label><input type="hidden" name="isi_html" value=""><button class="btn">Simpan judul</button></form>
  </section>` : html`
  <form method="post" action="/komponen/${k.id}" class="stack" id="kompForm">
    <section class="card stack">
      <div class="grid2">
        <label>Judul layar<input name="judul" value="${k.judul}" required></label>
        <label>Jenis komponen<select name="jenis">${JENIS_KOMPONEN.filter((x) => x.key !== 'penilaian').map((x) => html`<option value="${x.key}" ${x.key === k.jenis ? 'selected' : ''}>${x.label}</option>`)}</select></label>
      </div>

      <div>
        <span class="lbl">Teks singkat</span>
        <div class="rte" data-rte>
          <div class="rte-bar" role="toolbar" aria-label="Format teks">
            <button type="button" data-cmd="formatBlock" data-val="h3" title="Judul kecil">Judul</button>
            <button type="button" data-cmd="formatBlock" data-val="p" title="Paragraf">¶</button>
            <button type="button" data-cmd="bold" title="Tebal"><b>B</b></button>
            <button type="button" data-cmd="italic" title="Miring"><i>I</i></button>
            <button type="button" data-cmd="insertUnorderedList" title="Daftar poin">• Daftar</button>
            <button type="button" data-cmd="insertOrderedList" title="Daftar nomor">1. Daftar</button>
            <button type="button" data-act="istilah" title="Tandai istilah kunci">Istilah</button>
            <button type="button" data-act="tabel" title="Sisipkan tabel">Tabel</button>
            <button type="button" data-act="gambar" title="Sisipkan gambar dari pustaka">Gambar</button>
            <button type="button" data-cmd="removeFormat" title="Hapus format">⌫ Format</button>
          </div>
          <div class="rte-area" contenteditable="true" data-area>${raw(k.isi_html)}</div>
          <textarea name="isi_html" hidden>${k.isi_html}</textarea>
          <div class="rte-meter" data-meter></div>
        </div>
        <p class="muted small">Kalimat pendek. Istilah baru diberi arti sederhana (tandai dengan tombol <i>Istilah</i>). Maksimal 4 poin per layar.</p>
      </div>

      <div>
        <span class="lbl">Media utama layar ini</span>
        <div class="media-pick">
          <div class="media-prev">${media ? renderMedia(media, { ringkas: true }) : html`<span class="muted">Belum ada media</span>`}</div>
          <select name="media_id" aria-label="Pilih media">
            <option value="">— Tanpa media —</option>
            ${groups.map(([g, label]) => {
              const items = semuaMedia.filter((m) => m.jenis === g);
              return items.length ? html`<optgroup label="${label}">${items.map((m) => html`<option value="${m.id}" ${m.id === k.media_id ? 'selected' : ''}>${m.judul}</option>`)}</optgroup>` : '';
            })}
          </select>
          <a class="btn small" href="#unggah">Unggah media baru</a>
        </div>
        <p class="muted small">Media tampil di samping teks (teks dekat gambarnya). Hindari gambar dekoratif yang tidak membantu konsep.</p>
      </div>
    </section>

    <section class="card stack">
      <label class="switch"><input type="checkbox" id="kegOn" ${adaKeg || kegDefault ? 'checked' : ''}> <b>Tambahkan kegiatan kelas</b> <span class="muted small">(prediksi, langkah pengamatan, pertanyaan bertahap, kunci diskusi tersembunyi)</span></label>
      <div id="kegBox" class="stack" ${adaKeg || kegDefault ? '' : 'hidden'}>
        <label>Ayo memprediksi <small class="muted">(pertanyaan prediksi untuk siswa)</small><textarea id="kPrediksi" rows="2">${keg.prediksi || ''}</textarea></label>
        <label>Langkah pengamatan <small class="muted">(satu langkah per baris)</small><textarea id="kLangkah" rows="4">${(keg.langkah || []).join('\n')}</textarea></label>
        <label>Cara mencatat hasil<textarea id="kCatat" rows="2">${keg.catat || ''}</textarea></label>
        <div>
          <span class="lbl">Pertanyaan diskusi bertahap</span>
          <div id="kPertanyaan" class="stack"></div>
          <button type="button" class="btn small" id="kTambah">+ Pertanyaan</button>
        </div>
      </div>
      <input type="hidden" name="kegiatan_json" id="kegJson" value="${k.kegiatan_json}">
      <script type="application/json" id="kegData">${raw(JSON.stringify(keg.pertanyaan || []).replace(/</g, '\\u003c'))}</script>
    </section>

    <div class="row sticky-actions">
      <button class="btn primary big" name="lanjut" value="subbab">Simpan</button>
      <button class="btn big" name="lanjut" value="pratinjau">Simpan & pratinjau</button>
      <a class="btn" href="/subbab/${s.id}/edit">Batal</a>
    </div>
  </form>

  <dialog id="dlgGambar" class="dlg">
    <form method="dialog"><h3>Pilih gambar</h3>
      <div class="pick-grid">${gambar.length ? gambar.map((m) => html`<button value="${'/berkas/' + encodeURIComponent(m.file)}" data-alt="${m.judul}"><img src="/berkas/${encodeURIComponent(m.file)}" alt="" loading="lazy"><span>${m.judul}</span></button>`) : html`<p class="muted">Belum ada gambar di pustaka media.</p>`}</div>
      <button class="btn" value="">Tutup</button>
    </form>
  </dialog>

  <section class="card" id="unggah">
    <h2>Unggah media baru untuk layar ini</h2>
    <form method="post" action="/media" enctype="multipart/form-data" class="stack" data-upload>
      <input type="hidden" name="pasang_ke" value="${k.id}">
      <label>Berkas<input type="file" name="berkas" required accept=".jpg,.jpeg,.png,.svg,.gif,.webp,.mp4,.webm,.mp3,.wav,.ogg,.m4a,.pdf,.ppt,.pptx,.html,.htm"></label>
      <div class="grid2"><label>Judul media<input name="judul" required></label><label>Sumber<input name="sumber" placeholder="mis. Foto sendiri"></label></div>
      <label>Lisensi<input name="lisensi" placeholder="mis. Milik sekolah / CC BY 4.0"></label>
      <button class="btn primary">Unggah & pasang</button>
      <progress hidden max="100" value="0"></progress>
    </form>
  </section>`}
  <script src="/static/js/editor.js"></script>`;
  res.send(page({ title: 'Edit layar', user: req.user, body, active: 'k' + s.kelas_id, pesan: req.query.pesan, galat: req.query.galat }));
});

function bersihkanKegiatan(jsonStr) {
  if (!jsonStr) return '';
  try {
    const g = JSON.parse(jsonStr);
    const out = {
      prediksi: String(g.prediksi || '').trim().slice(0, 1000),
      langkah: (Array.isArray(g.langkah) ? g.langkah : []).map((x) => String(x).trim()).filter(Boolean).slice(0, 15),
      catat: String(g.catat || '').trim().slice(0, 1000),
      pertanyaan: (Array.isArray(g.pertanyaan) ? g.pertanyaan : []).map((p) => ({
        teks: String(p.teks || '').trim().slice(0, 1000),
        petunjuk: (Array.isArray(p.petunjuk) ? p.petunjuk : []).map((x) => String(x).trim()).filter(Boolean).slice(0, 6),
        kunci: String(p.kunci || '').trim().slice(0, 2000),
      })).filter((p) => p.teks).slice(0, 10),
    };
    if (!out.prediksi && !out.langkah.length && !out.catat && !out.pertanyaan.length) return '';
    return JSON.stringify(out);
  } catch (e) { return ''; }
}

r.post('/komponen/:id', (req, res) => {
  const k = db.get('SELECT * FROM komponen WHERE id = ?', toInt(req.params.id));
  if (!k) return res.redirect('/');
  const jenis = JENIS_MAP[req.body.jenis] ? req.body.jenis : k.jenis;
  const mediaId = toInt(req.body.media_id) || null;
  if (jenis === 'penilaian') {
    db.run('UPDATE komponen SET judul = ? WHERE id = ?', String(req.body.judul || k.judul).trim(), k.id);
  } else {
    db.run('UPDATE komponen SET judul = ?, jenis = ?, isi_html = ?, media_id = ?, kegiatan_json = ? WHERE id = ?',
      String(req.body.judul || '').trim() || JENIS_MAP[jenis].label, jenis, sanitize(req.body.isi_html), mediaId && db.get('SELECT id FROM media WHERE id = ?', mediaId) ? mediaId : null,
      bersihkanKegiatan(req.body.kegiatan_json), k.id);
  }
  touch(k.subbab_id);
  if (req.body.lanjut === 'pratinjau') {
    const pos = db.all('SELECT id FROM komponen WHERE subbab_id = ? ORDER BY urutan, id', k.subbab_id).findIndex((x) => x.id === k.id);
    return res.redirect(`/sajikan/${k.subbab_id}?slide=${pos + 1}&dari=edit`);
  }
  back(res, `/subbab/${k.subbab_id}/edit`, 'Layar disimpan.');
});
r.post('/komponen/:id/geser', (req, res) => {
  const k = db.get('SELECT * FROM komponen WHERE id = ?', toInt(req.params.id));
  if (!k) return res.redirect('/');
  geser('komponen', 'subbab_id', k.id, req.body.arah);
  res.redirect(`/subbab/${k.subbab_id}/edit`);
});
r.post('/komponen/:id/hapus', (req, res) => {
  const k = db.get('SELECT * FROM komponen WHERE id = ?', toInt(req.params.id));
  if (!k) return res.redirect('/');
  db.run('DELETE FROM komponen WHERE id = ?', k.id);
  touch(k.subbab_id);
  back(res, `/subbab/${k.subbab_id}/edit`, 'Layar dihapus.');
});

// ---------- F5/F7: penyaji materi ----------
function renderKegiatan(json) {
  if (!json) return '';
  let g;
  try { g = JSON.parse(json); } catch (e) { return ''; }
  return html`<div class="keg">
    ${g.prediksi ? html`<div class="keg-box pred"><span class="keg-lbl">🤔 Ayo memprediksi</span><p>${g.prediksi}</p></div>` : ''}
    ${g.langkah && g.langkah.length ? html`<div class="keg-box amati"><span class="keg-lbl">🔍 Ayo mengamati</span><ol class="langkah">${g.langkah.map((l) => html`<li>${l}</li>`)}</ol></div>` : ''}
    ${g.catat ? html`<div class="keg-box catat"><span class="keg-lbl">✏️ Catat hasilnya</span><p>${g.catat}</p></div>` : ''}
    ${(g.pertanyaan || []).map((p, i) => html`<div class="keg-box diskusi" data-diskusi>
      <span class="keg-lbl">💬 Diskusi ${i + 1}</span>
      <p class="q">${p.teks}</p>
      ${p.petunjuk.map((h, hi) => html`<p class="hint" hidden data-hint><b>Petunjuk ${hi + 1}</b> ${h}</p>`)}
      ${p.kunci ? html`<p class="kunci" hidden data-kunci><b>Kunci jawaban</b> ${p.kunci}</p>` : ''}
      <div class="row keg-act">
        ${p.petunjuk.length ? html`<button type="button" class="btn small" data-act="hint">Petunjuk (0/${p.petunjuk.length})</button>` : ''}
        ${p.kunci ? html`<button type="button" class="btn small" data-act="kunci">Buka kunci</button>` : ''}
      </div>
    </div>`)}
  </div>`;
}

function renderSoalPenyaji(list, subbabId) {
  if (!list.length) return html`<div class="pr-empty"><b>Belum ada soal yang disetujui untuk subbab ini.</b><span>Buat soal di <a href="/soal?subbab=${subbabId}">Bank Soal</a>, lalu klik <b>Setujui</b> agar muncul di sini.</span></div>`;
  return html`<div class="kuis-ajak"><span>Ingin menampilkan soal <b>satu per satu</b> dengan huruf besar dan timer?</span>
    <a class="btn primary" href="/soal/tayang?subbab=${subbabId}&dari=sajikan">${icon('play')}Tayangkan soal satu per satu</a></div>
  <ol class="soal-show">${list.map((q, i) => {
    const opsi = JSON.parse(q.opsi_json || '[]');
    return html`<li class="soal-card" data-diskusi>
      <div class="soal-no">${i + 1}</div>
      <div class="soal-isi">
        <p class="q">${q.pertanyaan}</p>
        ${q.jenis === 'pg' ? html`<ol class="opsi-show">${opsi.map((o, oi) => html`<li class="${'ABCD'[oi] === q.kunci ? 'benar' : ''}"><span class="huruf">${'ABCD'[oi]}</span>${o}</li>`)}</ol>` : ''}
        ${q.jenis === 'bs' ? html`<p class="bs-show"><span>Benar</span> atau <span>Salah</span>?</p>` : ''}
        <p class="kunci" hidden data-kunci><b>Jawaban:</b> ${q.jenis === 'pg' && opsi['ABCD'.indexOf(q.kunci)] ? `${q.kunci}. ${opsi['ABCD'.indexOf(q.kunci)]}` : q.kunci}${q.pembahasan ? html` — ${q.pembahasan}` : ''}</p>
        <div class="row"><span class="tag">${JENIS_SOAL[q.jenis]}</span><button type="button" class="btn small" data-act="kunci">Tampilkan jawaban</button></div>
      </div>
    </li>`;
  })}</ol>`;
}

r.get('/sajikan/:id', (req, res) => {
  const s = getSubbab(toInt(req.params.id));
  if (!s) return res.redirect('/');
  const komps = db.all('SELECT * FROM komponen WHERE subbab_id = ? ORDER BY urutan, id', s.id);
  const mediaIds = komps.map((k) => k.media_id).filter(Boolean);
  const mediaMap = {};
  if (mediaIds.length) db.all(`SELECT * FROM media WHERE id IN (${mediaIds.map(() => '?').join(',')})`, ...mediaIds).forEach((m) => { mediaMap[m.id] = m; });
  const soal = db.all(`SELECT * FROM soal WHERE subbab_id = ? AND status = 'disetujui' ORDER BY id LIMIT 10`, s.id);
  let mulai = Math.max(1, toInt(req.query.slide) || 1);
  if (req.query.lanjut && req.user.last_subbab_id === s.id) mulai = Math.max(1, (req.user.last_slide || 0) + 1);
  mulai = Math.min(mulai, Math.max(1, komps.length));
  db.run('UPDATE users SET last_subbab_id = ? WHERE id = ?', s.id, req.user.id);

  const slides = komps.map((k, i) => {
    const j = JENIS_MAP[k.jenis] || { label: k.jenis };
    const m = k.media_id ? mediaMap[k.media_id] : null;
    const isi = k.isi_html && stripTags(k.isi_html) ? raw(k.isi_html) : (/<img/i.test(k.isi_html) ? raw(k.isi_html) : '');
    const keg = renderKegiatan(k.kegiatan_json);
    const isDoc = m && (m.jenis === 'pdf' || m.jenis === 'ppt');
    let main;
    if (k.jenis === 'penilaian') main = html`<div class="sl-text wide">${isi}${renderSoalPenyaji(soal, s.id)}</div>`;
    else if (m && (isi || keg)) main = html`<div class="sl-split ${isDoc ? 'doc' : ''} ${m.jenis === 'audio' ? 'audio' : ''}"><div class="sl-media">${renderFigure(m)}</div><div class="sl-text">${isi}${keg}</div></div>`;
    else if (m) main = html`<div class="sl-media solo">${renderFigure(m)}</div>`;
    else main = html`<div class="sl-text wide ${k.jenis === 'tujuan' || k.jenis === 'rangkuman' ? 'big' : ''}">${isi || (keg ? '' : html`<div class="pr-empty"><b>Layar ini belum diisi.</b><span>Buka <a href="/komponen/${k.id}/edit">Edit layar</a> untuk menambahkan teks atau media.</span></div>`)}${keg}</div>`;
    return html`<section class="slide j-${k.jenis}" data-i="${i}" ${i + 1 === mulai ? '' : 'hidden'} aria-label="Layar ${i + 1}: ${k.judul}">
      <header class="sl-head" data-jenis="${j.label}">${String(k.judul).trim().toLowerCase() === String(j.label).toLowerCase() ? '' : html`<span class="tag j-${k.jenis}">${j.label}</span>`}<h2>${k.judul}</h2></header>
      <div class="sl-body">${main}</div>
    </section>`;
  });

  const keluar = req.query.dari === 'edit' ? `/subbab/${s.id}/edit` : `/kelas/${s.kelas_id}`;
  const body = html`
  <div class="presenter k${s.kelas_id}" id="presenter" data-subbab="${s.id}" data-start="${mulai - 1}">
    <header class="pr-top">
      <a class="pr-btn" href="${keluar}" title="Kembali ke daftar materi">${icon('arrow')}<span>Keluar</span></a>
      <div class="pr-title"><small>Kelas ${s.kelas_id} · ${s.bab}</small><b>${s.judul}</b></div>
      <span class="pr-hp" id="remoteTanda" hidden title="HP guru terhubung sebagai remote"></span>
      <button class="pr-btn" type="button" data-act="remote" title="Kendalikan presentasi dari HP guru">📱<span>Remote HP</span></button>
      <button class="pr-btn" type="button" data-act="toc" title="Lompat ke layar lain">${icon('list')}<span>Daftar layar</span></button>
      <button class="pr-btn" type="button" data-act="fs" title="Layar penuh (tombol F)">${icon('expand')}<span data-fs-label>Layar penuh</span></button>
    </header>
    <div class="pr-progress" aria-hidden="true"><span id="bar"></span></div>
    <div class="pr-stage" id="stage">
      ${slides.length ? slides : html`<section class="slide"><div class="sl-text wide"><div class="pr-empty"><b>Subbab ini belum punya layar.</b></div></div></section>`}
    </div>
    <footer class="pr-bottom">
      <button class="nav-btn" type="button" data-act="prev" aria-label="Layar sebelumnya"><span class="arr">‹</span><span class="nb-txt">Sebelumnya</span></button>
      <div class="pr-steps">
        <div class="dots">${komps.map((k, i) => html`<button type="button" class="dot j-${k.jenis}" data-go="${i}" title="${i + 1}. ${k.judul}" aria-label="Layar ${i + 1}: ${k.judul}"></button>`)}</div>
        <span class="pr-count"><b id="count"></b> <span id="countLbl"></span></span>
      </div>
      <button class="nav-btn primary" type="button" data-act="next" aria-label="Layar berikutnya"><span class="nb-txt">Berikutnya</span><span class="arr">›</span></button>
    </footer>
    <dialog class="toc" id="toc" aria-label="Daftar layar">
      <div class="toc-head"><b>Daftar layar</b><button type="button" class="btn small" data-act="toc-close">Tutup</button></div>
      <ol class="toc-list">${komps.map((k, i) => html`<li><button type="button" data-go="${i}"><span class="toc-no">${i + 1}</span><span class="toc-t">${String(k.judul).trim().toLowerCase() === String((JENIS_MAP[k.jenis] || { label: k.jenis }).label).toLowerCase() ? '' : html`<span class="tag j-${k.jenis}">${(JENIS_MAP[k.jenis] || { label: k.jenis }).label}</span>`}<b>${k.judul}</b></span></button></li>`)}</ol>
      <p class="toc-tip">Tombol keyboard: <kbd>→</kbd> berikutnya · <kbd>←</kbd> sebelumnya · <kbd>F</kbd> layar penuh</p>
    </dialog>
    <dialog class="dlg remote-dlg" id="remoteDlg" aria-label="Remote dari HP">
      <h2>📱 Kendalikan dari HP guru</h2>
      <div class="remote-isi">
        <div class="remote-qr" id="remoteQr"></div>
        <div>
          <ol class="steps-mini">
            <li>Sambungkan HP ke <b>Wi-Fi sekolah</b> yang sama.</li>
            <li>Pindai kode QR, lalu masuk dengan akun guru.</li>
            <li>Atau buka alamat di bawah dan masukkan kode:</li>
          </ol>
          <div class="remote-kode" id="remoteKode">····</div>
          <p class="muted small" id="remoteUrl"></p>
          <p class="remote-status" id="remoteStatus">Menunggu HP terhubung…</p>
          <p class="muted small">Di HP tampil tombol ◀ ▶, daftar layar, dan <b>kunci jawaban yang hanya terlihat oleh guru</b>.</p>
        </div>
      </div>
      <p style="text-align:right;margin:0"><button type="button" class="btn" data-act="remote-close">Tutup</button></p>
    </dialog>
  </div>
  <script src="/static/js/presenter.js?v=6"></script>`;
  res.send(page({ title: s.judul, user: req.user, body, bodyClass: 'is-presenter' }));
});

// ---------- Cetak LKPD (Lembar Kerja Peserta Didik) dari kegiatan kelas suatu subbab ----------
// Kolom tabel diambil dari teks "Buat tabel: A | B | C" pada isian "Cara mencatat hasil".
function kolomTabel(catat) {
  const m = String(catat || '').match(/tabel\s*:\s*(.+)$/i);
  if (!m) return null;
  const kol = m[1].replace(/\.\s*$/, '').split('|').map((x) => x.trim()).filter(Boolean);
  return kol.length >= 2 ? kol : null;
}
function lkpdHtml(s, komps, { kunci, sekolah }) {
  const garis = (n) => '<div class="x-garis"></div>'.repeat(n);
  const bagian = [];
  let no = 0;
  komps.forEach((k) => {
    let g;
    try { g = k.kegiatan_json ? JSON.parse(k.kegiatan_json) : null; } catch (e) { g = null; }
    if (!g) return;
    no++;
    const pengantar = stripTags(k.isi_html);
    let h = `<section class="x-keg"><h2>Kegiatan ${no}: ${esc(k.judul)}</h2>`;
    if (pengantar) h += `<p class="x-pengantar">${esc(pengantar)}</p>`;
    if (g.prediksi) h += `<h3>🤔 Ayo memprediksi</h3><p>${esc(g.prediksi)}</p><p class="x-kecil">Prediksiku:</p>${garis(2)}`;
    if (g.langkah && g.langkah.length) h += `<h3>🔍 Langkah kerja</h3><ol class="x-langkah">${g.langkah.map((l) => `<li><span class="x-cek">☐</span> ${esc(l)}</li>`).join('')}</ol>`;
    if (g.catat) {
      const kol = kolomTabel(g.catat);
      h += `<h3>✏️ Catat hasilnya</h3><p>${esc(g.catat)}</p>`;
      if (kol) h += `<table class="x-tabel"><thead><tr>${kol.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${`<tr>${kol.map(() => '<td>&nbsp;</td>').join('')}</tr>`.repeat(5)}</tbody></table>`;
      else if (/^gambar/i.test(g.catat)) h += '<div class="x-kotak"></div>';
      else h += garis(3);
    }
    if (g.pertanyaan && g.pertanyaan.length) {
      h += `<h3>💬 Ayo berdiskusi</h3><ol class="x-tanya">${g.pertanyaan.map((p) => `<li><p>${esc(p.teks)}</p>${kunci && p.kunci ? `<p class="x-kunci"><b>Kunci:</b> ${esc(p.kunci)}</p>` : garis(3)}</li>`).join('')}</ol>`;
    }
    bagian.push(h + '</section>');
  });
  const ref = komps.find((k) => k.jenis === 'refleksi');
  const butirRef = ref ? (ref.isi_html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []).map((x) => stripTags(x)) : [];
  const refleksi = butirRef.length ? `<section class="x-keg"><h2>Refleksi</h2><ol class="x-tanya">${butirRef.map((t) => `<li><p>${esc(t)}</p>${garis(2)}</li>`).join('')}</ol></section>` : '';
  const css = `body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.45;color:#000;margin:0}
  .x-page{max-width:18cm;margin:0 auto;padding:1cm 0}
  .x-kop{text-align:center;border-bottom:3px double #000;padding-bottom:6pt;margin-bottom:8pt}
  .x-kop h1{font-size:15pt;margin:0}.x-kop p{margin:2pt 0 0;font-size:11pt}
  table.x-id{width:100%;border-collapse:collapse;margin:6pt 0 8pt;font-size:11pt}table.x-id td{padding:3pt 0}
  .x-tujuan{border:1px solid #888;border-radius:6pt;padding:6pt 9pt;margin-bottom:10pt;font-size:11pt}
  .x-keg{page-break-inside:auto;margin-bottom:12pt}
  h2{font-size:13pt;margin:10pt 0 4pt;border-bottom:1px solid #999;padding-bottom:2pt}
  h3{font-size:12pt;margin:8pt 0 3pt}
  p{margin:0 0 4pt}.x-pengantar{font-style:italic}.x-kecil{font-size:10pt;color:#333}
  .x-garis{border-bottom:1px dotted #555;height:20pt}
  .x-langkah{margin:0;padding-left:18pt}.x-langkah li{margin:2pt 0}.x-cek{font-size:13pt}
  table.x-tabel{width:100%;border-collapse:collapse;margin:4pt 0 6pt;font-size:11pt}
  table.x-tabel th,table.x-tabel td{border:1px solid #000;padding:5pt 6pt;height:18pt;vertical-align:top;text-align:left}
  table.x-tabel th{background:#eee}
  .x-kotak{border:1px solid #555;height:5cm;margin:4pt 0}
  .x-tanya{margin:0;padding-left:18pt}.x-tanya li{margin:4pt 0 8pt;page-break-inside:avoid}
  .x-kunci{background:#e8f5e9;border-left:3pt solid #2e7d32;padding:3pt 6pt;font-size:11pt}
  .x-paraf{margin-top:14pt;width:100%;border-collapse:collapse;font-size:11pt}.x-paraf td{border:1px solid #000;padding:6pt;height:36pt;width:33%;vertical-align:top}
  .x-bar{position:sticky;top:0;background:#fff8e1;border-bottom:1px solid #e0c97a;padding:10px;text-align:center;font-family:system-ui,sans-serif}
  .x-bar button{font-size:15px;padding:8px 18px;margin:0 4px;cursor:pointer}
  @media print{.x-bar{display:none}.x-page{padding:0}} @page{size:A4;margin:1.6cm}`;
  return { css, isi: `<div class="x-page">
    <div class="x-kop"><h1>LEMBAR KERJA PESERTA DIDIK (LKPD)${kunci ? ' · VERSI GURU' : ''}</h1><p>${esc(sekolah)} · IPAS · Kelas ${s.kelas_id} · ${esc(s.bab)}</p><p><b>${esc(s.judul)}</b></p></div>
    <table class="x-id"><tr><td>Nama: ______________________</td><td>Kelompok: ________</td><td>Kelas: ______</td><td>Tanggal: __________</td></tr></table>
    ${s.tujuan ? `<div class="x-tujuan"><b>Tujuan pembelajaran:</b> ${esc(s.tujuan)}</div>` : ''}
    ${bagian.join('')}${refleksi}
    <table class="x-paraf"><tr><td>Paraf guru:</td><td>Nilai:</td><td>Catatan:</td></tr></table>
  </div>`, jumlah: bagian.length };
}

r.get('/subbab/:id/lkpd', (req, res) => {
  const s = getSubbab(toInt(req.params.id));
  if (!s) return res.redirect('/');
  const komps = db.all('SELECT * FROM komponen WHERE subbab_id = ? ORDER BY urutan, id', s.id);
  const kunci = req.query.kunci === '1';
  const sekolah = db.setting('nama_sekolah');
  const l = lkpdHtml(s, komps, { kunci, sekolah });
  const format = req.query.format;
  if (!format) {
    const body = html`
    ${pageHead({ crumb: html`<a href="/kelas/${s.kelas_id}">Kelas ${s.kelas_id}</a> › ${s.bab}`, title: html`🖨 Cetak LKPD: ${s.judul}`,
      desc: 'Lembar kerja disusun otomatis dari kegiatan kelas pada subbab ini: prediksi, langkah kerja, tabel pengamatan, pertanyaan diskusi, dan refleksi.' })}
    ${l.jumlah ? '' : html`<div class="flash warn">Subbab ini belum punya kegiatan kelas. Tambahkan kegiatan di layar <b>Kegiatan Pengamatan</b> atau <b>Latihan & Diskusi</b> melalui tombol Edit.</div>`}
    <form method="get" action="/subbab/${s.id}/lkpd" class="card stack">
      <fieldset class="seg"><legend>Versi</legend>
        <label><input type="radio" name="kunci" value="0" checked> Untuk siswa (dengan baris jawaban kosong)</label>
        <label><input type="radio" name="kunci" value="1"> Untuk guru (dengan kunci jawaban diskusi)</label>
      </fieldset>
      <div class="row">
        <button class="btn primary big" name="format" value="cetak" ${l.jumlah ? '' : 'disabled'}>${icon('print')}Cetak / Simpan PDF</button>
        <button class="btn big" name="format" value="doc" ${l.jumlah ? '' : 'disabled'}>Unduh Word (.doc)</button>
      </div>
      <p class="muted small">Berisi ${l.jumlah} kegiatan. "Cetak / Simpan PDF" membuka lembar siap cetak; pilih printer atau "Simpan sebagai PDF".</p>
    </form>`;
    return res.send(page({ title: 'Cetak LKPD', user: req.user, body, active: 'k' + s.kelas_id }));
  }
  const doc = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>LKPD ${esc(s.judul)}</title><link rel="icon" href="/static/img/logo.svg"><style>${l.css}</style></head><body>
  ${format === 'cetak' ? '<div class="x-bar"><button onclick="window.print()">🖨 Cetak / Simpan sebagai PDF</button><button onclick="history.back()">Kembali</button></div>' : ''}
  ${l.isi}
  ${format === 'cetak' ? '<script>setTimeout(function(){window.print()},400)</script>' : ''}
  </body></html>`;
  if (format === 'doc') {
    res.setHeader('Content-Type', 'application/msword; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="lkpd-${s.id}-${Date.now()}.doc"`);
    return res.send('﻿' + doc);
  }
  res.send(doc);
});

r.post('/api/posisi', (req, res) => {
  const sid = toInt(req.body.subbab);
  const slide = Math.max(0, toInt(req.body.slide));
  if (db.get('SELECT id FROM subbab WHERE id = ?', sid)) db.run('UPDATE users SET last_subbab_id = ?, last_slide = ? WHERE id = ?', sid, slide, req.user.id);
  res.json({ ok: true });
});

module.exports = r;
module.exports.buatSubbab = buatSubbab;
