// Uji tampilan di browser sungguhan (Chrome/Edge yang sudah terpasang) dengan playwright-core:
// media interaktif, mode Sajikan, remote HP → layar, dan kuis interaktif.
// Dilewati otomatis bila playwright-core atau browser tidak ditemukan.
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { AKAR, mulaiServer, bukaDb, cariBrowser } = require('./bantu');

const B = cariBrowser();
const lewati = B ? false : 'playwright-core atau Chrome/Edge tidak ditemukan (pasang: npm install --include=dev)';
let srv, browser, db;

before(async () => {
  if (!B) return;
  srv = await mulaiServer();
  db = bukaDb(srv.dataDir);
  browser = await B.chromium.launch({ executablePath: B.executablePath });
});
after(async () => { if (browser) await browser.close(); if (db) db.close(); if (srv) await srv.stop(); });

async function halaman(opsi = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, ...opsi });
  const page = await ctx.newPage();
  const galat = [];
  page.on('pageerror', (e) => galat.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_ABORTED/.test(m.text())) galat.push(m.text()); });
  return { ctx, page, galat };
}
async function masuk(page) {
  await page.goto(srv.base + '/masuk');
  await page.fill('input[name=username]', 'admin'); await page.fill('input[name=password]', 'admin123');
  await page.click('button[type=submit]');
  if (page.url().includes('/akun')) {
    await page.fill('input[name=lama]', 'admin123'); await page.fill('input[name=baru]', 'rahasia1'); await page.fill('input[name=ulang]', 'rahasia1');
    await page.click('form[action="/akun/sandi"] button');
  } else if (page.url().includes('/masuk')) {
    await page.fill('input[name=username]', 'admin'); await page.fill('input[name=password]', 'rahasia1'); await page.click('button[type=submit]');
  }
}
const idSubbab = (judul) => db.prepare('SELECT id FROM subbab WHERE judul = ?').get(judul).id;

test('semua media interaktif berjalan tanpa galat saat diklik', { skip: lewati, timeout: 240000 }, async () => {
  const dir = path.join(AKAR, 'seed', 'media');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));
  assert.ok(files.length >= 19, 'jumlah media interaktif');
  for (const f of files) {
    const { ctx, page, galat } = await halaman();
    await page.goto('file:///' + path.join(dir, f).replace(/\\/g, '/'));
    await page.waitForTimeout(300);
    const btn = page.locator('button:visible');
    const n = Math.min(await btn.count(), 25);
    for (let i = 0; i < n; i++) { try { await btn.nth(i).click({ timeout: 600 }); await page.waitForTimeout(60); } catch (e) { /* tombol berubah */ } }
    const sl = page.locator('input[type=range]:visible');
    for (let i = 0; i < await sl.count(); i++) { try { await sl.nth(i).fill('20'); } catch (e) { /* */ } }
    await page.waitForTimeout(250);
    assert.deepEqual(galat, [], `${f}: ${galat.join(' | ')}`);
    await ctx.close();
  }
});

test('remote: tombol ▶ di HP memindah layar presentasi', { skip: lewati, timeout: 90000 }, async () => {
  const layar = await halaman();
  await masuk(layar.page);
  const sid = idSubbab('Jenis Gaya dan Pengaruhnya');
  await layar.page.goto(`${srv.base}/sajikan/${sid}?slide=1`);
  await layar.page.click('[data-act=remote]');
  await layar.page.waitForSelector('#remoteDlg[open]');
  const kode = (await layar.page.textContent('#remoteKode')).trim();
  assert.match(kode, /^\d{4}$/);

  const hp = await halaman({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await layar.ctx.storageState() });
  await hp.page.goto(`${srv.base}/remote/${kode}`);
  await hp.page.waitForFunction(() => document.getElementById('status').textContent.includes('Terhubung'));
  await layar.page.waitForFunction(() => /1 HP/.test(document.getElementById('remoteStatus').textContent));
  await layar.page.click('[data-act=remote-close]');

  await hp.page.click('[data-aksi=next]');
  await layar.page.waitForFunction(() => document.getElementById('count').textContent.trim() === '2 / 10');
  await hp.page.click('[data-aksi=next]');
  await layar.page.waitForFunction(() => document.getElementById('count').textContent.trim() === '3 / 10');
  // layar 3 = Kegiatan Pengamatan: kunci diskusi tampil di HP saja
  await hp.page.waitForFunction(() => document.getElementById('catatan').textContent.includes('licin'));
  assert.equal(await layar.page.locator('.slide:not([hidden]) [data-kunci]:visible').count(), 0, 'kunci belum tampil di layar');
  await hp.page.click('[data-aksi=kunci]');
  await layar.page.waitForFunction(() => document.querySelectorAll('.slide:not([hidden]) [data-kunci]:not([hidden])').length > 0);
  // lompat lewat daftar layar
  await hp.page.click('.rm-daftar summary');
  await hp.page.click('#daftar [data-go="8"]');
  await layar.page.waitForFunction(() => document.getElementById('count').textContent.trim() === '9 / 10');
  assert.deepEqual(layar.galat, []);
  assert.deepEqual(hp.galat, []);
  await hp.ctx.close(); await layar.ctx.close();
});

test('kuis interaktif: jawaban benar menambah skor', { skip: lewati, timeout: 60000 }, async () => {
  const { ctx, page, galat } = await halaman();
  await masuk(page);
  await page.goto(`${srv.base}/soal/tayang?subbab=${idSubbab('Sistem Tata Surya')}`);
  await page.click('[data-q=mulai]');
  const s = page.locator('.qz-soal:not([hidden])');
  await s.locator('.qz-opt').nth(parseInt(await s.getAttribute('data-benar'), 10)).click();
  await page.waitForFunction(() => document.getElementById('qzBenar').textContent === '1');
  assert.deepEqual(galat, []);
  await ctx.close();
});

test('halaman Sajikan dan LKPD tanpa galat JS', { skip: lewati, timeout: 60000 }, async () => {
  const { ctx, page, galat } = await halaman();
  await masuk(page);
  for (const j of ['Perubahan Wujud Zat', 'Sistem Pencernaan', 'Revolusi Bumi dan Musim']) {
    await page.goto(`${srv.base}/sajikan/${idSubbab(j)}`);
    for (let i = 0; i < 9; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(40); }
  }
  await page.goto(`${srv.base}/subbab/${idSubbab('Gelombang Bunyi')}/lkpd`);
  assert.equal(await page.locator('button[value=cetak]').isEnabled(), true);
  assert.deepEqual(galat, []);
  await ctx.close();
});
