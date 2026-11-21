// Login, sesi, dan pembatasan akses (F2)
'use strict';
const crypto = require('crypto');
const db = require('./db');

const COOKIE = 'lms_sid';
const MAKS_SESI_MS = 12 * 60 * 60 * 1000; // batas mutlak 12 jam

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.run('INSERT INTO sessions (token, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)', token, userId, now, now);
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAKS_SESI_MS / 1000}`);
}

function destroySession(req, res) {
  const t = parseCookies(req)[COOKIE];
  if (t) db.run('DELETE FROM sessions WHERE token = ?', t);
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

// Memuat pengguna dari sesi; sesi berakhir otomatis bila menganggur
function loadUser(req, res, next) {
  req.user = null;
  const t = parseCookies(req)[COOKIE];
  if (t) {
    const s = db.get('SELECT * FROM sessions WHERE token = ?', t);
    const now = Date.now();
    const idleMs = Math.max(10, parseInt(db.setting('sesi_menit'), 10) || 120) * 60 * 1000;
    if (s && now - s.last_seen < idleMs && now - s.created_at < MAKS_SESI_MS) {
      const u = db.get('SELECT * FROM users WHERE id = ? AND aktif = 1', s.user_id);
      if (u) {
        req.user = u;
        if (now - s.last_seen > 60 * 1000) db.run('UPDATE sessions SET last_seen = ? WHERE token = ?', now, t);
      }
    } else if (s) {
      db.run('DELETE FROM sessions WHERE token = ?', t);
    }
  }
  next();
}

function requireLogin(req, res, next) {
  if (!req.user) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Sesi berakhir. Silakan masuk lagi.' });
    return res.redirect('/masuk?lanjut=' + encodeURIComponent(req.originalUrl));
  }
  if (req.user.harus_ganti && !['/akun', '/akun/sandi', '/keluar'].includes(req.path)) {
    return res.redirect('/akun?wajib=1');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).send('Halaman ini hanya untuk Admin.');
  next();
}

// Akses hanya dari jaringan sekolah (alamat IP privat)
function isPrivateIp(ip) {
  ip = String(ip || '').replace(/^::ffff:/, '');
  if (ip === '::1' || ip.startsWith('127.')) return true;
  if (/^10\./.test(ip) || /^192\.168\./.test(ip) || /^169\.254\./.test(ip)) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m && +m[1] >= 16 && +m[1] <= 31) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(ip) || /^fe80:/i.test(ip)) return true;
  return false;
}
function localOnly(req, res, next) {
  if (db.setting('hanya_jaringan_lokal') === '1' && !isPrivateIp(req.socket.remoteAddress)) {
    return res.status(403).send('Akses hanya diizinkan dari jaringan sekolah.');
  }
  next();
}

// Batasi percobaan login (mencegah tebak kata sandi)
const percobaan = new Map();
function loginThrottle(key) {
  const now = Date.now();
  const r = percobaan.get(key) || { n: 0, t: now };
  if (now - r.t > 10 * 60 * 1000) { r.n = 0; r.t = now; }
  return { blocked: r.n >= 8, fail() { r.n++; percobaan.set(key, r); }, reset() { percobaan.delete(key); } };
}

module.exports = { loadUser, requireLogin, requireAdmin, localOnly, createSession, destroySession, loginThrottle, isPrivateIp };
