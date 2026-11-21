// Perilaku umum halaman (tanpa pustaka luar)
(function () {
  'use strict';
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Halaman yang menunggu proses di server (mis. pemasangan LibreOffice) memuat ulang sendiri
  var ar = document.querySelector('[data-autorefresh]');
  if (ar) setTimeout(function () { location.reload(); }, (parseInt(ar.getAttribute('data-autorefresh'), 10) || 15) * 1000);

  // Tombol salin (mis. script Google Form). Clipboard API hanya ada di localhost/https, jadi ada cadangan.
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (!b) return;
    var el = document.querySelector(b.getAttribute('data-copy'));
    if (!el) return;
    var teks = el.value || el.textContent;
    var asli = b.textContent;
    var beres = function (ok) { b.textContent = ok ? '✓ Tersalin!' : 'Tekan Ctrl+C untuk menyalin'; setTimeout(function () { b.textContent = asli; }, 2500); };
    var cadangan = function () { el.focus(); el.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (x) { ok = false; } beres(ok); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(teks).then(function () { beres(true); }, cadangan);
    else cadangan();
  });

  // Menu samping di HP/tablet
  var side = document.getElementById('nav');
  var togs = $$('[data-nav-toggle]');
  function setNav(open) {
    if (!side) return;
    document.body.classList.toggle('nav-open', open);
    togs.forEach(function (t) { t.setAttribute('aria-expanded', open ? 'true' : 'false'); });
  }
  togs.forEach(function (t) { t.addEventListener('click', function () { setNav(!document.body.classList.contains('nav-open')); }); });
  $$('[data-nav-close]').forEach(function (el) { el.addEventListener('click', function () { setNav(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });

  // Perbesar gambar (lightbox) dan layar penuh untuk video/animasi/PDF
  var lb = null;
  function lightbox(src, cap) {
    if (!lb) {
      lb = document.createElement('dialog');
      lb.className = 'lightbox';
      lb.innerHTML = '<img alt=""><p class="lb-cap"></p><button type="button" class="lb-close" aria-label="Tutup">✕ Tutup</button>';
      lb.addEventListener('click', function (e) { if (e.target === lb || e.target.closest('.lb-close') || e.target.tagName === 'IMG') lb.close(); });
      var host = document.getElementById('presenter') || document.body;
      host.appendChild(lb);
    }
    lb.querySelector('img').src = src;
    lb.querySelector('img').alt = cap || '';
    lb.querySelector('.lb-cap').textContent = cap || '';
    if (lb.showModal) lb.showModal(); else window.open(src, '_blank');
  }
  document.addEventListener('click', function (e) {
    var z = e.target.closest('[data-zoom]');
    if (z) { e.preventDefault(); lightbox(z.getAttribute('data-zoom'), z.getAttribute('data-cap')); return; }
    var f = e.target.closest('[data-fs]');
    if (f) {
      e.preventDefault();
      var fig = f.closest('figure');
      var el = fig && fig.querySelector('video,iframe,.m-stage');
      if (!el) return;
      if ((document.fullscreenElement || document.webkitFullscreenElement) === el) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        return;
      }
      (el.requestFullscreen || el.webkitRequestFullscreen || el.webkitEnterFullscreen || function () {}).call(el);
    }
  });

  // Konfirmasi sebelum tindakan berisiko
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-confirm]');
    if (b && !confirm(b.getAttribute('data-confirm'))) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    var sub = e.submitter;
    if (sub && sub.hasAttribute('data-confirm')) return; // sudah dikonfirmasi saat klik
    if (f.hasAttribute('data-confirm') && !confirm(f.getAttribute('data-confirm'))) { e.preventDefault(); return; }
    if (f.hasAttribute('data-upload')) {
      e.preventDefault();
      cekVideo(f).then(function (lanjut) { if (lanjut) uploadWithProgress(null, f); });
    } else if (f.hasAttribute('data-loading')) showLoading(f.getAttribute('data-loading'));
  });

  // Peringatan video berat sebelum diunggah: resolusi > 720p, > ± 18 MB per menit, atau terlalu panjang.
  // Video berat sering tersendat bila diputar banyak HP sekaligus lewat Wi-Fi sekolah.
  function cekVideo(f) {
    var inp = f.querySelector('input[type=file]'), file = inp && inp.files && inp.files[0];
    if (!file || !(/^video\//.test(file.type) || /\.(mp4|webm|m4v)$/i.test(file.name))) return Promise.resolve(true);
    return new Promise(function (selesai) {
      var v = document.createElement('video'), url = URL.createObjectURL(file), beres = false;
      function akhir(hasil) { if (beres) return; beres = true; URL.revokeObjectURL(url); selesai(hasil); }
      var batas = setTimeout(function () { akhir(true); }, 5000); // tidak bisa dibaca: lanjutkan saja
      v.preload = 'metadata';
      v.onerror = function () { clearTimeout(batas); akhir(true); };
      v.onloadedmetadata = function () {
        clearTimeout(batas);
        var mb = file.size / 1048576, menit = v.duration / 60, masalah = [];
        if (v.videoHeight > 720) masalah.push('resolusi ' + v.videoHeight + 'p (disarankan maksimal 720p)');
        if (menit > 0 && mb / menit > 18) masalah.push('± ' + Math.round(mb / menit) + ' MB per menit (disarankan ≤ 18 MB per menit)');
        if (menit > 10) masalah.push('durasi ' + Math.round(menit) + ' menit (disarankan 2–5 menit per konsep)');
        if (!masalah.length) { akhir(true); return; }
        akhir(confirm('⚠️ Video ini mungkin tersendat saat diputar di HP atau di banyak perangkat sekaligus:\n\n• ' + masalah.join('\n• ') +
          '\n\nSaran: kompres menjadi MP4 720p dengan aplikasi gratis seperti HandBrake (preset "Fast 720p30") atau Shotcut, atau potong per konsep.\n\nTetap unggah video ini?'));
      };
      v.src = url;
    });
  }

  function showLoading(msg) {
    var ov = document.createElement('div');
    ov.className = 'loading-ov';
    ov.innerHTML = '<div><div class="spinner"></div><div></div></div>';
    ov.lastChild.lastChild.textContent = msg || 'Memproses…';
    document.body.appendChild(ov);
  }

  // Unggah dengan bilah kemajuan (berguna untuk video besar)
  function uploadWithProgress(e, f) {
    if (!window.XMLHttpRequest || !window.FormData) { f.submit(); return; }
    if (e) e.preventDefault();
    var bar = f.querySelector('progress');
    var btns = $$('button', f);
    btns.forEach(function (b) { b.disabled = true; });
    if (bar) { bar.hidden = false; bar.value = 0; }
    var xhr = new XMLHttpRequest();
    xhr.open('POST', f.action);
    xhr.upload.onprogress = function (ev) { if (bar && ev.lengthComputable) bar.value = Math.round(ev.loaded / ev.total * 100); };
    xhr.onload = function () {
      if (xhr.responseURL && xhr.responseURL !== f.action) location.href = xhr.responseURL;
      else { document.open(); document.write(xhr.responseText); document.close(); }
    };
    xhr.onerror = function () { alert('Unggah gagal. Periksa sambungan Wi-Fi ke server.'); btns.forEach(function (b) { b.disabled = false; }); };
    xhr.send(new FormData(f));
  }

  // Indikator online/offline untuk generate soal (F3)
  var pill = document.getElementById('aiPill');
  if (pill) {
    var cek = function () {
      fetch('/api/status', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (s) {
        var t = pill.querySelector('.txt');
        if (s.siap) { pill.dataset.state = 'on'; t.textContent = 'Online · Buat soal AI siap (sisa ' + s.sisa + ')'; }
        else if (s.online && s.kunciSalah) { pill.dataset.state = 'off'; t.textContent = 'Online · kunci API AI bermasalah, cek Pengaturan'; }
        else if (s.online && !s.adaKunci) { pill.dataset.state = 'off'; t.textContent = 'Online · Buat soal AI belum diaktifkan'; }
        else if (s.online) { pill.dataset.state = 'off'; t.textContent = 'Online · batas AI hari ini habis'; }
        else { pill.dataset.state = 'off'; t.textContent = 'Offline · Buat soal AI butuh internet. Materi & bank soal tetap bisa dipakai'; }
      }).catch(function () { pill.dataset.state = 'off'; pill.querySelector('.txt').textContent = 'Status tidak diketahui'; });
    };
    cek(); setInterval(cek, 60000);
  }

  // Bank soal: pilih semua & hitung terpilih
  var all = document.querySelector('[data-checkall]');
  var count = document.querySelector('[data-selcount]');
  function upd() {
    var n = $$('input[name=id]:checked').length;
    if (count) count.textContent = n ? n + ' dipilih' : 'Centang soal dulu';
    // tombol massal hanya aktif bila ada soal yang dicentang
    $$('.bulk button[name=aksi]').forEach(function (b) { b.disabled = !n; b.title = n ? '' : 'Centang soal dulu'; });
  }
  if (all) all.addEventListener('change', function () { $$('input[name=id]').forEach(function (c) { c.checked = all.checked; }); upd(); });
  $$('input[name=id]').forEach(function (c) { c.addEventListener('change', upd); });
  upd();

  // Form soal: tampilkan isian sesuai jenis
  var sf = document.querySelector('[data-soalform]');
  if (sf) {
    var sel = sf.querySelector('[data-jenis]');
    var apply = function () {
      $$('[data-show]', sf).forEach(function (el) {
        var on = el.getAttribute('data-show').split(' ').indexOf(sel.value) >= 0;
        el.hidden = !on;
        $$('input,textarea', el).forEach(function (i) { i.disabled = !on; });
      });
    };
    sel.addEventListener('change', apply); apply();
  }
})();
