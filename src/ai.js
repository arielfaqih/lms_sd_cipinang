// Generate soal dengan Google Gemini (F8). Hanya bagian ini yang butuh internet.
// Kunci API hanya disimpan dan dipakai di server, tidak pernah dikirim ke browser.
'use strict';
const db = require('./db');
const { stripTags, JENIS_SOAL } = require('./html');

const API = 'https://generativelanguage.googleapis.com/v1beta';

function pemakaianHariIni() {
  return db.get(`SELECT COUNT(*) AS n FROM ai_log WHERE date(waktu) = date('now','localtime') AND status IN ('ok','gagal')`).n;
}
function status() {
  const batas = Math.max(0, parseInt(db.setting('ai_batas_harian'), 10) || 0);
  const pakai = pemakaianHariIni();
  return { adaKunci: !!db.setting('gemini_api_key'), batas, pakai, sisa: Math.max(0, batas - pakai), model: db.setting('gemini_model') };
}

// Teks materi subbab (bahan satu-satunya untuk AI)
function materiSubbab(subbabId) {
  const s = db.get(`SELECT s.*, b.judul AS bab, b.kelas_id FROM subbab s JOIN bab b ON b.id = s.bab_id WHERE s.id = ?`, subbabId);
  if (!s) return null;
  const kom = db.all(`SELECT k.*, m.judul AS media_judul FROM komponen k LEFT JOIN media m ON m.id = k.media_id WHERE k.subbab_id = ? AND k.jenis != 'penilaian' ORDER BY k.urutan`, subbabId);
  const bagian = [];
  let isiLen = 0;
  for (const k of kom) {
    let t = stripTags(k.isi_html);
    if (k.kegiatan_json) {
      try {
        const g = JSON.parse(k.kegiatan_json);
        if (g.prediksi) t += ` Prediksi: ${g.prediksi}`;
        if (g.langkah && g.langkah.length) t += ` Langkah: ${g.langkah.join('; ')}`;
        for (const p of g.pertanyaan || []) t += ` Pertanyaan: ${p.teks}${p.kunci ? ` (Kunci: ${p.kunci})` : ''}`;
      } catch (e) { /* abaikan */ }
    }
    if (k.media_judul) t += ` [Media: ${k.media_judul}]`;
    if (t.trim()) bagian.push(`## ${k.judul || k.jenis}\n${t.trim()}`);
    if (k.jenis !== 'tujuan') isiLen += t.trim().length;
  }
  return { subbab: s, teks: bagian.join('\n\n'), isiLen };
}

const SKEMA = {
  type: 'OBJECT',
  properties: {
    soal: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          pertanyaan: { type: 'STRING' },
          opsi: { type: 'ARRAY', items: { type: 'STRING' } },
          kunci: { type: 'STRING' },
          pembahasan: { type: 'STRING' },
          kesulitan: { type: 'STRING', enum: ['mudah', 'sedang', 'sulit'] },
        },
        required: ['pertanyaan', 'kunci', 'pembahasan', 'kesulitan'],
      },
    },
  },
  required: ['soal'],
};

function susunPrompt({ materi, jenis, jumlah, kesulitan }) {
  const s = materi.subbab;
  const aturanJenis = {
    pg: 'Pilihan ganda: tepat 4 opsi (tanpa huruf A/B/C/D di depan opsi), satu jawaban benar, pengecoh masuk akal. Isi "kunci" dengan huruf opsi yang benar: A, B, C, atau D.',
    bs: 'Benar-salah: pernyataan yang jelas benar atau jelas salah menurut materi. "opsi" dikosongkan. "kunci" diisi "Benar" atau "Salah".',
    isian: 'Isian singkat: jawaban satu kata atau frasa pendek. "opsi" dikosongkan. "kunci" berisi jawaban yang diharapkan.',
    uraian: 'Uraian: pertanyaan terbuka yang meminta siswa menjelaskan dengan 1–3 kalimat. "opsi" dikosongkan. "kunci" berisi pokok-pokok jawaban yang diharapkan.',
  }[jenis];
  return `Kamu membantu guru IPAS (Ilmu Pengetahuan Alam dan Sosial, bagian IPA) SD di Indonesia menyusun soal untuk siswa ${`kelas ${s.kelas_id}`} (usia sekitar ${s.kelas_id + 5}–${s.kelas_id + 6} tahun).

Buat ${jumlah} soal jenis ${JENIS_SOAL[jenis]} dengan tingkat kesulitan ${kesulitan}.

ATURAN MUTU (wajib):
1. Soal HANYA boleh berdasarkan teks materi di bawah. Jangan menambah konsep di luar materi atau di luar jenjang kelas.
2. Gunakan bahasa Indonesia sederhana dengan kalimat pendek yang mudah dipahami siswa kelas ${s.kelas_id}.
3. ${aturanJenis}
4. Setiap soal wajib disertai kunci jawaban dan pembahasan singkat (1–2 kalimat).
5. Jangan membuat soal yang sama atau mirip satu sama lain.
6. Gunakan konteks kehidupan sehari-hari siswa bila cocok.

Bab: ${s.bab}
Subbab: ${s.judul}
Tujuan pembelajaran: ${s.tujuan || '-'}

TEKS MATERI:
"""
${materi.teks.slice(0, 12000)}
"""`;
}

// Memeriksa bentuk jawaban AI sebelum ditampilkan
function validasi(data, jenis) {
  if (!data || !Array.isArray(data.soal)) throw new Error('Format jawaban AI tidak sesuai (tidak ada daftar soal).');
  const hasil = [];
  for (const q of data.soal) {
    if (!q || typeof q.pertanyaan !== 'string' || !q.pertanyaan.trim()) continue;
    let opsi = Array.isArray(q.opsi) ? q.opsi.map((o) => String(o).replace(/^\s*[A-Da-d][.)]\s+/, '').trim()).filter(Boolean) : [];
    let kunci = String(q.kunci || '').trim();
    if (jenis === 'pg') {
      if (opsi.length !== 4) continue;
      const m = kunci.match(/^[A-Da-d]\b/);
      if (m) kunci = m[0].toUpperCase();
      else {
        const idx = opsi.findIndex((o) => o.toLowerCase() === kunci.toLowerCase());
        if (idx < 0) continue;
        kunci = 'ABCD'[idx];
      }
    } else {
      opsi = [];
      if (jenis === 'bs') {
        if (/^b/i.test(kunci)) kunci = 'Benar'; else if (/^s/i.test(kunci)) kunci = 'Salah'; else continue;
      }
      if (!kunci) continue;
    }
    hasil.push({
      pertanyaan: q.pertanyaan.trim(),
      opsi,
      kunci,
      pembahasan: String(q.pembahasan || '').trim(),
      kesulitan: ['mudah', 'sedang', 'sulit'].includes(q.kesulitan) ? q.kesulitan : 'sedang',
    });
  }
  if (!hasil.length) throw new Error('AI tidak menghasilkan soal yang lolos pemeriksaan bentuk. Coba lagi.');
  return hasil;
}

// Model cadangan bila model utama sedang sibuk (HTTP 503 "high demand") di server Google.
const MODEL_CADANGAN = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

// Satu kali panggilan ke satu model. Galat yang bisa dicoba ulang ditandai e.sementara = true.
async function panggilSekali(model, prompt, key) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 90000);
  try {
    const res = await fetch(`${API}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SKEMA, temperature: 0.7 },
      }),
      signal: ctl.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = body.error && body.error.message ? body.error.message : `HTTP ${res.status}`;
      if (res.status === 400 && /API key/i.test(msg)) throw new Error('Kunci API Gemini tidak valid. Periksa di Admin → Pengaturan.');
      if (res.status === 404) { const e = new Error(`Model "${model}" tidak ditemukan. Ganti nama model di Admin → Pengaturan.`); e.tidakAda = true; throw e; }
      const sibuk = [500, 502, 503, 504].includes(res.status) || /overloaded|high demand|unavailable|try again/i.test(msg);
      if (sibuk) { const e = new Error('SIBUK'); e.sementara = true; throw e; }
      if (res.status === 429) { const e = new Error('Kuota layanan Gemini habis untuk saat ini. Coba lagi beberapa menit lagi.'); e.kuota = true; throw e; }
      throw new Error('Layanan AI menolak permintaan: ' + msg);
    }
    const text = body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts
      ? body.candidates[0].content.parts.map((x) => x.text || '').join('') : '';
    if (!text) { const e = new Error('Layanan AI tidak mengembalikan isi. Coba lagi.'); e.sementara = true; throw e; }
    try { return JSON.parse(text); } catch (e) { const g = new Error('Jawaban AI bukan JSON yang valid. Coba lagi.'); g.sementara = true; throw g; }
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Layanan AI terlalu lama merespons. Periksa internet lalu coba lagi.');
    if (e.cause && /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ECONNRESET/.test(String(e.cause.code))) throw new Error('Tidak ada koneksi internet.');
    throw e;
  } finally { clearTimeout(to); }
}

// Mencoba model utama (2x dengan jeda), lalu model cadangan, bila server Google sedang sibuk.
async function panggilGemini(prompt) {
  const key = db.setting('gemini_api_key');
  const utama = (db.setting('gemini_model') || 'gemini-flash-latest').replace(/^models\//, '');
  const daftar = [utama, ...MODEL_CADANGAN.filter((m) => m !== utama)];
  let galatTerakhir = null;
  for (let mi = 0; mi < daftar.length; mi++) {
    const percobaan = mi === 0 ? 2 : 1;
    for (let c = 0; c < percobaan; c++) {
      try {
        return await panggilSekali(daftar[mi], prompt, key);
      } catch (e) {
        galatTerakhir = e;
        if (e.tidakAda && mi > 0) break; // model cadangan tidak tersedia untuk kunci ini: lewati
        if (!e.sementara && !e.kuota) throw e;
        if (e.kuota && mi === 0 && c === 0) { await tunggu(3000); continue; }
        if (e.kuota) break;
        await tunggu(c === 0 ? 2500 : 1500);
      }
    }
  }
  if (galatTerakhir && galatTerakhir.kuota) throw galatTerakhir;
  throw new Error('Server AI Google sedang sangat sibuk (bukan masalah kunci API atau laptop ini). LMS sudah mencoba beberapa kali dengan model cadangan. Tunggu 1–5 menit, lalu klik Buat soal lagi.');
}

async function buatSoal({ subbabId, jenis, jumlah, kesulitan, userId }) {
  const param = { subbabId, jenis, jumlah, kesulitan };
  const st = status();
  if (!st.adaKunci) throw new Error('Kunci API Gemini belum diisi. Minta Admin mengisinya di Pengaturan.');
  if (st.sisa <= 0) throw new Error(`Batas ${st.batas} permintaan AI per hari sudah tercapai. Coba lagi besok.`);
  const materi = materiSubbab(subbabId);
  if (!materi) throw new Error('Subbab tidak ditemukan.');
  if (materi.isiLen < 150) throw new Error('Teks materi subbab ini masih terlalu sedikit. Lengkapi materinya dulu agar soal tidak keluar dari materi.');
  try {
    const data = await panggilGemini(susunPrompt({ materi, jenis, jumlah, kesulitan }));
    const soal = validasi(data, jenis).slice(0, jumlah);
    const ids = db.tx(() => soal.map((q) => Number(db.run(
      `INSERT INTO soal (subbab_id, jenis, pertanyaan, opsi_json, kunci, pembahasan, kesulitan, asal, status, created_by) VALUES (?,?,?,?,?,?,?, 'ai', 'draf', ?)`,
      subbabId, jenis, q.pertanyaan, JSON.stringify(q.opsi), q.kunci, q.pembahasan, q.kesulitan, userId,
    ).lastInsertRowid)));
    db.run(`INSERT INTO ai_log (user_id, parameter_json, status, pesan, jumlah) VALUES (?, ?, 'ok', '', ?)`, userId, JSON.stringify(param), ids.length);
    return ids;
  } catch (e) {
    db.run(`INSERT INTO ai_log (user_id, parameter_json, status, pesan, jumlah) VALUES (?, ?, 'gagal', ?, 0)`, userId, JSON.stringify(param), String(e.message).slice(0, 1000));
    throw e;
  }
}

async function daftarModel() {
  const key = db.setting('gemini_api_key');
  if (!key) throw new Error('Kunci API belum diisi.');
  const res = await fetch(`${API}/models?pageSize=100`, { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body.error && body.error.message) || `HTTP ${res.status}`);
  return (body.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, '')).filter((n) => /gemini/i.test(n));
}

module.exports = { status, buatSoal, daftarModel, materiSubbab, susunPrompt, validasi };
