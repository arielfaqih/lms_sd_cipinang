// Pembantu uji: menjalankan server LMS terpisah dengan data sementara dan sesi login.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');

const AKAR = path.join(__dirname, '..');

function portBebas() {
  return new Promise((ok, gagal) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); });
    s.on('error', gagal);
  });
}

// Menjalankan server dengan folder data kosong (materi bawaan dibuat otomatis)
async function mulaiServer() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-uji-'));
  const port = await portBebas();
  const proc = spawn(process.execPath, ['server.js'], { cwd: AKAR, env: { ...process.env, PORT: String(port), LMS_DATA_DIR: dataDir }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  proc.stdout.on('data', (d) => { log += d; });
  proc.stderr.on('data', (d) => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(base + '/masuk'); if (r.ok) break; } catch (e) { /* belum siap */ }
    if (proc.exitCode !== null) throw new Error('Server berhenti saat dimulai:\n' + log);
    await new Promise((r) => setTimeout(r, 150));
  }
  return {
    base, dataDir, port, log: () => log,
    async stop() {
      proc.kill();
      await new Promise((r) => proc.once('exit', r));
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

// Klien HTTP sederhana dengan cookie sesi
function klien(base) {
  let cookie = '';
  async function req(url, opt = {}) {
    const r = await fetch(base + url, { redirect: 'manual', ...opt, headers: { ...(opt.headers || {}), cookie } });
    const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
    sc.forEach((c) => { const kv = c.split(';')[0]; const nama = kv.split('=')[0]; cookie = cookie.split('; ').filter((x) => x && !x.startsWith(nama + '=')).concat(kv).join('; '); });
    return r;
  }
  const form = (data) => ({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() });
  return {
    req, form,
    get cookie() { return cookie; },
    async masuk(user = 'admin', sandi = 'admin123', sandiBaru = 'rahasia1') {
      let r = await req('/masuk', form({ username: user, password: sandi, lanjut: '/' }));
      if (r.status !== 302) throw new Error('Login gagal: ' + r.status);
      r = await req('/');
      if (r.status === 302 && /\/akun/.test(r.headers.get('location'))) {
        await req('/akun/sandi', form({ lama: sandi, baru: sandiBaru, ulang: sandiBaru }));
      }
      return this;
    },
  };
}

// Membaca basis data uji (hanya-baca)
function bukaDb(dataDir) {
  process.removeAllListeners('warning');
  const { DatabaseSync } = require('node:sqlite');
  return new DatabaseSync(path.join(dataDir, 'lms.db'), { readOnly: true });
}

// Mencari browser Chrome/Edge yang terpasang untuk uji tampilan (tanpa unduhan)
function cariBrowser() {
  let pw;
  try { pw = require('playwright-core'); } catch (e) { return null; }
  const kandidat = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const exe = kandidat.find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
  return exe ? { chromium: pw.chromium, executablePath: exe } : null;
}

module.exports = { AKAR, mulaiServer, klien, bukaDb, cariBrowser };
