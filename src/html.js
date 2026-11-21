// Pembantu HTML: escape otomatis + kerangka halaman
'use strict';
const db = require('./db');

class Raw { constructor(s) { this.s = String(s); } toString() { return this.s; } }
const raw = (s) => new Raw(s ?? '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fmt(v) {
  if (v === null || v === undefined || v === false) return '';
  if (Array.isArray(v)) return v.map(fmt).join('');
  if (v instanceof Raw) return v.s;
  return esc(v);
}
function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => { out += s; if (i < vals.length) out += fmt(vals[i]); });
  return new Raw(out);
}

const JENIS_KOMPONEN = [
  { key: 'pemantik', label: 'Pemantik', saran: 'Foto atau video fenomena nyata dan satu pertanyaan.', dasar: 'Piaget, Gagné' },
  { key: 'tujuan', label: 'Tujuan Pembelajaran', saran: 'Dua sampai tiga kalimat tentang apa yang akan dipahami.', dasar: 'Gagné' },
  { key: 'pengamatan', label: 'Kegiatan Pengamatan', saran: 'Apa yang diamati, prediksi siswa, cara mencatat.', dasar: 'Bruner (enaktif), inkuiri' },
  { key: 'penjelasan', label: 'Penjelasan Konsep', saran: 'Gambar, animasi, atau video disertai teks singkat. Satu konsep per layar.', dasar: 'Bruner, Mayer, Sweller' },
  { key: 'contoh', label: 'Contoh di Sekitar Siswa', saran: 'Contoh dari kehidupan dan lingkungan setempat.', dasar: 'Piaget, kontekstual' },
  { key: 'latihan', label: 'Latihan Terbimbing & Diskusi', saran: 'Pertanyaan bertahap dan kunci diskusi yang bisa disembunyikan.', dasar: 'Vygotsky' },
  { key: 'rangkuman', label: 'Rangkuman', saran: 'Poin inti (maksimal 4) atau peta konsep.', dasar: 'Gagné' },
  { key: 'refleksi', label: 'Refleksi', saran: 'Siswa memikirkan apa yang sudah dipahami, yang masih membingungkan, dan cara menerapkannya. Dijawab lisan atau di buku.', dasar: 'Pembelajaran Mendalam (memahami → mengaplikasi → merefleksi); Wiggins & McTighe' },
  { key: 'penilaian', label: 'Penilaian', saran: 'Soal dari bank soal subbab ini (otomatis).', dasar: 'Gagné' },
];
const JENIS_MAP = Object.fromEntries(JENIS_KOMPONEN.map((j) => [j.key, j]));
const JUMLAH_TEMPLAT = JENIS_KOMPONEN.length;

// Isi bawaan layar Refleksi: pertanyaan umum yang bisa disesuaikan guru
const REFLEKSI_BAWAAN = '<ul><li>Apa hal baru yang kamu pahami hari ini?</li><li>Bagian mana yang masih membingungkan?</li><li>Di mana kamu bisa menemukan atau memakai ilmu ini di rumah?</li></ul><p>Tulis jawabanmu di buku, lalu ceritakan kepada teman sebangku.</p>';
const isiBawaan = (jenis) => (jenis === 'refleksi' ? REFLEKSI_BAWAAN : '');

const JENIS_SOAL = { pg: 'Pilihan ganda', isian: 'Isian singkat', bs: 'Benar-salah', uraian: 'Uraian' };
const KESULITAN = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' };
const JENIS_MEDIA = { gambar: 'Gambar', video: 'Video', audio: 'Audio', animasi: 'Animasi', pdf: 'PDF', ppt: 'PPT' };

const ICON = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-4a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h5z"/></svg>',
  quiz: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6v3H9zM6 6h2v2h8V6h2v15H6zM9 12h6M9 16h4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  media: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="9" r="1.6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>',
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.2 6.3L20 10l-5.8 1.7L12 18l-2.2-6.3L4 10l5.8-1.7zM19 15l1 2.5 2.5 1-2.5 1L19 22l-1-2.5-2.5-1 2.5-1z"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0z"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.3 9.3a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.8v.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.2"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="4.5" cy="6" r="1.5"/><circle cx="4.5" cy="12" r="1.5"/><circle cx="4.5" cy="18" r="1.5"/></svg>',
  wifi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="19.5" r="1.6"/></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const icon = (n) => raw(`<span class="ic">${ICON[n] || ''}</span>`);

// Kepala halaman yang seragam: judul, satu kalimat penjelasan, dan tombol utama.
function pageHead({ crumb = '', title, desc = '', actions = '' }) {
  return html`<div class="page-head">
    <div class="ph-text">${crumb ? html`<p class="crumb">${crumb}</p>` : ''}<h1>${title}</h1>${desc ? html`<p class="ph-desc">${desc}</p>` : ''}</div>
    ${actions ? html`<div class="row ph-actions">${actions}</div>` : ''}
  </div>`;
}

function page({ title, user, body, active = '', head = '', bodyClass = '', pesan = '', galat = '' }) {
  const sekolah = db.setting('nama_sekolah');
  const isAdmin = user && user.role === 'admin';
  const item = (key, href, ic, label) => html`<a href="${href}" class="${active === key ? 'on' : ''}" ${active === key ? raw('aria-current="page"') : ''}>${icon(ic)}<span>${label}</span></a>`;
  const fase = user ? Object.fromEntries(db.all('SELECT id, fase FROM kelas').map((k) => [k.id, k.fase])) : {};
  const kelasItem = (n) => html`<a href="/kelas/${n}" class="${active === 'k' + n ? 'on' : ''}" ${active === 'k' + n ? raw('aria-current="page"') : ''}><span class="nav-num k${n}">${n}</span><span>Kelas ${n}</span>${fase[n] ? html`<span class="nav-fase">Fase ${fase[n]}</span>` : ''}</a>`;
  const side = user ? html`
  <aside class="side" id="nav" aria-label="Menu utama">
    <a class="brand" href="/"><img src="/static/img/logo.svg" alt="" width="38" height="38"><span><b>LMS IPAS</b><small>Bagian IPA · ${sekolah}</small></span></a>
    <nav class="nav">
      ${item('home', '/', 'home', 'Beranda')}
      <p class="nav-grp">Mengajar di kelas</p>
      ${kelasItem(4)}${kelasItem(5)}${kelasItem(6)}
      <p class="nav-grp">Menyiapkan bahan</p>
      ${item('soal', '/soal', 'quiz', 'Bank Soal')}
      ${item('media', '/media', 'media', 'Pustaka Media')}
      <p class="nav-grp">Bantuan</p>
      ${item('panduan', '/panduan', 'help', 'Panduan Singkat')}
      ${isAdmin ? item('admin', '/admin', 'gear', 'Admin') : ''}
    </nav>
    <div class="side-foot">
      <a href="/akun" class="me ${active === 'akun' ? 'on' : ''}"><span class="me-av">${(user.nama || '?').trim().charAt(0).toUpperCase()}</span><span><b>${user.nama}</b><small>${isAdmin ? 'Admin' : 'Guru'} · Akun saya</small></span></a>
    </div>
  </aside>
  <div class="side-scrim" data-nav-close></div>` : '';
  return `<!doctype html>
<html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · LMS IPAS ${esc(sekolah)}</title>
<link rel="icon" href="/static/img/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/css/app.css?v=11">
${head}
</head><body class="${esc(bodyClass)}${user ? ' has-side' : ''}">
${side}
<div class="main">
${user ? html`<header class="mtop">
  <button class="menu-btn" type="button" aria-controls="nav" aria-expanded="false" data-nav-toggle><span class="burger"></span>Menu</button>
  <a class="brand" href="/"><img src="/static/img/logo.svg" alt="" width="30" height="30"><b>LMS IPAS</b></a>
</header>` : ''}
${user ? html`<nav class="tabbar" aria-label="Menu cepat">
  ${[['home', '/', 'home', 'Beranda'], ['soal', '/soal', 'quiz', 'Soal'], ['media', '/media', 'media', 'Media'], ['panduan', '/panduan', 'help', 'Panduan']].map(([k, h, ic, l]) => html`<a href="${h}" class="${active === k ? 'on' : ''}">${icon(ic)}<span>${l}</span></a>`)}
  <button type="button" aria-controls="nav" aria-expanded="false" data-nav-toggle><span class="burger"></span><span>Menu</span></button>
</nav>` : ''}
<main class="wrap">
${pesan ? html`<div class="flash ok" role="status">${icon('check')}<span>${pesan}</span></div>` : ''}
${galat ? html`<div class="flash err" role="alert"><b>!</b><span>${galat}</span></div>` : ''}
${fmt(body)}
</main>
</div>
<script src="/static/js/app.js?v=8"></script>
</body></html>`;
}

// Pembersih HTML sederhana untuk isi dari editor guru
function sanitize(input) {
  let s = String(input || '');
  const BAD = 'script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math';
  s = s.replace(new RegExp(`<\\s*(script|style|textarea|svg|math)\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`, 'gi'), '');
  s = s.replace(new RegExp(`<\\s*\\/?\\s*(${BAD})\\b[^>]*>`, 'gi'), '');
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/\s(href|src)\s*=\s*("|')\s*(javascript|vbscript|data):[^"']*\2/gi, ' $1="#"');
  s = s.replace(/\s(href|src)\s*=\s*(javascript|vbscript|data):[^\s>]*/gi, ' $1="#"');
  s = s.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, (m) => (/expression|url\s*\(/i.test(m) ? '' : m));
  return s;
}
const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

module.exports = { html, raw, esc, page, pageHead, icon, sanitize, stripTags, JENIS_KOMPONEN, JENIS_MAP, JUMLAH_TEMPLAT, REFLEKSI_BAWAAN, isiBawaan, JENIS_SOAL, KESULITAN, JENIS_MEDIA };
