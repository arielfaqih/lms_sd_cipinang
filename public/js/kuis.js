// Kuis interaktif di layar kelas: satu soal per layar, timer, skor, streak, suara & konfeti (tanpa internet).
(function () {
  'use strict';
  var root = document.getElementById('qz');
  if (!root) return;
  var $ = function (s, r) { return (r || root).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); };

  var slides = $$('[data-slide]');
  var segs = $$('.qz-seg');
  var total = parseInt(root.dataset.total, 10) || 0;
  var cur = 0;
  var durasi = 30;
  var hasil = {};            // no soal -> true (benar) / false (salah)
  var streak = 0;
  var suara = true;
  try { suara = localStorage.getItem('qz-suara') !== '0'; } catch (e) { /* abaikan */ }

  // ---------- suara (Web Audio, dibuat langsung di browser) ----------
  var ac = null;
  function nada(freqs, dur, type, vol) {
    if (!suara) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var t = ac.currentTime;
      freqs.forEach(function (f, i) {
        var o = ac.createOscillator(); var g = ac.createGain();
        o.type = type || 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * dur);
        g.gain.exponentialRampToValueAtTime(vol || 0.18, t + i * dur + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (i + 1) * dur);
        o.connect(g); g.connect(ac.destination); o.start(t + i * dur); o.stop(t + (i + 1) * dur + 0.05);
      });
    } catch (e) { /* abaikan */ }
  }
  var bunyi = {
    benar: function () { nada([523, 659, 784, 1047], 0.09, 'triangle', 0.2); },
    salah: function () { nada([220, 165], 0.18, 'sawtooth', 0.09); },
    tik: function () { nada([880], 0.05, 'square', 0.04); },
    habis: function () { nada([330, 262, 196], 0.16, 'triangle', 0.15); },
    selesai: function () { nada([523, 659, 784, 659, 784, 1047], 0.12, 'triangle', 0.2); },
  };
  function setSuara(on) {
    suara = on;
    try { localStorage.setItem('qz-suara', on ? '1' : '0'); } catch (e) { /* abaikan */ }
    var b = $('[data-q=sound]'); if (b) { b.textContent = on ? '🔊' : '🔇'; b.title = on ? 'Suara nyala (klik untuk mematikan)' : 'Suara mati (klik untuk menyalakan)'; }
  }
  setSuara(suara);

  // ---------- konfeti ----------
  var cv = document.getElementById('qzConfetti');
  var cx = cv && cv.getContext ? cv.getContext('2d') : null;
  var parts = []; var anim = 0;
  var WARNA = ['#ff5a7a', '#ffc53d', '#3dd68c', '#4f9dff', '#b07cff', '#ff8a3d'];
  function konfeti(banyak) {
    if (!cx || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cv.width = root.clientWidth; cv.height = root.clientHeight;
    for (var i = 0; i < (banyak || 140); i++) {
      parts.push({ x: cv.width / 2 + (Math.random() - 0.5) * cv.width * 0.3, y: cv.height * 0.55, vx: (Math.random() - 0.5) * 18, vy: -Math.random() * 18 - 6,
        s: Math.random() * 8 + 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: WARNA[i % WARNA.length], life: 0 });
    }
    if (!anim) anim = requestAnimationFrame(gerak);
  }
  function gerak() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(function (p) { return p.y < cv.height + 40 && p.life < 260; });
    parts.forEach(function (p) {
      p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); cx.restore();
    });
    anim = parts.length ? requestAnimationFrame(gerak) : 0;
    if (!anim) cx.clearRect(0, 0, cv.width, cv.height);
  }

  // ---------- timer ----------
  var tm = null;
  function stopTimer() { if (tm) { cancelAnimationFrame(tm.raf); tm = null; } }
  function mulaiTimer(slide) {
    stopTimer();
    var wrap = $('.qz-timer', slide);
    if (!durasi || !wrap) { if (wrap) wrap.hidden = true; return; }
    wrap.hidden = false;
    var bar = $('.qz-timer-bar', wrap); var num = $('.qz-timer-num', wrap);
    var akhir = performance.now() + durasi * 1000; var detikLalu = -1;
    tm = { raf: 0 };
    var langkah = function (now) {
      var sisa = Math.max(0, akhir - now); var s = Math.ceil(sisa / 1000);
      bar.style.transform = 'scaleX(' + (sisa / (durasi * 1000)) + ')';
      num.textContent = s;
      wrap.classList.toggle('kritis', s <= 5);
      if (s !== detikLalu) { if (s <= 5 && s > 0) bunyi.tik(); detikLalu = s; }
      if (sisa <= 0) { stopTimer(); waktuHabis(slide); return; }
      tm.raf = requestAnimationFrame(langkah);
    };
    tm.raf = requestAnimationFrame(langkah);
  }
  function waktuHabis(slide) {
    if (slide.classList.contains('dijawab')) return;
    bunyi.habis();
    if (slide.dataset.jenis === 'pilih') nilai(slide, -1);
    else bukaJawaban(slide, '⏰ Waktu habis!');
  }

  // ---------- skor ----------
  function perbaruiSkor() {
    var b = 0, s = 0;
    Object.keys(hasil).forEach(function (k) { if (hasil[k]) b++; else s++; });
    document.getElementById('qzBenar').textContent = b;
    document.getElementById('qzSalah').textContent = s;
    var st = document.getElementById('qzStreak');
    st.hidden = streak < 2; st.querySelector('b').textContent = streak;
    segs.forEach(function (g, i) { var r = hasil[i + 1]; g.classList.toggle('ok', r === true); g.classList.toggle('no', r === false); });
  }
  function catat(slide, benar) {
    hasil[slide.dataset.no] = benar;
    streak = benar ? streak + 1 : 0;
    perbaruiSkor();
    var st = document.getElementById('qzStreak');
    if (benar && streak >= 2) { st.classList.remove('pop'); void st.offsetWidth; st.classList.add('pop'); }
  }

  var PUJIAN = ['Hebat!', 'Keren!', 'Tepat sekali!', 'Luar biasa!', 'Mantap!', 'Pintar!'];
  function tampilFeedback(slide, judul, sub, kelas) {
    var fb = $('.qz-feedback', slide);
    fb.hidden = false;
    fb.className = 'qz-feedback ' + kelas;
    $('.qz-fb-title', fb).textContent = judul;
    $('.qz-fb-sub', fb).textContent = sub || '';
    setTimeout(function () { var n = $('.qz-next', fb); if (n) n.focus({ preventScroll: true }); fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
  }

  // pilihan ganda / benar-salah: k = indeks pilihan (-1 = waktu habis)
  function nilai(slide, k) {
    if (slide.classList.contains('dijawab')) return;
    stopTimer();
    slide.classList.add('dijawab');
    var benarIdx = parseInt(slide.dataset.benar, 10);
    var opts = $$('.qz-opt', slide);
    opts.forEach(function (o, i) {
      o.disabled = true;
      if (i === benarIdx) o.classList.add('benar');
      else if (i === k) o.classList.add('salah');
      else o.classList.add('redup');
    });
    if (k === benarIdx) {
      catat(slide, true); bunyi.benar(); konfeti(streak >= 3 ? 220 : 130);
      tampilFeedback(slide, '🎉 ' + PUJIAN[Math.floor(Math.random() * PUJIAN.length)], streak >= 2 ? streak + ' benar berturut-turut!' : 'Jawaban kelas benar.', 'ok');
    } else {
      catat(slide, false); if (k >= 0) bunyi.salah();
      tampilFeedback(slide, k < 0 ? '⏰ Waktu habis!' : '😮 Belum tepat', k < 0 ? 'Lihat jawaban yang benar di bawah.' : 'Tidak apa-apa, ayo pelajari pembahasannya.', 'no');
    }
  }
  // isian / uraian: guru membuka jawaban lalu menilai jawaban kelas
  function bukaJawaban(slide, judul) {
    if (slide.classList.contains('terbuka')) return;
    stopTimer();
    slide.classList.add('terbuka');
    var btn = $('.qz-open [data-q=reveal]', slide); if (btn) btn.hidden = true;
    tampilFeedback(slide, judul || '📖 Jawaban', 'Cocokkan dengan jawaban kelas, lalu pilih Benar atau Belum tepat.', 'info');
  }
  function nilaiTulis(slide, benar) {
    if (slide.classList.contains('dijawab')) return;
    slide.classList.add('dijawab');
    $$('[data-q=judge]', slide).forEach(function (b) { b.disabled = true; b.classList.toggle('dipilih', (b.dataset.v === '1') === benar); });
    catat(slide, benar);
    $('.qz-fb-sub', slide).textContent = benar ? (streak >= 2 ? streak + ' benar berturut-turut!' : 'Jawaban kelas benar.') : 'Tidak apa-apa, ayo pelajari pembahasannya.';
    if (benar) { bunyi.benar(); konfeti(120); $('.qz-fb-title', slide).textContent = '🎉 ' + PUJIAN[Math.floor(Math.random() * PUJIAN.length)]; $('.qz-feedback', slide).className = 'qz-feedback ok'; }
    else { bunyi.salah(); $('.qz-fb-title', slide).textContent = '😮 Belum tepat'; $('.qz-feedback', slide).className = 'qz-feedback no'; }
  }

  // ---------- layar akhir ----------
  function isiHasil() {
    var b = 0;
    for (var i = 1; i <= total; i++) if (hasil[i]) b++;
    var dijawab = Object.keys(hasil).length;
    var persen = total ? Math.round(b / total * 100) : 0;
    var bintang = persen >= 80 ? 3 : persen >= 60 ? 2 : persen >= 30 ? 1 : 0;
    document.getElementById('qzPersen').textContent = persen + '%';
    document.getElementById('qzRingSub').textContent = b + ' dari ' + total + ' benar';
    var ring = document.getElementById('qzRing'); var keliling = 2 * Math.PI * 52;
    ring.style.strokeDasharray = keliling; ring.style.strokeDashoffset = keliling;
    setTimeout(function () { ring.style.strokeDashoffset = keliling * (1 - persen / 100); }, 80);
    document.getElementById('qzStars').innerHTML = [0, 1, 2].map(function (i) { return '<span class="' + (i < bintang ? 'on' : '') + '" style="animation-delay:' + (0.25 + i * 0.25) + 's">★</span>'; }).join('');
    document.getElementById('qzEndTitle').textContent = persen >= 80 ? 'Luar biasa, kelas hebat!' : persen >= 60 ? 'Bagus sekali!' : persen >= 30 ? 'Ayo terus belajar!' : (dijawab ? 'Jangan menyerah, coba lagi!' : 'Kuis selesai!');
    document.getElementById('qzTrophy').textContent = persen >= 80 ? '🏆' : persen >= 60 ? '🥈' : persen >= 30 ? '🌱' : '📚';
    $$('#qzRecap li').forEach(function (li) {
      var r = hasil[li.dataset.r];
      li.className = r === true ? 'ok' : r === false ? 'no' : '';
      li.querySelector('.qz-r-ic').textContent = r === true ? '✓' : r === false ? '✗' : '–';
    });
    bunyi.selesai();
    if (persen >= 60) setTimeout(function () { konfeti(240); }, 300);
  }

  // ---------- navigasi ----------
  function tampil(i) {
    if (i < 0 || i >= slides.length) return;
    stopTimer();
    $$('video,audio').forEach(function (m) { try { m.pause(); } catch (e) { /* */ } });
    slides.forEach(function (s, k) { s.hidden = k !== i; });
    cur = i;
    var s = slides[i];
    segs.forEach(function (g, k) { g.classList.toggle('on', k + 1 === i); });
    var noSoal = s.dataset.no;
    document.getElementById('qzCount').textContent = noSoal ? 'Soal ' + noSoal + ' dari ' + total : (i === 0 ? 'Pembuka' : 'Hasil');
    root.classList.toggle('di-soal', !!noSoal);
    $('[data-q=prev]', root.querySelector('.qz-bottom')).disabled = i === 0;
    $('[data-q=next]', root.querySelector('.qz-bottom')).disabled = i === slides.length - 1;
    root.querySelector('.qz-stage').scrollTop = 0;
    if (noSoal && !s.classList.contains('dijawab') && !s.classList.contains('terbuka')) mulaiTimer(s);
    else if (noSoal) { var w = $('.qz-timer', s); if (w) w.hidden = true; }
    if (s.classList.contains('qz-end')) isiHasil();
    var url = new URL(location.href); url.searchParams.set('slide', i); history.replaceState(null, '', url);
  }

  function isFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function layarPenuh() {
    if (isFs()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (root.requestFullscreen || root.webkitRequestFullscreen || function () {}).call(root);
  }
  document.addEventListener('fullscreenchange', function () { var l = $('[data-fs-label]'); if (l) l.textContent = isFs() ? 'Keluar layar penuh' : 'Layar penuh'; });

  root.addEventListener('click', function (e) {
    var opt = e.target.closest('.qz-opt');
    if (opt) { nilai(opt.closest('.qz-soal'), parseInt(opt.dataset.opt, 10)); return; }
    var go = e.target.closest('[data-go]');
    if (go) { tampil(parseInt(go.dataset.go, 10)); return; }
    var b = e.target.closest('[data-q]');
    if (!b) return;
    var q = b.dataset.q;
    if (q === 'next') tampil(cur + 1);
    else if (q === 'prev') tampil(cur - 1);
    else if (q === 'mulai') { nada([392, 523], 0.08, 'triangle', 0.15); tampil(1); }
    else if (q === 'durasi') {
      durasi = parseInt(b.dataset.v, 10) || 0;
      $$('[data-q=durasi]').forEach(function (c) { c.classList.toggle('on', c === b); c.setAttribute('aria-checked', c === b ? 'true' : 'false'); });
    } else if (q === 'reveal') bukaJawaban(b.closest('.qz-soal'));
    else if (q === 'judge') nilaiTulis(b.closest('.qz-soal'), b.dataset.v === '1');
    else if (q === 'sound') setSuara(!suara);
    else if (q === 'fs') layarPenuh();
    else if (q === 'ulang') { var u = new URL(location.href); u.searchParams.delete('slide'); location.href = u.toString(); }
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    var s = slides[cur];
    var k = e.key.toLowerCase();
    if (s.dataset.jenis === 'pilih' && !s.classList.contains('dijawab')) {
      var idx = 'abcd'.indexOf(k); if (idx < 0) idx = '1234'.indexOf(k);
      var opts = $$('.qz-opt', s);
      if (idx >= 0 && idx < opts.length) { e.preventDefault(); nilai(s, idx); return; }
    }
    if (k === 'arrowright' || k === 'pagedown' || (k === 'enter' && tag !== 'button')) { e.preventDefault(); if (cur === 0) tampil(1); else tampil(cur + 1); }
    else if (k === 'arrowleft' || k === 'pageup') { e.preventDefault(); tampil(cur - 1); }
    else if (k === 'f') layarPenuh();
    else if (k === 'm') setSuara(!suara);
  });

  // geser di layar sentuh
  var sx = null, sy = null;
  root.addEventListener('touchstart', function (e) { if (e.target.closest('button,a')) { sx = null; return; } sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  root.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) tampil(dx < 0 ? cur + 1 : cur - 1);
    sx = null;
  }, { passive: true });

  var awal = parseInt(new URL(location.href).searchParams.get('slide'), 10);
  tampil(!isNaN(awal) ? Math.min(Math.max(awal, 0), slides.length - 1) : 0);
  perbaruiSkor();
})();
