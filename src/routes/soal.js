// Generate soal AI, tinjau & bank soal, ekspor (F8, F9, F10)
'use strict';
const express = require('express');
const { kirimPdf } = require('../pdf');
const db = require('../db');
const ai = require('../ai');
const net = require('../net');
const { html, page, icon, esc, JENIS_SOAL, KESULITAN } = require('../html');

const r = express.Router();
const toInt = (v) => parseInt(v, 10) || 0;
const ids = (v) => [...new Set([].concat(v || []).flatMap((x) => String(x).split(',')).map(toInt).filter(Boolean))];

function pilihanSubbab(selected, { name = 'subbab', kosong = '', required = false } = {}) {
  const rows = db.all(`SELECT s.id, s.judul, s.status, b.judul AS bab, b.kelas_id FROM subbab s JOIN bab b ON b.id = s.bab_id ORDER BY b.kelas_id, b.urutan, s.urutan`);
  const groups = {};
  rows.forEach((x) => { const g = `Kelas ${x.kelas_id} · ${x.bab}`; (groups[g] = groups[g] || []).push(x); });
  return html`<select name="${name}" ${required ? 'required' : ''} aria-label="Subbab">
    ${kosong !== null ? html`<option value="">${kosong || '— Pilih subbab —'}</option>` : ''}
    ${Object.entries(groups).map(([g, list]) => html`<optgroup label="${g}">${list.map((x) => html`<option value="${x.id}" ${x.id === selected ? 'selected' : ''}>${x.judul}${x.status === 'draf' ? ' (draf)' : ''}</option>`)}</optgroup>`)}
  </select>`;
}

function opsiArr(q) { try { return JSON.parse(q.opsi_json || '[]'); } catch (e) { return []; } }
function kunciTeks(q) {
  if (q.jenis === 'pg') { const o = opsiArr(q); const i = 'ABCD'.indexOf(q.kunci); return i >= 0 && o[i] ? `${q.kunci}. ${o[i]}` : q.kunci; }
  return q.kunci;
}

// ---------- F9: bank soal ----------
r.get('/soal', (req, res) => {
  const f = {
    kelas: [4, 5, 6].includes(toInt(req.query.kelas)) ? toInt(req.query.kelas) : 0,
    subbab: toInt(req.query.subbab),
    jenis: JENIS_SOAL[req.query.jenis] ? req.query.jenis : '',
    status: ['draf', 'disetujui'].includes(req.query.status) ? req.query.status : '',
    q: String(req.query.q || '').trim(),
  };
  const where = []; const p = [];
  if (f.kelas) { where.push('b.kelas_id = ?'); p.push(f.kelas); }
  if (f.subbab) { where.push('q.subbab_id = ?'); p.push(f.subbab); }
  if (f.jenis) { where.push('q.jenis = ?'); p.push(f.jenis); }
  if (f.status) { where.push('q.status = ?'); p.push(f.status); }
  if (f.q) { where.push('(q.pertanyaan LIKE ? OR q.pembahasan LIKE ?)'); p.push(`%${f.q}%`, `%${f.q}%`); }
  const list = db.all(`SELECT q.*, s.judul AS subbab, b.kelas_id FROM soal q JOIN subbab s ON s.id = q.subbab_id JOIN bab b ON b.id = s.bab_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY q.status = 'disetujui', b.kelas_id, s.judul, q.id DESC LIMIT 500`, ...p);
  const baru = new Set(ids(req.query.baru));
  const sub = f.subbab ? db.get('SELECT judul FROM subbab WHERE id = ?', f.subbab) : null;
  const body = html`
  <div class="page-head">
    <div class="ph-text"><h1>Bank Soal${sub ? html` <small class="muted">· ${sub.judul}</small>` : ''}</h1>
      <p class="ph-desc">${list.length} soal. Centang soal untuk ditayangkan, dicetak, atau dijadikan Google Form.</p></div>
    <div class="row ph-actions">${f.subbab && list.some((q) => q.status === 'disetujui') ? html`<a class="btn" href="/soal/tayang?subbab=${f.subbab}">${icon('play')}Tayangkan soal subbab ini</a>` : ''}<a class="btn" href="/soal/baru${f.subbab ? '?subbab=' + f.subbab : ''}">+ Tulis manual</a><a class="btn primary" href="/soal/buat${f.subbab ? '?subbab=' + f.subbab : ''}">${icon('spark')}Buat dengan AI</a></div>
  </div>
  ${list.some((q) => q.status === 'draf') ? html`<div class="tip"><span>Soal <span class="tag draf">Draf</span> perlu diperiksa, lalu klik <b>✓ Setujui</b> sebelum dipakai.</span></div>` : ''}
  <form class="filter card" method="get">
    <input name="q" value="${f.q}" placeholder="Cari kata dalam soal" aria-label="Cari">
    <select name="kelas" aria-label="Kelas"><option value="">Semua kelas</option>${[4, 5, 6].map((k) => html`<option value="${k}" ${k === f.kelas ? 'selected' : ''}>Kelas ${k}</option>`)}</select>
    ${pilihanSubbab(f.subbab, { kosong: 'Semua subbab' })}
    <select name="jenis" aria-label="Jenis"><option value="">Semua jenis</option>${Object.entries(JENIS_SOAL).map(([k, v]) => html`<option value="${k}" ${k === f.jenis ? 'selected' : ''}>${v}</option>`)}</select>
    <select name="status" aria-label="Status"><option value="">Semua status</option><option value="draf" ${f.status === 'draf' ? 'selected' : ''}>Draf (perlu ditinjau)</option><option value="disetujui" ${f.status === 'disetujui' ? 'selected' : ''}>Disetujui</option></select>
    <button class="btn">Saring</button>
  </form>

  <form method="post" action="/soal/aksi" id="bankForm">
    <div class="row bulk">
      <label class="row"><input type="checkbox" data-checkall> Pilih semua</label>
      <span class="muted small" data-selcount>0 dipilih</span>
      <button class="btn small" name="aksi" value="setujui">✓ Setujui</button>
      <button class="btn small primary" name="aksi" value="tayang">▶ Tayangkan</button>
      <button class="btn small" name="aksi" value="cetak">🖨 Cetak</button>
      <button class="btn small" name="aksi" value="pdf">⇩ Unduh PDF</button>
      <button class="btn small" name="aksi" value="gform">Google Form</button>
      <button class="btn small danger" name="aksi" value="hapus" data-confirm="Hapus soal yang dipilih?">Hapus</button>
    </div>
    ${!list.length ? html`<div class="card empty">Belum ada soal. ${f.subbab ? html`<a href="/soal/buat?subbab=${f.subbab}">Buat soal untuk subbab ini</a>.` : ''}</div>` : ''}
    <ol class="soal-list">
    ${list.map((q) => html`<li class="card soal ${q.status} ${baru.has(q.id) ? 'baru' : ''}">
      <div class="soal-top">
        <label class="pick"><input type="checkbox" name="id" value="${q.id}" ${baru.has(q.id) ? 'checked' : ''}><span class="sr">Pilih</span></label>
        ${q.status === 'draf' ? html`<span class="tag draf">Draf</span>` : ''}${q.asal === 'ai' ? html`<span class="tag ai">AI</span>` : ''}
        <span class="muted small">${JENIS_SOAL[q.jenis]} · ${KESULITAN[q.kesulitan]} · Kelas ${q.kelas_id} · ${q.subbab}</span>
      </div>
      <p class="q">${q.pertanyaan}</p>
      ${q.jenis === 'pg' ? html`<ol class="opsi" type="A">${opsiArr(q).map((o, i) => html`<li class="${'ABCD'[i] === q.kunci ? 'benar' : ''}">${o}</li>`)}</ol>` : ''}
      ${q.jenis === 'pg' ? '' : html`<p class="small"><b>Kunci:</b> ${kunciTeks(q)}</p>`}
      <div class="row soal-act">
        ${q.status === 'draf' ? html`<button class="btn small primary" formaction="/soal/${q.id}/setujui">✓ Setujui</button>` : ''}
        <a class="btn small ghost" href="/soal/tayang?ids=${q.id}" title="Tayangkan soal ini di layar kelas">${icon('play')}Tayangkan</a>
        <a class="btn small ghost" href="/soal/${q.id}/edit">${icon('edit')}Edit</a>
        <button class="btn icon ghost hapus" formaction="/soal/${q.id}/hapus" data-confirm="Hapus soal ini?" title="Hapus soal" aria-label="Hapus soal">✕</button>
      </div>
    </li>`)}
    </ol>
  </form>`;
  res.send(page({ title: 'Bank Soal', user: req.user, body, active: 'soal', pesan: req.query.pesan, galat: req.query.galat }));
});

r.post('/soal/aksi', (req, res) => {
  const pilih = ids(req.body.id);
  if (!pilih.length) return res.redirect('/soal?galat=' + encodeURIComponent('Centang dulu soal yang ingin dipakai (kotak di kiri setiap soal), atau klik ▶ Tayangkan pada satu soal.'));
  const ph = pilih.map(() => '?').join(',');
  if (req.body.aksi === 'setujui') {
    db.run(`UPDATE soal SET status = 'disetujui' WHERE id IN (${ph})`, ...pilih);
    return res.redirect('/soal?status=disetujui&pesan=' + encodeURIComponent(`${pilih.length} soal disetujui dan masuk bank soal.`));
  }
  if (req.body.aksi === 'hapus') {
    db.run(`DELETE FROM soal WHERE id IN (${ph})`, ...pilih);
    return res.redirect('back');
  }
  if (['ekspor', 'cetak', 'pdf'].includes(req.body.aksi)) return res.redirect(`/soal/ekspor?ids=${pilih.join(',')}${req.body.aksi === 'ekspor' ? '' : '&tujuan=' + req.body.aksi}`);
  if (req.body.aksi === 'tayang') return res.redirect('/soal/tayang?ids=' + pilih.join(','));
  if (req.body.aksi === 'gform') return res.redirect('/soal/gform?ids=' + pilih.join(','));
  res.redirect('/soal');
});
r.post('/soal/:id/setujui', (req, res) => {
  db.run(`UPDATE soal SET status = 'disetujui' WHERE id = ?`, toInt(req.params.id));
  res.redirect('back');
});
r.post('/soal/:id/hapus', (req, res) => {
  db.run('DELETE FROM soal WHERE id = ?', toInt(req.params.id));
  res.redirect('back');
});

// ---------- form soal (manual / edit) ----------
function formSoal(q, action, judul) {
  const opsi = opsiArr(q);
  return html`
  <h1>${judul}</h1>
  <form method="post" action="${action}" class="card stack" data-soalform>
    <div class="grid2">
      <label>Subbab${pilihanSubbab(q.subbab_id, { required: true })}</label>
      <label>Jenis soal<select name="jenis" data-jenis>${Object.entries(JENIS_SOAL).map(([k, v]) => html`<option value="${k}" ${k === q.jenis ? 'selected' : ''}>${v}</option>`)}</select></label>
    </div>
    <label>Pertanyaan<textarea name="pertanyaan" rows="3" required>${q.pertanyaan}</textarea></label>
    <fieldset data-show="pg"><legend>Opsi jawaban (pilih yang benar)</legend>
      ${['A', 'B', 'C', 'D'].map((h, i) => html`<label class="opsi-row"><input type="radio" name="kunci_pg" value="${h}" ${q.jenis === 'pg' && q.kunci === h ? 'checked' : ''}> <b>${h}.</b> <input name="opsi" value="${opsi[i] || ''}" aria-label="Opsi ${h}"></label>`)}
    </fieldset>
    <fieldset data-show="bs"><legend>Kunci</legend>
      <label><input type="radio" name="kunci_bs" value="Benar" ${q.kunci === 'Benar' ? 'checked' : ''}> Benar</label>
      <label><input type="radio" name="kunci_bs" value="Salah" ${q.kunci === 'Salah' ? 'checked' : ''}> Salah</label>
    </fieldset>
    <label data-show="isian uraian">Kunci jawaban<textarea name="kunci_teks" rows="2">${q.jenis === 'isian' || q.jenis === 'uraian' ? q.kunci : ''}</textarea></label>
    <label>Pembahasan singkat<textarea name="pembahasan" rows="2">${q.pembahasan}</textarea></label>
    <div class="grid2">
      <label>Tingkat kesulitan<select name="kesulitan">${Object.entries(KESULITAN).map(([k, v]) => html`<option value="${k}" ${k === q.kesulitan ? 'selected' : ''}>${v}</option>`)}</select></label>
      <label>Status<select name="status"><option value="draf" ${q.status === 'draf' ? 'selected' : ''}>Draf</option><option value="disetujui" ${q.status === 'disetujui' ? 'selected' : ''}>Disetujui (masuk bank soal)</option></select></label>
    </div>
    <div class="row"><button class="btn primary big">Simpan</button><a class="btn" href="javascript:history.back()">Batal</a></div>
  </form>`;
}

function bacaForm(body) {
  const jenis = JENIS_SOAL[body.jenis] ? body.jenis : 'pg';
  const opsi = [].concat(body.opsi || []).map((o) => String(o).trim());
  let kunci = '';
  if (jenis === 'pg') kunci = String(body.kunci_pg || '');
  else if (jenis === 'bs') kunci = String(body.kunci_bs || '');
  else kunci = String(body.kunci_teks || '').trim();
  const q = {
    subbab_id: toInt(body.subbab), jenis, pertanyaan: String(body.pertanyaan || '').trim(),
    opsi_json: JSON.stringify(jenis === 'pg' ? opsi.slice(0, 4) : []), kunci,
    pembahasan: String(body.pembahasan || '').trim(),
    kesulitan: KESULITAN[body.kesulitan] ? body.kesulitan : 'sedang',
    status: body.status === 'disetujui' ? 'disetujui' : 'draf',
  };
  let galat = '';
  if (!db.get('SELECT id FROM subbab WHERE id = ?', q.subbab_id)) galat = 'Pilih subbab.';
  else if (!q.pertanyaan) galat = 'Pertanyaan wajib diisi.';
  else if (jenis === 'pg' && (opsi.slice(0, 4).filter(Boolean).length < 4 || !/^[ABCD]$/.test(kunci))) galat = 'Pilihan ganda butuh 4 opsi dan satu kunci.';
  else if (!kunci) galat = 'Kunci jawaban wajib diisi.';
  return { q, galat };
}

r.get('/soal/baru', (req, res) => {
  const q = { subbab_id: toInt(req.query.subbab), jenis: 'pg', pertanyaan: '', opsi_json: '[]', kunci: '', pembahasan: '', kesulitan: 'sedang', status: 'disetujui' };
  res.send(page({ title: 'Soal baru', user: req.user, active: 'soal', body: formSoal(q, '/soal/baru', 'Tulis soal manual'), galat: req.query.galat }));
});
r.post('/soal/baru', (req, res) => {
  const { q, galat } = bacaForm(req.body);
  if (galat) return res.send(page({ title: 'Soal baru', user: req.user, active: 'soal', body: formSoal(q, '/soal/baru', 'Tulis soal manual'), galat }));
  db.run(`INSERT INTO soal (subbab_id, jenis, pertanyaan, opsi_json, kunci, pembahasan, kesulitan, asal, status, created_by) VALUES (?,?,?,?,?,?,?, 'manual', ?, ?)`,
    q.subbab_id, q.jenis, q.pertanyaan, q.opsi_json, q.kunci, q.pembahasan, q.kesulitan, q.status, req.user.id);
  res.redirect(`/soal?subbab=${q.subbab_id}&pesan=` + encodeURIComponent('Soal disimpan.'));
});
r.get('/soal/:id/edit', (req, res) => {
  const q = db.get('SELECT * FROM soal WHERE id = ?', toInt(req.params.id));
  if (!q) return res.redirect('/soal');
  res.send(page({ title: 'Edit soal', user: req.user, active: 'soal', body: formSoal(q, `/soal/${q.id}/edit`, 'Edit soal') }));
});
r.post('/soal/:id/edit', (req, res) => {
  const old = db.get('SELECT * FROM soal WHERE id = ?', toInt(req.params.id));
  if (!old) return res.redirect('/soal');
  const { q, galat } = bacaForm(req.body);
  if (galat) return res.send(page({ title: 'Edit soal', user: req.user, active: 'soal', body: formSoal({ ...q, id: old.id }, `/soal/${old.id}/edit`, 'Edit soal'), galat }));
  db.run('UPDATE soal SET subbab_id=?, jenis=?, pertanyaan=?, opsi_json=?, kunci=?, pembahasan=?, kesulitan=?, status=? WHERE id=?',
    q.subbab_id, q.jenis, q.pertanyaan, q.opsi_json, q.kunci, q.pembahasan, q.kesulitan, q.status, old.id);
  res.redirect(`/soal?subbab=${q.subbab_id}&pesan=` + encodeURIComponent('Soal diperbarui.'));
});

// ---------- F8: generate soal AI ----------
r.get('/soal/buat', async (req, res) => {
  if (req.query.cek) net.resetOnlineCache();
  const online = await net.isOnline();
  const st = ai.status();
  const isAdmin = req.user.role === 'admin';
  let alasan = '';
  if (!online) alasan = html`<b>Hubungkan laptop server ke internet dulu.</b> Membuat soal dengan AI membutuhkan internet. Sambungkan laptop server ke Wi-Fi yang ada internetnya atau ke hotspot HP, lalu klik <b>Periksa ulang</b>. Selama offline, Anda tetap bisa <a href="/soal/baru">menulis soal manual</a> dan memakai bank soal.`;
  else if (!st.adaKunci) alasan = isAdmin ? html`<b>Fitur ini belum diaktifkan.</b> Isi kunci API Gemini di <a href="/admin/pengaturan#ai">Admin → Pengaturan</a> (butuh internet).` : html`<b>Fitur ini belum diaktifkan.</b> Minta Admin mengisi kunci API Gemini di Admin → Pengaturan.`;
  else if (db.setting('ai_tes_status') === 'gagal') alasan = isAdmin ? html`<b>Kunci API Gemini bermasalah:</b> ${db.setting('ai_tes_pesan')} Perbaiki di <a href="/admin/pengaturan#ai">Admin → Pengaturan</a>.` : html`<b>Kunci API Gemini bermasalah.</b> Minta Admin memeriksanya di Admin → Pengaturan.`;
  else if (st.sisa <= 0) alasan = html`Batas ${st.batas} permintaan AI hari ini sudah tercapai. Coba lagi besok.`;
  const body = html`
  <div class="page-head"><div><p class="crumb"><a href="/soal">Bank Soal</a> ›</p><h1>${icon('spark')} Buat soal dengan AI</h1>
    <p class="ph-desc">AI menyusun draf soal <b>hanya dari teks materi subbab</b> yang dipilih. Semua hasil masuk sebagai draf dan wajib ditinjau guru.</p></div></div>
  <div class="net-note ${online ? 'on' : 'off'}" style="margin-bottom:1rem"><span class="net-dot"></span>
    <div>${online ? html`<b>Laptop server tersambung ke internet.</b> ${st.adaKunci ? `Sisa ${st.sisa} dari ${st.batas} permintaan AI hari ini.` : ''}` : html`<b>Butuh internet.</b> Fitur ini hanya bisa dipakai saat laptop server tersambung ke internet.`}</div>
    <a class="btn small" href="/soal/buat?cek=1${req.query.subbab ? '&subbab=' + toInt(req.query.subbab) : ''}">Periksa ulang</a></div>
  ${alasan ? html`<div class="flash warn">${alasan}</div>` : ''}
  <form method="post" action="/soal/buat" class="card stack" data-loading="AI sedang menyusun soal… biasanya 10–40 detik.">
    <label>Subbab${pilihanSubbab(toInt(req.query.subbab), { required: true })}</label>
    <div class="grid3">
      <label>Jenis soal<select name="jenis">${Object.entries(JENIS_SOAL).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label>
      <label>Jumlah soal<input type="number" name="jumlah" min="1" max="10" value="5"></label>
      <label>Tingkat kesulitan<select name="kesulitan">${Object.entries(KESULITAN).map(([k, v]) => html`<option value="${k}" ${k === 'sedang' ? 'selected' : ''}>${v}</option>`)}</select></label>
    </div>
    <button class="btn primary big" ${alasan ? 'disabled' : ''}>${icon('spark')}Buat soal</button>
    ${alasan ? html`<p class="muted small">Tombol nonaktif sampai masalah di atas selesai.</p>` : ''}
  </form>`;
  res.send(page({ title: 'Buat soal AI', user: req.user, body, active: 'soal', galat: req.query.galat }));
});

r.post('/soal/buat', async (req, res) => {
  const subbabId = toInt(req.body.subbab);
  const jenis = JENIS_SOAL[req.body.jenis] ? req.body.jenis : 'pg';
  const jumlah = Math.min(10, Math.max(1, toInt(req.body.jumlah) || 5));
  const kesulitan = KESULITAN[req.body.kesulitan] ? req.body.kesulitan : 'sedang';
  try {
    if (!(await net.isOnline())) { net.resetOnlineCache(); throw new Error('Tidak ada koneksi internet.'); }
    const baru = await ai.buatSoal({ subbabId, jenis, jumlah, kesulitan, userId: req.user.id });
    res.redirect(`/soal?subbab=${subbabId}&status=draf&baru=${baru.join(',')}&pesan=` + encodeURIComponent(`${baru.length} draf soal dibuat. Tinjau, edit bila perlu, lalu setujui.`));
  } catch (e) {
    if (!/koneksi|internet|Kunci API|Batas|terlalu sedikit|tidak ditemukan|Kuota|menolak|AI/i.test(e.message)) db.logError('generate soal', e);
    res.redirect(`/soal/buat?subbab=${subbabId}&galat=` + encodeURIComponent(e.message));
  }
});

// ---------- F10: ekspor soal ----------
r.get('/soal/ekspor', (req, res) => {
  const pilih = ids(req.query.ids);
  if (!pilih.length) return res.redirect('/soal?galat=' + encodeURIComponent('Pilih soal yang akan diekspor.'));
  const list = db.all(`SELECT q.*, s.judul AS subbab, b.kelas_id FROM soal q JOIN subbab s ON s.id = q.subbab_id JOIN bab b ON b.id = s.bab_id WHERE q.id IN (${pilih.map(() => '?').join(',')}) ORDER BY CASE q.jenis WHEN 'pg' THEN 1 WHEN 'bs' THEN 2 WHEN 'isian' THEN 3 ELSE 4 END, b.kelas_id, s.urutan, q.id`, ...pilih);
  const kunci = req.query.kunci !== '0';
  const format = req.query.format;
  const tujuan = ['cetak', 'pdf'].includes(req.query.tujuan) ? req.query.tujuan : '';
  const kelasSet = [...new Set(list.map((q) => q.kelas_id))];
  const subSet = [...new Set(list.map((q) => q.subbab))];
  const judul = String(req.query.judul || `Latihan IPAS Kelas ${kelasSet.join(', ')}`).slice(0, 120);
  const sekolah = db.setting('nama_sekolah');

  if (!format) {
    const body = html`
    <div class="page-head"><div><p class="crumb"><a href="/soal">Bank Soal</a> ›</p><h1>${tujuan === 'pdf' ? 'Unduh PDF' : tujuan === 'cetak' ? 'Cetak' : 'Ekspor'} ${list.length} soal</h1></div></div>
    <form method="get" action="/soal/ekspor" class="card stack">
      <input type="hidden" name="ids" value="${pilih.join(',')}">
      <label>Judul lembar soal<input name="judul" value="${judul}"></label>
      <fieldset class="seg"><legend>Kunci jawaban</legend>
        <label><input type="radio" name="kunci" value="1" checked> Sertakan kunci & pembahasan (halaman terpisah)</label>
        <label><input type="radio" name="kunci" value="0"> Tanpa kunci</label>
      </fieldset>
      <div class="row">
        <button class="btn big ${tujuan === 'pdf' ? '' : 'primary'}" name="format" value="cetak">${icon('print')}Cetak</button>
        <button class="btn big ${tujuan === 'pdf' ? 'primary' : ''}" name="format" value="pdf">⇩ Unduh PDF</button>
        <button class="btn big" name="format" value="doc">Unduh Word (.doc)</button>
      </div>
      <p class="muted small"><b>Cetak</b> langsung ke printer. <b>Unduh PDF</b> menyimpan berkas PDF untuk dibagikan atau dicetak nanti.</p>
      <p class="row small"><a href="/soal/gform?ids=${pilih.join(',')}">Jadikan Google Form</a> · <a href="/soal/tayang?ids=${pilih.join(',')}">Tayangkan di layar</a></p>
    </form>`;
    return res.send(page({ title: 'Ekspor soal', user: req.user, body, active: 'soal', galat: req.query.galat }));
  }

  const soalHtml = list.map((q, i) => {
    const opsi = opsiArr(q);
    let jawab = '';
    if (q.jenis === 'pg') jawab = `<ol type="A" class="x-opsi">${opsi.map((o) => `<li>${esc(o)}</li>`).join('')}</ol>`;
    else if (q.jenis === 'bs') jawab = '<p class="x-bs">( B ) Benar &nbsp;&nbsp; ( S ) Salah</p>';
    else if (q.jenis === 'isian') jawab = '<p class="x-line">Jawab: ______________________________</p>';
    else jawab = '<p class="x-line">Jawab:</p><div class="x-box"></div>';
    return `<li class="x-q"><p>${esc(q.pertanyaan)}</p>${jawab}</li>`;
  }).join('');
  const kunciHtml = kunci ? `<div class="x-kunci"><h2>Kunci Jawaban dan Pembahasan</h2><ol>${list.map((q) => `<li><b>${esc(kunciTeks(q))}</b>${q.pembahasan ? ` — ${esc(q.pembahasan)}` : ''}</li>`).join('')}</ol></div>` : '';
  const css = `body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.45;color:#000;margin:0}
  .x-page{max-width:18cm;margin:0 auto;padding:1cm 0}
  h1{font-size:15pt;margin:0 0 2pt;text-align:center} .x-sub{text-align:center;margin:0 0 10pt;font-size:11pt}
  table.x-id{width:100%;border-collapse:collapse;margin-bottom:12pt;font-size:11pt} table.x-id td{padding:3pt 0}
  ol.x-list{padding-left:20pt} .x-q{margin:0 0 10pt;page-break-inside:avoid} .x-q p{margin:0 0 3pt}
  .x-opsi{margin:2pt 0 0;padding-left:22pt} .x-box{border:1px solid #888;height:2.6cm;margin-top:3pt}
  .x-kunci{page-break-before:always} .x-kunci h2{font-size:13pt} .x-kunci li{margin-bottom:5pt}
  .x-bar{position:sticky;top:0;background:#fff8e1;border-bottom:1px solid #e0c97a;padding:10px;text-align:center;font-family:system-ui,sans-serif}
  .x-bar button{font-size:15px;padding:8px 18px;margin:0 4px;cursor:pointer}
  @media print{.x-bar{display:none}.x-page{padding:0}} @page{size:A4;margin:1.8cm}`;
  const doc = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(judul)}</title><link rel="icon" href="/static/img/logo.svg"><style>${css}</style></head><body>
  ${format === 'cetak' ? '<div class="x-bar"><button onclick="window.print()">🖨 Cetak</button><button onclick="history.back()">Kembali</button></div>' : ''}
  <div class="x-page">
  <h1>${esc(judul)}</h1><p class="x-sub">${esc(sekolah)} · IPAS · ${esc(subSet.join('; '))}</p>
  <table class="x-id"><tr><td>Nama: ________________________</td><td>Kelas: ______</td><td>Tanggal: ____________</td></tr></table>
  <ol class="x-list">${soalHtml}</ol>${kunciHtml}</div>
  ${format === 'cetak' ? '<script>setTimeout(function(){window.print()},400)</script>' : ''}
  </body></html>`;
  if (format === 'pdf') {
    const kembali = `/soal/ekspor?ids=${pilih.join(',')}&tujuan=pdf`;
    return kirimPdf(req, res, doc, `soal-ipas-${Date.now()}.pdf`, kembali);
  }
  if (format === 'doc') {
    res.setHeader('Content-Type', 'application/msword; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="soal-ipa-${Date.now()}.doc"`);
    return res.send('﻿' + doc);
  }
  res.send(doc);
});

// ---------- Ambil soal untuk ditayangkan / Google Form ----------
// ?ids=1,2,3 (soal pilihan guru, urutan bank soal) atau ?subbab=ID (semua soal disetujui subbab itu)
function ambilSoal(q) {
  const pilih = ids(q.ids);
  const subbab = toInt(q.subbab);
  const urut = `ORDER BY b.kelas_id, b.urutan, s.urutan, CASE q.jenis WHEN 'pg' THEN 1 WHEN 'bs' THEN 2 WHEN 'isian' THEN 3 ELSE 4 END, q.id`;
  const sel = 'SELECT q.*, s.judul AS subbab, b.kelas_id FROM soal q JOIN subbab s ON s.id = q.subbab_id JOIN bab b ON b.id = s.bab_id';
  if (pilih.length) return db.all(`${sel} WHERE q.id IN (${pilih.map(() => '?').join(',')}) ${urut}`, ...pilih);
  if (subbab) return db.all(`${sel} WHERE q.subbab_id = ? AND q.status = 'disetujui' ${urut}`, subbab);
  return [];
}
const judulDefault = (list) => {
  const sub = [...new Set(list.map((q) => q.subbab))];
  return sub.length === 1 ? `Latihan IPAS: ${sub[0]}` : `Latihan IPAS Kelas ${[...new Set(list.map((q) => q.kelas_id))].join(', ')}`;
};

// ---------- Tayangkan soal: kuis interaktif di layar kelas (gaya permainan kuis) ----------
// Satu soal per layar. Siswa/guru mengetuk jawaban di smartboard → langsung tahu benar/salah,
// timer otomatis, skor kelas, streak, konfeti & suara (semua offline). Logika ada di public/js/kuis.js.
r.get('/soal/tayang', (req, res) => {
  const list = ambilSoal(req.query);
  if (!list.length) return res.redirect('/soal?galat=' + encodeURIComponent(toInt(req.query.subbab) ? 'Belum ada soal yang disetujui untuk subbab ini.' : 'Centang soal yang akan ditayangkan dulu.'));
  const judul = String(req.query.judul || (list.length === 1 ? `Soal: ${list[0].subbab}` : judulDefault(list))).slice(0, 120);
  const draf = list.filter((q) => q.status === 'draf').length;
  const huruf = 'ABCD';
  const sub = toInt(req.query.subbab);
  const kembali = req.query.dari === 'sajikan' && sub ? `/sajikan/${sub}` : (sub ? `/soal?subbab=${sub}` : '/soal');
  const pilihWaktu = [[0, 'Tanpa batas'], [20, '20 detik'], [30, '30 detik'], [60, '1 menit'], [90, '1,5 menit']];

  const slideSoal = list.map((q, i) => {
    const opsi = q.jenis === 'pg' ? opsiArr(q) : (q.jenis === 'bs' ? ['Benar', 'Salah'] : []);
    const benar = q.jenis === 'pg' ? huruf.indexOf(q.kunci) : (q.jenis === 'bs' ? opsi.indexOf(q.kunci) : -1);
    const tertutup = opsi.length > 0 && benar >= 0;
    return html`<section class="qz-slide qz-soal" data-slide data-no="${i + 1}" data-benar="${benar}" data-jenis="${tertutup ? 'pilih' : 'tulis'}" hidden>
      <div class="qz-timer" aria-hidden="true"><div class="qz-timer-bar"></div><span class="qz-timer-num"></span></div>
      <div class="qz-qcard">
        <div class="qz-qmeta"><span class="qz-no">Soal ${i + 1} / ${list.length}</span><span class="qz-jenis">${JENIS_SOAL[q.jenis]}</span>${q.status === 'draf' ? html`<span class="qz-jenis draf">Draf</span>` : ''}</div>
        <p class="qz-q">${q.pertanyaan}</p>
      </div>
      ${tertutup
        ? html`<div class="qz-opts n${opsi.length}">${opsi.map((o, k) => html`<button type="button" class="qz-opt c${k}" data-opt="${k}"><span class="qz-key">${q.jenis === 'bs' ? (k === 0 ? '✓' : '✗') : huruf[k]}</span><span class="qz-txt">${o}</span><span class="qz-mark" aria-hidden="true"></span></button>`)}</div>
          <p class="qz-hint">Ketuk jawaban di layar, atau tekan tombol ${q.jenis === 'bs' ? html`<kbd>1</kbd> / <kbd>2</kbd>` : html`<kbd>A</kbd>–<kbd>${huruf[opsi.length - 1]}</kbd>`} pada keyboard.</p>`
        : html`<div class="qz-open"><span class="qz-open-ic">✏️</span><p>${q.jenis === 'isian' ? 'Tulis jawaban singkatmu di buku.' : 'Jelaskan jawabanmu di buku dengan 1–3 kalimat.'}</p>
            <button type="button" class="qz-big" data-q="reveal">Tampilkan jawaban</button></div>`}
      <div class="qz-feedback" hidden>
        <div class="qz-fb-head"><b class="qz-fb-title"></b><span class="qz-fb-sub"></span></div>
        <p class="qz-fb-kunci"><span>Jawaban yang benar:</span> <b>${kunciTeks(q)}</b></p>
        ${q.pembahasan ? html`<p class="qz-fb-bahas">💡 ${q.pembahasan}</p>` : ''}
        ${tertutup ? '' : html`<div class="qz-judge" data-judge><span>Apakah jawaban kelas sudah benar?</span>
          <button type="button" class="qz-pill ok" data-q="judge" data-v="1">✓ Benar</button><button type="button" class="qz-pill no" data-q="judge" data-v="0">✗ Belum tepat</button></div>`}
        <button type="button" class="qz-big qz-next" data-q="next">${i === list.length - 1 ? 'Lihat hasil 🏆' : 'Soal berikutnya ›'}</button>
      </div>
    </section>`;
  });

  const body = html`
  <div class="qz" id="qz" data-total="${list.length}">
    <header class="qz-top">
      <a class="qz-btn" href="${kembali}" title="Keluar dari kuis">✕ <span>Keluar</span></a>
      <div class="qz-title"><b>${judul}</b><small>${list.length} soal</small></div>
      <div class="qz-stats" aria-live="polite">
        <span class="qz-stat ok" title="Jawaban benar">✓ <b id="qzBenar">0</b></span>
        <span class="qz-stat no" title="Jawaban salah">✗ <b id="qzSalah">0</b></span>
        <span class="qz-stat streak" id="qzStreak" hidden title="Benar berturut-turut">🔥 <b></b></span>
      </div>
      <button class="qz-btn" type="button" data-q="sound" title="Suara nyala/mati">🔊</button>
      <button class="qz-btn" type="button" data-q="fs" title="Layar penuh (F)">⛶ <span data-fs-label>Layar penuh</span></button>
    </header>
    <div class="qz-progress">${list.map((q, i) => html`<button type="button" class="qz-seg" data-go="${i + 1}" title="Soal ${i + 1}" aria-label="Ke soal ${i + 1}"></button>`)}</div>

    <main class="qz-stage">
      <section class="qz-slide qz-start" data-slide>
        <div class="qz-hero">
          <span class="qz-badge">🧪 Kuis IPAS · ${list.length} soal</span>
          <h1>${judul}</h1>
          <p class="qz-sub">${[...new Set(list.map((q) => `Kelas ${q.kelas_id} · ${q.subbab}`))].join(' / ')}</p>
          ${draf ? html`<p class="qz-warn">⚠ ${draf} soal masih Draf (belum diperiksa). Pastikan kuncinya benar.</p>` : ''}
          <div class="qz-setup">
            <span class="qz-setup-lbl">⏱ Waktu per soal</span>
            <div class="qz-chips" role="radiogroup" aria-label="Waktu per soal">${pilihWaktu.map(([d, l]) => html`<button type="button" class="qz-chip ${d === 30 ? 'on' : ''}" data-q="durasi" data-v="${d}" role="radio" aria-checked="${d === 30 ? 'true' : 'false'}">${l}</button>`)}</div>
          </div>
          <button type="button" class="qz-start-btn" data-q="mulai">Mulai kuis ▶</button>
          <p class="qz-help">Cara main: baca soal bersama → siswa menjawab → ketuk jawaban di layar → lihat pembahasan → lanjut.</p>
        </div>
      </section>
      ${slideSoal}
      <section class="qz-slide qz-end" data-slide hidden>
        <div class="qz-hero">
          <div class="qz-trophy" id="qzTrophy">🏆</div>
          <h1 id="qzEndTitle">Kuis selesai!</h1>
          <div class="qz-stars" id="qzStars"></div>
          <div class="qz-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="bg"/><circle cx="60" cy="60" r="52" class="fg" id="qzRing"/></svg><div><b id="qzPersen">0%</b><small id="qzRingSub"></small></div></div>
          <ol class="qz-recap" id="qzRecap">${list.map((q, i) => html`<li data-r="${i + 1}"><span class="qz-r-ic">–</span><span class="qz-r-q">${i + 1}. ${q.pertanyaan.length > 90 ? q.pertanyaan.slice(0, 90) + '…' : q.pertanyaan}</span><b>${kunciTeks(q)}</b></li>`)}</ol>
          <div class="qz-end-act"><button type="button" class="qz-big" data-q="ulang">↻ Ulangi kuis</button><a class="qz-big ghost" href="${kembali}">Selesai</a></div>
        </div>
      </section>
    </main>

    <footer class="qz-bottom">
      <button class="qz-nav" type="button" data-q="prev" aria-label="Sebelumnya">‹</button>
      <span class="qz-count" id="qzCount"></span>
      <button class="qz-nav" type="button" data-q="next" aria-label="Berikutnya">›</button>
    </footer>
    <canvas class="qz-confetti" id="qzConfetti" aria-hidden="true"></canvas>
  </div>
  <script src="/static/js/kuis.js?v=1"></script>`;
  res.send(page({ title: 'Kuis · ' + judul, user: req.user, body, bodyClass: 'is-presenter is-kuis' }));
});

// ---------- Google Form: buat Apps Script dari soal terpilih ----------
function scriptGoogleForm(list, { judul, acak, sekolah }) {
  const data = {
    judul,
    deskripsi: `${sekolah} · IPAS · ${[...new Set(list.map((q) => q.subbab))].join('; ')}\nBacalah setiap soal dengan teliti, lalu pilih atau tulis jawaban yang paling tepat.`,
    acak: !!acak,
    soal: list.map((q) => {
      const opsi = q.jenis === 'pg' ? opsiArr(q) : (q.jenis === 'bs' ? ['Benar', 'Salah'] : []);
      return {
        jenis: q.jenis,
        pertanyaan: q.pertanyaan,
        opsi,
        benar: q.jenis === 'pg' ? 'ABCD'.indexOf(q.kunci) : (q.jenis === 'bs' ? opsi.indexOf(q.kunci) : -1),
        kunci: kunciTeks(q),
        pembahasan: q.pembahasan || '',
        poin: q.jenis === 'uraian' ? 2 : 1,
      };
    }),
  };
  return `/**
 * Script pembuat Google Form (kuis) dari LMS IPAS ${sekolah}.
 * Dibuat: ${new Date().toLocaleString('id-ID')} · ${list.length} soal
 *
 * CARA PAKAI (butuh internet):
 * 1. Buka https://script.google.com dan masuk dengan akun Google sekolah.
 * 2. Klik "Proyek baru". Hapus semua isi editor, lalu tempel seluruh script ini.
 * 3. Klik tombol Simpan (ikon disket), lalu klik "Jalankan" (fungsi: buatFormSoal).
 * 4. Pertama kali, Google meminta izin: klik "Tinjau izin" -> pilih akun -> "Lanjutan"
 *    -> "Buka (tidak aman)" -> "Izinkan". Ini wajar karena script dibuat sendiri.
 * 5. Setelah selesai, buka "Log eksekusi": ada link untuk MENGEDIT form (guru)
 *    dan link untuk DIBAGIKAN ke siswa. Form juga muncul di Google Drive Anda.
 *
 * Pilihan ganda & benar-salah dinilai otomatis. Isian singkat & uraian dinilai guru
 * di tab "Respons" (kunci jawaban tampil sebagai umpan balik).
 */
var DATA = ${JSON.stringify(data, null, 2)};

function buatFormSoal() {
  var form = FormApp.create(DATA.judul);
  form.setDescription(DATA.deskripsi);
  form.setIsQuiz(true);
  form.setShuffleQuestions(DATA.acak);
  form.setProgressBar(true);
  form.setConfirmationMessage('Terima kasih! Jawabanmu sudah terkirim.');

  form.addTextItem().setTitle('Nama lengkap').setRequired(true);
  form.addTextItem().setTitle('Kelas').setRequired(true);

  DATA.soal.forEach(function (q, i) {
    var judul = (i + 1) + '. ' + q.pertanyaan;
    var umpan = q.pembahasan ? FormApp.createFeedback().setText(q.pembahasan).build() : null;
    var kunci = FormApp.createFeedback().setText('Kunci jawaban: ' + q.kunci + (q.pembahasan ? ' — ' + q.pembahasan : '')).build();
    if ((q.jenis === 'pg' || q.jenis === 'bs') && q.opsi.length) {
      var item = form.addMultipleChoiceItem();
      item.setTitle(judul).setPoints(q.poin).setRequired(true);
      item.setChoices(q.opsi.map(function (o, k) { return item.createChoice(o, k === q.benar); }));
      if (umpan) { item.setFeedbackForCorrect(umpan); item.setFeedbackForIncorrect(umpan); }
    } else if (q.jenis === 'isian') {
      form.addTextItem().setTitle(judul).setPoints(q.poin).setRequired(true).setGeneralFeedback(kunci);
    } else {
      form.addParagraphTextItem().setTitle(judul).setPoints(q.poin).setRequired(true).setGeneralFeedback(kunci);
    }
  });

  // Form baru kadang belum diterbitkan; terbitkan agar siswa bisa langsung mengisi.
  try { if (typeof form.setPublished === 'function') form.setPublished(true); } catch (e) { /* abaikan */ }
  form.setAcceptingResponses(true);

  Logger.log('Google Form berhasil dibuat: ' + DATA.judul + ' (' + DATA.soal.length + ' soal)');
  Logger.log('Link untuk MENGEDIT (guru): ' + form.getEditUrl());
  Logger.log('Link untuk SISWA: ' + form.getPublishedUrl());
}
`;
}

r.get('/soal/gform', (req, res) => {
  const list = ambilSoal(req.query);
  if (!list.length) return res.redirect('/soal?galat=' + encodeURIComponent('Centang soal yang akan dijadikan Google Form dulu.'));
  const judul = String(req.query.judul || judulDefault(list)).slice(0, 120);
  const acak = req.query.acak === '1';
  const script = scriptGoogleForm(list, { judul, acak, sekolah: db.setting('nama_sekolah') });
  if (req.query.unduh) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="buat-google-form-${Date.now()}.gs"`);
    return res.send(script);
  }
  const idq = req.query.ids ? `ids=${ids(req.query.ids).join(',')}` : `subbab=${toInt(req.query.subbab)}`;
  const draf = list.filter((q) => q.status === 'draf').length;
  const hitung = (j) => list.filter((q) => q.jenis === j).length;
  const body = html`
  <div class="page-head"><div class="ph-text"><p class="crumb"><a href="/soal">Bank Soal</a> ›</p><h1>Jadikan Google Form</h1>
    <p class="ph-desc">LMS membuatkan <b>script</b> yang, bila dijalankan di Google, langsung menyusun Google Form kuis berisi ${list.length} soal ini lengkap dengan kunci dan nilai otomatis.</p></div></div>
  <div class="net-note off" style="margin-bottom:1rem"><span class="net-dot"></span><div><b>Butuh internet dan akun Google.</b> Script ini dijalankan di situs Google (script.google.com), jadi perangkat yang dipakai harus tersambung ke internet. Menyalin atau mengunduh script di halaman ini tidak butuh internet.</div></div>
  ${draf ? html`<div class="flash warn">${draf} soal masih berstatus <b>Draf</b>. Sebaiknya periksa dan setujui dulu agar kunci jawabannya benar.</div>` : ''}
  <div class="grid-edit">
    <section class="card stack">
      <h2>1. Atur form</h2>
      <form method="get" action="/soal/gform" class="stack">
        ${req.query.ids ? html`<input type="hidden" name="ids" value="${ids(req.query.ids).join(',')}">` : html`<input type="hidden" name="subbab" value="${toInt(req.query.subbab)}">`}
        <label>Judul Google Form<input name="judul" value="${judul}"></label>
        <label class="switch"><input type="checkbox" name="acak" value="1" ${acak ? 'checked' : ''}> Acak urutan soal untuk setiap siswa</label>
        <button class="btn">Perbarui script</button>
      </form>
      <p class="small muted">Isi: ${hitung('pg')} pilihan ganda · ${hitung('bs')} benar-salah · ${hitung('isian')} isian · ${hitung('uraian')} uraian. Pilihan ganda &amp; benar-salah dinilai otomatis (1 poin); isian (1 poin) dan uraian (2 poin) dinilai guru.</p>
      <h2>2. Jalankan di Google</h2>
      <ol class="langkah-list">
        <li class="lk"><span class="lk-ic"></span><div><b>Salin script</b><div class="lk-isi">Klik tombol <b>Salin script</b> di samping.</div></div></li>
        <li class="lk"><span class="lk-ic"></span><div><b>Buka script.google.com</b><div class="lk-isi">Masuk dengan akun Google sekolah → klik <b>Proyek baru</b>. <a class="btn small" href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">Buka script.google.com ↗</a></div></div></li>
        <li class="lk"><span class="lk-ic"></span><div><b>Tempel &amp; jalankan</b><div class="lk-isi">Hapus isi editor, tempel script (Ctrl+V), klik <b>Simpan</b>, lalu <b>Jalankan</b>.</div></div></li>
        <li class="lk"><span class="lk-ic"></span><div><b>Beri izin (sekali saja)</b><div class="lk-isi">Tinjau izin → pilih akun → <b>Lanjutan</b> → <b>Buka (tidak aman)</b> → <b>Izinkan</b>. Wajar, karena script ini milik Anda sendiri.</div></div></li>
        <li class="lk"><span class="lk-ic"></span><div><b>Ambil link form</b><div class="lk-isi">Di <b>Log eksekusi</b> muncul link untuk mengedit form dan link untuk dibagikan ke siswa. Form juga tersimpan di Google Drive.</div></div></li>
      </ol>
    </section>
    <section class="card stack">
      <div class="fn-head"><h2>Script Google Apps Script</h2>
        <div class="row"><button type="button" class="btn primary" data-copy="#gsScript">Salin script</button><a class="btn" href="/soal/gform?${idq}&judul=${encodeURIComponent(judul)}${acak ? '&acak=1' : ''}&unduh=1">Unduh .gs</a></div></div>
      <textarea id="gsScript" class="code-box" readonly rows="24" spellcheck="false">${script}</textarea>
    </section>
  </div>`;
  res.send(page({ title: 'Jadikan Google Form', user: req.user, body, active: 'soal' }));
});

module.exports = r;
