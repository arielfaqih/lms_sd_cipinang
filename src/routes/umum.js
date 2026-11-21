// Halaman depan, login, akun, beranda guru (F1, F2, F3)
'use strict';
const express = require('express');
const QRCode = require('qrcode');
const db = require('../db');
const auth = require('../auth');
const net = require('../net');
const ai = require('../ai');
const { html, raw, page, pageHead, icon, JENIS_KOMPONEN, JUMLAH_TEMPLAT } = require('../html');

const r = express.Router();

async function alamatBlok(req) {
  const port = req.app.locals.PORT;
  const addrs = net.lanAddresses();
  if (!addrs.length) return html`<p class="muted">Laptop ini belum terhubung ke Wi-Fi/LAN. Hubungkan ke router atau nyalakan hotspot laptop, lalu muat ulang halaman ini.</p>`;
  const items = [];
  for (const a of addrs.slice(0, 3)) {
    const url = `http://${a.address}:${port}`;
    const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 180 });
    items.push(html`<figure class="qr"><div class="qr-img">${raw(svg)}</div><figcaption><b>${url}</b><small>${a.name}</small></figcaption></figure>`);
  }
  return html`<div class="qr-list">${items}</div>
    <p class="muted small">Pindai kode QR dengan kamera HP yang tersambung ke Wi-Fi yang sama. Matikan data seluler di HP agar tidak berpindah jaringan.</p>`;
}

r.get('/masuk', async (req, res) => {
  if (req.user) return res.redirect('/');
  const lanjut = typeof req.query.lanjut === 'string' && req.query.lanjut.startsWith('/') && !req.query.lanjut.startsWith('//') ? req.query.lanjut : '/';
  const body = html`
  <div class="login-wrap">
    <section class="card login">
      <img src="/static/img/logo.svg" alt="" width="64" height="64">
      <h1>LMS IPAS<br><small>Bagian IPA · ${db.setting('nama_sekolah')} · Kelas 4–6</small></h1>
      <form method="post" action="/masuk" class="stack">
        <input type="hidden" name="lanjut" value="${lanjut}">
        <label>Nama pengguna<input name="username" autocomplete="username" required autofocus></label>
        <label>Kata sandi<input name="password" type="password" autocomplete="current-password" required></label>
        <button class="btn primary big" type="submit">Masuk</button>
      </form>
      <p class="login-help">Lupa kata sandi? Minta Admin sekolah untuk meresetnya.</p>
    </section>
    <section class="card">
      <h2>${icon('wifi')}Buka dari HP atau smartboard</h2>
      <ol class="steps-mini">
        <li>Sambungkan perangkat ke <b>Wi-Fi sekolah</b> yang sama dengan laptop ini.</li>
        <li>Pindai kode QR di bawah dengan kamera HP, atau ketik alamatnya di browser.</li>
      </ol>
      ${await alamatBlok(req)}
    </section>
  </div>`;
  res.send(page({ title: 'Masuk', user: null, body, galat: req.query.galat || '', pesan: req.query.pesan || '', bodyClass: 'is-login' }));
});

r.post('/masuk', (req, res) => {
  const username = String(req.body.username || '').trim();
  const lanjut = String(req.body.lanjut || '/');
  const key = `${req.socket.remoteAddress}|${username.toLowerCase()}`;
  const th = auth.loginThrottle(key);
  const back = (msg) => res.redirect('/masuk?galat=' + encodeURIComponent(msg) + '&lanjut=' + encodeURIComponent(lanjut));
  if (th.blocked) return back('Terlalu banyak percobaan. Tunggu 10 menit lalu coba lagi.');
  const u = db.get('SELECT * FROM users WHERE username = ?', username);
  if (!u || !db.verifyPassword(req.body.password || '', u.pass_hash)) { th.fail(); return back('Nama pengguna atau kata sandi salah.'); }
  if (!u.aktif) return back('Akun ini dinonaktifkan. Hubungi admin.');
  th.reset();
  auth.createSession(res, u.id);
  res.redirect(lanjut.startsWith('/') && !lanjut.startsWith('//') ? lanjut : '/');
});

r.post('/keluar', (req, res) => { auth.destroySession(req, res); res.redirect('/masuk'); });

r.use(auth.requireLogin);

r.get('/akun', (req, res) => {
  const u = req.user;
  const body = html`
  <h1>Akun saya</h1>
  ${req.query.wajib ? html`<div class="flash warn">Demi keamanan, ganti kata sandi bawaan sebelum melanjutkan.</div>` : ''}
  <div class="grid2">
    <section class="card">
      <h2>Profil</h2>
      <p><b>${u.nama}</b><br><span class="muted">@${u.username} · ${u.role === 'admin' ? 'Admin' : 'Guru'}</span></p>
      <form method="post" action="/keluar"><button class="btn">Keluar</button></form>
    </section>
    <section class="card">
      <h2>Ganti kata sandi</h2>
      <form method="post" action="/akun/sandi" class="stack">
        <label>Kata sandi sekarang<input type="password" name="lama" required autocomplete="current-password"></label>
        <label>Kata sandi baru (minimal 6 karakter)<input type="password" name="baru" minlength="6" required autocomplete="new-password"></label>
        <label>Ulangi kata sandi baru<input type="password" name="ulang" minlength="6" required autocomplete="new-password"></label>
        <button class="btn primary">Simpan</button>
      </form>
    </section>
  </div>`;
  res.send(page({ title: 'Akun', user: u, body, active: 'akun', pesan: req.query.pesan, galat: req.query.galat }));
});

r.post('/akun/sandi', (req, res) => {
  const { lama, baru, ulang } = req.body;
  const back = (k, m) => res.redirect(`/akun?${k}=` + encodeURIComponent(m) + (req.user.harus_ganti && k === 'galat' ? '&wajib=1' : ''));
  if (!db.verifyPassword(lama || '', req.user.pass_hash)) return back('galat', 'Kata sandi sekarang salah.');
  if (!baru || String(baru).length < 6) return back('galat', 'Kata sandi baru minimal 6 karakter.');
  if (baru !== ulang) return back('galat', 'Ulangan kata sandi tidak sama.');
  if (baru === lama) return back('galat', 'Kata sandi baru harus berbeda.');
  db.run('UPDATE users SET pass_hash = ?, harus_ganti = 0 WHERE id = ?', db.hashPassword(baru), req.user.id);
  res.redirect('/?pesan=' + encodeURIComponent('Kata sandi berhasil diganti.'));
});

r.get('/api/status', async (req, res) => {
  const online = await net.isOnline();
  const st = ai.status();
  const kunciSalah = db.setting('ai_tes_status') === 'gagal';
  res.json({ online, ...st, kunciSalah, siap: online && st.adaKunci && !kunciSalah && st.sisa > 0 });
});

r.get('/', async (req, res) => {
  const u = req.user;
  const kelas = db.all(`SELECT k.id, k.nama, k.fase,
      (SELECT COUNT(*) FROM subbab s JOIN bab b ON b.id = s.bab_id WHERE b.kelas_id = k.id AND s.status = 'terbit') AS terbit,
      (SELECT COUNT(*) FROM subbab s JOIN bab b ON b.id = s.bab_id WHERE b.kelas_id = k.id) AS total,
      (SELECT COUNT(*) FROM bab b WHERE b.kelas_id = k.id) AS bab,
      (SELECT COUNT(*) FROM soal q JOIN subbab s ON s.id = q.subbab_id JOIN bab b ON b.id = s.bab_id WHERE b.kelas_id = k.id AND q.status='disetujui') AS soal
    FROM kelas k ORDER BY k.id`);
  const last = u.last_subbab_id ? db.get(`SELECT s.id, s.judul, b.judul AS bab, b.kelas_id FROM subbab s JOIN bab b ON b.id = s.bab_id WHERE s.id = ?`, u.last_subbab_id) : null;
  const draf = db.get(`SELECT COUNT(*) AS n FROM soal WHERE status = 'draf'`).n;
  const jam = new Date().getHours();
  const salam = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
  const body = html`
  <section class="hello">
    <div>
      <h1>${salam}, ${u.nama.split(' ')[0]}!</h1>
      <p>Mau mengajar kelas berapa hari ini?</p>
    </div>
    <div class="ai-pill" id="aiPill" data-state="cek" title="Internet hanya dibutuhkan untuk fitur Buat Soal dengan AI"><span class="dot"></span><span class="txt">Memeriksa internet…</span></div>
  </section>

  ${last ? html`<a class="card resume" href="/sajikan/${last.id}?lanjut=1">
      <span class="resume-ic">${icon('play')}</span>
      <span><small>Lanjutkan yang terakhir ditayangkan · Kelas ${last.kelas_id}</small><b>${last.judul}</b><span class="muted">${last.bab}</span></span>
      <span class="btn primary go">Lanjutkan ${icon('arrow')}</span>
    </a>` : ''}

  <section class="kelas-grid" aria-label="Pilih kelas">
    ${kelas.map((k) => {
      const persen = k.total ? Math.round((k.terbit / k.total) * 100) : 0;
      return html`<a class="kelas-card k${k.id}" href="/kelas/${k.id}">
        <span class="kc-top"><span class="kelas-num">${k.id}</span>
          <span class="kelas-info"><b>${k.nama}</b><small>Fase ${k.fase} · ${k.bab} bab</small></span></span>
        <span class="kc-prog"><span>${k.terbit}/${k.total} subbab siap · ${k.soal} soal</span>
          <span class="kc-bar"><span style="width:${persen}%"></span></span></span>
        <span class="kc-go">Buka materi ${icon('arrow')}</span>
      </a>`;
    })}
  </section>

  <nav class="quick" aria-label="Pintasan">
    <a href="/soal?status=draf">${icon('check')}<span>Tinjau draf soal</span>${draf ? html`<span class="badge">${draf}</span>` : ''}</a>
    <a href="/soal/buat">${icon('spark')}<span>Buat soal dengan AI</span></a>
    <a href="/media">${icon('media')}<span>Pustaka media</span></a>
    <a href="/panduan">${icon('help')}<span>Panduan singkat</span></a>
  </nav>

  <details class="card">
    <summary><b>${icon('wifi')}Buka di HP atau perangkat lain</b></summary>
    ${await alamatBlok(req)}
  </details>`;
  res.send(page({ title: 'Beranda', user: u, body, active: 'home', pesan: req.query.pesan }));
});

// ---------- Panduan singkat di dalam aplikasi ----------
r.get('/panduan', (req, res) => {
  const body = html`
  ${pageHead({ title: 'Panduan Singkat', desc: 'Semua yang perlu diketahui guru untuk memakai LMS ini, dalam 5 bagian. Baca sekali, setelah itu cukup ikuti alurnya.' })}
  <div class="guide">
    <section class="card guide-sec"><span class="guide-no">1</span><div>
      <h2>Membuka LMS</h2>
      <ul>
        <li>Di laptop server: buka <b>http://localhost:3000</b>.</li>
        <li>Di HP / laptop lain / smartboard: sambung ke Wi-Fi sekolah yang sama, lalu pindai <b>kode QR</b> di Beranda (bagian paling bawah).</li>
        <li>Matikan <b>data seluler</b> di HP. Bila muncul "Wi-Fi tidak ada internet", pilih <b>Tetap tersambung</b>.</li>
      </ul>
    </div></section>

    <section class="card guide-sec"><span class="guide-no">2</span><div>
      <h2>Menyajikan materi di kelas</h2>
      <ol>
        <li>Menu kiri → pilih <b>Kelas 4, 5, atau 6</b>.</li>
        <li>Pada subbab yang diinginkan, klik <span class="ui pri">▶ Sajikan</span>.</li>
        <li>Klik <span class="ui">Layar penuh</span> (atau tekan tombol <kbd>F</kbd>).</li>
        <li>Pindah layar: tombol <span class="ui">Berikutnya</span>, panah keyboard <kbd>→</kbd> <kbd>←</kbd>, remote presenter, atau geser di layar sentuh.</li>
        <li>Klik gambar untuk <b>memperbesar</b>. Video, animasi, dan PDF punya tombol <span class="ui">Layar penuh</span> sendiri.</li>
        <li>Di kotak diskusi: klik <span class="ui">Petunjuk</span> untuk membuka bantuan satu per satu, dan <span class="ui">Buka kunci</span> setelah siswa berdiskusi.</li>
        <li><span class="ui">Daftar layar</span> di kanan atas untuk melompat ke layar mana saja.</li>
        <li><b>Remote dari HP:</b> klik <span class="ui">📱 Remote HP</span>, lalu pindai kode QR dengan HP guru (Wi-Fi yang sama). HP menjadi remote dengan tombol ◀ ▶, dan <b>kunci jawaban hanya tampil di HP guru</b>.</li>
        <li><b>Lembar kerja:</b> klik <span class="ui">LKPD</span> pada subbab untuk mencetak lembar kerja siswa (atau versi guru dengan kunci).</li>
      </ol>
    </div></section>

    <section class="card guide-sec"><span class="guide-no">3</span><div>
      <h2>Menyusun materi</h2>
      <p>Setiap subbab otomatis berisi <b>${JUMLAH_TEMPLAT} layar</b> dengan urutan berikut:</p>
      <ul class="templat">${JENIS_KOMPONEN.map((j, i) => html`<li><span class="tag j-${j.key}">${i + 1}. ${j.label}</span>${j.saran}</li>`)}</ul>
      <ol style="margin-top:1rem">
        <li>Di halaman kelas, klik <span class="ui">Edit</span> pada subbab.</li>
        <li>Klik <span class="ui">Edit</span> pada setiap layar → tulis teks singkat → pilih atau unggah media → <span class="ui pri">Simpan</span>.</li>
        <li>Jika muncul kotak <b>Perlu dilengkapi</b>, ikuti daftarnya sampai tertulis <b>Templat lengkap</b>.</li>
        <li>Jika sudah siap, ubah status subbab menjadi <span class="tag terbit">Terbit</span>.</li>
      </ol>
      <p class="muted">Aturan menulis: satu konsep per layar, maksimal 4 poin, kalimat pendek, mulai dari hal nyata (foto/kegiatan) baru istilah.</p>
    </div></section>

    <section class="card guide-sec"><span class="guide-no">4</span><div>
      <h2>Soal: buat, setujui, tayangkan, cetak</h2>
      <ol>
        <li>Buka <b>Bank Soal</b> → <span class="ui">+ Tulis manual</span>, atau <span class="ui pri">Buat dengan AI</span> (butuh internet).</li>
        <li>Soal baru berstatus <span class="tag draf">Draf</span>. Periksa isinya dan kunci jawabannya, lalu klik <span class="ui">✓ Setujui</span>.</li>
        <li>Hanya soal <span class="tag disetujui">Disetujui</span> yang tampil di layar <b>Penilaian</b> saat menyajikan.</li>
        <li><b>Kuis di layar kelas:</b> klik <span class="ui pri">▶ Tayangkan</span> pada satu soal, atau centang beberapa soal → <span class="ui pri">▶ Tayangkan</span>. Pilih waktu per soal, klik <b>Mulai kuis</b>. Siswa menjawab bersama, lalu ketuk jawaban di smartboard (atau tekan A–D / 1–4). Layar langsung menunjukkan benar/salah, pembahasan, skor kelas, dan streak 🔥. Untuk soal isian/uraian, klik <span class="ui">Tampilkan jawaban</span> lalu nilai jawaban kelas. Di akhir muncul hasil dan bintang. Suara bisa dimatikan dengan tombol 🔊.</li>
        <li><b>Mencetak:</b> centang soal → <span class="ui">Ekspor / cetak</span> → pilih dengan/tanpa kunci → <b>Cetak</b> atau <b>Unduh Word</b>.</li>
        <li><b>Kuis online (Google Form):</b> centang soal → <span class="ui">Google Form</span> → <span class="ui pri">Salin script</span> → buka script.google.com → tempel → <b>Jalankan</b>. Google Form kuis jadi otomatis lengkap dengan kunci. <i>Butuh internet dan akun Google.</i></li>
      </ol>
    </div></section>

    <section class="card guide-sec"><span class="guide-no">5</span><div>
      <h2>Media (gambar, video, animasi, PDF)</h2>
      <ul>
        <li><b>Pustaka Media</b> → <span class="ui pri">Unggah media</span>. Satu media bisa dipakai di banyak layar.</li>
        <li>Format: gambar JPG/PNG/SVG, video MP4 (maks. 720p), animasi HTML5/GIF, audio MP3, dokumen PDF/PPT.</li>
        <li>Isi <b>Sumber</b> dan <b>Lisensi</b>. Keduanya tampil kecil di bawah media saat menyajikan.</li>
        <li>Jangan memakai YouTube karena butuh internet; unduh atau rekam videonya sendiri.</li>
      </ul>
    </div></section>

    <section class="card"><h2>Arti warna &amp; label</h2>
      <dl class="faq">
        <dt><span class="tag draf">Draf</span></dt><dd>Belum selesai / belum diperiksa. Subbab draf tetap bisa disajikan untuk dicoba.</dd>
        <dt><span class="tag terbit">Terbit</span> / <span class="tag disetujui">Disetujui</span></dt><dd>Sudah siap dipakai di kelas.</dd>
        <dt><span class="ui pri">Tombol hijau</span></dt><dd>Langkah utama yang biasanya Anda klik berikutnya.</dd>
        <dt><span class="ui" style="color:var(--danger)">Tombol merah</span></dt><dd>Menghapus. Selalu ada konfirmasi sebelum benar-benar dihapus.</dd>
      </dl>
    </section>
  </div>`;
  res.send(page({ title: 'Panduan Singkat', user: req.user, body, active: 'panduan' }));
});

module.exports = r;
