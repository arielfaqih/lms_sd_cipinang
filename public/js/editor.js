// Editor teks sederhana dan penyusun kegiatan kelas (F7, F11)
(function () {
  'use strict';
  var form = document.getElementById('kompForm');
  if (!form) return;
  var rte = form.querySelector('[data-rte]');
  var area = rte.querySelector('[data-area]');
  var ta = rte.querySelector('textarea');
  var meter = rte.querySelector('[data-meter]');
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* abaikan */ }

  var savedRange = null;
  function saveSel() { var s = window.getSelection(); if (s.rangeCount && area.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); }
  function restoreSel() { area.focus(); if (savedRange) { var s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); } }
  area.addEventListener('keyup', saveSel); area.addEventListener('mouseup', saveSel);

  // Pengukur beban kognitif (Sweller): jumlah poin dan kata per layar
  function ukur() {
    var poin = area.querySelectorAll('li').length;
    var kata = (area.innerText || '').trim().split(/\s+/).filter(Boolean).length;
    var msgs = [kata + ' kata', poin + ' poin'];
    var warn = false;
    if (poin > 4) { msgs.push('lebih dari 4 poin — pecah menjadi dua layar'); warn = true; }
    if (kata > 90) { msgs.push('teks panjang — ringkas atau pecah layar'); warn = true; }
    meter.textContent = msgs.join(' · ');
    meter.classList.toggle('warn', warn);
  }
  area.addEventListener('input', ukur); ukur();

  rte.querySelector('.rte-bar').addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
  rte.querySelector('.rte-bar').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    area.focus();
    if (b.dataset.cmd) {
      document.execCommand(b.dataset.cmd, false, b.dataset.val ? '<' + b.dataset.val + '>' : null);
    } else if (b.dataset.act === 'istilah') {
      var sel = window.getSelection();
      var t = sel.toString();
      if (!t) { alert('Blok dulu kata yang menjadi istilah kunci.'); return; }
      var arti = prompt('Arti sederhana untuk istilah "' + t + '" (boleh dikosongkan):', '');
      var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      document.execCommand('insertHTML', false, '<span class="istilah">' + esc(t) + '</span>' + (arti ? ' (' + esc(arti) + ')' : ''));
    } else if (b.dataset.act === 'tabel') {
      var k = parseInt(prompt('Jumlah kolom?', '2'), 10) || 2;
      var r = parseInt(prompt('Jumlah baris (termasuk judul)?', '3'), 10) || 3;
      var h = '<table><tbody>';
      for (var i = 0; i < r; i++) { h += '<tr>'; for (var j = 0; j < k; j++) h += i === 0 ? '<th>Judul</th>' : '<td>&nbsp;</td>'; h += '</tr>'; }
      document.execCommand('insertHTML', false, h + '</tbody></table><p><br></p>');
    } else if (b.dataset.act === 'gambar') {
      saveSel();
      var dlg = document.getElementById('dlgGambar');
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    }
    ukur();
  });

  var dlg = document.getElementById('dlgGambar');
  if (dlg) {
    dlg.addEventListener('close', function () {
      if (!dlg.returnValue) return;
      var btn = dlg.querySelector('button[value="' + dlg.returnValue.replace(/"/g, '\\"') + '"]');
      restoreSel();
      var img = document.createElement('img');
      img.src = dlg.returnValue; img.alt = btn ? btn.dataset.alt : '';
      document.execCommand('insertHTML', false, img.outerHTML);
      ukur();
    });
  }

  // ---- Kegiatan kelas ----
  var on = document.getElementById('kegOn');
  var box = document.getElementById('kegBox');
  var list = document.getElementById('kPertanyaan');
  on.addEventListener('change', function () { box.hidden = !on.checked; });

  function addQ(q) {
    q = q || { teks: '', petunjuk: [], kunci: '' };
    var d = document.createElement('div');
    d.className = 'keg-q';
    d.innerHTML = '<label>Pertanyaan<textarea rows="2" data-f="teks"></textarea></label>' +
      '<label>Petunjuk bertahap <small class="muted">(satu per baris; dibuka satu per satu oleh guru)</small><textarea rows="2" data-f="petunjuk"></textarea></label>' +
      '<label>Kunci diskusi <small class="muted">(tersembunyi sampai guru membukanya)</small><textarea rows="2" data-f="kunci"></textarea></label>' +
      '<button type="button" class="btn small danger" data-del>Hapus pertanyaan</button>';
    d.querySelector('[data-f=teks]').value = q.teks || '';
    d.querySelector('[data-f=petunjuk]').value = (q.petunjuk || []).join('\n');
    d.querySelector('[data-f=kunci]').value = q.kunci || '';
    d.querySelector('[data-del]').onclick = function () { d.remove(); };
    list.appendChild(d);
  }
  var data = [];
  try { data = JSON.parse(document.getElementById('kegData').textContent || '[]'); } catch (e) { data = []; }
  data.forEach(addQ);
  document.getElementById('kTambah').onclick = function () { addQ(); };

  var lines = function (s) { return s.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };
  form.addEventListener('submit', function () {
    ta.value = area.innerHTML.trim() === '<br>' ? '' : area.innerHTML;
    var out = '';
    if (on.checked) {
      out = JSON.stringify({
        prediksi: document.getElementById('kPrediksi').value,
        langkah: lines(document.getElementById('kLangkah').value),
        catat: document.getElementById('kCatat').value,
        pertanyaan: Array.prototype.map.call(list.children, function (d) {
          return { teks: d.querySelector('[data-f=teks]').value, petunjuk: lines(d.querySelector('[data-f=petunjuk]').value), kunci: d.querySelector('[data-f=kunci]').value };
        }),
      });
    }
    document.getElementById('kegJson').value = out;
  });
})();
