// Menampilkan media dengan pemutar bawaan browser (F6)
'use strict';
const { html, raw } = require('./html');

const url = (f) => '/berkas/' + encodeURIComponent(f);

function renderMedia(m, { ringkas = false } = {}) {
  if (!m) return '';
  const alt = m.judul || '';
  switch (m.jenis) {
    case 'gambar':
      return html`<img class="m-img" src="${url(m.file)}" alt="${alt}" loading="lazy">`;
    case 'video':
      return html`<video class="m-video" src="${url(m.file)}" controls preload="metadata" playsinline></video>`;
    case 'audio':
      return html`<div class="m-audio"><b>${alt}</b><audio src="${url(m.file)}" controls preload="metadata"></audio></div>`;
    case 'animasi':
      if (/\.gif$/i.test(m.file)) return html`<img class="m-img" src="${url(m.file)}" alt="${alt}">`;
      return html`<iframe class="m-frame" src="${url(m.file)}" title="${alt}" sandbox="allow-scripts" loading="lazy" allow="fullscreen"></iframe>`;
    case 'pdf':
      return html`<div class="m-doc">${ringkas ? '' : html`<iframe class="m-frame" src="${url(m.file)}#view=FitH" title="${alt}"></iframe>`}
        <a class="btn small" href="${url(m.file)}" target="_blank" rel="noopener">Buka PDF</a>
        <a class="btn small" href="${url(m.file)}" download="${m.nama_asli}">Unduh</a></div>`;
    case 'ppt':
      return html`<div class="m-doc">${m.file_pdf && !ringkas ? html`<iframe class="m-frame" src="${url(m.file_pdf)}#view=FitH" title="${alt}"></iframe>` : ''}
        ${!m.file_pdf ? html`<p class="muted">${m.konversi === 'proses' ? 'PPT sedang dikonversi… muat ulang sebentar lagi.' : 'PPT ini belum bisa ditampilkan di browser. Unggah versi PDF-nya (di PowerPoint: Simpan Sebagai → PDF), atau pasang LibreOffice di server.'}</p>` : ''}
        ${m.file_pdf ? html`<a class="btn small" href="${url(m.file_pdf)}" target="_blank" rel="noopener">Buka layar penuh</a>` : ''}
        <a class="btn small" href="${url(m.file)}" download="${m.nama_asli}">Unduh PPT asli</a></div>`;
    default:
      return html`<a href="${url(m.file)}" download>${alt}</a>`;
  }
}

// Media dalam bingkai rapi + keterangan (judul, sumber, lisensi) dan tombol yang sesuai jenisnya.
// Dipakai di mode Sajikan dan halaman detail media.
function renderFigure(m, { caption = true } = {}) {
  if (!m) return '';
  const src = url(m.file);
  const isGif = m.jenis === 'animasi' && /\.gif$/i.test(m.file);
  // Kredit media bawaan LMS tidak perlu ditampilkan; kredit media unggahan guru tetap tampil.
  const bawaan = /^contoh-/.test(m.file || '');
  const kredit = bawaan ? '' : [m.sumber && `Sumber: ${m.sumber}`, m.lisensi].filter(Boolean).join(' · ');
  const btn = (attrs, ic, label) => html`<button type="button" class="m-act" ${attrs}><span class="ic">${ic}</span>${label}</button>`;
  const IC_ZOOM = '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  const IC_FS = '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  let stage; let acts = [];
  let kind = m.jenis;
  if (m.jenis === 'gambar' || isGif) {
    kind = 'gambar';
    stage = html`<button type="button" class="m-zoom" data-zoom="${src}" data-cap="${m.judul}" title="Klik untuk memperbesar"><img class="m-img" src="${src}" alt="${m.judul}" loading="lazy"></button>`;
    acts.push(btn(html`data-zoom="${src}" data-cap="${m.judul}"`, raw(IC_ZOOM), 'Perbesar'));
  } else if (m.jenis === 'video') {
    stage = html`<video class="m-video" src="${src}#t=0.1" controls preload="metadata" playsinline controlslist="nodownload"></video>`;
    acts.push(btn('data-fs', raw(IC_FS), 'Layar penuh'));
  } else if (m.jenis === 'audio') {
    stage = html`<div class="m-audio-card"><span class="m-audio-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg></span><b>${m.judul}</b><audio src="${src}" controls preload="metadata"></audio></div>`;
  } else if (m.jenis === 'animasi') {
    stage = html`<iframe class="m-frame" src="${src}" title="${m.judul}" sandbox="allow-scripts" loading="lazy" allow="fullscreen"></iframe>`;
    acts.push(btn('data-fs', raw(IC_FS), 'Layar penuh'));
  } else if (m.jenis === 'pdf' || (m.jenis === 'ppt' && m.file_pdf)) {
    kind = 'doc';
    const pdf = url(m.jenis === 'pdf' ? m.file : m.file_pdf);
    stage = html`<iframe class="m-frame" src="${pdf}#view=FitH&toolbar=1" title="${m.judul}"></iframe>`;
    acts.push(btn('data-fs', raw(IC_FS), 'Layar penuh'));
    acts.push(html`<a class="m-act" href="${pdf}" target="_blank" rel="noopener">Buka di tab baru</a>`);
    acts.push(html`<a class="m-act" href="${src}" download="${m.nama_asli}">Unduh</a>`);
  } else if (m.jenis === 'ppt') {
    kind = 'doc';
    stage = html`<div class="m-note"><b>${m.konversi === 'proses' ? 'PPT sedang diubah menjadi PDF…' : 'PPT ini belum bisa ditayangkan langsung.'}</b>
      <span>${m.konversi === 'proses' ? 'Muat ulang halaman sebentar lagi.' : 'Unggah versi PDF-nya (di PowerPoint: Simpan Sebagai → PDF), atau pasang LibreOffice di laptop server.'}</span></div>`;
    acts.push(html`<a class="m-act" href="${src}" download="${m.nama_asli}">Unduh PPT asli</a>`);
  } else {
    stage = html`<a href="${src}" download>${m.judul}</a>`;
  }
  return html`<figure class="mfig mfig-${kind}">
    <div class="m-stage">${stage}</div>
    ${caption ? html`<figcaption class="m-cap"><span class="m-cap-t"><b>${m.judul}</b>${kredit ? html`<small>${kredit}</small>` : ''}</span>${acts.length ? html`<span class="m-cap-act">${acts}</span>` : ''}</figcaption>` : ''}
  </figure>`;
}

function thumb(m) {
  if (!m) return '';
  if (m.jenis === 'gambar' || (m.jenis === 'animasi' && /\.gif$/i.test(m.file))) return html`<img src="${url(m.file)}" alt="" loading="lazy">`;
  if (m.jenis === 'video') return html`<video src="${url(m.file)}#t=1" preload="metadata" muted playsinline></video>`;
  const label = { audio: '♪ Audio', animasi: '✦ Interaktif', pdf: 'PDF', ppt: 'PPT' }[m.jenis] || '?';
  return html`<span class="thumb-label t-${m.jenis}">${label}</span>`;
}

module.exports = { renderMedia, renderFigure, thumb, url };
