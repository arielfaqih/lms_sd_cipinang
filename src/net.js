// Alamat jaringan lokal (F1) dan pengecekan internet untuk generate soal
'use strict';
const os = require('os');
const dns = require('dns').promises;

function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) out.push({ name, address: a.address });
    }
  }
  // Wi-Fi/LAN biasa (192.168.x / 10.x) di depan
  return out.sort((a, b) => (/^192\.168\./.test(b.address) ? 1 : 0) - (/^192\.168\./.test(a.address) ? 1 : 0));
}

let cache = { t: 0, online: false };
async function isOnline() {
  if (Date.now() - cache.t < 20000) return cache.online;
  let online = false;
  try {
    await Promise.race([
      dns.lookup('generativelanguage.googleapis.com'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500)),
    ]);
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 3500);
    try {
      await fetch('https://generativelanguage.googleapis.com/', { method: 'HEAD', signal: ctl.signal });
      online = true;
    } finally { clearTimeout(to); }
  } catch (e) { online = false; }
  cache = { t: Date.now(), online };
  return online;
}
function resetOnlineCache() { cache.t = 0; }

module.exports = { lanAddresses, isOnline, resetOnlineCache };
