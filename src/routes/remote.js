// Kendali presentasi dari HP guru (remote) lewat jaringan lokal sekolah.
// Layar (smartboard) membuat sesi berkode 4 angka; HP guru membuka /remote/KODE.
// Sinkronisasi memakai Server-Sent Events (SSE): tanpa internet dan tanpa pustaka tambahan.
'use strict';
const express = require('express');
const QRCode = require('qrcode');
const net = require('../net');
const { html, page } = require('../html');

const r = express.Router();
const SESI = new Map(); // kode -> { kode, userId, layar:Set<res>, hp:Set<res>, state, aktif }
const KEDALUWARSA = 8 * 60 * 60 * 1000; // sesi dihapus setelah 8 jam tidak dipakai

function kirim(res, event, data) { try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) { /* koneksi putus */ } }
function siarkan(set, event, data) { set.forEach((res) => kirim(res, event, data)); }
function infoKoneksi(s) { const d = { layar: s.layar.size, hp: s.hp.size }; siarkan(s.layar, 'koneksi', d); siarkan(s.hp, 'koneksi', d); }
function ambil(kode) { const s = SESI.get(String(kode)); if (s) s.aktif = Date.now(); return s; }

setInterval(() => {
  const batas = Date.now() - KEDALUWARSA;
  for (const [k, s] of SESI) if (s.aktif < batas && !s.layar.size && !s.hp.size) SESI.delete(k);
}, 10 * 60 * 1000).unref();

// Semua alamat remote yang mungkin; yang pertama paling tepat (lihat net.alamatTerbaik)
function alamatRemote(req, kode) {
  const port = req.app.locals.PORT;
  const daftar = net.alamatTerbaik(req.hostname).map((a) => `http://${a.address}:${port}/remote/${kode}`);
  return daftar.length ? daftar : [`http://localhost:${port}/remote/${kode}`];
}

// Layar membuat (atau memakai ulang) sesi remote
r.post('/api/remote/buat', async (req, res) => {
  let kode = String(req.body.kode || '');
  if (!SESI.has(kode)) {
    do { kode = String(Math.floor(1000 + Math.random() * 9000)); } while (SESI.has(kode));
    SESI.set(kode, { kode, userId: req.user.id, layar: new Set(), hp: new Set(), state: null, aktif: Date.now() });
  }
  const [url, ...lain] = alamatRemote(req, kode);
  const qr = await QRCode.toString(url, { type: 'svg', margin: 1, width: 220 });
  res.json({ kode, url, lain, qr, tanpaJaringan: !net.lanAddresses().length });
});

// Aliran peristiwa untuk layar atau HP
r.get('/api/remote/:kode/events', (req, res) => {
  const s = ambil(req.params.kode);
  if (!s) return res.status(404).json({ error: 'Kode remote tidak ditemukan. Buka lagi tombol Remote HP di layar.' });
  const peran = req.query.peran === 'layar' ? 'layar' : 'hp';
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 2000\n\n');
  s[peran].add(res);
  if (peran === 'hp' && s.state) kirim(res, 'state', s.state);
  infoKoneksi(s);
  const detak = setInterval(() => { try { res.write(': detak\n\n'); } catch (e) { /* */ } }, 20000);
  req.on('close', () => { clearInterval(detak); s[peran].delete(res); infoKoneksi(s); });
});

// Layar melaporkan keadaan slide terkini → diteruskan ke HP
r.post('/api/remote/:kode/state', (req, res) => {
  const s = ambil(req.params.kode);
  if (!s) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
  s.state = req.body && typeof req.body === 'object' ? req.body : null;
  siarkan(s.hp, 'state', s.state);
  res.json({ ok: true });
});

// HP mengirim perintah → diteruskan ke layar
const PERINTAH = new Set(['next', 'prev', 'go', 'kunci', 'petunjuk']);
r.post('/api/remote/:kode/perintah', (req, res) => {
  const s = ambil(req.params.kode);
  if (!s) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
  const aksi = String(req.body.aksi || '');
  if (!PERINTAH.has(aksi)) return res.status(400).json({ error: 'Perintah tidak dikenal.' });
  if (!s.layar.size) return res.status(409).json({ error: 'Layar presentasi tidak terhubung. Pastikan halaman Sajikan masih terbuka.' });
  siarkan(s.layar, 'perintah', { aksi, i: parseInt(req.body.i, 10) || 0 });
  res.json({ ok: true });
});

// Halaman memasukkan kode
r.get('/remote', (req, res) => {
  const body = html`<div class="card" style="max-width:460px;margin:6vh auto;text-align:center">
    <h1>📱 Remote presentasi</h1>
    <p class="ph-desc">Masukkan 4 angka kode yang tampil di layar presentasi (tombol <b>Remote HP</b>).</p>
    <form method="get" action="/remote/kode" class="stack" onsubmit="location.href='/remote/'+this.kode.value.trim();return false;">
      <input name="kode" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required autofocus placeholder="contoh: 4821" style="font-size:2rem;text-align:center;letter-spacing:.4em">
      <button class="btn primary big">Hubungkan</button>
    </form></div>`;
  res.send(page({ title: 'Remote presentasi', user: req.user, body }));
});

// Halaman remote di HP guru
r.get('/remote/:kode', (req, res) => {
  const kode = String(req.params.kode).replace(/\D/g, '').slice(0, 4);
  if (!SESI.has(kode)) {
    return res.send(page({ title: 'Remote presentasi', user: req.user, galat: `Kode ${kode || '?'} tidak ditemukan atau sudah kedaluwarsa. Buka tombol Remote HP di layar presentasi untuk mendapat kode baru.`,
      body: html`<p style="text-align:center"><a class="btn" href="/remote">Masukkan kode lain</a></p>` }));
  }
  const body = html`
  <div class="rm" id="rm" data-kode="${kode}">
    <div class="rm-top"><span class="rm-dot" id="dot"></span><span id="status">Menghubungkan…</span><span class="rm-kode">Kode ${kode}</span></div>
    <div class="rm-kartu"><small id="posisi">–</small><b id="judul">Menunggu layar presentasi…</b><span id="sub"></span></div>
    <div class="rm-nav"><button type="button" class="rm-btn" data-aksi="prev" aria-label="Layar sebelumnya">◀</button><button type="button" class="rm-btn utama" data-aksi="next" aria-label="Layar berikutnya">▶</button></div>
    <div class="rm-berikut" id="berikut"></div>
    <div class="rm-aksi"><button type="button" class="btn" data-aksi="petunjuk">💡 Buka petunjuk berikutnya</button><button type="button" class="btn" data-aksi="kunci">🔑 Tampilkan/tutup kunci di layar</button></div>
    <details class="rm-catatan" open><summary>📝 Catatan guru (hanya tampil di HP ini)</summary><div id="catatan"><p class="muted">Kunci jawaban layar ini akan tampil di sini.</p></div></details>
    <details class="rm-daftar"><summary>☰ Lompat ke layar…</summary><ol id="daftar"></ol></details>
    <p class="rm-pesan" id="pesan" role="status"></p>
  </div>
  <script src="/static/js/remote.js?v=1"></script>`;
  res.send(page({ title: 'Remote presentasi', user: req.user, body, bodyClass: 'is-remote' }));
});

module.exports = r;
module.exports.SESI = SESI;
