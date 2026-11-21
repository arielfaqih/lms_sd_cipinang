// HP guru sebagai remote presentasi: menerima keadaan layar dan mengirim perintah (SSE + fetch).
(function () {
  'use strict';
  var rm = document.getElementById('rm');
  if (!rm) return;
  var kode = rm.dataset.kode, state = null, es = null;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  function status(teks, ok) { $('status').textContent = teks; $('dot').className = 'rm-dot' + (ok ? ' on' : ''); }
  function pesan(teks) { $('pesan').textContent = teks || ''; if (teks) setTimeout(function () { if ($('pesan').textContent === teks) $('pesan').textContent = ''; }, 3500); }

  function tampil() {
    if (!state) return;
    var l = state.layar[state.i] || {};
    $('posisi').textContent = 'Layar ' + (state.i + 1) + ' dari ' + state.n + ' · ' + (l.label || '');
    $('judul').textContent = l.judul || '';
    $('sub').textContent = state.judul || '';
    var nx = state.layar[state.i + 1];
    $('berikut').innerHTML = nx ? 'Berikutnya: <b>' + esc(nx.judul) + '</b>' : '<b>Ini layar terakhir.</b>';
    var c = state.catatan || [];
    $('catatan').innerHTML = c.length ? '<ul>' + c.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '<p class="muted">Tidak ada kunci jawaban di layar ini.</p>';
    $('daftar').innerHTML = state.layar.map(function (x, k) { return '<li><button type="button" class="' + (k === state.i ? 'on' : '') + '" data-go="' + k + '">' + esc(x.judul) + ' <small>' + esc(x.label) + '</small></button></li>'; }).join('');
    document.querySelector('[data-aksi=prev]').disabled = state.i === 0;
    document.querySelector('[data-aksi=next]').disabled = state.i >= state.n - 1;
  }

  function sambung() {
    if (es) es.close();
    es = new EventSource('/api/remote/' + kode + '/events?peran=hp');
    es.addEventListener('state', function (e) { state = JSON.parse(e.data); tampil(); });
    es.addEventListener('koneksi', function (e) { var d = JSON.parse(e.data); status(d.layar ? 'Terhubung ke layar presentasi' : 'Layar presentasi belum terbuka', !!d.layar); });
    es.onerror = function () { status('Koneksi terputus, mencoba lagi…', false); };
  }

  function perintah(aksi, i) {
    if (navigator.vibrate) navigator.vibrate(15);
    fetch('/api/remote/' + kode + '/perintah', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ aksi: aksi, i: i || 0 }) })
      .then(function (r) { return r.json(); }).then(function (j) { if (j.error) pesan(j.error); }).catch(function () { pesan('Gagal mengirim. Periksa Wi-Fi.'); });
  }

  rm.addEventListener('click', function (e) {
    var a = e.target.closest('[data-aksi]');
    if (a) { perintah(a.dataset.aksi); return; }
    var g = e.target.closest('[data-go]');
    if (g) { perintah('go', parseInt(g.dataset.go, 10)); g.closest('details').open = false; }
  });

  // Geser kiri/kanan di HP juga memindah layar
  var sx = null;
  rm.addEventListener('touchstart', function (e) { if (e.target.closest('button,summary,a')) { sx = null; return; } sx = e.touches[0].clientX; }, { passive: true });
  rm.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 70) perintah(dx < 0 ? 'next' : 'prev'); sx = null; }, { passive: true });

  // Layar HP tetap menyala selama dipakai sebagai remote (jika didukung)
  function jagaLayar() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () {}); } catch (e) { /* */ } }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { jagaLayar(); if (!es || es.readyState === 2) sambung(); } });
  jagaLayar();
  sambung();
})();
