// LMS Offline IPA Kelas 4–6 — server lokal
'use strict';
process.removeAllListeners('warning');
process.on('warning', (w) => { if (w.name !== 'ExperimentalWarning') console.warn(w); });

const path = require('path');
const express = require('express');
const db = require('./src/db');
const auth = require('./src/auth');
const net = require('./src/net');
const { page, html } = require('./src/html');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const VERSI = require('./package.json').version;

db.open();
require('./src/seed').seedIfEmpty();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false);
app.locals.VERSI = VERSI;

app.use(auth.localOnly);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

// Aset statis (semua lokal, tanpa CDN)
app.use('/static', express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// Berkas media. Animasi HTML dan SVG dijalankan dalam sandbox agar aman.
app.use('/berkas', auth.loadUser, (req, res, next) => {
  if (!req.user) return res.status(401).send('Silakan masuk dulu.');
  if (/\.(html?|svg)$/i.test(req.path)) res.setHeader('Content-Security-Policy', 'sandbox allow-scripts');
  next();
}, express.static(db.MEDIA_DIR, { maxAge: '1d', acceptRanges: true, dotfiles: 'deny' }));

app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.json({ limit: '5mb' }));
app.use(auth.loadUser);

app.use(require('./src/routes/umum'));
app.use(auth.requireLogin);
app.use(require('./src/routes/materi'));
app.use(require('./src/routes/media'));
app.use(require('./src/routes/soal'));
app.use(require('./src/routes/remote'));
app.use('/admin', auth.requireAdmin, require('./src/routes/admin'));

app.use((req, res) => {
  res.status(404).send(page({ title: 'Tidak ditemukan', user: req.user, body: html`<div class="card"><h1>Halaman tidak ditemukan</h1><p><a class="btn" href="/">Kembali ke beranda</a></p></div>` }));
});
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  db.logError(`${req.method} ${req.path}`, err);
  const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Berkas terlalu besar.' : 'Terjadi kesalahan. Detail tercatat di catatan kesalahan (Admin → Pengaturan).';
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: msg });
  res.status(500).send(page({ title: 'Kesalahan', user: req.user, body: html`<div class="card"><h1>Ups, ada kesalahan</h1><p>${msg}</p><p><a class="btn" href="javascript:history.back()">Kembali</a></p></div>` }));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  const addrs = net.lanAddresses();
  console.log('\n  LMS IPAS ' + db.setting('nama_sekolah') + ' — server berjalan (versi ' + VERSI + ')');
  console.log('  Di laptop ini   : http://localhost:' + PORT);
  for (const a of addrs) console.log(`  Dari HP/perangkat: http://${a.address}:${PORT}   (${a.name})`);
  console.log('\n  Biarkan jendela ini terbuka selama LMS dipakai. Tekan Ctrl+C untuk berhenti.\n');
});
// Port sudah dipakai: biasanya LMS sudah berjalan di jendela lain (misalnya pintasan diklik dua kali).
// Tampilkan pesan yang jelas, bukan galat teknis. Kode keluar 10 = LMS sudah berjalan (dibaca mulai-server.bat).
server.on('error', async (e) => {
  if (e.code !== 'EADDRINUSE') throw e;
  let lms = false;
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/masuk`, { signal: AbortSignal.timeout(3000) });
    lms = /LMS IPAS/.test(await r.text());
  } catch (x) { lms = false; }
  if (lms) {
    console.log('\n  LMS IPAS SUDAH BERJALAN di jendela lain (port ' + PORT + ').');
    console.log('  Tidak perlu dinyalakan dua kali. Buka di browser: http://localhost:' + PORT);
    console.log('  Jendela ini boleh ditutup. Jendela server yang pertama JANGAN ditutup.\n');
    process.exit(10);
  }
  console.log('\n  Port ' + PORT + ' sedang dipakai aplikasi lain, jadi LMS belum bisa dinyalakan.');
  console.log('  Tutup aplikasi tersebut (atau mulai ulang laptop), lalu jalankan LMS lagi.\n');
  process.exit(1);
});
server.requestTimeout = 0; // unggah video besar boleh lama
app.locals.PORT = PORT;

function stop() { server.close(); db.close(); process.exit(0); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
