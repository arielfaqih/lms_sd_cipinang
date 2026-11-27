// Mode presentasi (F5), kegiatan kelas yang dikendalikan guru (F7), dan remote dari HP guru.
(function () {
  'use strict';
  var root = document.getElementById('presenter');
  if (!root) return;
  var slides = Array.prototype.slice.call(root.querySelectorAll('.slide'));
  var dots = Array.prototype.slice.call(root.querySelectorAll('.dot'));
  var tocItems = Array.prototype.slice.call(root.querySelectorAll('.toc-list [data-go]'));
  var count = document.getElementById('count');
  var countLbl = document.getElementById('countLbl');
  var bar = document.getElementById('bar');
  var stage = document.getElementById('stage');
  var toc = document.getElementById('toc');
  var fsLabel = root.querySelector('[data-fs-label]');
  var cur = Math.min(parseInt(root.dataset.start, 10) || 0, slides.length - 1);
  var subbab = root.dataset.subbab;
  var saveTimer;

  function pauseMedia(s) { Array.prototype.forEach.call(s.querySelectorAll('video,audio'), function (m) { try { m.pause(); } catch (e) { /* */ } }); }

  function show(i) {
    if (i < 0 || i >= slides.length) return;
    pauseMedia(slides[cur]);
    slides.forEach(function (s, k) { s.hidden = k !== i; });
    dots.forEach(function (d, k) { d.classList.toggle('on', k === i); d.classList.toggle('seen', k < i); });
    tocItems.forEach(function (b, k) { b.classList.toggle('on', k === i); });
    cur = i;
    count.textContent = (i + 1) + ' / ' + slides.length;
    var head = slides[i].querySelector('.sl-head');
    countLbl.textContent = head ? (head.getAttribute('data-jenis') || '') : '';
    bar.style.width = ((i + 1) / slides.length * 100) + '%';
    stage.scrollTop = 0;
    root.querySelector('[data-act=prev]').disabled = i === 0;
    var next = root.querySelector('[data-act=next]');
    next.querySelector('.nb-txt').textContent = i === slides.length - 1 ? 'Selesai' : 'Berikutnya';
    var url = new URL(location.href); url.searchParams.set('slide', i + 1); url.searchParams.delete('lanjut');
    history.replaceState(null, '', url);
    clearTimeout(saveTimer);
    if (subbab) saveTimer = setTimeout(function () {
      var body = new URLSearchParams({ subbab: subbab, slide: String(i) });
      fetch('/api/posisi', { method: 'POST', body: body, credentials: 'same-origin' }).catch(function () {});
    }, 600);
    kirimState();
  }

  function isFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function fullscreen() {
    var d = document;
    if (isFs()) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (root.requestFullscreen || root.webkitRequestFullscreen || function () {}).call(root);
  }
  function onFs() { if (fsLabel) fsLabel.textContent = isFs() ? 'Keluar layar penuh' : 'Layar penuh'; }
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);

  function openToc() { if (toc && toc.showModal) { toc.showModal(); var on = toc.querySelector('.on'); if (on) on.focus(); } }

  // Petunjuk bertahap dan kunci jawaban pada kotak diskusi / soal
  function bukaPetunjuk(b) {
    var box = b.closest('[data-diskusi]');
    var hints = box.querySelectorAll('[data-hint]');
    var shown = box.querySelectorAll('[data-hint]:not([hidden])').length;
    if (shown < hints.length) hints[shown].hidden = false;
    shown++;
    b.textContent = 'Petunjuk (' + Math.min(shown, hints.length) + '/' + hints.length + ')';
    if (shown >= hints.length) b.disabled = true;
  }
  function aturKunci(b, buka) {
    var wadah = b.closest('[data-diskusi]');
    var k = wadah.querySelector('[data-kunci]');
    var jawaban = b.dataset.jenis === 'jawaban' || b.textContent.indexOf('jawaban') >= 0;
    b.dataset.jenis = jawaban ? 'jawaban' : 'kunci';
    k.hidden = buka === undefined ? !k.hidden : !buka;
    wadah.classList.toggle('reveal', !k.hidden); // sorot pilihan yang benar
    b.classList.toggle('open', !k.hidden);
    b.textContent = k.hidden ? (jawaban ? 'Tampilkan jawaban' : 'Buka kunci') : (jawaban ? 'Sembunyikan jawaban' : 'Tutup kunci');
  }

  root.addEventListener('click', function (e) {
    if (e.target === toc) { toc.close(); return; } // klik di luar kotak daftar
    var rd = document.getElementById('remoteDlg');
    if (rd && e.target === rd) { rd.close(); return; }
    var b = e.target.closest('[data-act],[data-go]');
    if (!b) return;
    if (b.blur && (b.dataset.go !== undefined || b.dataset.act === 'next' || b.dataset.act === 'prev')) b.blur();
    if (b.dataset.go !== undefined) { if (toc && toc.open) toc.close(); return show(parseInt(b.dataset.go, 10)); }
    var act = b.dataset.act;
    if (act === 'next') {
      if (cur === slides.length - 1) { if (confirm('Ini layar terakhir. Selesai dan kembali?')) location.href = root.querySelector('.pr-top a').href; }
      else show(cur + 1);
    } else if (act === 'prev') show(cur - 1);
    else if (act === 'fs') fullscreen();
    else if (act === 'toc') openToc();
    else if (act === 'toc-close') toc.close();
    else if (act === 'hint') { bukaPetunjuk(b); kirimState(); }
    else if (act === 'kunci') { aturKunci(b); kirimState(); }
    else if (act === 'remote') bukaRemote();
    else if (act === 'remote-close') document.getElementById('remoteDlg').close();
  });

  // Tombol keyboard / remote presentasi (clicker)
  document.addEventListener('keydown', function (e) {
    if ((toc && toc.open) || document.querySelector('dialog.lightbox[open]') || document.querySelector('#remoteDlg[open]')) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'video' || tag === 'audio') return;
    if (e.key === ' ' && tag === 'button') return; // spasi menekan tombol yang sedang fokus
    if (['ArrowRight', 'PageDown', ' '].indexOf(e.key) >= 0) { e.preventDefault(); show(cur + 1); }
    else if (['ArrowLeft', 'PageUp'].indexOf(e.key) >= 0) { e.preventDefault(); show(cur - 1); }
    else if (e.key === 'Home') show(0);
    else if (e.key === 'End') show(slides.length - 1);
    else if (e.key === 'f' || e.key === 'F') fullscreen();
  });

  // Geser di HP / smartboard
  var sx = null, sy = null;
  stage.addEventListener('touchstart', function (e) { if (e.target.closest('iframe,video,audio,input,.m-zoom')) { sx = null; return; } sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(dx < 0 ? cur + 1 : cur - 1);
    sx = null;
  }, { passive: true });

  // ---------------- Remote dari HP guru ----------------
  var KEY = 'lms-remote-kode', kode = null, es = null;
  try { kode = sessionStorage.getItem(KEY); } catch (e) { kode = null; }
  function teks(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function stateSekarang() {
    var s = slides[cur];
    var catatan = [];
    if (s) Array.prototype.forEach.call(s.querySelectorAll('[data-diskusi]'), function (d, k) {
      var q = d.querySelector('.q'), kunci = d.querySelector('[data-kunci]');
      if (kunci) catatan.push((q ? (k + 1) + '. ' + teks(q) + ' → ' : '') + teks(kunci).replace(/^(kunci jawaban|kunci:|jawaban:)\s*/i, ''));
    });
    return {
      i: cur, n: slides.length, judul: (root.querySelector('.pr-title b') || {}).textContent || '',
      layar: slides.map(function (sl) { var h = sl.querySelector('.sl-head'); return { judul: h ? teks(h.querySelector('h2')) : '', label: h ? h.getAttribute('data-jenis') || '' : '' }; }),
      catatan: catatan,
    };
  }
  function kirimState() {
    if (!kode) return;
    fetch('/api/remote/' + kode + '/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(stateSekarang()) }).catch(function () {});
  }
  function jalankan(p) {
    var s = slides[cur];
    if (p.aksi === 'next') show(cur + 1);
    else if (p.aksi === 'prev') show(cur - 1);
    else if (p.aksi === 'go') show(p.i);
    else if (p.aksi === 'petunjuk') { var h = s && s.querySelector('[data-act=hint]:not(:disabled)'); if (h) bukaPetunjuk(h); kirimState(); }
    else if (p.aksi === 'kunci' && s) {
      var tombol = s.querySelectorAll('[data-act=kunci]'), adaTertutup = s.querySelector('[data-kunci][hidden]');
      Array.prototype.forEach.call(tombol, function (b) { aturKunci(b, !!adaTertutup); });
      kirimState();
    }
  }
  function tandaHp(jml) {
    var t = document.getElementById('remoteTanda');
    if (t) { t.hidden = !jml; t.textContent = '📱 ' + jml; }
    var st = document.getElementById('remoteStatus');
    if (st) st.textContent = jml ? '✓ ' + jml + ' HP terhubung. Dialog ini boleh ditutup.' : 'Menunggu HP terhubung…';
  }
  function sambung() {
    if (es) es.close();
    es = new EventSource('/api/remote/' + kode + '/events?peran=layar');
    es.addEventListener('perintah', function (e) { jalankan(JSON.parse(e.data)); });
    es.addEventListener('koneksi', function (e) { tandaHp(JSON.parse(e.data).hp); });
    es.onopen = kirimState;
    es.onerror = function () { // sesi hilang (mis. server dimulai ulang): minta kode baru saat dibuka lagi
      if (es.readyState === 2) { kode = null; try { sessionStorage.removeItem(KEY); } catch (x) { /* */ } }
    };
  }
  function buatSesi() {
    return fetch('/api/remote/buat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ kode: kode || '' }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var baru = j.kode !== kode; kode = j.kode;
        try { sessionStorage.setItem(KEY, kode); } catch (e) { /* */ }
        if (baru || !es || es.readyState === 2) sambung();
        return j;
      });
  }
  function bukaRemote() {
    var dlg = document.getElementById('remoteDlg');
    if (!dlg) return;
    buatSesi().then(function (j) {
      document.getElementById('remoteQr').innerHTML = j.qr;
      document.getElementById('remoteKode').textContent = j.kode;
      var u = document.getElementById('remoteUrl');
      u.textContent = '';
      var b = document.createElement('b'); b.textContent = j.url; u.appendChild(b);
      if (j.lain && j.lain.length) {
        var s = document.createElement('span');
        s.className = 'remote-lain';
        s.textContent = 'Jika tidak terbuka, coba: ' + j.lain.join(' atau ');
        u.appendChild(s);
      }
      var w = document.getElementById('remoteWarn');
      if (w) w.hidden = !j.tanpaJaringan;
      if (dlg.showModal && !dlg.open) dlg.showModal();
    }).catch(function () { alert('Gagal membuat sesi remote. Periksa sambungan ke server.'); });
  }
  // Sesi remote yang sudah ada (mis. pindah subbab) disambung lagi otomatis
  if (kode) buatSesi().catch(function () {});

  if (slides.length) show(cur);
})();
