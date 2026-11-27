// Membuat "Buku Panduan Guru" (PDF) beserta tangkapan layar asli LMS.
//   node tools/buat-panduan.js            -> tangkapan layar baru + PDF
//   node tools/buat-panduan.js --pdf-saja -> hanya PDF (memakai gambar yang sudah ada)
// Butuh: playwright-core (devDependency, untuk tangkapan layar) dan Microsoft Edge / Google Chrome (untuk PDF).
// Hasil: public/panduan-guru.pdf (dibuka dari LMS: Panduan Singkat → Unduh Buku Panduan) dan ikut dikemas di paket.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DOK = path.join(ROOT, 'docs', 'panduan-guru');
const GAMBAR = path.join(DOK, 'gambar');
const KELUAR = path.join(ROOT, 'public', 'panduan-guru.pdf');
const PORT = 3995;
const BASE = `http://127.0.0.1:${PORT}`;

function cariBrowser() {
  const c = [process.env.LMS_BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  return c.find((p) => fs.existsSync(p));
}

async function tangkapLayar() {
  const { chromium } = require('playwright-core');
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-panduan-'));
  const srv = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), LMS_DATA_DIR: data }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/masuk'); break; } catch (e) { await new Promise((r) => setTimeout(r, 300)); } }
    fs.mkdirSync(GAMBAR, { recursive: true });
    const b = await chromium.launch({ executablePath: cariBrowser() });
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    const foto = async (nama, opsi = {}) => { await p.waitForTimeout(opsi.tunggu || 500); await p.screenshot({ path: path.join(GAMBAR, nama + '.jpg'), type: 'jpeg', quality: 82, ...(opsi.clip ? { clip: opsi.clip } : {}), fullPage: !!opsi.penuh }); };

    await p.goto(BASE + '/masuk'); await foto('01-masuk');
    await p.fill('input[name=username]', 'admin'); await p.fill('input[name=password]', 'admin123'); await p.click('button[type=submit]');
    await p.waitForURL(/akun/); await foto('02-ganti-sandi');
    await p.fill('input[name=lama]', 'admin123'); await p.fill('input[name=baru]', 'sandibaru1'); await p.fill('input[name=ulang]', 'sandibaru1');
    await Promise.all([p.waitForNavigation(), p.click('form[action="/akun/sandi"] button')]);
    await p.goto(BASE + '/'); await foto('03-beranda');
    await p.goto(BASE + '/kelas/4'); await foto('04-kelas');
    const href = await p.locator('li.sub', { hasText: 'Jenis Gaya' }).locator('a[href^="/sajikan/"]').getAttribute('href');
    await p.goto(BASE + href + '?slide=1'); await foto('05-sajikan-pemantik', { tunggu: 1200 });
    await p.goto(BASE + href + '?slide=7'); await p.locator('section.slide:not([hidden]) [data-act=hint]').first().click(); await foto('06-sajikan-diskusi', { tunggu: 900 });
    await p.goto(BASE + href + '?slide=1'); await p.click('[data-act=remote]'); await p.waitForSelector('#remoteDlg[open]'); await foto('07-remote-dialog', { tunggu: 800 });
    const urlRemote = await p.locator('#remoteUrl b').textContent();
    const hp = await b.newPage({ viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true });
    await hp.goto(urlRemote.replace(/^http:\/\/[^/]+/, BASE));
    if (hp.url().includes('/masuk')) { await hp.fill('input[name=username]', 'admin'); await hp.fill('input[name=password]', 'sandibaru1'); await Promise.all([hp.waitForNavigation(), hp.click('button[type=submit]')]); }
    await hp.waitForTimeout(1500); await hp.screenshot({ path: path.join(GAMBAR, '08-remote-hp.jpg'), type: 'jpeg', quality: 82 });
    await p.goto(BASE + '/soal?kelas=4'); await foto('09-bank-soal');
    const sub = href.split('/')[2];
    await p.goto(BASE + `/soal/tayang?subbab=${sub}`); await foto('10-kuis-mulai'); await p.click('[data-q=mulai]'); await p.waitForTimeout(600);
    await p.locator('.qz-opt').nth(2).click(); await foto('11-kuis-jawab', { tunggu: 900 });
    await p.goto(BASE + `/soal/ekspor?ids=${(await (await p.request.get(BASE + '/soal?subbab=' + sub)).text()).match(/name="id" value="(\d+)"/g).map((x) => x.match(/\d+/)[0]).join(',')}`); await foto('12-cetak-soal');
    await p.goto(BASE + `/subbab/${sub}/lkpd`); await foto('13-lkpd');
    await p.goto(BASE + `/subbab/${sub}/edit`); await foto('14-edit-subbab');
    await p.goto(BASE + '/'); await p.click('details.card > summary'); await p.waitForTimeout(800);
    await p.locator('details.card').scrollIntoViewIfNeeded();
    await p.locator('details.card').screenshot({ path: path.join(GAMBAR, '15-qr-hp.jpg'), type: 'jpeg', quality: 82 });
    await p.goto(BASE + '/admin/pengguna'); await foto('16-pengguna');
    await p.goto(BASE + '/admin/backup'); await foto('17-backup');
    await p.goto(BASE + '/admin/pengaturan'); await foto('18-pengaturan');
    await p.goto(BASE + '/soal/buat'); await foto('19-buat-ai', { tunggu: 2000 });
    await b.close();
  } finally { srv.kill(); try { fs.rmSync(data, { recursive: true, force: true }); } catch (e) { /* */ } }
}

function buatPdf() {
  const browser = cariBrowser();
  if (!browser) throw new Error('Microsoft Edge / Google Chrome tidak ditemukan.');
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-pdf-'));
  const sumber = require('url').pathToFileURL(path.join(DOK, 'panduan.html')).href;
  execFileSync(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-pdf-header-footer', '--print-to-pdf-no-header',
    `--user-data-dir=${profil}`, `--print-to-pdf=${KELUAR}`, sumber], { stdio: 'ignore', timeout: 120000 });
  fs.rmSync(profil, { recursive: true, force: true });
  console.log(`PDF: ${KELUAR} (${Math.round(fs.statSync(KELUAR).size / 1024)} KB)`);
}

(async () => {
  if (!process.argv.includes('--pdf-saja')) { console.log('Mengambil tangkapan layar...'); await tangkapLayar(); }
  buatPdf();
})().catch((e) => { console.error(e); process.exit(1); });
