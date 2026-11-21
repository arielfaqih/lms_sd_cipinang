// Basis data SQLite (bawaan Node.js, tanpa server basis data terpisah)
'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); } catch (e) {
  console.error('\n  LMS membutuhkan Node.js versi 22.13 atau lebih baru (disarankan versi LTS terbaru).');
  console.error('  Versi Node.js di komputer ini: ' + process.version + '\n');
  process.exit(1);
}

const DATA_DIR = process.env.LMS_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'lms.db');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');
const TMP_DIR = path.join(DATA_DIR, 'tmp');
for (const d of [DATA_DIR, MEDIA_DIR, BACKUP_DIR, TMP_DIR]) fs.mkdirSync(d, { recursive: true });

let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nama TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('guru','admin')),
  pass_hash TEXT NOT NULL,
  aktif INTEGER NOT NULL DEFAULT 1,
  harus_ganti INTEGER NOT NULL DEFAULT 0,
  last_subbab_id INTEGER,
  last_slide INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS kelas (
  id INTEGER PRIMARY KEY,
  nama TEXT NOT NULL,
  fase TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bab (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kelas_id INTEGER NOT NULL REFERENCES kelas(id),
  judul TEXT NOT NULL,
  urutan INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS subbab (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bab_id INTEGER NOT NULL REFERENCES bab(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  urutan INTEGER NOT NULL DEFAULT 0,
  tujuan TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf','terbit')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file TEXT NOT NULL,
  nama_asli TEXT NOT NULL,
  judul TEXT NOT NULL,
  jenis TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT '',
  ukuran INTEGER NOT NULL DEFAULT 0,
  sumber TEXT NOT NULL DEFAULT '',
  lisensi TEXT NOT NULL DEFAULT '',
  file_pdf TEXT,
  konversi TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS komponen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subbab_id INTEGER NOT NULL REFERENCES subbab(id) ON DELETE CASCADE,
  urutan INTEGER NOT NULL DEFAULT 0,
  jenis TEXT NOT NULL,
  judul TEXT NOT NULL DEFAULT '',
  isi_html TEXT NOT NULL DEFAULT '',
  media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  kegiatan_json TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS soal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subbab_id INTEGER NOT NULL REFERENCES subbab(id) ON DELETE CASCADE,
  jenis TEXT NOT NULL CHECK (jenis IN ('pg','isian','bs','uraian')),
  pertanyaan TEXT NOT NULL,
  opsi_json TEXT NOT NULL DEFAULT '[]',
  kunci TEXT NOT NULL DEFAULT '',
  pembahasan TEXT NOT NULL DEFAULT '',
  kesulitan TEXT NOT NULL DEFAULT 'sedang' CHECK (kesulitan IN ('mudah','sedang','sulit')),
  asal TEXT NOT NULL DEFAULT 'manual' CHECK (asal IN ('ai','manual')),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf','disetujui')),
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS ai_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  user_id INTEGER,
  parameter_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  pesan TEXT NOT NULL DEFAULT '',
  jumlah INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  sumber TEXT NOT NULL,
  pesan TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_komponen_subbab ON komponen(subbab_id, urutan);
CREATE INDEX IF NOT EXISTS idx_soal_subbab ON soal(subbab_id, status);
CREATE INDEX IF NOT EXISTS idx_bab_kelas ON bab(kelas_id, urutan);
CREATE INDEX IF NOT EXISTS idx_subbab_bab ON subbab(bab_id, urutan);
`;

function open() {
  db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  // Kolom tambahan (aman untuk basis data lama): kelas tempat bab diajarkan menurut ATP sekolah.
  // NULL = diajarkan di kelas bab itu sendiri; mis. 3 = sudah diajarkan di kelas 3 (pengulangan di kelas 4).
  if (!db.prepare('PRAGMA table_info(bab)').all().some((c) => c.name === 'atp_kelas')) db.exec('ALTER TABLE bab ADD COLUMN atp_kelas INTEGER');
  const k = db.prepare('INSERT OR IGNORE INTO kelas (id, nama, fase) VALUES (?, ?, ?)');
  k.run(4, 'Kelas 4', 'B');
  k.run(5, 'Kelas 5', 'C');
  k.run(6, 'Kelas 6', 'C');
  return db;
}

function close() {
  if (db) { try { db.close(); } catch (e) { /* abaikan */ } db = null; }
}

const get = (sql, ...p) => db.prepare(sql).get(...p);
const all = (sql, ...p) => db.prepare(sql).all(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);
const exec = (sql) => db.exec(sql);

function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

// ---- Pengaturan ----
const DEFAULT_SETTINGS = {
  nama_sekolah: 'SDN Cipinang II',
  gemini_api_key: '',
  gemini_model: 'gemini-flash-latest',
  ai_batas_harian: '20',
  hanya_jaringan_lokal: '1',
  sesi_menit: '120',
};
function setting(key) {
  const r = get('SELECT value FROM settings WHERE key = ?', key);
  return r ? r.value : (DEFAULT_SETTINGS[key] ?? '');
}
function setSetting(key, value) {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));
}

// ---- Kata sandi (scrypt bawaan Node.js) ----
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pw), salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [alg, saltHex, hashHex] = String(stored).split('$');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const hash = crypto.scryptSync(String(pw), Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return expected.length === hash.length && crypto.timingSafeEqual(hash, expected);
}

function logError(sumber, err) {
  const pesan = (err && (err.stack || err.message)) || String(err);
  console.error(`[${sumber}]`, pesan);
  try { run('INSERT INTO error_log (sumber, pesan) VALUES (?, ?)', sumber, pesan.slice(0, 4000)); } catch (e) { /* abaikan */ }
}

module.exports = {
  open, close, get, all, run, exec, tx,
  setting, setSetting, hashPassword, verifyPassword, logError,
  DATA_DIR, DB_FILE, MEDIA_DIR, BACKUP_DIR, TMP_DIR,
  get raw() { return db; },
};
