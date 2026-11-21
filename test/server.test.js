// Uji server: halaman, kelengkapan materi bawaan, LKPD, kuis, Google Form, remote, ekspor, backup, unggah.
// Jalankan: npm test
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const { mulaiServer, klien, bukaDb } = require('./bantu');

let srv, k, db;
before(async () => { srv = await mulaiServer(); k = await klien(srv.base).masuk(); db = bukaDb(srv.dataDir); });
after(async () => { if (db) db.close(); if (srv) await srv.stop(); });

const teks = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const subbabSemua = () => db.prepare(`SELECT s.id, s.judul, s.status, b.kelas_id FROM subbab s JOIN bab b ON b.id = s.bab_id ORDER BY b.kelas_id, b.urutan, s.urutan`).all();

test('halaman utama dapat dibuka (200)', async () => {
  for (const u of ['/', '/kelas/4', '/kelas/5', '/kelas/6', '/soal', '/soal/buat', '/media', '/panduan', '/akun', '/remote',
    '/admin', '/admin/pengguna', '/admin/backup', '/admin/pengaturan', '/admin/log']) {
    const r = await k.req(u);
    assert.equal(r.status, 200, `${u} → ${r.status}`);
  }
});

test('halaman terkunci tanpa login', async () => {
  const r = await fetch(srv.base + '/kelas/4', { redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), /\/masuk/);
});

test('materi bawaan: 19 subbab lengkap sesuai templat', () => {
  const subs = subbabSemua();
  assert.equal(subs.length, 19);
  for (const s of subs) {
    const komps = db.prepare('SELECT * FROM komponen WHERE subbab_id = ? ORDER BY urutan').all(s.id);
    const jenis = new Set(komps.map((x) => x.jenis));
    for (const j of ['pemantik', 'tujuan', 'pengamatan', 'penjelasan', 'contoh', 'latihan', 'rangkuman', 'refleksi', 'penilaian']) assert.ok(jenis.has(j), `${s.judul}: layar ${j} tidak ada`);
    const kosong = komps.filter((x) => x.jenis !== 'penilaian' && !teks(x.isi_html) && !x.media_id && !x.kegiatan_json);
    assert.equal(kosong.length, 0, `${s.judul}: layar kosong ${kosong.map((x) => x.judul)}`);
    const padat = komps.filter((x) => (x.isi_html.match(/<li\b/gi) || []).length > 4 || teks(x.isi_html).split(' ').length > 90);
    assert.equal(padat.length, 0, `${s.judul}: layar terlalu padat ${padat.map((x) => x.judul)}`);
    assert.ok(komps.some((x) => x.media_id), `${s.judul}: tidak ada media`);
    const soal = db.prepare(`SELECT * FROM soal WHERE subbab_id = ? AND status = 'disetujui'`).all(s.id);
    assert.ok(soal.length >= 6, `${s.judul}: soal ${soal.length}`);
    for (const q of soal) {
      const opsi = JSON.parse(q.opsi_json || '[]');
      if (q.jenis === 'pg') { assert.equal(opsi.length, 4, `${s.judul}: opsi PG`); assert.ok('ABCD'.includes(q.kunci) && q.kunci.length === 1, `${s.judul}: kunci PG "${q.kunci}"`); }
      if (q.jenis === 'bs') assert.ok(['Benar', 'Salah'].includes(q.kunci), `${s.judul}: kunci B/S`);
    }
  }
});

test('setiap layar Pemantik punya ilustrasi dan penyaji memakai ikon layar', async () => {
  for (const s of subbabSemua()) {
    const p = db.prepare(`SELECT media_id FROM komponen WHERE subbab_id = ? AND jenis = 'pemantik' ORDER BY urutan LIMIT 1`).get(s.id);
    assert.ok(p && p.media_id, `${s.judul}: layar Pemantik belum bergambar`);
  }
  const s = subbabSemua()[0];
  const r = await k.req(`/sajikan/${s.id}`);
  assert.match(await r.text(), /class="sl-ico"/);
  const beranda = await k.req('/');
  assert.match(await beranda.text(), /class="tabbar"/);
});

test('setiap subbab dapat disajikan dan ditayangkan sebagai kuis', async () => {
  for (const s of subbabSemua()) {
    const r = await k.req(`/sajikan/${s.id}`);
    assert.equal(r.status, 200, s.judul);
    const h = await r.text();
    const jml = db.prepare('SELECT COUNT(*) AS n FROM komponen WHERE subbab_id = ?').get(s.id).n;
    assert.equal((h.match(/class="slide /g) || []).length, jml, `${s.judul}: jumlah layar`);
    const q = await k.req(`/soal/tayang?subbab=${s.id}`);
    assert.equal(q.status, 200, `${s.judul}: kuis`);
    assert.match(await q.text(), /qz-soal/);
  }
});

test('Cetak LKPD versi siswa dan guru', async () => {
  const s = db.prepare(`SELECT id FROM subbab WHERE judul = 'Jenis Gaya dan Pengaruhnya'`).get();
  assert.equal((await k.req(`/subbab/${s.id}/lkpd`)).status, 200);
  const siswa = await (await k.req(`/subbab/${s.id}/lkpd?format=cetak&kunci=0`)).text();
  assert.match(siswa, /LEMBAR KERJA PESERTA DIDIK/);
  assert.match(siswa, /<table class="x-tabel">/, 'tabel pengamatan dari "Buat tabel:"');
  assert.match(siswa, /Langkah kerja/);
  assert.doesNotMatch(siswa, /class="x-kunci"/, 'versi siswa tanpa kunci');
  const guru = await (await k.req(`/subbab/${s.id}/lkpd?format=cetak&kunci=1`)).text();
  assert.match(guru, /VERSI GURU/);
  assert.match(guru, /class="x-kunci"/);
  const doc = await k.req(`/subbab/${s.id}/lkpd?format=doc`);
  assert.match(doc.headers.get('content-type'), /msword/);
});

test('script Google Form valid (dijalankan dengan tiruan FormApp)', async () => {
  const ids = db.prepare(`SELECT id FROM soal WHERE status = 'disetujui' LIMIT 12`).all().map((x) => x.id).join(',');
  const r = await k.req(`/soal/gform?ids=${ids}&unduh=1`);
  assert.equal(r.status, 200);
  const src = await r.text();
  const API = {
    Form: ['setDescription', 'setIsQuiz', 'setShuffleQuestions', 'setProgressBar', 'setConfirmationMessage', 'addTextItem', 'addMultipleChoiceItem', 'addParagraphTextItem', 'setPublished', 'setAcceptingResponses', 'getEditUrl', 'getPublishedUrl'],
    TextItem: ['setTitle', 'setRequired', 'setPoints', 'setGeneralFeedback'],
    ParagraphTextItem: ['setTitle', 'setRequired', 'setPoints', 'setGeneralFeedback'],
    MultipleChoiceItem: ['setTitle', 'setRequired', 'setPoints', 'setChoices', 'createChoice', 'setFeedbackForCorrect', 'setFeedbackForIncorrect'],
    FeedbackBuilder: ['setText', 'build'],
  };
  const pg = [];
  function obj(type, impl = {}) {
    const o = {};
    for (const m of API[type]) o[m] = impl[m] || function () { return prox; };
    const prox = new Proxy(o, { get(t, key) { if (key in t) return t[key]; if (typeof key === 'string') throw new Error(`Metode tidak ada: ${type}.${key}`); return undefined; } });
    return prox;
  }
  const form = obj('Form', {
    addTextItem: () => obj('TextItem'), addParagraphTextItem: () => obj('ParagraphTextItem'),
    addMultipleChoiceItem: () => { const benar = []; pg.push(benar); const i = obj('MultipleChoiceItem', { createChoice: (v, ok) => { if (ok) benar.push(v); return {}; } }); return i; },
    getEditUrl: () => 'e', getPublishedUrl: () => 'p',
  });
  const ctx = { FormApp: { create: () => form, createFeedback: () => obj('FeedbackBuilder', { build: () => ({}) }) }, Logger: { log() {} } };
  vm.createContext(ctx);
  vm.runInContext(src + '\nbuatFormSoal();', ctx);
  assert.ok(pg.length > 0);
  pg.forEach((b) => assert.equal(b.length, 1, 'setiap pilihan ganda tepat satu kunci'));
});

test('remote HP: perintah diteruskan ke layar dan keadaan ke HP', async () => {
  const r = await k.req('/api/remote/buat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const { kode, qr } = await r.json();
  assert.match(kode, /^\d{4}$/);
  assert.match(qr, /<svg/);
  const ctl = new AbortController();
  const dengar = async (peran) => {
    const res = await fetch(`${srv.base}/api/remote/${kode}/events?peran=${peran}`, { headers: { cookie: k.cookie }, signal: ctl.signal });
    const rd = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
    return { tunggu: async (event) => { for (;;) { const i = buf.indexOf(`event: ${event}\n`); if (i >= 0) { const j = buf.indexOf('\n\n', i); if (j >= 0) { const blok = buf.slice(i, j); buf = buf.slice(j + 2); return JSON.parse(blok.split('data: ')[1]); } } const { value, done } = await rd.read(); if (done) throw new Error('aliran berakhir'); buf += dec.decode(value); } } };
  };
  const layar = await dengar('layar');
  const hp = await dengar('hp');
  const js = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
  await k.req(`/api/remote/${kode}/state`, { ...js, body: JSON.stringify({ i: 2, n: 10, judul: 'Uji', layar: [], catatan: ['kunci rahasia'] }) });
  const st = await hp.tunggu('state');
  assert.equal(st.i, 2);
  assert.deepEqual(st.catatan, ['kunci rahasia']);
  const kirim = await k.req(`/api/remote/${kode}/perintah`, { ...js, body: JSON.stringify({ aksi: 'next' }) });
  assert.equal(kirim.status, 200);
  assert.equal((await layar.tunggu('perintah')).aksi, 'next');
  const salah = await k.req(`/api/remote/${kode}/perintah`, { ...js, body: JSON.stringify({ aksi: 'hapus-semua' }) });
  assert.equal(salah.status, 400);
  assert.equal((await k.req('/remote/0000')).status, 200);
  assert.equal((await k.req(`/remote/${kode}`)).status, 200);
  ctl.abort();
});

test('ekspor soal (cetak & Word) dan backup', async () => {
  const ids = db.prepare(`SELECT id FROM soal LIMIT 5`).all().map((x) => x.id).join(',');
  assert.match(await (await k.req(`/soal/ekspor?ids=${ids}&format=cetak`)).text(), /x-list/);
  assert.match((await k.req(`/soal/ekspor?ids=${ids}&format=doc`)).headers.get('content-type'), /msword/);
  const b = await k.req('/admin/backup', { method: 'POST' });
  assert.equal(b.status, 200);
  assert.match(b.headers.get('content-type'), /zip/);
});

test('unggah media gambar', async () => {
  const fd = new FormData();
  fd.append('berkas', new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'], { type: 'image/svg+xml' }), 'uji.svg');
  fd.append('judul', 'Gambar uji');
  const r = await k.req('/media', { method: 'POST', body: fd });
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), /\/media\/\d+/);
  const tolak = new FormData();
  tolak.append('berkas', new Blob(['x'], { type: 'application/octet-stream' }), 'jahat.exe');
  assert.match((await k.req('/media', { method: 'POST', body: tolak })).headers.get('location'), /galat=/);
});
