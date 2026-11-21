// Data awal: akun, struktur bab sesuai CP IPAS (bagian IPA) Keputusan Kepala BSKAP
// No. 046/H/KR/2025, satu subbab lengkap per kelas, media contoh, dan bank soal awal.
// Tujuan pembelajaran memakai kata kerja CP (menganalisis, menyimpulkan, menghasilkan,
// merefleksikan) karena "pemahaman" dalam CP dicapai lewat kemampuan mengaplikasikan dan
// menganalisis (Kajian Akademik Kurikulum Merdeka, BSKAP 2024).
'use strict';
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { JENIS_KOMPONEN, isiBawaan } = require('./html');

const SEED_MEDIA = path.join(__dirname, '..', 'seed', 'media');
const MATERI_VERSI = '5';
const { MATERI } = require('./materi-lengkap');

// Tujuan pembelajaran per subbab. "lama" disimpan agar instalasi yang sudah berjalan
// bisa diperbarui otomatis tanpa menimpa tujuan yang sudah diubah guru.
const TUJUAN = {
  pancaindra: {
    lama: 'Siswa dapat menyebutkan lima pancaindra beserta fungsinya dan cara merawatnya.',
    baru: 'Siswa dapat menjelaskan bentuk dan fungsi pancaindra melalui percobaan sederhana, serta menerapkan cara merawatnya dalam kegiatan sehari-hari.' },
  siklusHewan: {
    lama: 'Siswa dapat menjelaskan tahap-tahap siklus hidup hewan, misalnya kupu-kupu dan katak.',
    baru: 'Siswa dapat menganalisis tahap-tahap siklus hidup hewan (misalnya kupu-kupu dan katak) dengan membandingkan perubahan bentuk tubuh pada setiap tahap.' },
  pelestarianMH: {
    lama: 'Siswa dapat memberi contoh upaya melestarikan hewan dan tumbuhan di lingkungan sekitar.',
    baru: 'Siswa dapat mengaitkan siklus hidup makhluk hidup dengan upaya pelestariannya, lalu merancang satu aksi pelestarian hewan atau tumbuhan di lingkungan sekitar.' },
  wujud: {
    lama: 'Siswa dapat menyebutkan tiga wujud benda, menjelaskan perubahan wujud mencair, membeku, menguap, dan mengembun, serta memberi contohnya di sekitar rumah.',
    baru: 'Siswa dapat menyebutkan tiga wujud zat dan menyimpulkan proses perubahan wujud (mencair, membeku, menguap, mengembun) dari hasil pengamatan, serta memberi contohnya di sekitar rumah.' },
  energi4: {
    lama: 'Siswa dapat menyebutkan sumber energi dan bentuk-bentuk energi serta perubahannya dalam kehidupan sehari-hari.',
    baru: 'Siswa dapat menjelaskan sumber dan bentuk energi, serta menyelidiki proses perubahan bentuk energi pada benda di sekitar (misalnya senter, kipas angin, dan setrika).' },
  gaya: {
    lama: 'Siswa dapat menyebutkan jenis-jenis gaya (otot, gesek, magnet, gravitasi) dan pengaruhnya terhadap benda.',
    baru: 'Siswa dapat membedakan jenis gaya (gaya otot, gesek, magnet, dan gravitasi) dan menyelidiki pengaruhnya terhadap arah, gerak, dan bentuk benda melalui percobaan sederhana.' },
  sda: {
    lama: 'Siswa dapat memberi contoh tindakan sederhana menjaga sumber daya alam untuk mengurangi dampak perubahan iklim.',
    baru: 'Siswa dapat menghasilkan solusi sederhana untuk masalah pelestarian sumber daya alam di sekitar sekolah (misalnya air, tanah, dan pohon) sebagai upaya mitigasi perubahan iklim.' },
  pernapasan: {
    lama: 'Siswa dapat menyebutkan organ pernapasan manusia, fungsinya, dan cara menjaga kesehatannya.',
    baru: 'Siswa dapat menjelaskan organ pernapasan manusia dan fungsinya, lalu merefleksikan kebiasaan sehari-harinya untuk menjaga kesehatan pernapasan.' },
  pencernaan: {
    lama: 'Siswa dapat menjelaskan urutan organ pencernaan dan cara menjaga kesehatan pencernaan.',
    baru: 'Siswa dapat menjelaskan urutan organ pencernaan dan fungsinya, lalu merefleksikan pola makannya sendiri untuk menjaga kesehatan pencernaan.' },
  peredaran: {
    lama: null,
    baru: 'Siswa dapat menjelaskan peran jantung, pembuluh darah, dan darah dalam sistem peredaran darah, lalu merefleksikan kebiasaan (olahraga dan makanan) yang menjaga kesehatan jantung.' },
  biotik: {
    lama: 'Siswa dapat membedakan komponen biotik dan abiotik serta hubungan keduanya dalam ekosistem.',
    baru: 'Siswa dapat menganalisis hubungan antara komponen biotik dan abiotik, serta memperkirakan pengaruhnya terhadap ekosistem di sekitar sekolah.' },
  bunyi: {
    lama: 'Siswa dapat menjelaskan bagaimana bunyi terjadi dan merambat melalui benda padat, cair, dan gas.',
    baru: 'Siswa dapat menjelaskan fenomena bunyi dalam kehidupan sehari-hari, yaitu bagaimana bunyi terjadi dan merambat melalui benda padat, cair, dan gas, berdasarkan percobaan sederhana.' },
  cahaya: {
    lama: 'Siswa dapat menyebutkan sifat-sifat cahaya dan contohnya dalam kehidupan sehari-hari.',
    baru: 'Siswa dapat menjelaskan fenomena cahaya dalam kehidupan sehari-hari (merambat lurus, dapat dipantulkan, dapat dibiaskan, dan menembus benda bening) berdasarkan percobaan sederhana.' },
  hemat: {
    lama: 'Siswa dapat memberi contoh cara menghemat energi listrik dan bahan bakar di rumah dan sekolah.',
    baru: 'Siswa dapat menghasilkan rencana aksi penghematan energi listrik dan bahan bakar di rumah atau sekolah, menerapkannya selama satu minggu, dan melaporkan hasilnya sebagai upaya mitigasi perubahan iklim.' },
  alternatif: {
    lama: 'Siswa dapat menyebutkan sumber energi alternatif seperti matahari, angin, dan air beserta manfaatnya.',
    baru: 'Siswa dapat mengidentifikasi sumber energi alternatif di lingkungan sekitar (matahari, angin, air, dan biogas) dan merancang pemanfaatan sederhananya sebagai upaya mitigasi perubahan iklim.' },
  tataSurya: {
    lama: 'Siswa dapat menyebutkan anggota tata surya dan urutan planet dari Matahari.',
    baru: 'Siswa dapat menjelaskan sistem tata surya, anggota-anggotanya, dan urutan planet dari Matahari, serta kaitannya dengan gerak rotasi dan revolusi Bumi.' },
  revolusi: {
    lama: 'Siswa dapat menjelaskan revolusi Bumi dan akibatnya, seperti pergantian musim dan perbedaan lama siang dan malam.',
    // Di Indonesia, musim hujan/kemarau terutama dipengaruhi angin muson, bukan langsung oleh revolusi.
    baru: 'Siswa dapat menjelaskan revolusi Bumi dan akibatnya: gerak semu tahunan Matahari, perbedaan lama siang dan malam, serta pergantian empat musim di daerah subtropis; lalu membedakannya dengan musim hujan dan kemarau di Indonesia yang terutama dipengaruhi angin muson.' },
};

// Istilah disesuaikan dengan CP ("wujud zat")
const TUJUAN_WUJUD_LAYAR = {
  lama: '<ul><li>Menyebutkan tiga wujud benda: padat, cair, dan gas.</li><li>Menjelaskan perubahan wujud: mencair, membeku, menguap, dan mengembun.</li><li>Memberi contoh perubahan wujud di sekitar rumah.</li></ul>',
  baru: '<ul><li>Menyebutkan tiga wujud zat: padat, cair, dan gas.</li><li>Menyimpulkan perubahan wujud (mencair, membeku, menguap, mengembun) dari pengamatan.</li><li>Memberi contoh perubahan wujud di sekitar rumah.</li></ul>',
};
const RANGKUMAN_WUJUD = {
  lama: '<ul><li>Wujud benda ada tiga: padat, cair, dan gas.</li><li>Dipanaskan: mencair dan menguap.</li><li>Didinginkan: membeku dan mengembun.</li><li>Perubahan wujud terjadi di sekitar kita setiap hari.</li></ul>',
  baru: '<ul><li>Wujud zat ada tiga: padat, cair, dan gas.</li><li>Dipanaskan: mencair dan menguap.</li><li>Didinginkan: membeku dan mengembun.</li><li>Perubahan wujud terjadi di sekitar kita setiap hari.</li></ul>',
};

// Layar Refleksi khusus untuk tiga subbab contoh yang lengkap
const REFLEKSI = {
  wujud: '<ul><li>Perubahan wujud apa yang paling sering kamu lihat di rumah?</li><li>Sekarang, bisakah kamu menjelaskan dari mana air di luar gelas es teh? Ceritakan dengan kata-katamu sendiri.</li><li>Bagian mana yang masih membingungkan: mencair, membeku, menguap, atau mengembun?</li></ul><p>Tulis jawabanmu di buku, lalu ceritakan kepada teman sebangku.</p>',
  rantai: '<ul><li>Makhluk hidup apa di sekitar rumahmu yang menjadi bagian dari rantai makanan?</li><li>Apa yang bisa kamu lakukan agar rantai makanan di sekitar sekolah tetap seimbang?</li><li>Bagian mana yang masih membingungkan: produsen, konsumen, atau pengurai?</li></ul><p>Tulis jawabanmu di buku, lalu ceritakan kepada teman sebangku.</p>',
  rotasi: '<ul><li>Jelaskan kepada teman: mengapa ada siang dan malam?</li><li>Dulu, apa yang kamu kira tentang gerak Matahari? Apakah pendapatmu berubah sekarang?</li><li>Bagaimana kamu bisa membuktikan rotasi Bumi sendiri? (Petunjuk: amati bayangan tiang bendera pada pagi dan sore hari.)</li></ul>',
};

function tambahMedia(file, judul, jenis, mime) {
  const src = path.join(SEED_MEDIA, file);
  const dest = `contoh-${file}`;
  fs.copyFileSync(src, path.join(db.MEDIA_DIR, dest));
  return Number(db.run('INSERT INTO media (file, nama_asli, judul, jenis, mime, ukuran, sumber, lisensi) VALUES (?,?,?,?,?,?,?,?)',
    dest, file, judul, jenis, mime, fs.statSync(src).size, 'Ilustrasi contoh bawaan LMS', 'Bebas dipakai dan diubah sekolah').lastInsertRowid);
}

function bab(kelas, judul, urutan) {
  return Number(db.run('INSERT INTO bab (kelas_id, judul, urutan) VALUES (?, ?, ?)', kelas, judul, urutan).lastInsertRowid);
}

// Subbab kosong dengan templat lengkap (untuk diisi guru)
function subbabKosong(babId, judul, urutan, tujuan) {
  const id = Number(db.run('INSERT INTO subbab (bab_id, judul, urutan, tujuan, status) VALUES (?,?,?,?,?)', babId, judul, urutan, tujuan, 'draf').lastInsertRowid);
  JENIS_KOMPONEN.forEach((j, i) => db.run('INSERT INTO komponen (subbab_id, urutan, jenis, judul, isi_html) VALUES (?,?,?,?,?)',
    id, i + 1, j.key, j.label, j.key === 'tujuan' ? `<p>${tujuan}</p>` : isiBawaan(j.key)));
  return id;
}

// Subbab lengkap dari daftar komponen
function subbabLengkap(babId, judul, urutan, tujuan, komps, soal) {
  const id = Number(db.run('INSERT INTO subbab (bab_id, judul, urutan, tujuan, status) VALUES (?,?,?,?,?)', babId, judul, urutan, tujuan, 'terbit').lastInsertRowid);
  komps.forEach((k, i) => db.run('INSERT INTO komponen (subbab_id, urutan, jenis, judul, isi_html, media_id, kegiatan_json) VALUES (?,?,?,?,?,?,?)',
    id, i + 1, k.jenis, k.judul, k.isi || '', k.media || null, k.keg ? JSON.stringify(k.keg) : ''));
  for (const q of soal) {
    db.run(`INSERT INTO soal (subbab_id, jenis, pertanyaan, opsi_json, kunci, pembahasan, kesulitan, asal, status) VALUES (?,?,?,?,?,?,?, 'manual', 'disetujui')`,
      id, q[0], q[1], JSON.stringify(q[2] || []), q[3], q[4], q[5] || 'sedang');
  }
  return id;
}

const I = (t, arti) => `<span class="istilah">${t}</span>${arti ? ` (${arti})` : ''}`;

// Media milik materi versi 3 (dibuat sendiri, bebas dipakai sekolah). Dipakai ulang bila sudah ada.
function mediaV3() {
  const pakai = (file, judul, jenis, mime) => {
    const ada = db.get('SELECT id FROM media WHERE file = ?', `contoh-${file}`);
    return ada ? ada.id : tambahMedia(file, judul, jenis, mime);
  };
  return {
    detak: pakai('detak-jantung.svg', 'Jantung berdebar setelah berlari', 'gambar', 'image/svg+xml'),
    peredaran: pakai('peredaran-darah.svg', 'Diagram peredaran darah kecil dan besar', 'gambar', 'image/svg+xml'),
    animPeredaran: pakai('peredaran-darah.html', 'Animasi peredaran darah manusia', 'animasi', 'text/html'),
    desember: pakai('desember-dua-tempat.svg', 'Desember di Jepang dan di Indonesia', 'gambar', 'image/svg+xml'),
    animRevolusi: pakai('revolusi-bumi.html', 'Simulasi revolusi Bumi dan musim', 'animasi', 'text/html'),
    revolusi: pakai('revolusi-musim.svg', 'Diagram revolusi Bumi dan empat musim', 'gambar', 'image/svg+xml'),
    muson: pakai('angin-muson.svg', 'Angin muson barat dan timur di Indonesia', 'gambar', 'image/svg+xml'),
  };
}

// ---------- Kelas 5 · Sistem Peredaran Darah (CP Fase C: merefleksikan sistem organ & menjaga kesehatan) ----------
function materiPeredaran(m) {
  return {
    komps: [
      { jenis: 'pemantik', judul: 'Deg… deg… deg…', media: m.detak,
        isi: '<p>Lompat-lompat di tempat selama 30 detik.</p><p>Lalu letakkan telapak tanganmu di dada sebelah kiri.</p><h3>Apa yang kamu rasakan? Mengapa jantung berdetak lebih cepat?</h3>' },
      { jenis: 'tujuan', judul: 'Hari ini kita akan belajar',
        isi: '<ul><li>Menjelaskan tugas jantung, pembuluh darah, dan darah.</li><li>Membedakan peredaran darah kecil dan peredaran darah besar.</li><li>Merefleksikan kebiasaan yang menjaga kesehatan jantung.</li></ul>' },
      { jenis: 'pengamatan', judul: 'Ayo menghitung denyut nadi',
        isi: '<p>Bekerja berpasangan. Siapkan jam atau stopwatch.</p>',
        keg: {
          prediksi: 'Menurutmu, apakah denyut nadimu setelah lompat-lompat lebih cepat, lebih lambat, atau sama dengan saat duduk diam?',
          langkah: ['Duduk tenang selama 1 menit.', 'Letakkan dua jari (telunjuk dan jari tengah) di pergelangan tangan bagian dalam, di bawah pangkal ibu jari. Jangan memakai ibu jari.', 'Hitung denyut selama 15 detik, lalu kalikan 4. Itulah denyut nadimu per menit.', 'Lompat-lompat di tempat selama 1 menit, lalu langsung hitung lagi dengan cara yang sama.'],
          catat: 'Buat tabel: Keadaan (duduk diam / setelah lompat) | Denyut dalam 15 detik | Denyut per menit (× 4).',
          pertanyaan: [
            { teks: 'Kapan denyut nadimu lebih cepat? Mengapa?', petunjuk: ['Bandingkan dua angka di tabelmu.', 'Saat bergerak, otot membutuhkan lebih banyak oksigen.'], kunci: 'Setelah lompat-lompat. Otot yang bekerja membutuhkan lebih banyak oksigen dan zat makanan, sehingga jantung memompa darah lebih cepat.' },
            { teks: 'Mengapa denyut terasa di pergelangan tangan, padahal jantung ada di dada?', petunjuk: ['Darah mengalir di dalam saluran ke seluruh tubuh.', 'Setiap kali jantung memompa, saluran itu ikut berdenyut.'], kunci: 'Di pergelangan tangan ada pembuluh nadi (arteri). Setiap kali jantung memompa, darah terdorong dan dinding pembuluh nadi ikut berdenyut.' },
          ],
        } },
      { jenis: 'penjelasan', judul: 'Jantung, pembuluh darah, dan darah', media: m.peredaran,
        isi: `<ul><li>${I('Jantung')}: memompa darah ke seluruh tubuh. Besarnya kira-kira sekepalan tangan pemiliknya.</li><li>${I('Pembuluh nadi', 'arteri')} membawa darah keluar dari jantung. ${I('Pembuluh balik', 'vena')} membawa darah kembali ke jantung.</li><li>${I('Darah')}: sel darah merah mengangkut oksigen, sel darah putih melawan kuman, keping darah membantu menutup luka.</li></ul>` },
      { jenis: 'penjelasan', judul: 'Dua jalur peredaran darah', media: m.animPeredaran,
        isi: `<p>Tekan tombol pada animasi untuk melihat setiap jalur.</p><ul><li>${I('Peredaran darah kecil')}: jantung → paru-paru → jantung. Di paru-paru darah mengambil oksigen.</li><li>${I('Peredaran darah besar')}: jantung → seluruh tubuh → jantung. Darah mengantar oksigen dan zat makanan.</li><li>Warna biru di gambar hanya penanda darah yang sedikit oksigennya. Darah kita selalu merah.</li></ul>` },
      { jenis: 'contoh', judul: 'Peredaran darah di sekitar kita',
        isi: '<ul><li>Wajah memerah dan jantung berdebar setelah bermain kejar-kejaran.</li><li>Luka kecil berhenti berdarah karena keping darah membentuk lapisan penutup.</li><li>Petugas Posyandu atau dokter mendengarkan detak jantung dengan stetoskop dan memeriksa tekanan darah.</li><li>Orang yang kurang darah (anemia) mudah lelah dan pucat. Sayuran hijau, telur, dan ikan membantu tubuh membentuk darah.</li></ul>' },
      { jenis: 'latihan', judul: 'Ayo berdiskusi',
        isi: '<p>Diskusikan bersama kelompokmu.</p>',
        keg: {
          prediksi: '', langkah: [], catat: '',
          pertanyaan: [
            { teks: 'Rina berlari dua putaran lapangan. Napasnya cepat dan jantungnya berdebar. Apa hubungan keduanya?', petunjuk: ['Napas cepat membuat lebih banyak udara masuk ke paru-paru.', 'Siapa yang mengantar oksigen dari paru-paru ke otot?'], kunci: 'Otot Rina membutuhkan banyak oksigen. Napas cepat memasukkan lebih banyak oksigen ke paru-paru, dan jantung berdetak cepat agar darah segera mengantar oksigen itu ke otot. Sistem pernapasan dan peredaran darah bekerja sama.' },
            { teks: 'Darah dari kaki kembali ke jantung. Ke mana darah itu dipompa agar mendapat oksigen lagi?', petunjuk: ['Organ apa yang mengambil oksigen dari udara?'], kunci: 'Ke paru-paru melalui peredaran darah kecil, lalu kembali ke jantung dan dipompa lagi ke seluruh tubuh melalui peredaran darah besar.' },
            { teks: 'Sebutkan dua kebiasaanmu yang baik dan satu kebiasaan yang perlu diubah agar jantungmu sehat.', petunjuk: ['Ingat olahraga, makanan, dan waktu tidurmu.'], kunci: 'Jawaban bervariasi. Contoh kebiasaan baik: rutin bermain aktif atau berolahraga, makan sayur dan buah, cukup tidur. Contoh yang perlu diubah: terlalu sering makan gorengan atau minum minuman manis, terlalu lama duduk bermain gawai.' },
          ],
        } },
      { jenis: 'rangkuman', judul: 'Rangkuman', media: m.peredaran,
        isi: '<ul><li>Jantung memompa darah melalui pembuluh darah ke seluruh tubuh.</li><li>Pembuluh nadi membawa darah dari jantung; pembuluh balik membawa darah ke jantung.</li><li>Peredaran darah kecil: jantung → paru-paru → jantung. Peredaran darah besar: jantung → seluruh tubuh → jantung.</li><li>Olahraga teratur, makanan bergizi, dan cukup tidur menjaga jantung tetap sehat.</li></ul>' },
      { jenis: 'refleksi', judul: 'Ayo merefleksi',
        isi: '<ul><li>Berapa denyut nadimu saat diam dan setelah bergerak? Apa artinya bagi tubuhmu?</li><li>Kebiasaan apa yang akan kamu mulai minggu ini agar jantungmu sehat?</li><li>Bagian mana yang masih membingungkan: pembuluh nadi, pembuluh balik, atau jalur peredaran darah?</li></ul><p>Tulis jawabanmu di buku, lalu ceritakan kepada teman sebangku.</p>' },
      { jenis: 'penilaian', judul: 'Ayo menjawab' },
    ],
    soal: [
      ['pg', 'Organ yang bertugas memompa darah ke seluruh tubuh adalah …', ['paru-paru', 'jantung', 'lambung', 'ginjal'], 'B', 'Jantung adalah otot kuat yang memompa darah melalui pembuluh darah ke seluruh tubuh.', 'mudah'],
      ['pg', 'Pembuluh darah yang membawa darah kembali ke jantung disebut …', ['pembuluh nadi (arteri)', 'pembuluh balik (vena)', 'tenggorokan', 'kerongkongan'], 'B', 'Pembuluh balik (vena) membawa darah dari seluruh tubuh kembali ke jantung.', 'mudah'],
      ['pg', 'Jalur peredaran darah kecil yang benar adalah …', ['jantung → seluruh tubuh → jantung', 'jantung → paru-paru → jantung', 'paru-paru → seluruh tubuh → paru-paru', 'jantung → otak → jantung'], 'B', 'Pada peredaran darah kecil, darah dipompa ke paru-paru untuk mengambil oksigen, lalu kembali ke jantung.', 'sedang'],
      ['bs', 'Darah di dalam pembuluh balik (vena) berwarna biru.', [], 'Salah', 'Darah selalu berwarna merah. Pembuluh balik hanya tampak kebiruan dari luar kulit, dan warna biru di gambar hanya penanda darah yang sedikit oksigennya.', 'sedang'],
      ['isian', 'Bagian darah yang membantu menutup luka agar darah berhenti keluar disebut …', [], 'keping darah', 'Keping darah (trombosit) membentuk lapisan penutup pada luka.', 'mudah'],
      ['uraian', 'Mengapa denyut nadi lebih cepat setelah berlari? Jelaskan!', [], 'Saat berlari, otot bekerja keras sehingga membutuhkan lebih banyak oksigen dan zat makanan. Jantung memompa lebih cepat agar darah segera mengantar oksigen ke otot.', 'Sistem peredaran darah dan sistem pernapasan bekerja sama memenuhi kebutuhan oksigen tubuh.', 'sulit'],
    ],
  };
}

// ---------- Kelas 6 · Revolusi Bumi dan Musim (CP Fase C: tata surya, rotasi & revolusi) ----------
// Catatan sains: empat musim terjadi karena poros Bumi miring, bukan karena jarak ke Matahari.
// Musim hujan/kemarau di Indonesia terutama disebabkan angin muson (pengaruh revolusi secara tidak langsung).
function materiRevolusi(m) {
  return {
    komps: [
      { jenis: 'pemantik', judul: 'Desember yang berbeda', media: m.desember,
        isi: '<p>Pada bulan Desember, anak-anak di Jepang bermain salju.</p><p>Pada bulan yang sama, di Indonesia sering turun hujan dan udaranya tetap hangat.</p><h3>Bulannya sama, mengapa keadaannya sangat berbeda?</h3>' },
      { jenis: 'tujuan', judul: 'Hari ini kita akan belajar',
        isi: '<ul><li>Menjelaskan apa itu revolusi Bumi.</li><li>Menjelaskan akibat revolusi: gerak semu tahunan Matahari, perbedaan lama siang dan malam, dan empat musim di daerah subtropis.</li><li>Membedakan empat musim dengan musim hujan dan kemarau di Indonesia.</li></ul>' },
      { jenis: 'pengamatan', judul: 'Percobaan lampu dan bola miring',
        isi: '<p>Siapkan: lampu belajar tanpa kap (sebagai Matahari), bola plastik, tusuk sate, dan spidol. Gelapkan kelas.</p>',
        keg: {
          prediksi: 'Jika bola yang porosnya miring dibawa berkeliling lampu, apakah bagian atas bola selalu mendapat cahaya yang sama banyaknya?',
          langkah: ['Tusukkan tusuk sate menembus bola sebagai poros. Gambar garis khatulistiwa dengan spidol.', 'Miringkan poros sedikit (kira-kira seperempat sudut siku-siku) dan arahkan ujung atasnya ke satu dinding, misalnya papan tulis.', 'Bawa bola berkeliling lampu. Ujung atas poros harus tetap mengarah ke papan tulis.', 'Berhenti di empat posisi: depan, kanan, belakang, dan kiri lampu. Amati belahan atas atau bawah yang lebih banyak terkena cahaya.'],
          catat: 'Gambar bola di empat posisi. Arsir bagian yang gelap, lalu tulis belahan mana yang lebih banyak mendapat cahaya.',
          pertanyaan: [
            { teks: 'Di posisi mana belahan atas bola paling banyak terkena cahaya?', petunjuk: ['Perhatikan posisi saat ujung atas poros condong ke arah lampu.'], kunci: 'Saat ujung atas poros condong ke arah lampu. Belahan atas mendapat cahaya lebih banyak dan lebih lama, seperti musim panas di belahan Bumi utara.' },
            { teks: 'Apa yang terjadi jika porosnya tegak (tidak miring)?', petunjuk: ['Ulangi percobaan dengan poros tegak.'], kunci: 'Belahan atas dan bawah mendapat cahaya yang sama di setiap posisi, sehingga tidak terjadi pergantian empat musim.' },
          ],
        } },
      { jenis: 'penjelasan', judul: 'Revolusi Bumi', media: m.animRevolusi,
        isi: `<ul><li>${I('Revolusi')}: gerak Bumi mengelilingi Matahari.</li><li>Satu kali revolusi ± 365¼ hari (satu tahun). Kelebihan ¼ hari dikumpulkan menjadi tanggal 29 Februari setiap 4 tahun (${I('tahun kabisat')}).</li><li>Poros Bumi miring ± 23,5° dan arah miringnya tetap selama revolusi.</li></ul>` },
      { jenis: 'penjelasan', judul: 'Akibat revolusi Bumi', media: m.revolusi,
        isi: `<ul><li>${I('Gerak semu tahunan Matahari')}: selama setahun Matahari tampak bergeser ke utara dan ke selatan khatulistiwa.</li><li>Belahan Bumi yang condong ke Matahari mendapat siang lebih panjang dan cahaya lebih tegak.</li><li>Di daerah subtropis terjadi empat musim: semi, panas, gugur, dan dingin.</li><li>Saat belahan utara musim panas, belahan selatan musim dingin.</li></ul>` },
      { jenis: 'contoh', judul: 'Musim di Indonesia: hujan dan kemarau', media: m.muson,
        isi: `<ul><li>Indonesia dekat khatulistiwa: udara hangat dan lama siang hampir 12 jam sepanjang tahun.</li><li>Musim hujan (± Oktober–Maret): ${I('angin muson barat')} dari Benua Asia melewati laut luas sehingga membawa banyak uap air.</li><li>Musim kemarau (± April–September): ${I('angin muson timur')} dari Benua Australia yang kering.</li><li>Arah angin muson berubah karena gerak semu tahunan Matahari. Jadi revolusi Bumi berpengaruh secara tidak langsung.</li></ul>` },
      { jenis: 'latihan', judul: 'Ayo berdiskusi',
        isi: '<p>Diskusikan bersama kelompokmu.</p>',
        keg: {
          prediksi: '', langkah: [], catat: '',
          pertanyaan: [
            { teks: 'Pada bulan Desember, Australia sedang mengalami musim apa? Jelaskan!', petunjuk: ['Australia berada di belahan Bumi selatan.', 'Pada bulan Desember, belahan mana yang condong ke Matahari?'], kunci: 'Musim panas. Pada bulan Desember belahan Bumi selatan condong ke Matahari sehingga mendapat cahaya lebih banyak dan siang lebih panjang.' },
            { teks: 'Rudi berkata, "Musim panas terjadi karena Bumi sedang paling dekat dengan Matahari." Setujukah kamu?', petunjuk: ['Jika benar, apakah belahan utara dan selatan akan musim panas pada waktu yang sama?', 'Ingat percobaan bola miring.'], kunci: 'Tidak setuju. Musim terjadi karena poros Bumi miring, bukan karena jarak. Buktinya, belahan utara dan selatan mengalami musim yang berlawanan pada waktu yang sama. Bumi justru paling dekat dengan Matahari sekitar awal Januari, saat belahan utara musim dingin.' },
            { teks: 'Mengapa di sebagian besar wilayah Indonesia tidak pernah turun salju?', petunjuk: ['Indonesia dekat dengan garis apa?', 'Adakah tempat di Indonesia yang bersalju?'], kunci: 'Indonesia dekat khatulistiwa sehingga Matahari bersinar hampir tegak sepanjang tahun dan udaranya hangat. Salju hanya ada di puncak gunung yang sangat tinggi, seperti Puncak Jaya di Papua, karena udara di sana sangat dingin.' },
          ],
        } },
      { jenis: 'rangkuman', judul: 'Rangkuman',
        isi: '<ul><li>Revolusi: Bumi mengelilingi Matahari selama ± 365¼ hari.</li><li>Poros Bumi yang miring menyebabkan gerak semu tahunan Matahari, perbedaan lama siang dan malam, dan empat musim di daerah subtropis.</li><li>Belahan utara dan belahan selatan selalu mengalami musim yang berlawanan.</li><li>Musim hujan dan kemarau di Indonesia terutama disebabkan oleh angin muson.</li></ul>' },
      { jenis: 'refleksi', judul: 'Ayo merefleksi',
        isi: '<ul><li>Sebelum belajar, apa yang kamu kira menyebabkan musim? Apakah pendapatmu berubah sekarang?</li><li>Jelaskan kepada teman perbedaan rotasi dan revolusi Bumi.</li><li>Biasanya bulan apa musim hujan dimulai di daerahmu? Tanyakan kepada orang tua atau petani di sekitarmu.</li></ul>' },
      { jenis: 'penilaian', judul: 'Ayo menjawab' },
    ],
    soal: [
      ['pg', 'Waktu yang diperlukan Bumi untuk satu kali revolusi adalah sekitar …', ['24 jam', '29½ hari', '365¼ hari', '400 hari'], 'C', 'Satu kali revolusi sekitar 365¼ hari atau satu tahun.', 'mudah'],
      ['pg', 'Pergantian empat musim di daerah subtropis disebabkan oleh …', ['rotasi Bumi', 'revolusi Bumi dengan poros yang miring', 'jarak Bumi ke Bulan', 'angin muson'], 'B', 'Karena poros Bumi miring, saat revolusi belahan utara dan selatan bergantian condong ke Matahari.', 'sedang'],
      ['pg', 'Musim kemarau di Indonesia terutama dipengaruhi oleh …', ['angin muson barat dari Benua Asia', 'angin muson timur dari Benua Australia', 'rotasi Bumi', 'gerhana Matahari'], 'B', 'Angin muson timur bertiup dari Benua Australia yang kering sehingga membawa sedikit uap air.', 'sedang'],
      ['bs', 'Musim panas terjadi karena Bumi sedang berada paling dekat dengan Matahari.', [], 'Salah', 'Musim terjadi karena poros Bumi miring. Bumi justru paling dekat dengan Matahari sekitar awal Januari, saat belahan utara mengalami musim dingin.', 'sedang'],
      ['isian', 'Tahun yang memiliki 366 hari karena ada tanggal 29 Februari disebut tahun …', [], 'kabisat', 'Kelebihan ¼ hari setiap tahun dikumpulkan menjadi 1 hari setiap 4 tahun.', 'mudah'],
      ['uraian', 'Pada bulan Juni, Jepang mengalami musim panas, sedangkan Australia mengalami musim dingin. Jelaskan mengapa demikian!', [], 'Poros Bumi miring. Pada bulan Juni belahan Bumi utara (Jepang) condong ke Matahari sehingga mendapat cahaya lebih banyak dan siang lebih panjang (musim panas), sedangkan belahan selatan (Australia) menjauhi Matahari (musim dingin).', 'Belahan utara dan selatan selalu mengalami musim yang berlawanan.', 'sulit'],
    ],
  };
}

function seedKelas4(m) {
  const b1 = bab(4, 'Pancaindra', 1);
  subbabKosong(b1, 'Bentuk dan Fungsi Pancaindra', 1, TUJUAN.pancaindra.baru);
  const b2 = bab(4, 'Siklus Hidup Makhluk Hidup', 2);
  subbabKosong(b2, 'Siklus Hidup Hewan', 1, TUJUAN.siklusHewan.baru);
  subbabKosong(b2, 'Pelestarian Makhluk Hidup', 2, TUJUAN.pelestarianMH.baru);
  const b3 = bab(4, 'Wujud Zat dan Perubahannya', 3);
  subbabLengkap(b3, 'Perubahan Wujud Zat', 1, TUJUAN.wujud.baru,
    [
      { jenis: 'pemantik', judul: 'Gelas es teh yang basah', media: m.gelas,
        isi: '<p>Coba perhatikan gelas es teh ini.</p><p><b>Bagian luar gelas menjadi basah.</b> Padahal gelasnya tidak bocor.</p><h3>Dari mana datangnya air itu?</h3>' },
      { jenis: 'tujuan', judul: 'Hari ini kita akan belajar',
        isi: TUJUAN_WUJUD_LAYAR.baru },
      { jenis: 'pengamatan', judul: 'Ayo mengamati es batu',
        isi: '<p>Siapkan: 1 gelas bening, 3 es batu, dan jam.</p>',
        keg: {
          prediksi: 'Apa yang akan terjadi pada es batu jika dibiarkan di meja selama 15 menit? Apa yang terjadi pada bagian luar gelas?',
          langkah: ['Masukkan 3 es batu ke dalam gelas bening.', 'Letakkan gelas di atas meja.', 'Amati es batu setiap 5 menit.', 'Raba bagian luar gelas dengan jarimu.'],
          catat: 'Buat tabel: Menit ke- | Keadaan es batu | Bagian luar gelas (kering/basah).',
          pertanyaan: [
            { teks: 'Apa yang terjadi pada es batu setelah 15 menit?', petunjuk: ['Lihat bentuk es batu. Apakah masih sama?', 'Es batu berubah menjadi apa?'], kunci: 'Es batu mencair menjadi air karena menyerap panas dari udara di sekitarnya.' },
            { teks: 'Mengapa bagian luar gelas menjadi basah?', petunjuk: ['Apakah air bisa menembus kaca? Tidak.', 'Udara di sekitar kita mengandung uap air yang tidak terlihat.'], kunci: 'Uap air di udara menyentuh gelas yang dingin, lalu berubah menjadi titik-titik air. Peristiwa ini disebut mengembun.' },
          ],
        } },
      { jenis: 'penjelasan', judul: 'Tiga wujud zat', media: m.tigaWujud,
        isi: `<ul><li>${I('Padat')}: bentuknya tetap. Contoh: batu, es.</li><li>${I('Cair')}: bentuknya mengikuti wadah. Contoh: air, minyak.</li><li>${I('Gas')}: memenuhi ruangan. Contoh: udara, uap air.</li></ul>` },
      { jenis: 'penjelasan', judul: 'Benda dapat berubah wujud', media: m.animWujud,
        isi: `<p>Geser suhu pada simulasi. Amati partikelnya.</p><ul><li>${I('Mencair', 'padat → cair')}: es dipanaskan.</li><li>${I('Membeku', 'cair → padat')}: air didinginkan.</li><li>${I('Menguap', 'cair → gas')}: air dipanaskan.</li><li>${I('Mengembun', 'gas → cair')}: uap air didinginkan.</li></ul>` },
      { jenis: 'contoh', judul: 'Perubahan wujud di sekitar kita',
        isi: '<ul><li>Es lilin <b>mencair</b> jika lama dipegang di siang hari.</li><li>Air di cetakan es <b>membeku</b> di dalam kulkas.</li><li>Pakaian yang dijemur menjadi kering karena airnya <b>menguap</b>.</li><li>Pagi hari ada titik air di daun padi. Itu <b>embun</b>.</li></ul>' },
      { jenis: 'latihan', judul: 'Ayo berdiskusi',
        isi: '<p>Diskusikan bersama teman sebangkumu.</p>',
        keg: {
          prediksi: '', langkah: [], catat: '',
          pertanyaan: [
            { teks: 'Ibu memanaskan mentega di wajan. Mentega berubah menjadi cair. Perubahan wujud apa ini?', petunjuk: ['Mentega awalnya padat atau cair?', 'Padat menjadi cair disebut …'], kunci: 'Mencair (padat → cair) karena mentega menyerap panas.' },
            { teks: 'Setelah hujan, ada genangan air di halaman. Siang harinya genangan itu hilang. Ke mana airnya?', petunjuk: ['Siang hari panas matahari terik.', 'Air yang dipanaskan berubah menjadi gas.'], kunci: 'Air menguap menjadi uap air karena panas matahari.' },
            { teks: 'Bagaimana cara membuat es lilin? Perubahan wujud apa yang terjadi?', petunjuk: ['Di mana es lilin disimpan?'], kunci: 'Air gula atau sirup dimasukkan ke kantong plastik lalu disimpan di freezer. Airnya membeku (cair → padat).' },
          ],
        } },
      { jenis: 'rangkuman', judul: 'Rangkuman', media: m.siklus, isi: RANGKUMAN_WUJUD.baru },
      { jenis: 'refleksi', judul: 'Ayo merefleksi', isi: REFLEKSI.wujud },
      { jenis: 'penilaian', judul: 'Ayo menjawab' },
    ],
    [
      ['pg', 'Es batu yang dibiarkan di luar kulkas akan berubah menjadi air. Peristiwa ini disebut …', ['membeku', 'mencair', 'menguap', 'mengembun'], 'B', 'Es (padat) berubah menjadi air (cair) karena menyerap panas. Ini disebut mencair.', 'mudah'],
      ['pg', 'Pakaian basah yang dijemur di bawah sinar matahari menjadi kering karena airnya …', ['membeku', 'mencair', 'menguap', 'mengembun'], 'C', 'Air pada pakaian berubah menjadi uap air karena panas matahari. Ini disebut menguap.', 'mudah'],
      ['pg', 'Benda di bawah ini yang bentuknya selalu mengikuti wadahnya adalah …', ['batu', 'kayu', 'minyak goreng', 'kelereng'], 'C', 'Minyak goreng adalah benda cair. Benda cair bentuknya mengikuti wadah.', 'mudah'],
      ['bs', 'Titik-titik air di luar gelas es teh berasal dari teh yang merembes keluar gelas.', [], 'Salah', 'Air itu berasal dari uap air di udara yang mengembun saat menyentuh gelas yang dingin.', 'sedang'],
      ['isian', 'Perubahan wujud dari gas menjadi cair disebut …', [], 'mengembun', 'Contohnya embun di daun pada pagi hari.', 'sedang'],
      ['uraian', 'Sebutkan dua contoh peristiwa membeku yang dapat kamu temukan di rumah!', [], 'Contoh: membuat es batu di freezer; membuat es lilin; agar-agar atau puding yang mengeras saat didinginkan (boleh contoh lain yang tepat).', 'Membeku adalah perubahan dari cair menjadi padat karena didinginkan.', 'sedang'],
    ]);
  const b4 = bab(4, 'Energi dan Perubahannya', 4);
  subbabKosong(b4, 'Sumber dan Bentuk Energi', 1, TUJUAN.energi4.baru);
  const b5 = bab(4, 'Gaya di Sekitar Kita', 5);
  subbabKosong(b5, 'Jenis Gaya dan Pengaruhnya', 1, TUJUAN.gaya.baru);
  const b6 = bab(4, 'Pelestarian Sumber Daya Alam', 6);
  subbabKosong(b6, 'Pelestarian Alam untuk Mengurangi Perubahan Iklim', 1, TUJUAN.sda.baru);
}

function seedKelas5(m) {
  const b1 = bab(5, 'Sistem Organ Tubuh Manusia', 1);
  subbabKosong(b1, 'Sistem Pernapasan', 1, TUJUAN.pernapasan.baru);
  subbabKosong(b1, 'Sistem Pencernaan', 2, TUJUAN.pencernaan.baru);
  const pd = materiPeredaran(m);
  subbabLengkap(b1, 'Sistem Peredaran Darah', 3, TUJUAN.peredaran.baru, pd.komps, pd.soal);
  const b2 = bab(5, 'Ekosistem', 2);
  subbabKosong(b2, 'Komponen Biotik dan Abiotik', 1, TUJUAN.biotik.baru);
  subbabLengkap(b2, 'Rantai Makanan', 2,
    'Siswa dapat menjelaskan rantai makanan, menyebutkan peran produsen, konsumen, dan pengurai, serta memperkirakan akibat jika salah satu makhluk hidup dalam rantai makanan hilang.',
    [
      { jenis: 'pemantik', judul: 'Ada apa di sawah?', media: m.sawah,
        isi: '<p>Petani sering menemukan ular di sawah.</p><h3>Mengapa ular senang tinggal di sawah?</h3>' },
      { jenis: 'tujuan', judul: 'Hari ini kita akan belajar',
        isi: '<ul><li>Menjelaskan apa itu rantai makanan.</li><li>Menyebutkan peran produsen, konsumen, dan pengurai.</li><li>Memperkirakan akibat jika satu makhluk hidup hilang dari rantai makanan.</li></ul>' },
      { jenis: 'pengamatan', judul: 'Ayo mengamati kebun sekolah',
        isi: '<p>Bekerja dalam kelompok berempat. Bawa buku catatan dan pensil.</p>',
        keg: {
          prediksi: 'Menurutmu, makhluk hidup apa saja yang akan kamu temukan di kebun sekolah? Apa makanannya?',
          langkah: ['Amati kebun atau halaman sekolah selama 10 menit.', 'Catat semua hewan dan tumbuhan yang kamu temukan.', 'Tulis apa yang dimakan setiap hewan.', 'Jangan mengganggu atau menangkap hewan.'],
          catat: 'Buat tabel: Nama makhluk hidup | Makanannya.',
          pertanyaan: [
            { teks: 'Makhluk hidup apa yang tidak memakan makhluk hidup lain?', petunjuk: ['Lihat daftar tumbuhan yang kamu temukan.', 'Tumbuhan hijau butuh cahaya matahari.'], kunci: 'Tumbuhan hijau. Tumbuhan membuat makanannya sendiri dengan bantuan cahaya matahari.' },
            { teks: 'Pilih satu hewan dari catatanmu. Siapa yang mungkin memakan hewan itu?', petunjuk: ['Contoh: belalang dimakan oleh …?'], kunci: 'Jawaban bervariasi. Contoh: belalang dimakan katak atau burung.' },
          ],
        } },
      { jenis: 'penjelasan', judul: 'Apa itu rantai makanan?', media: m.animRantai,
        isi: `<p>${I('Rantai makanan')} adalah peristiwa makan dan dimakan dengan urutan tertentu.</p><ul><li>Panah menunjuk dari yang <b>dimakan</b> ke yang <b>memakan</b>.</li><li>Contoh di sawah: padi → tikus → ular → elang.</li></ul>` },
      { jenis: 'penjelasan', judul: 'Peran makhluk hidup', media: m.peran,
        isi: `<ul><li>${I('Produsen')}: tumbuhan hijau yang membuat makanan sendiri.</li><li>${I('Konsumen')}: hewan yang memakan makhluk hidup lain.</li><li>${I('Pengurai')}: jamur dan bakteri yang menguraikan makhluk mati.</li></ul>` },
      { jenis: 'contoh', judul: 'Rantai makanan di sekitar kita',
        isi: '<ul><li>Di kebun: daun → ulat → burung → elang.</li><li>Di sawah: padi → belalang → katak → ular.</li><li>Di kolam: tumbuhan air → ikan kecil → burung bangau.</li></ul><p>Rantai makanan apa yang ada di dekat rumahmu?</p>' },
      { jenis: 'latihan', judul: 'Ayo berdiskusi',
        isi: '<p>Jawab bersama kelompokmu.</p>',
        keg: {
          prediksi: '', langkah: [], catat: '',
          pertanyaan: [
            { teks: 'Banyak ular di sawah ditangkap orang. Apa yang terjadi pada jumlah tikus?', petunjuk: ['Siapa yang memakan tikus?', 'Jika pemangsanya berkurang, mangsanya akan …'], kunci: 'Tikus bertambah banyak karena pemangsanya berkurang. Akibatnya padi banyak dimakan tikus dan panen petani berkurang.' },
            { teks: 'Susun rantai makanan dari: elang, daun, ulat, burung.', petunjuk: ['Mulai dari produsen.', 'Siapa yang memakan daun?'], kunci: 'Daun → ulat → burung → elang.' },
            { teks: 'Mengapa jamur dan bakteri penting walaupun tidak terlihat dalam rantai makanan?', petunjuk: ['Apa yang terjadi pada daun atau hewan yang mati?'], kunci: 'Jamur dan bakteri menguraikan makhluk hidup yang mati menjadi zat yang menyuburkan tanah, sehingga tumbuhan bisa tumbuh.' },
          ],
        } },
      { jenis: 'rangkuman', judul: 'Rangkuman',
        isi: '<ul><li>Rantai makanan: peristiwa makan dan dimakan dengan urutan tertentu.</li><li>Rantai makanan selalu dimulai dari produsen (tumbuhan hijau).</li><li>Konsumen memakan makhluk hidup lain; pengurai menguraikan makhluk mati.</li><li>Jika satu makhluk hidup hilang, makhluk hidup lain ikut terpengaruh.</li></ul>' },
      { jenis: 'refleksi', judul: 'Ayo merefleksi', isi: REFLEKSI.rantai },
      { jenis: 'penilaian', judul: 'Ayo menjawab' },
    ],
    [
      ['pg', 'Dalam rantai makanan, tumbuhan hijau berperan sebagai …', ['konsumen I', 'produsen', 'pengurai', 'konsumen puncak'], 'B', 'Tumbuhan hijau membuat makanannya sendiri dengan bantuan cahaya matahari, sehingga disebut produsen.', 'mudah'],
      ['pg', 'Perhatikan rantai makanan: padi → tikus → ular → elang. Hewan yang berperan sebagai konsumen I adalah …', ['padi', 'tikus', 'ular', 'elang'], 'B', 'Konsumen I adalah pemakan tumbuhan. Tikus memakan padi.', 'mudah'],
      ['pg', 'Jika ular di sawah habis ditangkap, yang paling mungkin terjadi adalah …', ['jumlah tikus berkurang', 'jumlah padi bertambah', 'jumlah tikus bertambah', 'jumlah elang bertambah'], 'C', 'Ular adalah pemakan tikus. Jika ular hilang, tikus bertambah banyak.', 'sedang'],
      ['bs', 'Jamur dan bakteri berperan sebagai pengurai dalam ekosistem.', [], 'Benar', 'Jamur dan bakteri menguraikan makhluk hidup yang sudah mati.', 'mudah'],
      ['isian', 'Peristiwa makan dan dimakan dengan urutan tertentu disebut …', [], 'rantai makanan', 'Contoh: padi → tikus → ular → elang.', 'mudah'],
      ['uraian', 'Mengapa petani sebaiknya tidak membunuh ular sawah? Jelaskan!', [], 'Ular sawah memakan tikus. Jika ular dibunuh, tikus bertambah banyak dan merusak padi sehingga panen berkurang.', 'Setiap makhluk hidup dalam rantai makanan saling bergantung.', 'sulit'],
    ]);
  const b3 = bab(5, 'Bunyi dan Cahaya', 3);
  subbabKosong(b3, 'Gelombang Bunyi', 1, TUJUAN.bunyi.baru);
  subbabKosong(b3, 'Sifat-sifat Cahaya', 2, TUJUAN.cahaya.baru);
}

function seedKelas6(m) {
  const b1 = bab(6, 'Energi dalam Kehidupan', 1);
  subbabKosong(b1, 'Penghematan Energi', 1, TUJUAN.hemat.baru);
  subbabKosong(b1, 'Energi Alternatif', 2, TUJUAN.alternatif.baru);
  const b2 = bab(6, 'Bumi dan Tata Surya', 2);
  subbabKosong(b2, 'Sistem Tata Surya', 1, TUJUAN.tataSurya.baru);
  subbabLengkap(b2, 'Rotasi Bumi: Siang dan Malam', 2,
    'Siswa dapat menjelaskan rotasi Bumi, menjelaskan terjadinya siang dan malam, serta menjelaskan gerak semu harian Matahari.',
    [
      { jenis: 'pemantik', judul: 'Matahari terbit dan terbenam', media: m.terbit,
        isi: '<p>Setiap pagi Matahari terbit di timur. Sore hari Matahari terbenam di barat.</p><h3>Benarkah Matahari yang bergerak mengelilingi kita?</h3>' },
      { jenis: 'tujuan', judul: 'Hari ini kita akan belajar',
        isi: '<ul><li>Menjelaskan apa itu rotasi Bumi.</li><li>Menjelaskan mengapa terjadi siang dan malam.</li><li>Menjelaskan mengapa Matahari tampak terbit di timur dan terbenam di barat.</li></ul>' },
      { jenis: 'pengamatan', judul: 'Percobaan senter dan bola',
        isi: '<p>Siapkan: senter, bola plastik (atau globe), dan stiker kecil. Gelapkan kelas.</p>',
        keg: {
          prediksi: 'Jika bola diputar perlahan di depan senter yang menyala, apa yang terjadi pada stiker di bola?',
          langkah: ['Tempel stiker pada bola sebagai tanda Indonesia.', 'Satu siswa menyalakan senter dan mengarahkannya ke bola (senter = Matahari).', 'Siswa lain memutar bola perlahan berlawanan arah jarum jam (dilihat dari atas).', 'Amati kapan stiker terkena cahaya dan kapan berada di bagian gelap.'],
          catat: 'Gambar posisi stiker saat berada di bagian terang dan di bagian gelap.',
          pertanyaan: [
            { teks: 'Mengapa hanya sebagian bola yang terang?', petunjuk: ['Dari mana cahaya datang?', 'Bisakah cahaya senter menembus bola?'], kunci: 'Cahaya senter hanya mengenai sisi bola yang menghadap senter. Sisi lainnya tidak terkena cahaya sehingga gelap.' },
            { teks: 'Apa yang terjadi pada stiker ketika bola terus diputar?', petunjuk: ['Perhatikan stiker selama satu putaran penuh.'], kunci: 'Stiker bergantian berada di bagian terang (siang) dan bagian gelap (malam).' },
          ],
        } },
      { jenis: 'penjelasan', judul: 'Rotasi Bumi', media: m.animRotasi,
        isi: `<ul><li>${I('Rotasi')}: perputaran Bumi pada porosnya.</li><li>Bumi berputar dari barat ke timur.</li><li>Satu kali rotasi lamanya sekitar 24 jam (sehari semalam).</li></ul>` },
      { jenis: 'penjelasan', judul: 'Mengapa ada siang dan malam?', media: m.siangMalam,
        isi: `<ul><li>Bagian Bumi yang menghadap Matahari mengalami <b>siang</b>.</li><li>Bagian yang membelakangi Matahari mengalami <b>malam</b>.</li><li>Bumi berputar ke timur, sehingga Matahari tampak bergerak ke barat. Ini disebut ${I('gerak semu Matahari', 'gerak yang hanya terlihat, bukan gerak sebenarnya')}.</li></ul>` },
      { jenis: 'contoh', judul: 'Bukti rotasi Bumi di sekitar kita',
        isi: '<ul><li>Saat pukul 07.00 WIB di Jakarta, di Jayapura sudah pukul 09.00 WIT.</li><li>Bayangan tiang bendera di pagi hari mengarah ke barat, sore hari ke timur.</li><li>Petani berangkat ke sawah saat Matahari terbit di timur.</li></ul>' },
      { jenis: 'latihan', judul: 'Ayo berdiskusi',
        isi: '<p>Diskusikan bersama kelompokmu.</p>',
        keg: {
          prediksi: '', langkah: [], catat: '',
          pertanyaan: [
            { teks: 'Mengapa Matahari terbit lebih dulu di Papua daripada di Sumatra?', petunjuk: ['Bumi berputar ke arah mana?', 'Papua ada di bagian timur atau barat Indonesia?'], kunci: 'Bumi berputar dari barat ke timur, sehingga wilayah timur (Papua) lebih dulu menghadap Matahari.' },
            { teks: 'Apa yang terjadi jika Bumi tidak berotasi?', petunjuk: ['Ingat percobaan senter dan bola yang tidak diputar.'], kunci: 'Tidak ada pergantian siang dan malam setiap hari. Satu sisi Bumi terus terang dan sisi lainnya terus gelap dalam waktu yang sangat lama.' },
          ],
        } },
      { jenis: 'rangkuman', judul: 'Rangkuman',
        isi: '<ul><li>Rotasi adalah perputaran Bumi pada porosnya, sekitar 24 jam sekali.</li><li>Bumi berotasi dari barat ke timur.</li><li>Rotasi menyebabkan siang dan malam.</li><li>Rotasi menyebabkan gerak semu Matahari: terbit di timur, terbenam di barat.</li></ul>' },
      { jenis: 'refleksi', judul: 'Ayo merefleksi', isi: REFLEKSI.rotasi },
      { jenis: 'penilaian', judul: 'Ayo menjawab' },
    ],
    [
      ['pg', 'Perputaran Bumi pada porosnya disebut …', ['revolusi', 'rotasi', 'gerhana', 'gravitasi'], 'B', 'Rotasi adalah perputaran Bumi pada porosnya.', 'mudah'],
      ['pg', 'Waktu yang diperlukan Bumi untuk satu kali rotasi adalah sekitar …', ['12 jam', '24 jam', '7 hari', '365 hari'], 'B', 'Satu kali rotasi sekitar 24 jam, yaitu satu hari satu malam.', 'mudah'],
      ['pg', 'Akibat rotasi Bumi adalah …', ['terjadinya pergantian musim', 'terjadinya siang dan malam', 'terjadinya gerhana bulan', 'perubahan bentuk bulan'], 'B', 'Rotasi membuat bagian Bumi bergantian menghadap dan membelakangi Matahari.', 'sedang'],
      ['bs', 'Matahari terbit di timur karena Matahari bergerak mengelilingi Bumi setiap hari.', [], 'Salah', 'Matahari hanya tampak bergerak (gerak semu). Sebenarnya Bumi yang berotasi dari barat ke timur.', 'sedang'],
      ['isian', 'Bumi berotasi dari arah barat ke arah …', [], 'timur', 'Karena itu Matahari tampak terbit di timur.', 'mudah'],
      ['uraian', 'Saat di Jakarta pukul 07.00 WIB, di Jayapura sudah pukul 09.00 WIT. Jelaskan mengapa demikian!', [], 'Bumi berotasi dari barat ke timur, sehingga Jayapura (di timur) lebih dulu menghadap Matahari dan waktunya lebih cepat dua jam dari Jakarta.', 'Perbedaan waktu antarwilayah adalah salah satu akibat rotasi Bumi.', 'sulit'],
    ]);
  const rv = materiRevolusi(m);
  subbabLengkap(b2, 'Revolusi Bumi dan Musim', 3, TUJUAN.revolusi.baru, rv.komps, rv.soal);
}

function seedIfEmpty() {
  const adaUser = db.get('SELECT COUNT(*) AS n FROM users').n;
  if (!adaUser) {
    db.run(`INSERT INTO users (username, nama, role, pass_hash, harus_ganti) VALUES ('admin', 'Admin LMS', 'admin', ?, 1)`, db.hashPassword('admin123'));
    db.run(`INSERT INTO users (username, nama, role, pass_hash, harus_ganti) VALUES ('guru', 'Guru IPAS', 'guru', ?, 1)`, db.hashPassword('guru123'));
    console.log('  Akun awal dibuat: admin/admin123 dan guru/guru123 (wajib ganti sandi saat pertama masuk).');
  }
  if (db.get('SELECT COUNT(*) AS n FROM bab').n || process.env.LMS_TANPA_CONTOH) { perbaruiMateri(); return; }
  db.tx(() => {
    const m = {
      gelas: tambahMedia('gelas-es-teh.svg', 'Gelas es teh berembun', 'gambar', 'image/svg+xml'),
      tigaWujud: tambahMedia('tiga-wujud.svg', 'Tiga wujud zat (partikel)', 'gambar', 'image/svg+xml'),
      siklus: tambahMedia('siklus-wujud.svg', 'Diagram perubahan wujud', 'gambar', 'image/svg+xml'),
      animWujud: tambahMedia('perubahan-wujud.html', 'Simulasi perubahan wujud air', 'animasi', 'text/html'),
      sawah: tambahMedia('sawah.svg', 'Ilustrasi ekosistem sawah', 'gambar', 'image/svg+xml'),
      peran: tambahMedia('peran-ekosistem.svg', 'Diagram produsen, konsumen, pengurai', 'gambar', 'image/svg+xml'),
      animRantai: tambahMedia('rantai-makanan.html', 'Animasi rantai makanan di sawah', 'animasi', 'text/html'),
      terbit: tambahMedia('matahari-terbit.svg', 'Matahari terbit di timur', 'gambar', 'image/svg+xml'),
      siangMalam: tambahMedia('siang-malam.svg', 'Diagram siang dan malam', 'gambar', 'image/svg+xml'),
      animRotasi: tambahMedia('rotasi-bumi.html', 'Simulasi rotasi Bumi', 'animasi', 'text/html'),
    };
    Object.assign(m, mediaV3());
    seedKelas4(m);
    seedKelas5(m);
    seedKelas6(m);
    pasangMediaInteraktif([]);
    isiMateriLengkap([]);
    db.setSetting('materi_versi', MATERI_VERSI);
  });
  console.log('  Materi bawaan dimuat: 19 subbab terisi lengkap dengan media interaktif dan soal.');
}

// Versi 5: isi lengkap (9 layar + soal) untuk 14 subbab yang sebelumnya masih kerangka.
// Hanya diisi bila subbab itu masih kerangka bawaan: belum punya soal, belum ada kegiatan,
// teksnya masih bawaan, dan medianya (bila ada) hanya media interaktif bawaan.
function isiMateriLengkap(log) {
  for (const mt of MATERI) {
    const s = db.get(`SELECT s.* FROM subbab s JOIN bab b ON b.id = s.bab_id WHERE b.kelas_id = ? AND s.judul = ?`, mt.kelas, mt.judul);
    if (!s || db.get('SELECT COUNT(*) AS n FROM soal WHERE subbab_id = ?', s.id).n) continue;
    const mi = MEDIA_INTERAKTIF.find((x) => x[0] === mt.kelas && x[1] === mt.judul);
    const media = mi ? db.get('SELECT id FROM media WHERE file = ?', `contoh-${mi[2]}`) : null;
    const bawaan = new Set(['', `<p>${s.tujuan}</p>`, isiBawaan('refleksi')]);
    const komps = db.all('SELECT * FROM komponen WHERE subbab_id = ? ORDER BY urutan, id', s.id);
    if (komps.some((k) => k.kegiatan_json || !bawaan.has(k.isi_html || ''))) continue; // teks/kegiatan sudah ditulis guru
    // Media yang sudah dipilih guru (selain media interaktif bawaan) dipertahankan di layar berjenis sama.
    const mediaGuru = {};
    komps.forEach((k) => { if (k.media_id && (!media || k.media_id !== media.id) && !mediaGuru[k.jenis]) mediaGuru[k.jenis] = k.media_id; });
    db.run('DELETE FROM komponen WHERE subbab_id = ?', s.id);
    const dipakai = {};
    mt.komps.forEach((k, i) => {
      let mid = k.media === 'INTERAKTIF' && media ? media.id : null;
      if (!mid && mediaGuru[k.jenis] && !dipakai[k.jenis]) { mid = mediaGuru[k.jenis]; dipakai[k.jenis] = true; log.push('media guru dipertahankan'); }
      db.run('INSERT INTO komponen (subbab_id, urutan, jenis, judul, isi_html, media_id, kegiatan_json) VALUES (?,?,?,?,?,?,?)',
        s.id, i + 1, k.jenis, k.judul, k.isi || '', mid, k.keg ? JSON.stringify(k.keg) : '');
    });
    for (const q of mt.soal) {
      db.run(`INSERT INTO soal (subbab_id, jenis, pertanyaan, opsi_json, kunci, pembahasan, kesulitan, asal, status) VALUES (?,?,?,?,?,?,?, 'manual', 'disetujui')`,
        s.id, q[0], q[1], JSON.stringify(q[2] || []), q[3], q[4], q[5] || 'sedang');
    }
    db.run(`UPDATE subbab SET status = 'terbit', updated_at = datetime('now','localtime') WHERE id = ?`, s.id);
    log.push('materi lengkap');
  }
}

// Berkas media contoh bawaan (contoh-*) diperbarui ke versi terbaru dari folder seed/media.
// Aman: isi berkas ini tidak dapat diubah guru dari aplikasi (guru hanya mengubah judul/sumber/lisensi).
function segarkanMediaContoh(log) {
  for (const m of db.all(`SELECT id, file FROM media WHERE file LIKE 'contoh-%'`)) {
    const src = path.join(SEED_MEDIA, m.file.slice('contoh-'.length));
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(db.MEDIA_DIR, m.file));
    db.run('UPDATE media SET ukuran = ? WHERE id = ?', fs.statSync(src).size, m.id);
    log.push('media disegarkan');
  }
}

// Versi 4: media interaktif HTML5 untuk setiap subbab yang belum punya simulasi.
// Media masuk ke Pustaka Media dan dipasang pada layar "Penjelasan Konsep" pertama yang belum bermedia.
const MEDIA_INTERAKTIF = [
  [4, 'Bentuk dan Fungsi Pancaindra', 'pancaindra.html', 'Jelajah pancaindra (interaktif)'],
  [4, 'Siklus Hidup Hewan', 'siklus-hidup.html', 'Siklus hidup kupu-kupu, katak, belalang, dan ayam'],
  [4, 'Pelestarian Makhluk Hidup', 'pelestarian-makhluk-hidup.html', 'Permainan: melestarikan atau mengancam?'],
  [4, 'Sumber dan Bentuk Energi', 'perubahan-energi.html', 'Simulasi perubahan bentuk energi'],
  [4, 'Jenis Gaya dan Pengaruhnya', 'lab-gaya.html', 'Lab gaya: otot, gesek, magnet, gravitasi, bentuk'],
  [4, 'Pelestarian Alam untuk Mengurangi Perubahan Iklim', 'kota-hijau.html', 'Kota hijau: aksi melawan perubahan iklim'],
  [5, 'Sistem Pernapasan', 'pernapasan.html', 'Simulasi bernapas: paru-paru dan diafragma'],
  [5, 'Sistem Pencernaan', 'pencernaan.html', 'Perjalanan makanan di saluran pencernaan'],
  [5, 'Komponen Biotik dan Abiotik', 'biotik-abiotik.html', 'Pilah biotik-abiotik dan percobaan tanaman'],
  [5, 'Gelombang Bunyi', 'bunyi.html', 'Lab bunyi: getaran, nada, dan perambatan'],
  [5, 'Sifat-sifat Cahaya', 'cahaya.html', 'Lab cahaya: lurus, pantul, bias, dan tembus'],
  [6, 'Penghematan Energi', 'hemat-energi.html', 'Rumah hemat energi'],
  [6, 'Energi Alternatif', 'energi-alternatif.html', 'Simulasi energi alternatif: surya, angin, air, biogas'],
  [6, 'Sistem Tata Surya', 'tata-surya.html', 'Jelajah tata surya dan urutan planet'],
];
function pasangMediaInteraktif(log) {
  for (const [kelas, judulSub, file, judulMedia] of MEDIA_INTERAKTIF) {
    const ada = db.get('SELECT id FROM media WHERE file = ?', `contoh-${file}`);
    const mediaId = ada ? ada.id : tambahMedia(file, judulMedia, 'animasi', 'text/html');
    if (!ada) log.push('media');
    const s = db.get(`SELECT s.id FROM subbab s JOIN bab b ON b.id = s.bab_id WHERE b.kelas_id = ? AND s.judul = ?`, kelas, judulSub);
    if (!s || db.get('SELECT id FROM komponen WHERE subbab_id = ? AND media_id = ?', s.id, mediaId)) continue;
    const k = db.get(`SELECT id FROM komponen WHERE subbab_id = ? AND jenis = 'penjelasan' AND media_id IS NULL ORDER BY urutan LIMIT 1`, s.id);
    if (!k) continue; // semua layar penjelasan sudah diberi media oleh guru
    db.run('UPDATE komponen SET media_id = ? WHERE id = ?', mediaId, k.id);
    db.run(`UPDATE subbab SET updated_at = datetime('now','localtime') WHERE id = ?`, s.id);
    log.push('dipasang');
  }
}

// Pembaruan materi bawaan untuk instalasi yang sudah berjalan (dijalankan sekali).
// Hanya mengubah teks yang masih SAMA PERSIS dengan versi bawaan lama, jadi
// isi yang sudah diubah guru tidak tertimpa.
function perbaruiMateri() {
  const versi = parseInt(db.setting('materi_versi'), 10) || 1;
  if (versi >= parseInt(MATERI_VERSI, 10)) return;
  const log = [];
  db.tx(() => {
    if (versi < 2) perbaruiKeV2(log);
    if (versi < 3) perbaruiKeV3(log);
    if (versi < 4) pasangMediaInteraktif(log);
    if (versi < 5) isiMateriLengkap(log);
    segarkanMediaContoh(log);
    db.setSetting('materi_versi', MATERI_VERSI);
  });
  const hit = (k) => log.filter((x) => x === k).length;
  console.log(`  Materi bawaan diperbarui ke versi ${MATERI_VERSI} (CP 046/2025): ${hit('tujuan')} tujuan, ${hit('refleksi')} layar Refleksi, ${hit('peredaran darah') + hit('isi lengkap')} subbab baru/diisi, ${hit('materi lengkap')} subbab kerangka diisi lengkap, ${hit('media')} media interaktif baru (${hit('dipasang')} dipasang), ${hit('media disegarkan')} berkas media contoh diperbarui.`);
}

// Versi 3: isi lengkap Sistem Peredaran Darah (kelas 5) dan Revolusi Bumi dan Musim (kelas 6),
// hanya bila subbab itu masih kerangka kosong bawaan (belum diisi guru dan belum punya soal).
function perbaruiKeV3(log) {
  const target = [
    [5, 'Sistem Peredaran Darah', materiPeredaran],
    [6, 'Revolusi Bumi dan Musim', materiRevolusi],
  ];
  let m = null;
  for (const [kelas, judul, materi] of target) {
    const s = db.get(`SELECT s.* FROM subbab s JOIN bab b ON b.id = s.bab_id WHERE b.kelas_id = ? AND s.judul = ?`, kelas, judul);
    if (!s || db.get('SELECT COUNT(*) AS n FROM soal WHERE subbab_id = ?', s.id).n) continue;
    const bawaan = new Set(['', `<p>${s.tujuan}</p>`, isiBawaan('refleksi')]);
    const komps = db.all('SELECT * FROM komponen WHERE subbab_id = ?', s.id);
    if (komps.some((k) => k.media_id || k.kegiatan_json || !bawaan.has(k.isi_html || ''))) continue; // sudah diisi guru
    m = m || mediaV3();
    const isi = materi(m);
    db.run('DELETE FROM komponen WHERE subbab_id = ?', s.id);
    isi.komps.forEach((k, i) => db.run('INSERT INTO komponen (subbab_id, urutan, jenis, judul, isi_html, media_id, kegiatan_json) VALUES (?,?,?,?,?,?,?)',
      s.id, i + 1, k.jenis, k.judul, k.isi || '', k.media || null, k.keg ? JSON.stringify(k.keg) : ''));
    for (const q of isi.soal) {
      db.run(`INSERT INTO soal (subbab_id, jenis, pertanyaan, opsi_json, kunci, pembahasan, kesulitan, asal, status) VALUES (?,?,?,?,?,?,?, 'manual', 'disetujui')`,
        s.id, q[0], q[1], JSON.stringify(q[2] || []), q[3], q[4], q[5] || 'sedang');
    }
    db.run(`UPDATE subbab SET status = 'terbit', updated_at = datetime('now','localtime') WHERE id = ?`, s.id);
    log.push('isi lengkap');
  }
}

// Versi 2: kesesuaian dengan CP 046/2025 (tujuan, istilah, peredaran darah, layar Refleksi)
function perbaruiKeV2(log) {
  {
    // (3, 5) Tujuan pembelajaran sesuai kata kerja CP, termasuk Revolusi Bumi & musim
    for (const [, t] of Object.entries(TUJUAN)) {
      if (!t.lama) continue;
      for (const s of db.all('SELECT id FROM subbab WHERE tujuan = ?', t.lama)) {
        db.run('UPDATE subbab SET tujuan = ? WHERE id = ?', t.baru, s.id);
        db.run(`UPDATE komponen SET isi_html = ? WHERE subbab_id = ? AND jenis = 'tujuan' AND isi_html = ?`, `<p>${t.baru}</p>`, s.id, `<p>${t.lama}</p>`);
        log.push('tujuan');
      }
    }
    // (7) Istilah "wujud zat" pada subbab contoh kelas 4
    for (const s of db.all(`SELECT s.id FROM subbab s JOIN bab b ON b.id = s.bab_id WHERE b.kelas_id = 4 AND s.judul = 'Perubahan Wujud Benda'`)) {
      db.run(`UPDATE subbab SET judul = 'Perubahan Wujud Zat' WHERE id = ?`, s.id);
      db.run(`UPDATE komponen SET judul = 'Tiga wujud zat' WHERE subbab_id = ? AND judul = 'Tiga wujud benda'`, s.id);
      db.run('UPDATE komponen SET isi_html = ? WHERE subbab_id = ? AND isi_html = ?', TUJUAN_WUJUD_LAYAR.baru, s.id, TUJUAN_WUJUD_LAYAR.lama);
      db.run('UPDATE komponen SET isi_html = ? WHERE subbab_id = ? AND isi_html = ?', RANGKUMAN_WUJUD.baru, s.id, RANGKUMAN_WUJUD.lama);
      log.push('wujud zat');
    }
    db.run(`UPDATE media SET judul = 'Tiga wujud zat (partikel)' WHERE judul = 'Tiga wujud benda (partikel)'`);
    // (4) Sistem Peredaran Darah di bab Sistem Organ Tubuh Manusia (kelas 5)
    for (const b of db.all(`SELECT id FROM bab WHERE kelas_id = 5 AND judul = 'Sistem Organ Tubuh Manusia'`)) {
      if (db.get(`SELECT id FROM subbab WHERE bab_id = ? AND judul LIKE '%Peredaran Darah%'`, b.id)) continue;
      const urut = db.get('SELECT COALESCE(MAX(urutan), 0) + 1 AS n FROM subbab WHERE bab_id = ?', b.id).n;
      subbabKosong(b.id, 'Sistem Peredaran Darah', urut, TUJUAN.peredaran.baru);
      log.push('peredaran darah');
    }
    // (6) Layar Refleksi sebelum Penilaian pada setiap subbab yang belum memilikinya
    const khusus = { 'Perubahan Wujud Zat': REFLEKSI.wujud, 'Rantai Makanan': REFLEKSI.rantai, 'Rotasi Bumi: Siang dan Malam': REFLEKSI.rotasi };
    for (const s of db.all(`SELECT id, judul FROM subbab WHERE id NOT IN (SELECT subbab_id FROM komponen WHERE jenis = 'refleksi')`)) {
      const komps = db.all('SELECT id, jenis FROM komponen WHERE subbab_id = ? ORDER BY urutan, id', s.id);
      let pos = komps.findIndex((k) => k.jenis === 'penilaian');
      if (pos < 0) pos = komps.length;
      komps.forEach((k, i) => db.run('UPDATE komponen SET urutan = ? WHERE id = ?', i < pos ? i + 1 : i + 2, k.id));
      db.run(`INSERT INTO komponen (subbab_id, urutan, jenis, judul, isi_html) VALUES (?, ?, 'refleksi', ?, ?)`,
        s.id, pos + 1, khusus[s.judul] ? 'Ayo merefleksi' : 'Refleksi', khusus[s.judul] || isiBawaan('refleksi'));
      log.push('refleksi');
    }
  }
}

module.exports = { seedIfEmpty, perbaruiMateri };
