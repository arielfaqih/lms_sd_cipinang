// Alamat jaringan lokal (F1) dan pengecekan internet untuk generate soal
'use strict';
const os = require('os');
const dns = require('dns').promises;

// Adaptor virtual (VirtualBox, VMware, Hyper-V/WSL, Docker, VPN) tidak bisa dijangkau HP,
// jadi tidak boleh ditawarkan sebagai alamat LMS. Dikenali dari awalan MAC dan namanya.
const MAC_VIRTUAL = /^(0a:00:27|08:00:27|00:50:56|00:0c:29|00:05:69|00:1c:14|00:15:5d|02:42:|00:03:ff)/i;
const NAMA_VIRTUAL = /virtualbox|vmware|vethernet|hyper-v|wsl|docker|vbox|loopback|tap|tun|openvpn|wireguard|zerotier|tailscale|hamachi|radmin|npcap|bluetooth/i;

function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue;
      if (MAC_VIRTUAL.test(a.mac || '') || NAMA_VIRTUAL.test(name)) continue;
      out.push({ name, address: a.address });
    }
  }
  // Urutan: Wi-Fi → hotspot laptop (192.168.137.x) → kabel LAN → lainnya
  const skor = (x) => (/wi-?fi|wlan|wireless|nirkabel/i.test(x.name) ? 0
    : /^192\.168\.137\./.test(x.address) ? 1
      : /ethernet|lan/i.test(x.name) ? 2 : 3);
  return out.sort((a, b) => skor(a) - skor(b));
}

// Alamat yang paling mungkin dijangkau perangkat lain. Bila browser penyaji sudah membuka LMS
// lewat alamat jaringan (bukan localhost), alamat itulah yang pasti benar.
function alamatTerbaik(hostname) {
  const daftar = lanAddresses();
  if (hostname && !/^(localhost|127\.|::1|\[::1\])/i.test(hostname) && daftar.some((x) => x.address === hostname)) {
    return [daftar.find((x) => x.address === hostname), ...daftar.filter((x) => x.address !== hostname)];
  }
  return daftar;
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

module.exports = { lanAddresses, alamatTerbaik, isOnline, resetOnlineCache };
