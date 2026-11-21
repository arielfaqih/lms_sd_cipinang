// Membuat berkas PDF dari HTML tanpa internet, memakai Microsoft Edge / Google Chrome
// yang sudah terpasang di laptop server (mode headless "print to PDF").
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const db = require('./db');

function cariBrowser() {
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const lokal = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const calon = [
    process.env.LMS_BROWSER,
    path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(lokal, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ].filter(Boolean);
  return calon.find((p) => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }) || null;
}

// htmlStr: dokumen HTML lengkap. baseUrl: alamat server agar gambar /berkas/... ikut termuat.
function htmlKePdf(htmlStr, baseUrl) {
  const browser = cariBrowser();
  if (!browser) return Promise.reject(Object.assign(new Error('TANPA_BROWSER'), { tanpaBrowser: true }));
  const id = crypto.randomBytes(6).toString('hex');
  const masuk = path.join(db.TMP_DIR, `pdf-${id}.html`);
  const keluar = path.join(db.TMP_DIR, `pdf-${id}.pdf`);
  const profil = path.join(db.TMP_DIR, `pdf-profil-${id}`);
  const isi = baseUrl ? htmlStr.replace(/<head>/i, `<head><base href="${baseUrl}/">`) : htmlStr;
  fs.writeFileSync(masuk, isi);
  const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--no-pdf-header-footer', '--print-to-pdf-no-header', `--user-data-dir=${profil}`, `--print-to-pdf=${keluar}`,
    require('url').pathToFileURL(masuk).href];
  return new Promise((resolve, reject) => {
    execFile(browser, args, { timeout: 60000, windowsHide: true }, () => {
      try {
        if (!fs.existsSync(keluar) || fs.statSync(keluar).size < 500) return reject(new Error('Browser tidak menghasilkan PDF.'));
        resolve(fs.readFileSync(keluar));
      } catch (e) { reject(e); } finally {
        for (const f of [masuk, keluar]) fs.rm(f, { force: true }, () => {});
        fs.rm(profil, { recursive: true, force: true }, () => {});
      }
    });
  });
}

// Mengirim PDF ke browser guru sebagai unduhan; bila gagal, tampilkan pesan yang jelas.
async function kirimPdf(req, res, htmlStr, namaBerkas, kembali) {
  try {
    const buf = await htmlKePdf(htmlStr, `http://127.0.0.1:${req.app.locals.PORT}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${namaBerkas}"`);
    res.send(buf);
  } catch (e) {
    const pesan = e.tanpaBrowser
      ? 'Unduh PDF butuh Microsoft Edge atau Google Chrome di laptop server. Sementara itu, pakai tombol Cetak lalu pilih "Simpan sebagai PDF".'
      : 'PDF gagal dibuat. Coba lagi, atau pakai tombol Cetak lalu pilih "Simpan sebagai PDF".';
    res.redirect(kembali + (kembali.includes('?') ? '&' : '?') + 'galat=' + encodeURIComponent(pesan));
  }
}

module.exports = { cariBrowser, htmlKePdf, kirimPdf };
