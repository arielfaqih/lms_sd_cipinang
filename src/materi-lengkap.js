// Isi lengkap 14 subbab bawaan (selain 5 subbab contoh) sesuai CP IPAS bagian IPA
// Keputusan Kepala BSKAP No. 046/H/KR/2025. Setiap subbab mengikuti templat 9 layar:
// pemantik → tujuan → pengamatan (inkuiri) → penjelasan (media interaktif) → penjelasan →
// contoh kontekstual → latihan & diskusi bertahap → rangkuman → refleksi → penilaian.
// Layar bertanda media: 'INTERAKTIF' memakai media interaktif subbab itu (lihat MEDIA_INTERAKTIF di seed.js).
'use strict';

const I = (t, arti) => `<span class="istilah">${t}</span>${arti ? ` (${arti})` : ''}`;
const L = (arr) => `<ul><li>${arr.join('</li><li>')}</li></ul>`;
const T = (teks, petunjuk, kunci) => ({ teks, petunjuk, kunci });
const KEG = (prediksi, langkah, catat, pertanyaan) => ({ prediksi, langkah, catat, pertanyaan });
const DISKUSI = (pertanyaan) => ({ prediksi: '', langkah: [], catat: '', pertanyaan });
const PENUTUP = '<p>Tulis jawabanmu di buku, lalu ceritakan kepada teman sebangku.</p>';
const BINGUNG = 'Bagian mana yang masih membingungkan? Tuliskan agar bisa ditanyakan kepada guru.';

// Susunan 9+1 layar baku
function layar(o) {
  return [
    { jenis: 'pemantik', judul: o.pemantik[0], isi: o.pemantik[1] },
    { jenis: 'tujuan', judul: 'Hari ini kita akan belajar', isi: L(o.tujuan) },
    { jenis: 'pengamatan', judul: o.amati[0], isi: o.amati[1], keg: o.amati[2] },
    { jenis: 'penjelasan', judul: o.jelas1[0], isi: o.jelas1[1], media: 'INTERAKTIF' },
    { jenis: 'penjelasan', judul: o.jelas2[0], isi: o.jelas2[1] },
    { jenis: 'contoh', judul: o.contoh[0], isi: L(o.contoh[1]) },
    { jenis: 'latihan', judul: 'Ayo berdiskusi', isi: '<p>Diskusikan bersama kelompokmu. Buka petunjuk satu per satu jika perlu.</p>', keg: DISKUSI(o.diskusi) },
    { jenis: 'rangkuman', judul: 'Rangkuman', isi: L(o.rangkuman) },
    { jenis: 'refleksi', judul: 'Ayo merefleksi', isi: L(o.refleksi.concat([BINGUNG])) + PENUTUP },
    { jenis: 'penilaian', judul: 'Ayo menjawab' },
  ];
}

const MATERI = [
  // =============================== KELAS 4 · FASE B ===============================
  { kelas: 4, judul: 'Bentuk dan Fungsi Pancaindra', komps: layar({
    pemantik: ['Kotak misteri', '<p>Bu guru membawa sebuah kotak tertutup. Kamu tidak boleh melihat isinya.</p><h3>Bagaimana caramu menebak isi kotak tanpa melihatnya?</h3>'],
    tujuan: ['Menjelaskan bentuk dan fungsi lima pancaindra.', 'Menyelidiki kerja pancaindra melalui percobaan sederhana.', 'Menerapkan cara merawat pancaindra setiap hari.'],
    amati: ['Percobaan kotak misteri', '<p>Bekerja berkelompok. Siapkan kain penutup mata, kotak kardus berlubang, dan benda: jeruk, kerincingan, kapas, sejumput garam, dan daun pandan.</p>',
      KEG('Indra apa saja yang dapat kamu pakai untuk menebak benda tanpa melihatnya?',
        ['Satu anggota menutup mata dengan kain.', 'Masukkan tangan ke kotak, raba bendanya, lalu tebak.', 'Cium bau jeruk dan daun pandan tanpa melihat.', 'Goyangkan kerincingan dan dengarkan. Cicipi sedikit garam hanya dengan izin guru.'],
        'Buat tabel: Nama benda | Indra yang dipakai | Tebakan benar atau salah.',
        [T('Indra apa yang paling membantu menebak kapas? Mengapa?', ['Kapas tidak berbau dan tidak berbunyi.', 'Apa yang terasa saat kapas disentuh?'], 'Kulit (indra peraba), karena kapas terasa lembut dan ringan saat diraba.'),
          T('Mengapa lebih mudah menebak jika memakai lebih dari satu indra?', ['Bandingkan tebakan dengan satu indra dan dengan beberapa indra.'], 'Setiap indra memberi informasi yang berbeda: bentuk, bau, bunyi, atau rasa. Gabungan informasi membuat tebakan lebih tepat.')])],
    jelas1: ['Lima pancaindra', `<p>Ketuk setiap organ pada media untuk melihat fungsi dan cara merawatnya.</p>${L([`Mata: ${I('indra penglihatan')}.`, `Telinga: ${I('indra pendengaran')}.`, `Hidung: ${I('indra pembau')}. Lidah: ${I('indra pengecap')}.`, `Kulit: ${I('indra peraba')}.`])}`],
    jelas2: ['Bagaimana pancaindra bekerja?', L([`Pancaindra menerima ${I('rangsang', 'sesuatu dari luar yang dapat dirasakan')}: cahaya, bunyi, bau, rasa, dan sentuhan.`, 'Rangsang diteruskan oleh saraf ke otak.', 'Otak mengolahnya sehingga kita tahu apa yang dilihat, didengar, dicium, dikecap, atau diraba.', 'Pancaindra sering bekerja bersama, misalnya saat makan kita melihat, mencium, dan mengecap makanan.'])],
    contoh: ['Pancaindra dalam kegiatan sehari-hari', ['Saat menyeberang jalan, mata melihat kendaraan dan telinga mendengar klakson.', 'Ibu mencium bau gosong dari dapur, lalu segera mematikan kompor.', 'Lidah mengecap rasa asam pada rujak buah.', 'Kulit merasakan panasnya aspal pada siang hari, sehingga kita memakai alas kaki.']],
    diskusi: [
      T('Saat pilek, makanan terasa kurang enak. Mengapa?', ['Saat pilek, hidung tersumbat.', 'Rasa makanan dikenali dengan bantuan lidah dan hidung.'], 'Hidung tersumbat sehingga bau makanan tidak tercium. Kita mengenali rasa makanan dengan bantuan lidah dan hidung, jadi makanan terasa hambar.'),
      T('Doni membaca komik di tempat gelap sambil berbaring. Apa saranmu?', ['Ingat cara merawat mata.'], 'Membaca di tempat yang terang, duduk tegak, dan menjaga jarak mata ke buku sekitar 30 cm agar mata tidak cepat lelah.'),
      T('Mengapa kita tidak boleh memasukkan benda tajam ke lubang telinga?', ['Bagian apa yang ada di dalam lubang telinga?'], 'Benda tajam dapat melukai gendang telinga sehingga pendengaran terganggu.')],
    rangkuman: ['Pancaindra terdiri atas mata, telinga, hidung, lidah, dan kulit.', 'Setiap indra menerima rangsang yang berbeda, lalu saraf meneruskannya ke otak.', 'Pancaindra sering bekerja sama.', 'Pancaindra perlu dirawat agar tetap berfungsi dengan baik.'],
    refleksi: ['Indra mana yang paling sering kamu pakai saat belajar di kelas?', 'Kebiasaan apa yang akan kamu lakukan untuk merawat mata dan telingamu?'],
  }), soal: [
    ['pg', 'Indra yang berfungsi untuk mencium bau adalah …', ['mata', 'telinga', 'hidung', 'kulit'], 'C', 'Hidung adalah indra pembau.', 'mudah'],
    ['pg', 'Bagian mata yang mengatur banyaknya cahaya yang masuk adalah …', ['kelopak mata', 'pupil', 'bulu mata', 'alis'], 'B', 'Pupil (anak mata) membesar di tempat gelap dan mengecil di tempat terang.', 'sedang'],
    ['pg', 'Cara merawat telinga yang benar adalah …', ['membersihkan dengan peniti', 'mendengarkan musik sangat keras', 'membersihkan bagian luar telinga dengan lembut', 'memasukkan air ke telinga setiap hari'], 'C', 'Telinga cukup dibersihkan bagian luarnya dengan lembut.', 'mudah'],
    ['bs', 'Kulit dapat merasakan panas, dingin, dan sakit.', [], 'Benar', 'Kulit adalah indra peraba yang peka terhadap sentuhan, tekanan, panas, dingin, dan sakit.', 'mudah'],
    ['isian', 'Lidah adalah indra …', [], 'pengecap', 'Lidah mengecap rasa manis, asin, asam, pahit, dan gurih.', 'mudah'],
    ['uraian', 'Saat menyeberang jalan, pancaindra apa saja yang kita pakai? Jelaskan!', [], 'Mata untuk melihat kendaraan dan lampu lalu lintas, telinga untuk mendengar suara kendaraan atau klakson. Keduanya membantu kita menyeberang dengan aman.', 'Pancaindra sering bekerja bersama untuk menjaga keselamatan kita.', 'sedang'],
  ] },

  { kelas: 4, judul: 'Siklus Hidup Hewan', komps: layar({
    pemantik: ['Dari ulat menjadi kupu-kupu?', '<p>Di daun tanaman jeruk ada ulat yang rakus memakan daun.</p><p>Beberapa minggu kemudian, muncul kupu-kupu cantik di dekat tanaman itu.</p><h3>Benarkah ulat dan kupu-kupu adalah hewan yang sama?</h3>'],
    tujuan: ['Menganalisis tahap-tahap siklus hidup hewan.', 'Membandingkan metamorfosis sempurna, metamorfosis tidak sempurna, dan hewan tanpa metamorfosis.', 'Menggambar diagram siklus hidup.'],
    amati: ['Mengamati ulat atau berudu', '<p>Jika memungkinkan, amati ulat pada daun atau berudu di kolam. Jika tidak, gunakan gambar atau media interaktif. Jangan merusak tempat hidupnya.</p>',
      KEG('Apakah berudu akan tumbuh kaki? Kira-kira kaki mana yang tumbuh lebih dulu?',
        ['Amati bentuk tubuh hewan: berkaki atau tidak, berekor atau bersayap.', 'Gambar hewan yang kamu amati.', 'Bandingkan gambarmu dengan bentuk hewan dewasanya.', 'Kembalikan hewan ke tempat asalnya.'],
        'Buat tabel: Nama hewan | Ciri tubuh sekarang | Ciri tubuh saat dewasa | Sama atau berbeda?',
        [T('Apa perbedaan berudu dan katak dewasa?', ['Perhatikan ekor dan kaki.', 'Di mana masing-masing hidup?'], 'Berudu berekor, belum berkaki lengkap, hidup di air, dan bernapas dengan insang. Katak dewasa berkaki empat, tidak berekor, dan bernapas dengan paru-paru.'),
          T('Mengapa perubahan bentuk tubuh ini disebut metamorfosis?', ['"Meta" berarti berubah, "morf" berarti bentuk.'], 'Karena bentuk tubuh hewan berubah-ubah selama hidupnya, dari muda sampai dewasa.')])],
    jelas1: ['Siklus hidup hewan', `<p>Pilih hewan pada media, lalu tekan <b>Tahap berikutnya</b>. Coba juga <b>Susun urutan</b>.</p>${L([`${I('Siklus hidup')}: tahap-tahap perubahan makhluk hidup dari lahir sampai dewasa dan berkembang biak.`, 'Siklus selalu berulang karena hewan dewasa menghasilkan keturunan.'])}`],
    jelas2: ['Tiga jenis siklus hidup', L([`${I('Metamorfosis sempurna')}: bentuk tubuh berubah total. Kupu-kupu dan nyamuk: telur → larva → pupa → dewasa. Katak: telur → berudu → katak muda → katak dewasa.`, `${I('Metamorfosis tidak sempurna')}: telur → nimfa → dewasa. Nimfa mirip induknya. Contoh: belalang, kecoak, capung.`, 'Tanpa metamorfosis: anak mirip induknya sejak lahir atau menetas. Contoh: ayam, kucing, sapi.'])],
    contoh: ['Siklus hidup di sekitar kita', ['Jentik di bak mandi adalah larva nyamuk. Menguras bak mandi memutus siklus hidup nyamuk demam berdarah.', 'Ulat di daun tanaman cabai kelak berubah menjadi ngengat atau kupu-kupu.', 'Capung bertelur di air. Nimfanya hidup di air sebelum menjadi capung dewasa.', 'Anak ayam yang baru menetas sudah mirip induknya.']],
    diskusi: [
      T('Mengapa menguras bak mandi seminggu sekali dapat mencegah demam berdarah?', ['Jentik adalah tahap apa dalam siklus hidup nyamuk?', 'Jentik menjadi nyamuk dalam waktu kurang dari dua minggu.'], 'Jentik (larva) nyamuk terbuang sebelum sempat menjadi nyamuk dewasa, sehingga siklus hidupnya terputus dan nyamuk pembawa demam berdarah berkurang.'),
      T('Apa perbedaan siklus hidup kupu-kupu dan belalang?', ['Apakah belalang mengalami tahap kepompong?'], 'Kupu-kupu mengalami tahap kepompong (pupa) dan bentuknya berubah total (metamorfosis sempurna). Belalang tidak melalui kepompong; nimfanya sudah mirip induk (metamorfosis tidak sempurna).'),
      T('Pada tahap apa kupu-kupu paling banyak makan? Mengapa?', ['Apakah kepompong makan?'], 'Pada tahap ulat (larva). Ulat makan banyak untuk menyimpan cadangan makanan, karena saat menjadi kepompong ia tidak makan.')],
    rangkuman: ['Siklus hidup adalah tahap perubahan dari lahir sampai dewasa dan berkembang biak.', 'Metamorfosis sempurna: bentuk berubah total (kupu-kupu, nyamuk, katak).', 'Metamorfosis tidak sempurna: telur → nimfa → dewasa (belalang, capung).', 'Hewan tanpa metamorfosis: anaknya mirip induk (ayam, kucing).'],
    refleksi: ['Hewan apa di sekitar rumahmu yang mengalami metamorfosis?', 'Tindakan apa yang dapat kamu lakukan untuk memutus siklus hidup nyamuk?'],
  }), soal: [
    ['pg', 'Urutan siklus hidup kupu-kupu yang benar adalah …', ['telur – kepompong – ulat – kupu-kupu', 'telur – ulat – kepompong – kupu-kupu', 'ulat – telur – kepompong – kupu-kupu', 'telur – nimfa – kupu-kupu'], 'B', 'Kupu-kupu mengalami metamorfosis sempurna: telur, ulat (larva), kepompong (pupa), kupu-kupu.', 'mudah'],
    ['pg', 'Hewan yang mengalami metamorfosis tidak sempurna adalah …', ['nyamuk', 'katak', 'belalang', 'kupu-kupu'], 'C', 'Belalang mengalami tahap telur, nimfa, dan dewasa tanpa kepompong.', 'sedang'],
    ['pg', 'Jentik di bak mandi adalah tahap … dari siklus hidup nyamuk.', ['telur', 'larva', 'pupa', 'dewasa'], 'B', 'Jentik adalah larva nyamuk yang hidup di air.', 'mudah'],
    ['bs', 'Anak ayam yang baru menetas bentuknya sudah mirip induknya.', [], 'Benar', 'Ayam tidak mengalami metamorfosis.', 'mudah'],
    ['isian', 'Tahap siklus hidup belalang setelah telur disebut …', [], 'nimfa', 'Nimfa mirip induknya tetapi kecil dan belum bersayap.', 'sedang'],
    ['uraian', 'Jelaskan perubahan yang terjadi pada katak dari telur sampai dewasa!', [], 'Telur menetas menjadi berudu yang berekor dan bernapas dengan insang. Kaki belakang lalu kaki depan tumbuh. Ekor memendek, katak muda mulai bernapas dengan paru-paru, lalu menjadi katak dewasa.', 'Katak mengalami metamorfosis sempurna.', 'sulit'],
  ] },

  { kelas: 4, judul: 'Pelestarian Makhluk Hidup', komps: layar({
    pemantik: ['Ke mana perginya kunang-kunang?', '<p>Dulu, malam di desa dipenuhi kerlip kunang-kunang. Sekarang kunang-kunang sulit ditemukan.</p><h3>Apa yang terjadi? Apa yang bisa kita lakukan?</h3>'],
    tujuan: ['Mengaitkan siklus hidup makhluk hidup dengan upaya pelestariannya.', 'Membedakan tindakan yang melestarikan dan yang mengancam makhluk hidup.', 'Merancang satu aksi pelestarian di lingkungan sekitar.'],
    amati: ['Survei makhluk hidup di sekolah', '<p>Bekerja berkelompok. Bawa buku catatan. Jangan menangkap hewan atau merusak tumbuhan.</p>',
      KEG('Menurutmu, apakah makhluk hidup di sekolah kita sudah terjaga dengan baik? Mengapa?',
        ['Berkeliling halaman sekolah selama 15 menit.', 'Catat hewan dan tumbuhan yang kamu temukan.', 'Catat hal yang dapat mengancam mereka, misalnya sampah, tanaman rusak, atau genangan kotor.', 'Gambar atau foto temuanmu.'],
        'Buat tabel: Makhluk hidup yang ditemukan | Ancaman yang terlihat | Usul perbaikan.',
        [T('Ancaman apa yang paling banyak kamu temukan?', ['Lihat kolom ancaman di tabelmu.'], 'Jawaban bervariasi, misalnya sampah plastik, tanaman yang terinjak, atau ranting pohon yang dipatahkan.'),
          T('Usul apa yang paling mudah dilakukan kelasmu?', ['Pilih usul yang bisa dilakukan setiap hari.'], 'Jawaban bervariasi, misalnya piket memungut sampah, menyiram tanaman, atau membuat papan larangan memetik bunga.')])],
    jelas1: ['Melestarikan atau mengancam?', `<p>Mainkan media: tentukan apakah setiap tindakan melestarikan atau mengancam makhluk hidup.</p>${L([`${I('Melestarikan')}: menjaga makhluk hidup agar tetap ada dan dapat berkembang biak.`, `Jika siklus hidup terus terputus, misalnya telurnya selalu diambil, jumlah hewan berkurang dan bisa ${I('punah', 'hilang sama sekali dari Bumi')}.`])}`],
    jelas2: ['Mengapa makhluk hidup bisa punah?', L(['Perburuan dan perdagangan liar, misalnya burung dan penyu.', `Rusaknya ${I('habitat', 'tempat hidup')}: hutan ditebang atau dibakar.`, 'Pencemaran air dan tanah oleh sampah dan racun.', 'Hewan atau tumbuhan diambil sebelum sempat berkembang biak.'])],
    contoh: ['Upaya pelestarian di Indonesia', ['Taman Nasional Komodo melindungi komodo di habitat aslinya.', 'Penangkaran penyu: telur dijaga sampai menetas, lalu tukik dilepas ke laut.', 'Kebun Raya Bogor melestarikan berbagai jenis tumbuhan.', 'Di sekolah: menanam pohon, membuat taman bunga, dan menjaga kolam tetap bersih.']],
    diskusi: [
      T('Jika banyak katak di sawah mati karena racun, apa akibatnya bagi petani?', ['Katak memakan apa?'], 'Serangga hama seperti belalang dan wereng bertambah karena pemangsanya berkurang, sehingga tanaman padi rusak.'),
      T('Mengapa penyu sulit berkembang biak jika telurnya diambil manusia?', ['Apa yang terjadi pada telur yang diambil?'], 'Telur tidak menetas menjadi tukik, sehingga tidak ada penyu baru. Padahal di alam hanya sedikit tukik yang berhasil tumbuh dewasa.'),
      T('Rancanglah satu aksi kelasmu untuk melestarikan makhluk hidup di sekolah.', ['Aksi apa yang murah dan bisa dilakukan setiap hari?'], 'Jawaban bervariasi. Contoh: menanam bunga untuk kupu-kupu, menyediakan tempat minum burung, atau piket membersihkan kolam.')],
    rangkuman: ['Melestarikan berarti menjaga makhluk hidup agar tetap ada dan dapat berkembang biak.', 'Perburuan, rusaknya habitat, dan pencemaran mengancam makhluk hidup.', 'Taman nasional, penangkaran, dan kebun raya adalah upaya pelestarian.', 'Aksi kecil di sekolah ikut menjaga siklus hidup makhluk hidup.'],
    refleksi: ['Tindakan apa yang pernah kamu lakukan: melestarikan atau mengancam?', 'Aksi pelestarian apa yang akan kamu mulai minggu ini?'],
  }), soal: [
    ['pg', 'Tindakan yang melestarikan hewan adalah …', ['memburu burung di hutan', 'menangkap ikan dengan racun', 'membuat penangkaran hewan langka', 'membeli telur penyu'], 'C', 'Penangkaran membantu hewan langka berkembang biak dengan aman.', 'mudah'],
    ['pg', 'Komodo dilindungi di habitat aslinya di …', ['Kebun Raya Bogor', 'Taman Nasional Komodo', 'Taman Mini Indonesia Indah', 'Pantai Kuta'], 'B', 'Taman Nasional Komodo berada di Nusa Tenggara Timur.', 'mudah'],
    ['pg', 'Hewan dapat punah jika …', ['habitatnya dijaga', 'siklus hidupnya terus-menerus terputus', 'tempat hidupnya bersih', 'dibiakkan di penangkaran'], 'B', 'Jika hewan tidak dapat berkembang biak, jumlahnya terus berkurang.', 'sedang'],
    ['bs', 'Membakar hutan dapat menyebabkan banyak hewan kehilangan tempat hidupnya.', [], 'Benar', 'Hutan adalah habitat banyak hewan dan tumbuhan.', 'mudah'],
    ['isian', 'Tempat hewan dikembangbiakkan dengan bantuan manusia disebut …', [], 'penangkaran', 'Contohnya penangkaran penyu dan jalak bali.', 'sedang'],
    ['uraian', 'Mengapa mengambil telur penyu dapat mengancam kelestarian penyu?', [], 'Telur yang diambil tidak menetas, sehingga siklus hidup penyu terputus dan jumlah penyu berkurang. Jika terus terjadi, penyu bisa punah.', 'Pelestarian berarti menjaga agar siklus hidup tidak terputus.', 'sulit'],
  ] },

  { kelas: 4, judul: 'Sumber dan Bentuk Energi', komps: layar({
    pemantik: ['Dari mana tenagamu?', '<p>Pagi ini kamu berjalan kaki ke sekolah, lalu bermain bola saat istirahat.</p><h3>Dari mana tubuhmu mendapat tenaga untuk bergerak?</h3>'],
    tujuan: ['Menjelaskan sumber energi dan bentuk-bentuk energi.', 'Menyelidiki perubahan bentuk energi pada benda di sekitar.', 'Memberi contoh perubahan energi dalam kehidupan sehari-hari.'],
    amati: ['Ayo menyelidiki senter', '<p>Bekerja berkelompok. Siapkan senter dan baterainya. Jangan membuka atau merusak baterai.</p>',
      KEG('Apa yang terjadi jika baterai dilepas dari senter? Mengapa?',
        ['Nyalakan senter dan arahkan ke dinding. Amati.', 'Setelah 2 menit menyala, sentuh kaca lampunya dengan hati-hati. Rasakan.', 'Matikan senter, lepaskan baterai, lalu coba nyalakan lagi.', 'Pasang kembali baterainya.'],
        'Catat: Apa yang muncul saat senter menyala? Apa yang terjadi tanpa baterai?',
        [T('Energi apa yang dihasilkan senter?', ['Apa yang kamu lihat dan rasakan saat senter menyala?'], 'Energi cahaya. Kaca lampunya mungkin terasa sedikit hangat karena sebagian energi berubah menjadi panas.'),
          T('Apa sumber energi senter?', ['Apa yang membuat senter tidak menyala?'], 'Baterai. Di dalam baterai tersimpan energi kimia yang berubah menjadi energi listrik.')])],
    jelas1: ['Perubahan bentuk energi', `<p>Pilih alat pada media. Tebak dulu energi yang muncul, lalu tekan <b>Nyalakan</b>.</p>${L([`Energi tidak dapat hilang, tetapi dapat ${I('berubah bentuk')}.`, 'Contoh: setrika mengubah energi listrik menjadi energi panas.'])}`],
    jelas2: ['Sumber dan bentuk energi', L([`${I('Sumber energi')}: asal energi, misalnya matahari, makanan, bahan bakar (bensin, gas), air yang mengalir, angin, dan baterai.`, 'Matahari adalah sumber energi terbesar bagi Bumi.', `${I('Bentuk energi')}: cahaya, panas, listrik, gerak, bunyi, dan kimia.`, 'Energi kimia tersimpan dalam makanan, bahan bakar, dan baterai.'])],
    contoh: ['Energi di rumah', ['Kompor gas: energi kimia → panas untuk memasak.', 'Kipas angin: energi listrik → gerak.', 'Pengeras suara masjid: energi listrik → bunyi.', 'Menjemur pakaian: panas matahari mengeringkan pakaian.']],
    diskusi: [
      T('Mengapa tubuh terasa lemas jika belum sarapan?', ['Apa sumber energi tubuh?'], 'Tubuh belum mendapat energi kimia dari makanan, sehingga tenaga untuk bergerak dan berpikir berkurang.'),
      T('Saat kedua telapak tangan digosokkan, tangan terasa hangat. Perubahan energi apa yang terjadi?', ['Tangan bergerak, lalu terasa apa?'], 'Energi gerak berubah menjadi energi panas.'),
      T('Sebutkan perubahan energi pada lampu belajar!', ['Lampu memakai energi apa? Menghasilkan apa?'], 'Energi listrik berubah menjadi energi cahaya dan sedikit energi panas.')],
    rangkuman: ['Sumber energi adalah asal energi, misalnya matahari, makanan, dan bahan bakar.', 'Bentuk energi: cahaya, panas, listrik, gerak, bunyi, dan kimia.', 'Energi dapat berubah bentuk, misalnya listrik menjadi cahaya.', 'Matahari adalah sumber energi terbesar bagi Bumi.'],
    refleksi: ['Sebutkan tiga alat di rumahmu dan perubahan energinya.', 'Bagaimana caramu menghemat energi di rumah?'],
  }), soal: [
    ['pg', 'Sumber energi terbesar bagi Bumi adalah …', ['baterai', 'matahari', 'bensin', 'angin'], 'B', 'Matahari memberi cahaya dan panas bagi seluruh Bumi.', 'mudah'],
    ['pg', 'Kipas angin mengubah energi listrik menjadi energi …', ['cahaya', 'bunyi', 'gerak', 'kimia'], 'C', 'Baling-baling kipas bergerak berputar.', 'mudah'],
    ['pg', 'Energi kimia tersimpan di dalam …', ['cahaya lampu', 'makanan', 'bunyi radio', 'angin'], 'B', 'Makanan, bahan bakar, dan baterai menyimpan energi kimia.', 'sedang'],
    ['bs', 'Setrika listrik mengubah energi listrik menjadi energi panas.', [], 'Benar', 'Panas setrika dipakai untuk merapikan pakaian.', 'mudah'],
    ['isian', 'Radio mengubah energi listrik menjadi energi …', [], 'bunyi', 'Bunyi keluar dari pengeras suara radio.', 'mudah'],
    ['uraian', 'Jelaskan perubahan energi saat kamu bersepeda!', [], 'Energi kimia dari makanan di tubuh berubah menjadi energi gerak untuk mengayuh sepeda. Tubuh juga menghasilkan panas sehingga berkeringat.', 'Energi tidak hilang, tetapi berubah bentuk.', 'sulit'],
  ] },

  { kelas: 4, judul: 'Jenis Gaya dan Pengaruhnya', komps: layar({
    pemantik: ['Kelereng di lantai', '<p>Sebuah kelereng diam di lantai. Kamu menyentilnya, lalu kelereng menggelinding dan akhirnya berhenti sendiri.</p><h3>Mengapa kelereng bisa bergerak, lalu berhenti?</h3>'],
    tujuan: ['Membedakan jenis gaya: gaya otot, gaya gesek, gaya magnet, dan gaya gravitasi.', 'Menyelidiki pengaruh gaya terhadap arah, gerak, dan bentuk benda.', 'Memberi contoh gaya dalam kehidupan sehari-hari.'],
    amati: ['Percobaan gaya sederhana', '<p>Bekerja berkelompok. Siapkan bola plastik, plastisin, magnet, paku kecil, dan penghapus.</p>',
      KEG('Benda mana yang akan ditarik magnet: paku atau penghapus?',
        ['Dorong bola, lalu dorong dari samping saat bola masih bergerak. Amati arahnya.', 'Tekan plastisin dengan telapak tangan. Amati bentuknya.', 'Dekatkan magnet ke paku, lalu ke penghapus.', 'Gulirkan bola di lantai keramik, lalu di karpet atau tikar. Bandingkan jaraknya.'],
        'Buat tabel: Percobaan | Gaya yang bekerja | Apa yang berubah (arah, gerak, atau bentuk).',
        [T('Di permukaan mana bola menggelinding lebih jauh? Mengapa?', ['Permukaan mana yang lebih kasar?'], 'Di lantai keramik, karena permukaannya licin sehingga gaya geseknya kecil. Di karpet gaya geseknya besar sehingga bola cepat berhenti.'),
          T('Apa pengaruh gaya pada plastisin?', ['Bandingkan bentuk sebelum dan sesudah ditekan.'], 'Gaya tekan mengubah bentuk plastisin menjadi pipih.')])],
    jelas1: ['Lab gaya', `<p>Coba setiap tab pada media: dorong dan tarik, gaya gesek, gaya magnet, gravitasi, dan mengubah bentuk.</p>${L([`${I('Gaya')} adalah dorongan atau tarikan.`, 'Gaya dapat membuat benda bergerak atau berhenti, mengubah arah gerak, dan mengubah bentuk benda.'])}`],
    jelas2: ['Jenis-jenis gaya', L([`${I('Gaya otot')}: berasal dari tenaga otot, misalnya mengangkat ember.`, `${I('Gaya gesek')}: terjadi antara dua permukaan yang bersentuhan dan arahnya melawan gerak.`, `${I('Gaya magnet')}: tarikan magnet pada benda dari besi atau baja.`, `${I('Gaya gravitasi')}: tarikan Bumi yang membuat benda jatuh ke bawah.`])],
    contoh: ['Gaya di sekitar kita', ['Menendang bola mengubah arah geraknya (gaya otot).', 'Rem sepeda memperlambat putaran roda (gaya gesek).', 'Pintu kulkas menempel rapat karena ada magnet di karetnya.', 'Buah mangga jatuh dari pohon karena gaya gravitasi.']],
    diskusi: [
      T('Mengapa jalan yang licin karena hujan berbahaya bagi pengendara motor?', ['Gaya apa yang membantu ban mencengkeram jalan?'], 'Gaya gesek antara ban dan jalan menjadi kecil, sehingga motor mudah tergelincir dan sulit dihentikan.'),
      T('Bagaimana cara memisahkan paku kecil yang tercampur pasir?', ['Gaya apa yang hanya menarik benda dari besi?'], 'Dekatkan magnet ke campuran itu. Paku besi akan tertarik magnet, sedangkan pasir tidak.'),
      T('Sebutkan contoh gaya yang mengubah bentuk benda!', ['Ingat kegiatan di dapur atau saat membuang sampah.'], 'Contoh: menekan plastisin, menginjak kaleng bekas, menguleni adonan roti, dan meremas kertas.')],
    rangkuman: ['Gaya adalah dorongan atau tarikan.', 'Jenis gaya: gaya otot, gaya gesek, gaya magnet, dan gaya gravitasi.', 'Gaya dapat membuat benda bergerak, berhenti, berubah arah, dan berubah bentuk.', 'Gaya gesek bisa bermanfaat (rem) dan bisa merugikan (ban menjadi aus).'],
    refleksi: ['Gaya apa saja yang kamu pakai saat menyapu kelas?', 'Pernahkah kamu terpeleset? Gaya apa yang berperan?'],
  }), soal: [
    ['pg', 'Gaya yang membuat buah jatuh dari pohon adalah …', ['gaya magnet', 'gaya gesek', 'gaya gravitasi', 'gaya otot'], 'C', 'Gravitasi adalah tarikan Bumi.', 'mudah'],
    ['pg', 'Benda yang dapat ditarik magnet adalah …', ['penghapus', 'paku besi', 'pensil kayu', 'sendok plastik'], 'B', 'Magnet menarik benda dari besi atau baja.', 'mudah'],
    ['pg', 'Menendang bola yang sedang bergerak ke arah lain menunjukkan bahwa gaya dapat …', ['mengubah warna benda', 'mengubah arah gerak benda', 'membuat benda mencair', 'menghilangkan benda'], 'B', 'Gaya dapat mengubah arah gerak benda.', 'sedang'],
    ['bs', 'Gaya gesek pada karpet lebih kecil daripada gaya gesek pada lantai keramik yang licin.', [], 'Salah', 'Permukaan karpet lebih kasar sehingga gaya geseknya lebih besar.', 'sedang'],
    ['isian', 'Gaya yang berasal dari tenaga otot disebut gaya …', [], 'otot', 'Contohnya mendorong meja dan menarik tali.', 'mudah'],
    ['uraian', 'Mengapa sol sepatu olahraga dibuat bergerigi?', [], 'Sol bergerigi memperbesar gaya gesek dengan lantai atau tanah, sehingga kaki tidak mudah tergelincir.', 'Gaya gesek dapat dimanfaatkan untuk keselamatan.', 'sulit'],
  ] },

  { kelas: 4, judul: 'Pelestarian Alam untuk Mengurangi Perubahan Iklim', komps: layar({
    pemantik: ['Bumi makin panas', '<p>Kakek bercerita, dulu udara di kampung terasa sejuk. Sekarang siang hari terasa sangat panas dan banjir lebih sering datang.</p><h3>Apa penyebab perubahan ini? Apa yang bisa kita lakukan?</h3>'],
    tujuan: ['Menjelaskan hubungan pelestarian sumber daya alam dengan perubahan iklim.', 'Mengidentifikasi masalah sumber daya alam di sekitar sekolah.', 'Menghasilkan solusi sederhana dan melaksanakannya.'],
    amati: ['Patroli hemat air dan listrik', '<p>Bekerja berkelompok. Bawa lembar catatan. Mintalah izin guru sebelum memeriksa ruangan.</p>',
      KEG('Menurutmu, adakah air atau listrik yang terbuang sia-sia di sekolah?',
        ['Periksa keran di kamar mandi dan tempat wudu: adakah yang menetes?', 'Periksa lampu dan kipas di ruangan kosong: menyala atau mati?', 'Periksa tempat sampah: sudah dipilah atau belum?', 'Laporkan temuanmu kepada guru.'],
        'Buat tabel: Tempat | Masalah yang ditemukan | Usul solusi.',
        [T('Masalah apa yang paling sering ditemukan?', ['Lihat tabelmu.'], 'Jawaban bervariasi, misalnya keran menetes, lampu menyala di ruang kosong, atau sampah tercampur.'),
          T('Solusi apa yang bisa langsung dilakukan kelasmu?', ['Pilih solusi yang murah dan mudah.'], 'Contoh: membuat stiker pengingat "Matikan lampu", piket memeriksa keran, dan menyediakan tempat sampah terpilah.')])],
    jelas1: ['Aksi di Kota Hijau', `<p>Pilih aksi-aksi pada media dan amati perubahan udara, air, dan suhu Bumi.</p>${L(['Aksi kecil yang dilakukan banyak orang memberi dampak yang besar.', `Upaya mengurangi penyebab perubahan iklim disebut ${I('mitigasi perubahan iklim')}.`])}`],
    jelas2: ['Apa itu perubahan iklim?', L([`Membakar bensin, batu bara, dan sampah menghasilkan gas ${I('karbon dioksida')}.`, `Gas itu menumpuk di udara dan menahan panas, sehingga Bumi makin panas. Inilah ${I('pemanasan global')}.`, 'Pemanasan global mengubah iklim: kemarau lebih panjang, hujan lebih deras, dan cuaca sulit diduga.', 'Pohon menyerap karbon dioksida, sehingga menebang hutan memperparah perubahan iklim.'])],
    contoh: ['Sumber daya alam yang perlu dijaga', ['Air bersih: tutup keran dan pakai air secukupnya.', 'Hutan dan pohon: tanam pohon, jangan membakar hutan.', 'Tanah: buat lubang biopori agar air hujan meresap.', 'Energi listrik: matikan alat yang tidak dipakai.']],
    diskusi: [
      T('Mengapa menanam pohon dapat mengurangi pemanasan global?', ['Gas apa yang diserap pohon?'], 'Pohon menyerap karbon dioksida dari udara untuk membuat makanan, sehingga gas penahan panas di udara berkurang.'),
      T('Mengapa membakar sampah plastik tidak dianjurkan?', ['Apa yang dihasilkan saat sampah dibakar?'], 'Pembakaran sampah menghasilkan asap beracun dan karbon dioksida yang mencemari udara dan menambah pemanasan global.'),
      T('Susunlah rencana aksi kelas untuk menghemat air selama satu minggu.', ['Siapa melakukan apa, kapan, dan bagaimana mencatat hasilnya?'], 'Jawaban bervariasi. Contoh: memasang stiker pengingat di keran, piket memeriksa keran setiap pulang sekolah, dan berkumur memakai gelas.')],
    rangkuman: ['Sumber daya alam seperti air, hutan, tanah, dan energi harus dijaga.', 'Membakar bahan bakar dan sampah menambah karbon dioksida yang membuat Bumi makin panas.', 'Menanam pohon, menghemat air dan listrik, serta memilah sampah membantu mengurangi perubahan iklim.', 'Aksi kecil yang dilakukan bersama memberi dampak besar.'],
    refleksi: ['Kebiasaan apa di rumahmu yang boros air atau listrik?', 'Solusi apa yang akan kamu lakukan mulai hari ini?'],
  }), soal: [
    ['pg', 'Gas yang menumpuk di udara dan membuat Bumi makin panas terutama adalah …', ['oksigen', 'karbon dioksida', 'nitrogen', 'helium'], 'B', 'Karbon dioksida dihasilkan dari pembakaran bahan bakar dan sampah.', 'sedang'],
    ['pg', 'Kegiatan yang membantu mengurangi perubahan iklim adalah …', ['membakar sampah', 'menebang hutan', 'menanam pohon', 'membiarkan lampu menyala'], 'C', 'Pohon menyerap karbon dioksida.', 'mudah'],
    ['pg', 'Lubang biopori bermanfaat untuk …', ['tempat membakar sampah', 'membantu air hujan meresap ke tanah', 'menyimpan bensin', 'memelihara ikan'], 'B', 'Air yang meresap menambah air tanah dan mengurangi banjir.', 'sedang'],
    ['bs', 'Menutup keran saat menggosok gigi adalah cara menghemat air.', [], 'Benar', 'Air bersih adalah sumber daya alam yang terbatas.', 'mudah'],
    ['isian', 'Naiknya suhu Bumi secara keseluruhan disebut pemanasan …', [], 'global', 'Pemanasan global menyebabkan perubahan iklim.', 'mudah'],
    ['uraian', 'Mengapa bersepeda ke sekolah lebih ramah lingkungan daripada naik motor?', [], 'Sepeda tidak membakar bensin sehingga tidak menghasilkan asap dan karbon dioksida. Udara lebih bersih dan pemanasan global berkurang.', 'Mengurangi pemakaian bahan bakar adalah bentuk mitigasi perubahan iklim.', 'sulit'],
  ] },

  // =============================== KELAS 5 · FASE C ===============================
  { kelas: 5, judul: 'Sistem Pernapasan', komps: layar({
    pemantik: ['Berapa lama kamu bisa menahan napas?', '<p>Tarik napas, lalu tahan selama kamu bisa. Jangan dipaksakan!</p><h3>Mengapa kita tidak bisa menahan napas terlalu lama?</h3>'],
    tujuan: ['Menjelaskan organ pernapasan manusia dan fungsinya.', 'Menjelaskan proses menarik dan menghembuskan napas.', 'Merefleksikan kebiasaan untuk menjaga kesehatan pernapasan.'],
    amati: ['Mengukur napas dan lingkar dada', '<p>Bekerja berpasangan. Siapkan pita meteran kain dan jam.</p>',
      KEG('Apakah lingkar dada berubah saat menarik napas? Apakah jumlah napas bertambah setelah berlari?',
        ['Lilitkan pita meteran di dada teman. Ukur saat ia menarik napas dan saat menghembuskan napas.', 'Hitung jumlah napas teman selama 1 menit saat duduk diam.', 'Teman berlari di tempat selama 1 menit.', 'Hitung lagi jumlah napasnya selama 1 menit.'],
        'Buat tabel: Lingkar dada (menarik/menghembuskan) | Jumlah napas per menit (diam/setelah berlari).',
        [T('Kapan lingkar dada lebih besar? Mengapa?', ['Saat menarik napas, udara masuk ke mana?'], 'Saat menarik napas. Tulang rusuk terangkat dan paru-paru mengembang terisi udara, sehingga rongga dada membesar.'),
          T('Mengapa jumlah napas bertambah setelah berlari?', ['Otot yang bekerja membutuhkan apa?'], 'Otot membutuhkan lebih banyak oksigen dan menghasilkan lebih banyak karbon dioksida, sehingga kita bernapas lebih cepat.')])],
    jelas1: ['Proses bernapas', `<p>Tekan <b>Tarik napas</b> dan <b>Hembuskan</b> pada media. Amati paru-paru dan diafragma, lalu ketuk organ untuk melihat fungsinya.</p>${L([`${I('Inspirasi', 'menarik napas')}: diafragma turun, rongga dada membesar, udara masuk.`, `${I('Ekspirasi', 'menghembuskan napas')}: diafragma naik, rongga dada mengecil, udara keluar.`])}`],
    jelas2: ['Organ pernapasan', L(['Hidung: menyaring, menghangatkan, dan melembapkan udara.', `${I('Tenggorokan', 'trakea')} dan ${I('cabang tenggorokan', 'bronkus')}: saluran udara menuju paru-paru.`, `Paru-paru: di dalam ${I('gelembung paru', 'alveolus')}, oksigen masuk ke darah dan karbon dioksida keluar dari darah.`, 'Darah mengangkut oksigen ke seluruh tubuh untuk menghasilkan energi.'])],
    contoh: ['Pernapasan dalam kehidupan sehari-hari', ['Bernapas lewat hidung lebih baik daripada lewat mulut karena udaranya tersaring.', 'Saat udara berdebu atau berasap, masker membantu melindungi saluran pernapasan.', 'Asap rokok merusak paru-paru, juga paru-paru orang di sekitar perokok.', 'Olahraga teratur membuat paru-paru lebih kuat.']],
    diskusi: [
      T('Mengapa kita bersin saat menghirup debu?', ['Ke mana debu akan pergi jika tidak dikeluarkan?'], 'Bersin adalah cara tubuh mengeluarkan debu dan kotoran dari hidung agar tidak masuk ke paru-paru.'),
      T('Mengapa asap kebakaran hutan berbahaya bagi warga di sekitarnya?', ['Apa yang terhirup bersama asap?'], 'Asap mengandung debu halus dan gas berbahaya yang masuk ke paru-paru, sehingga menyebabkan batuk, sesak napas, dan infeksi saluran pernapasan (ISPA).'),
      T('Sebutkan dua kebiasaanmu yang menjaga kesehatan pernapasan dan satu kebiasaan yang perlu diubah.', ['Ingat olahraga, masker, dan asap.'], 'Jawaban bervariasi. Contoh baik: berolahraga, memakai masker saat berdebu, menjauhi asap rokok. Contoh yang perlu diubah: bermain di tempat berasap tanpa masker.')],
    rangkuman: ['Organ pernapasan: hidung, tenggorokan, cabang tenggorokan, dan paru-paru.', 'Saat menarik napas diafragma turun dan udara masuk; saat menghembuskan napas diafragma naik dan udara keluar.', 'Di paru-paru, oksigen masuk ke darah dan karbon dioksida dikeluarkan.', 'Olahraga, udara bersih, dan menjauhi asap rokok menjaga kesehatan pernapasan.'],
    refleksi: ['Berapa kali kamu bernapas dalam satu menit saat diam dan setelah berlari?', 'Kebiasaan apa yang akan kamu ubah untuk menjaga paru-parumu?'],
  }), soal: [
    ['pg', 'Pertukaran oksigen dan karbon dioksida terjadi di …', ['hidung', 'tenggorokan', 'gelembung paru-paru (alveolus)', 'diafragma'], 'C', 'Alveolus dikelilingi pembuluh darah halus.', 'sedang'],
    ['pg', 'Saat menarik napas, diafragma …', ['naik dan rongga dada mengecil', 'turun dan rongga dada membesar', 'diam saja', 'naik dan rongga dada membesar'], 'B', 'Rongga dada yang membesar membuat udara masuk.', 'sedang'],
    ['pg', 'Fungsi rambut hidung adalah …', ['mencium bau', 'menyaring debu dari udara', 'menghangatkan makanan', 'mengeluarkan karbon dioksida'], 'B', 'Rambut dan lendir hidung menangkap debu.', 'mudah'],
    ['bs', 'Udara yang kita hembuskan mengandung lebih banyak karbon dioksida daripada udara yang kita hirup.', [], 'Benar', 'Karbon dioksida adalah sisa yang dikeluarkan tubuh.', 'sedang'],
    ['isian', 'Otot sekat antara rongga dada dan rongga perut disebut …', [], 'diafragma', 'Diafragma berperan saat menarik dan menghembuskan napas.', 'mudah'],
    ['uraian', 'Mengapa kita harus menjauhi asap rokok?', [], 'Asap rokok mengandung zat berbahaya yang merusak saluran pernapasan dan paru-paru, menyebabkan batuk dan penyakit paru-paru, juga bagi orang yang menghirup asapnya.', 'Perokok pasif juga terkena bahaya asap rokok.', 'sulit'],
  ] },

  { kelas: 5, judul: 'Sistem Pencernaan', komps: layar({
    pemantik: ['Ke mana nasi yang kita makan?', '<p>Siang tadi kamu makan sepiring nasi, sayur, dan tempe.</p><h3>Ke mana perginya makanan itu? Bagaimana makanan bisa memberi kita tenaga?</h3>'],
    tujuan: ['Menjelaskan urutan organ pencernaan dan fungsinya.', 'Membedakan pencernaan mekanik dan pencernaan kimiawi.', 'Merefleksikan pola makan sendiri untuk menjaga kesehatan pencernaan.'],
    amati: ['Percobaan mengunyah nasi', '<p>Lakukan sendiri dengan nasi putih yang bersih. Cuci tangan dulu.</p>',
      KEG('Jika nasi dikunyah lama, apakah rasanya akan berubah?',
        ['Ambil satu sendok kecil nasi putih tanpa lauk.', 'Kunyah perlahan sekitar 2 menit tanpa ditelan.', 'Perhatikan perubahan rasanya.', 'Telan atau buang ke tisu sesuai petunjuk guru.'],
        'Catat rasa nasi pada awal dan setelah 2 menit dikunyah.',
        [T('Bagaimana rasa nasi setelah lama dikunyah?', ['Apakah terasa sedikit manis?'], 'Terasa agak manis, karena air liur mengubah zat tepung (karbohidrat) pada nasi menjadi gula.'),
          T('Pencernaan apa saja yang terjadi di mulut?', ['Apa yang dilakukan gigi? Apa yang dilakukan air liur?'], 'Pencernaan mekanik oleh gigi yang mengunyah, dan pencernaan kimiawi oleh air liur yang mengubah zat tepung menjadi gula.')])],
    jelas1: ['Perjalanan makanan', `<p>Tekan <b>Telan makanan</b> pada media dan ikuti perjalanannya.</p>${L(['Urutan: mulut → kerongkongan → lambung → usus halus → usus besar → anus.', 'Hati dan pankreas membantu pencernaan di usus halus.'])}`],
    jelas2: ['Pencernaan mekanik dan kimiawi', L([`${I('Pencernaan mekanik')}: makanan dihancurkan secara fisik, misalnya dikunyah gigi dan diaduk lambung.`, `${I('Pencernaan kimiawi')}: makanan diuraikan oleh ${I('enzim', 'zat pencerna')}, misalnya di air liur dan getah lambung.`, 'Sari makanan diserap usus halus ke dalam darah.', 'Usus besar menyerap air dari sisa makanan.'])],
    contoh: ['Pencernaan dalam keseharian', ['Perut keroncongan menandakan tubuh membutuhkan makanan.', 'Sering terlambat makan dapat memicu sakit maag.', 'Kurang makan sayur dan kurang minum dapat menyebabkan sembelit.', 'Makanan yang tidak bersih dapat menyebabkan diare.']],
    diskusi: [
      T('Mengapa kita dianjurkan mengunyah makanan sampai halus?', ['Makanan yang halus lebih mudah diapakan?'], 'Makanan yang halus lebih mudah dicerna di lambung dan usus, sehingga sari makanan lebih mudah diserap.'),
      T('Rudi jarang makan sayur dan sulit buang air besar. Apa saranmu?', ['Makanan apa yang berserat?'], 'Makan sayur dan buah yang berserat, minum air putih yang cukup, dan rutin bergerak atau berolahraga.'),
      T('Mengapa usus halus sangat panjang?', ['Apa tugas utama usus halus?'], 'Agar permukaan untuk menyerap sari makanan sangat luas, sehingga sari makanan terserap dengan baik.')],
    rangkuman: ['Urutan organ pencernaan: mulut, kerongkongan, lambung, usus halus, usus besar, dan anus.', 'Pencernaan mekanik menghancurkan makanan; pencernaan kimiawi menguraikannya dengan enzim.', 'Usus halus menyerap sari makanan; usus besar menyerap air.', 'Makan teratur, makan makanan berserat, dan cukup minum menjaga kesehatan pencernaan.'],
    refleksi: ['Bagaimana pola makanmu kemarin: teratur atau tidak? Cukup sayur dan buah?', 'Kebiasaan makan apa yang akan kamu perbaiki?'],
  }), soal: [
    ['pg', 'Urutan organ pencernaan yang benar adalah …', ['mulut – lambung – kerongkongan – usus halus', 'mulut – kerongkongan – lambung – usus halus', 'mulut – usus halus – lambung – usus besar', 'kerongkongan – mulut – lambung – usus besar'], 'B', 'Makanan masuk dari mulut, melalui kerongkongan, lalu lambung dan usus halus.', 'mudah'],
    ['pg', 'Penyerapan sari makanan terjadi di …', ['lambung', 'usus halus', 'usus besar', 'kerongkongan'], 'B', 'Sari makanan diserap ke dalam darah melalui dinding usus halus.', 'sedang'],
    ['pg', 'Contoh pencernaan mekanik adalah …', ['air liur mengubah zat tepung menjadi gula', 'gigi mengunyah makanan', 'enzim lambung mencerna protein', 'usus menyerap sari makanan'], 'B', 'Pencernaan mekanik menghancurkan makanan secara fisik.', 'sedang'],
    ['bs', 'Usus besar berfungsi menyerap air dari sisa makanan.', [], 'Benar', 'Sisa makanan yang airnya sudah diserap menjadi feses.', 'mudah'],
    ['isian', 'Gerakan meremas kerongkongan yang mendorong makanan ke lambung disebut gerak …', [], 'peristaltik', 'Gerak peristaltik juga terjadi di usus.', 'sedang'],
    ['uraian', 'Mengapa makan tidak teratur dapat menyebabkan sakit maag?', [], 'Lambung tetap menghasilkan asam lambung walaupun sedang kosong. Jika sering terlambat makan, asam lambung dapat melukai dinding lambung sehingga perut terasa perih.', 'Makan teratur membantu menjaga kesehatan lambung.', 'sulit'],
  ] },

  { kelas: 5, judul: 'Komponen Biotik dan Abiotik', komps: layar({
    pemantik: ['Ikan di akuarium', '<p>Rina memelihara ikan di akuarium. Suatu hari airnya keruh dan lampunya mati selama beberapa hari.</p><h3>Apa yang akan terjadi pada ikan dan tanaman air di akuarium itu?</h3>'],
    tujuan: ['Membedakan komponen biotik dan abiotik.', 'Menganalisis hubungan antara komponen biotik dan abiotik.', 'Memperkirakan akibat perubahan suatu komponen terhadap ekosistem.'],
    amati: ['Percobaan kecambah kacang hijau', '<p>Bekerja berkelompok. Siapkan 3 gelas plastik, kapas, dan biji kacang hijau. Percobaan berlangsung 5–7 hari.</p>',
      KEG('Kecambah di gelas mana yang akan tumbuh paling baik?',
        ['Gelas A: kapas basah, diletakkan di tempat terang.', 'Gelas B: kapas basah, disimpan di dalam lemari yang gelap.', 'Gelas C: kapas kering, diletakkan di tempat terang.', 'Amati dan ukur tinggi kecambah setiap hari.'],
        'Buat tabel: Hari ke- | Tinggi dan warna kecambah di gelas A | B | C.',
        [T('Bagaimana keadaan kecambah di gelas B (tempat gelap)?', ['Bandingkan warna dan tinggi dengan gelas A.'], 'Kecambah di tempat gelap tumbuh lebih tinggi, tetapi kurus, lemah, dan pucat kekuningan karena kekurangan cahaya.'),
          T('Mengapa biji di gelas C tidak tumbuh?', ['Apa yang tidak ada di gelas C?'], 'Karena tidak ada air. Biji membutuhkan air untuk berkecambah.')])],
    jelas1: ['Biotik dan abiotik', `<p>Mainkan tab <b>Pilah komponen</b>, lalu coba tab <b>Percobaan tanaman</b> pada media.</p>${L([`${I('Komponen biotik')}: semua makhluk hidup, misalnya tumbuhan, hewan, jamur, dan bakteri.`, `${I('Komponen abiotik')}: benda tak hidup, misalnya air, tanah, udara, cahaya, suhu, dan batu.`])}`],
    jelas2: ['Saling memengaruhi', L([`${I('Ekosistem')} adalah hubungan timbal balik antara makhluk hidup dan lingkungannya.`, 'Abiotik memengaruhi biotik: tumbuhan membutuhkan air, cahaya, dan tanah untuk tumbuh.', 'Biotik memengaruhi abiotik: cacing menggemburkan tanah, pepohonan membuat udara sejuk.', 'Jika satu komponen berubah, komponen lain ikut terpengaruh.'])],
    contoh: ['Ekosistem di sekitar kita', ['Sawah: padi, katak, dan ular (biotik); air, tanah, dan cahaya matahari (abiotik).', 'Kolam: ikan dan ganggang (biotik); air, batu, dan suhu (abiotik).', 'Hutan kota: pohon dan burung (biotik); tanah dan udara (abiotik).', 'Saat kemarau panjang, sawah kering sehingga padi tidak tumbuh dan katak berkurang.']],
    diskusi: [
      T('Mengapa ikan di akuarium bisa mati jika airnya tidak pernah diganti?', ['Air termasuk komponen apa?'], 'Air menjadi kotor dan kekurangan oksigen. Komponen abiotik (air) yang buruk memengaruhi komponen biotik (ikan).'),
      T('Bagaimana cacing tanah membantu tumbuhan?', ['Apa yang dilakukan cacing di dalam tanah?'], 'Cacing menggemburkan tanah sehingga udara dan air mudah masuk, dan kotorannya menyuburkan tanah.'),
      T('Apa akibatnya jika pohon-pohon di bukit ditebang habis?', ['Apa fungsi akar pohon?', 'Ke mana hewan-hewan di bukit akan pergi?'], 'Tanah tidak lagi ditahan akar sehingga mudah longsor, air hujan tidak meresap sehingga terjadi banjir, dan hewan kehilangan tempat tinggal.')],
    rangkuman: ['Ekosistem terdiri atas komponen biotik (makhluk hidup) dan abiotik (benda tak hidup).', 'Abiotik memengaruhi biotik, misalnya tumbuhan membutuhkan cahaya dan air.', 'Biotik juga memengaruhi abiotik, misalnya cacing menggemburkan tanah.', 'Perubahan satu komponen memengaruhi seluruh ekosistem.'],
    refleksi: ['Sebutkan komponen biotik dan abiotik di halaman rumahmu.', 'Apa yang dapat kamu lakukan agar ekosistem di sekitar sekolah tetap seimbang?'],
  }), soal: [
    ['pg', 'Berikut ini yang termasuk komponen abiotik adalah …', ['cacing', 'jamur', 'cahaya matahari', 'rumput'], 'C', 'Cahaya matahari bukan makhluk hidup.', 'mudah'],
    ['pg', 'Berikut ini yang termasuk komponen biotik adalah …', ['batu', 'udara', 'bakteri', 'air'], 'C', 'Bakteri adalah makhluk hidup yang sangat kecil.', 'mudah'],
    ['pg', 'Contoh komponen biotik yang memengaruhi komponen abiotik adalah …', ['tumbuhan membutuhkan cahaya', 'cacing menggemburkan tanah', 'ikan membutuhkan air', 'padi membutuhkan air'], 'B', 'Cacing (biotik) mengubah keadaan tanah (abiotik).', 'sedang'],
    ['bs', 'Tanaman yang disimpan di tempat gelap akan tumbuh pucat.', [], 'Benar', 'Tanpa cahaya, tumbuhan tidak dapat membentuk zat hijau daun dengan baik.', 'sedang'],
    ['isian', 'Hubungan timbal balik antara makhluk hidup dan lingkungannya disebut …', [], 'ekosistem', 'Contoh ekosistem: sawah, kolam, dan hutan.', 'mudah'],
    ['uraian', 'Jelaskan hubungan antara air sungai yang tercemar dan ikan di sungai itu!', [], 'Air yang tercemar (abiotik) mengandung zat berbahaya dan sedikit oksigen, sehingga ikan (biotik) sakit, tidak dapat berkembang biak, atau mati.', 'Komponen abiotik dan biotik saling memengaruhi.', 'sulit'],
  ] },

  { kelas: 5, judul: 'Gelombang Bunyi', komps: layar({
    pemantik: ['Telepon kaleng', '<p>Dua anak bercakap-cakap memakai dua kaleng bekas yang dihubungkan dengan benang.</p><h3>Bagaimana suara bisa sampai lewat benang?</h3>'],
    tujuan: ['Menjelaskan bahwa bunyi berasal dari benda yang bergetar.', 'Menyelidiki perambatan bunyi melalui benda padat, cair, dan gas.', 'Menjelaskan fenomena bunyi dalam kehidupan sehari-hari.'],
    amati: ['Membuat telepon kaleng', '<p>Bekerja berpasangan. Siapkan 2 gelas plastik atau kaleng bekas, benang kasur ± 5 meter, dan paku untuk melubangi (dibantu guru).</p>',
      KEG('Apakah suara tetap terdengar jika benangnya kendur?',
        ['Lubangi dasar kedua gelas, masukkan ujung benang, lalu ikat.', 'Rentangkan benang sampai tegang.', 'Satu anak berbicara pelan ke dalam gelas, anak lain mendengarkan di gelas lainnya.', 'Ulangi dengan benang kendur, lalu dengan benang yang dipegang jari di tengahnya.'],
        'Buat tabel: Keadaan benang | Suara terdengar jelas, pelan, atau tidak terdengar.',
        [T('Kapan suara terdengar paling jelas?', ['Bandingkan benang tegang dan benang kendur.'], 'Saat benang tegang, karena getaran suara merambat dengan baik melalui benang (benda padat).'),
          T('Mengapa suara hilang saat benang dipegang di tengah?', ['Apa yang terjadi pada getaran benang?'], 'Jari menghentikan getaran benang, sehingga bunyi tidak dapat merambat ke gelas lainnya.')])],
    jelas1: ['Bunyi berasal dari getaran', `<p>Petik senar pada media. Ubah tinggi nada dan kekuatan petikan, lalu coba lomba perambatan bunyi.</p>${L(['Bunyi dihasilkan oleh benda yang bergetar, misalnya senar gitar dan kulit bedug.', `Getaran cepat (${I('frekuensi')} tinggi) → nada tinggi. Getaran kuat (simpangan besar) → bunyi keras.`])}`],
    jelas2: ['Bunyi merambat', L([`Bunyi merambat sebagai ${I('gelombang')} melalui ${I('perantara', 'medium')}: benda padat, cair, dan gas.`, 'Bunyi merambat paling cepat di benda padat, lalu cair, lalu gas.', 'Bunyi tidak dapat merambat di ruang hampa, misalnya di luar angkasa.', 'Telinga menangkap getaran bunyi, lalu gendang telinga ikut bergetar.'])],
    contoh: ['Bunyi di sekitar kita', ['Suara azan dari pengeras suara masjid merambat melalui udara.', 'Penyelam masih dapat mendengar suara di dalam air.', 'Ketukan di meja terdengar lebih jelas jika telinga ditempelkan ke meja.', 'Bunyi dapat dipantulkan: gema terdengar saat kita berteriak di dekat tebing.']],
    diskusi: [
      T('Mengapa kilat terlihat lebih dulu daripada suara guntur terdengar?', ['Mana yang lebih cepat: cahaya atau bunyi?'], 'Cahaya merambat jauh lebih cepat daripada bunyi, sehingga kilat terlihat lebih dulu, baru kemudian guntur terdengar.'),
      T('Mengapa astronaut di luar angkasa berbicara melalui radio?', ['Adakah udara di luar angkasa?'], 'Di luar angkasa tidak ada udara (ruang hampa), sehingga bunyi tidak dapat merambat. Radio mengirim pesan dengan gelombang radio.'),
      T('Bagaimana cara membuat nada gitar lebih tinggi?', ['Ingat simulasi senar: apa yang membuat getaran lebih cepat?'], 'Mengencangkan senar, memetik senar yang lebih kecil, atau memperpendek bagian senar yang bergetar dengan menekannya di leher gitar.')],
    rangkuman: ['Bunyi berasal dari benda yang bergetar.', 'Getaran cepat menghasilkan nada tinggi; getaran kuat menghasilkan bunyi keras.', 'Bunyi merambat melalui benda padat, cair, dan gas, paling cepat di benda padat.', 'Bunyi tidak dapat merambat di ruang hampa.'],
    refleksi: ['Benda apa di rumahmu yang menghasilkan bunyi? Bagian apa yang bergetar?', 'Bagaimana cara menjaga telinga dari bunyi yang terlalu keras?'],
  }), soal: [
    ['pg', 'Bunyi dihasilkan oleh benda yang …', ['diam', 'bergetar', 'berwarna', 'dingin'], 'B', 'Tanpa getaran tidak ada bunyi.', 'mudah'],
    ['pg', 'Bunyi merambat paling cepat melalui …', ['udara', 'air', 'besi', 'ruang hampa'], 'C', 'Bunyi merambat paling cepat di benda padat.', 'sedang'],
    ['pg', 'Senar gitar yang dikencangkan akan menghasilkan nada yang …', ['lebih rendah', 'lebih tinggi', 'sama saja', 'tidak berbunyi'], 'B', 'Senar yang kencang bergetar lebih cepat.', 'sedang'],
    ['bs', 'Bunyi dapat merambat di ruang hampa.', [], 'Salah', 'Bunyi membutuhkan perantara untuk merambat.', 'mudah'],
    ['isian', 'Bunyi pantul yang terdengar setelah bunyi asli selesai disebut …', [], 'gema', 'Gema terjadi jika dinding pemantul letaknya jauh, misalnya tebing.', 'sedang'],
    ['uraian', 'Mengapa kilat terlihat lebih dahulu sebelum guntur terdengar? Jelaskan!', [], 'Kilat dan guntur terjadi bersamaan, tetapi cahaya merambat jauh lebih cepat daripada bunyi. Karena itu cahaya kilat sampai lebih dulu ke mata, baru kemudian bunyi guntur sampai ke telinga.', 'Kecepatan bunyi di udara sekitar 340 meter per detik, jauh lebih lambat daripada cahaya.', 'sulit'],
  ] },

  { kelas: 5, judul: 'Sifat-sifat Cahaya', komps: layar({
    pemantik: ['Pensil yang patah', '<p>Masukkan pensil ke dalam gelas bening berisi air. Lihat dari samping.</p><h3>Pensil tampak patah! Benarkah pensilnya patah?</h3>'],
    tujuan: ['Menjelaskan sifat-sifat cahaya.', 'Menyelidiki sifat cahaya melalui percobaan sederhana.', 'Memberi contoh sifat cahaya dalam kehidupan sehari-hari.'],
    amati: ['Percobaan sifat cahaya', '<p>Bekerja berkelompok. Siapkan senter, 3 karton berlubang, cermin datar, gelas bening berisi air, pensil, kertas minyak, dan kardus.</p>',
      KEG('Jika lubang ketiga karton tidak segaris, apakah cahaya senter sampai ke dinding?',
        ['Susun 3 karton berlubang sejajar. Sorotkan senter ke lubang pertama, lalu geser karton tengah.', 'Arahkan cahaya senter ke cermin. Amati ke mana cahaya dipantulkan.', 'Masukkan pensil ke gelas berisi air. Lihat dari samping.', 'Sorotkan senter ke kaca, kertas minyak, lalu kardus. Amati cahaya di baliknya.'],
        'Buat tabel: Percobaan | Yang diamati | Sifat cahaya.',
        [T('Apa yang terjadi saat karton tengah digeser?', ['Apakah lubangnya masih segaris?'], 'Cahaya tidak sampai ke dinding karena terhalang karton. Ini membuktikan cahaya merambat lurus.'),
          T('Benda mana yang paling banyak ditembus cahaya?', ['Bandingkan kaca, kertas minyak, dan kardus.'], 'Kaca bening. Kertas minyak ditembus sebagian, sedangkan kardus tidak ditembus sehingga terbentuk bayangan.')])],
    jelas1: ['Laboratorium cahaya', `<p>Coba keempat percobaan pada media.</p>${L(['Cahaya merambat lurus.', 'Cahaya dapat dipantulkan, dibiaskan, dan dapat menembus benda bening.'])}`],
    jelas2: ['Sifat-sifat cahaya', L(['Merambat lurus: berkas cahaya senter dan cahaya matahari di sela-sela daun tampak lurus.', `Dapat dipantulkan: cermin ${I('memantulkan')} cahaya sehingga kita dapat bercermin.`, `Dapat ${I('dibiaskan', 'dibelokkan')} saat melewati dua benda bening yang berbeda, misalnya dari udara ke air.`, 'Dapat menembus benda bening. Benda gelap menghalangi cahaya sehingga terbentuk bayangan.'])],
    contoh: ['Cahaya di sekitar kita', ['Spion kendaraan memakai cermin yang memantulkan cahaya.', 'Kacamata dan kaca pembesar (lup) memanfaatkan pembiasan cahaya.', 'Dasar kolam tampak lebih dangkal daripada sebenarnya karena pembiasan.', 'Pelangi terbentuk karena cahaya matahari diuraikan oleh titik-titik air hujan.']],
    diskusi: [
      T('Mengapa kita harus berhati-hati saat berenang di kolam yang tampak dangkal?', ['Ingat pensil yang tampak patah.'], 'Karena pembiasan cahaya, dasar kolam tampak lebih dangkal daripada sebenarnya. Kolam bisa lebih dalam daripada yang terlihat.'),
      T('Mengapa bayangan terbentuk di belakang tubuh kita saat berdiri di bawah lampu?', ['Apakah tubuh kita dapat ditembus cahaya?'], 'Tubuh kita tidak tembus cahaya sehingga menghalangi cahaya yang merambat lurus. Daerah di belakang tubuh tidak terkena cahaya sehingga gelap.'),
      T('Sebutkan alat yang memanfaatkan pemantulan cahaya!', ['Alat apa yang memakai cermin?'], 'Contoh: cermin rias, spion kendaraan, periskop, dan cermin cekung di belakang lampu senter.')],
    rangkuman: ['Cahaya merambat lurus.', 'Cahaya dapat dipantulkan, misalnya oleh cermin.', 'Cahaya dapat dibiaskan saat melewati benda bening yang berbeda, misalnya dari udara ke air.', 'Cahaya dapat menembus benda bening dan dapat diuraikan menjadi warna-warni pelangi.'],
    refleksi: ['Sifat cahaya apa yang paling sering kamu temui di rumah?', 'Coba jelaskan peristiwa pensil yang tampak patah kepada keluargamu.'],
  }), soal: [
    ['pg', 'Pensil yang dimasukkan ke gelas berisi air tampak patah karena cahaya …', ['merambat lurus', 'dipantulkan', 'dibiaskan', 'diserap'], 'C', 'Cahaya dibelokkan saat berpindah dari air ke udara.', 'sedang'],
    ['pg', 'Benda yang dapat ditembus cahaya seluruhnya adalah …', ['kardus', 'kaca bening', 'kayu', 'tembok'], 'B', 'Kaca bening adalah benda tembus cahaya.', 'mudah'],
    ['pg', 'Kita dapat bercermin karena cahaya …', ['dibiaskan', 'dipantulkan', 'menembus benda bening', 'diuraikan'], 'B', 'Cermin memantulkan cahaya dari tubuh kita kembali ke mata.', 'mudah'],
    ['bs', 'Cahaya merambat lurus.', [], 'Benar', 'Buktinya, cahaya senter hanya sampai jika lubang-lubang karton segaris.', 'mudah'],
    ['isian', 'Pelangi terbentuk karena cahaya matahari … oleh titik-titik air hujan.', [], 'diuraikan', 'Cahaya putih matahari terdiri atas berbagai warna.', 'sedang'],
    ['uraian', 'Mengapa dasar kolam yang jernih tampak lebih dangkal daripada sebenarnya?', [], 'Cahaya dari dasar kolam dibiaskan (dibelokkan) saat keluar dari air ke udara, sehingga dasar kolam tampak lebih dekat ke permukaan.', 'Pembiasan terjadi saat cahaya melewati dua benda bening yang berbeda.', 'sulit'],
  ] },

  // =============================== KELAS 6 · FASE C ===============================
  { kelas: 6, judul: 'Penghematan Energi', komps: layar({
    pemantik: ['Tagihan listrik membengkak', '<p>Bulan ini tagihan listrik keluarga Dimas naik. Ternyata TV sering menyala tanpa ditonton dan penanak nasi dibiarkan menyala seharian.</p><h3>Mengapa kebiasaan itu boros? Apa dampaknya bagi lingkungan?</h3>'],
    tujuan: ['Menjelaskan pentingnya menghemat energi sebagai upaya mitigasi perubahan iklim.', 'Menghitung perkiraan pemakaian energi listrik di rumah.', 'Menghasilkan dan menerapkan rencana aksi hemat energi selama satu minggu.'],
    amati: ['Audit energi di rumah', '<p>Tugas di rumah, dibantu orang tua. Catat alat listrik di rumahmu.</p>',
      KEG('Menurutmu, alat apa yang paling banyak memakai listrik di rumahmu?',
        ['Catat nama alat listrik dan dayanya (watt). Lihat label di bagian belakang atau bawah alat.', 'Tanyakan berapa jam setiap alat dipakai dalam sehari.', 'Hitung: daya (watt) × jam ÷ 1.000 = kWh per hari.', 'Tandai alat yang sering menyala padahal tidak dipakai.'],
        'Buat tabel: Nama alat | Daya (watt) | Jam per hari | kWh per hari.',
        [T('Alat apa yang paling boros di rumahmu?', ['Lihat kWh terbesar di tabelmu.'], 'Jawaban bervariasi. Biasanya alat berdaya besar atau yang lama menyala, seperti AC, kulkas, atau penanak nasi.'),
          T('Bagaimana cara mengurangi pemakaiannya?', ['Bisakah jam pemakaiannya dikurangi?'], 'Mematikan alat saat tidak dipakai, mengurangi jam pemakaian, dan mengatur suhu AC tidak terlalu dingin.')])],
    jelas1: ['Rumah hemat energi', `<p>Matikan alat atau kurangi jam pemakaiannya pada media. Capailah target hemat 20%.</p>${L([`Energi listrik diukur dalam ${I('kWh', 'kilowatt-jam')}.`, 'Makin besar daya alat dan makin lama dipakai, makin banyak energi yang terpakai.'])}`],
    jelas2: ['Mengapa harus hemat energi?', L(['Sebagian besar listrik di Indonesia dibuat dengan membakar batu bara, minyak, dan gas.', 'Pembakaran itu menghasilkan karbon dioksida yang menyebabkan pemanasan global.', `Batu bara, minyak bumi, dan gas alam adalah ${I('sumber energi tak terbarukan')}: suatu saat akan habis.`, 'Hemat energi berarti hemat biaya sekaligus menjaga Bumi.'])],
    contoh: ['Aksi hemat energi', ['Matikan lampu, TV, dan kipas saat tidak dipakai.', 'Cabut pengisi daya HP setelah baterai penuh.', 'Manfaatkan cahaya matahari: buka jendela pada siang hari.', 'Berjalan kaki, bersepeda, atau naik kendaraan umum untuk menghemat bahan bakar.']],
    diskusi: [
      T('Mengapa lampu LED lebih hemat daripada lampu pijar?', ['Bandingkan daya (watt) kedua lampu untuk terang yang sama.'], 'Untuk terang yang sama, lampu LED memakai daya listrik lebih kecil dan tidak banyak membuang energi menjadi panas.'),
      T('Hitunglah: lampu 10 watt menyala selama 10 jam. Berapa kWh energinya?', ['Gunakan rumus: watt × jam ÷ 1.000.'], '10 × 10 ÷ 1.000 = 0,1 kWh.'),
      T('Susunlah rencana aksi hemat energi keluargamu selama satu minggu.', ['Tentukan alat, aksi, dan cara mencatat hasilnya.'], 'Jawaban bervariasi. Contoh: mematikan TV jika tidak ditonton, mencabut penanak nasi setelah nasi habis, dan mencatat angka meteran listrik setiap hari.')],
    rangkuman: ['Energi listrik diukur dalam kWh: daya (watt) × jam ÷ 1.000.', 'Sebagian besar listrik berasal dari pembakaran batu bara yang menghasilkan karbon dioksida.', 'Menghemat energi mengurangi biaya dan pemanasan global.', 'Matikan alat yang tidak dipakai dan manfaatkan cahaya matahari.'],
    refleksi: ['Alat apa di rumahmu yang sering menyala sia-sia?', 'Apa hasil rencana aksi hemat energimu minggu ini?'],
  }), soal: [
    ['pg', 'Satuan untuk mengukur pemakaian energi listrik di rumah adalah …', ['meter', 'kWh', 'kilogram', 'liter'], 'B', 'Meteran listrik PLN mencatat pemakaian dalam kWh.', 'mudah'],
    ['pg', 'Cara menghemat energi listrik yang benar adalah …', ['menyalakan lampu pada siang hari', 'membiarkan TV menyala tanpa ditonton', 'mencabut pengisi daya HP setelah penuh', 'membuka pintu kulkas lama-lama'], 'C', 'Pengisi daya yang tetap tercolok masih memakai sedikit listrik.', 'mudah'],
    ['pg', 'Sebagian besar listrik di Indonesia dihasilkan dengan membakar …', ['kayu', 'batu bara', 'kertas', 'plastik'], 'B', 'Pembangkit listrik tenaga uap banyak memakai batu bara.', 'sedang'],
    ['bs', 'Batu bara adalah sumber energi yang tidak dapat diperbarui.', [], 'Benar', 'Batu bara terbentuk selama jutaan tahun dan jumlahnya terbatas.', 'sedang'],
    ['isian', 'Kipas angin 50 watt menyala selama 4 jam. Energi yang dipakai adalah … kWh.', [], '0,2', '50 × 4 ÷ 1.000 = 0,2 kWh.', 'sulit'],
    ['uraian', 'Mengapa menghemat listrik dapat mengurangi pemanasan global?', [], 'Listrik banyak dihasilkan dengan membakar batu bara yang menghasilkan karbon dioksida. Jika listrik dihemat, batu bara yang dibakar berkurang, sehingga karbon dioksida penyebab pemanasan global juga berkurang.', 'Menghemat energi adalah salah satu bentuk mitigasi perubahan iklim.', 'sulit'],
  ] },

  { kelas: 6, judul: 'Energi Alternatif', komps: layar({
    pemantik: ['Desa tanpa listrik PLN', '<p>Sebuah desa di pegunungan belum terjangkau jaringan listrik PLN. Namun, setiap malam rumah-rumah di desa itu tetap terang.</p><h3>Dari mana warga desa mendapat listrik?</h3>'],
    tujuan: ['Mengidentifikasi sumber energi alternatif di lingkungan sekitar.', 'Menjelaskan kelebihan dan kekurangan setiap energi alternatif.', 'Merancang pemanfaatan energi alternatif sederhana.'],
    amati: ['Membuat kincir angin sederhana', '<p>Bekerja berkelompok. Siapkan kertas persegi, gunting, sedotan, dan paku payung (dibantu guru).</p>',
      KEG('Kapan kincir akan berputar paling cepat?',
        ['Gunting kertas persegi dari setiap sudut menuju tengah, jangan sampai putus.', 'Lipat ujung-ujungnya ke tengah, lalu tusuk dengan paku payung ke sedotan.', 'Tiup kincir pelan, lalu tiup kencang.', 'Bawa kincir ke luar kelas dan amati putarannya saat ada angin.'],
        'Buat tabel: Keadaan (tiupan pelan, tiupan kencang, angin di luar) | Putaran (lambat, sedang, cepat).',
        [T('Kapan kincir berputar paling cepat?', ['Bandingkan tiupan pelan dan kencang.'], 'Saat tiupan atau angin kencang. Makin kencang angin, makin cepat kincir berputar.'),
          T('Bagaimana kincir angin dapat menghasilkan listrik?', ['Putaran kincir menggerakkan alat apa?'], 'Putaran kincir menggerakkan generator yang mengubah energi gerak menjadi energi listrik.')])],
    jelas1: ['Simulasi energi alternatif', `<p>Pilih sumber energi pada media, lalu ubah keadaannya. Amati nyala lampu atau api.</p>${L([`${I('Energi alternatif')}: energi pengganti bahan bakar fosil (minyak bumi, batu bara, gas alam).`, `Sebagian besar energi alternatif adalah ${I('energi terbarukan')}: tidak akan habis dan lebih bersih.`])}`],
    jelas2: ['Jenis energi alternatif', L(['Energi matahari: panel surya mengubah cahaya menjadi listrik.', 'Energi angin dan air: memutar kincir atau turbin untuk menghasilkan listrik.', 'Biogas: kotoran ternak diolah menjadi gas untuk memasak.', `${I('Energi panas bumi')}: uap panas dari dalam bumi memutar turbin. Indonesia memiliki banyak gunung api sehingga kaya panas bumi.`])],
    contoh: ['Energi alternatif di Indonesia', ['PLTB Sidrap di Sulawesi Selatan memanfaatkan angin.', 'PLTA Cirata di Jawa Barat memanfaatkan aliran air waduk.', 'PLTP Kamojang di Jawa Barat memanfaatkan panas bumi.', 'Lampu jalan tenaga surya banyak dipasang di desa-desa.']],
    diskusi: [
      T('Mengapa Indonesia cocok memanfaatkan energi matahari?', ['Indonesia terletak di dekat garis apa?'], 'Indonesia terletak di sekitar khatulistiwa sehingga mendapat sinar matahari hampir sepanjang tahun.'),
      T('Apa kekurangan panel surya?', ['Bagaimana saat malam atau mendung?'], 'Panel surya hanya menghasilkan listrik saat ada cahaya matahari, berkurang saat mendung, dan membutuhkan baterai untuk menyimpan listrik di malam hari.'),
      T('Rancanglah energi alternatif yang cocok untuk desa peternak sapi. Jelaskan alasannya!', ['Bahan apa yang banyak tersedia di desa itu setiap hari?'], 'Biogas, karena kotoran sapi tersedia setiap hari dan dapat diolah menjadi gas untuk memasak; sisa olahannya menjadi pupuk.')],
    rangkuman: ['Energi alternatif menggantikan bahan bakar fosil yang akan habis dan menghasilkan asap.', 'Contohnya energi matahari, angin, air, biogas, dan panas bumi.', 'Setiap energi alternatif memiliki kelebihan dan kekurangan.', 'Indonesia kaya akan sumber energi alternatif.'],
    refleksi: ['Energi alternatif apa yang paling cocok untuk daerahmu? Mengapa?', 'Bagaimana kamu dapat ikut mendukung penggunaan energi bersih?'],
  }), soal: [
    ['pg', 'Alat yang mengubah energi cahaya matahari menjadi listrik adalah …', ['kincir angin', 'panel surya', 'turbin air', 'kompor biogas'], 'B', 'Panel surya dipasang menghadap matahari.', 'mudah'],
    ['pg', 'Biogas dibuat dari …', ['batu bara', 'kotoran ternak', 'minyak bumi', 'pasir'], 'B', 'Kotoran ternak diuraikan bakteri di dalam digester.', 'mudah'],
    ['pg', 'PLTB memanfaatkan energi …', ['air', 'angin', 'panas bumi', 'matahari'], 'B', 'PLTB adalah Pembangkit Listrik Tenaga Bayu (angin).', 'sedang'],
    ['bs', 'Minyak bumi adalah energi alternatif yang dapat diperbarui.', [], 'Salah', 'Minyak bumi adalah bahan bakar fosil yang tidak dapat diperbarui.', 'sedang'],
    ['isian', 'Energi dari uap panas di dalam bumi disebut energi panas …', [], 'bumi', 'Indonesia memiliki banyak pembangkit listrik tenaga panas bumi.', 'mudah'],
    ['uraian', 'Sebutkan satu kelebihan dan satu kekurangan pembangkit listrik tenaga angin!', [], 'Kelebihan: angin tidak akan habis dan tidak menghasilkan asap. Kekurangan: angin tidak selalu bertiup kencang, dan kincir besar membutuhkan lahan yang luas.', 'Setiap energi alternatif cocok untuk daerah tertentu.', 'sulit'],
  ] },

  { kelas: 6, judul: 'Sistem Tata Surya', komps: layar({
    pemantik: ['Bintang paling terang di pagi hari', '<p>Menjelang subuh, di langit timur tampak sebuah titik yang sangat terang. Orang menyebutnya bintang kejora.</p><h3>Benarkah itu sebuah bintang?</h3>'],
    tujuan: ['Menjelaskan anggota-anggota tata surya.', 'Mengurutkan planet dari yang terdekat dengan Matahari.', 'Mengaitkan gerak planet dengan rotasi dan revolusi.'],
    amati: ['Model jarak planet di halaman', '<p>Kegiatan di halaman sekolah. Siapkan 9 kertas bertuliskan Matahari dan nama-nama planet.</p>',
      KEG('Menurutmu, apakah jarak antarplanet sama?',
        ['Satu siswa memegang kertas Matahari di ujung halaman.', 'Siswa lain berdiri dari Matahari sejauh: Merkurius 1, Venus 2, Bumi 2½, Mars 4, Jupiter 13, Saturnus 24, Uranus 48, dan Neptunus 75 langkah.', 'Amati jarak antarplanet.', 'Siswa "planet" berjalan pelan mengelilingi Matahari (revolusi) sambil berputar (rotasi).'],
        'Gambar susunan planet dan tandai planet-planet yang letaknya sangat jauh.',
        [T('Planet mana yang berdekatan dan mana yang berjauhan?', ['Bandingkan Merkurius sampai Mars dengan Jupiter sampai Neptunus.'], 'Merkurius, Venus, Bumi, dan Mars berdekatan dengan Matahari. Jupiter, Saturnus, Uranus, dan Neptunus sangat jauh dan saling berjauhan.'),
          T('Siapa yang menempuh jalan paling panjang saat berkeliling?', ['Lingkaran mana yang paling besar?'], 'Neptunus, karena paling jauh dari Matahari. Karena itu revolusi Neptunus paling lama.')])],
    jelas1: ['Jelajah tata surya', `<p>Ketuk setiap planet pada media, lalu mainkan <b>Urutkan planet</b>.</p>${L([`${I('Tata surya')}: Matahari sebagai pusat dan benda-benda langit yang mengelilinginya.`, 'Urutan planet: Merkurius, Venus, Bumi, Mars, Jupiter, Saturnus, Uranus, Neptunus.'])}`],
    jelas2: ['Anggota tata surya', L(['Matahari: bintang yang memancarkan cahaya dan panas sendiri.', `${I('Planet')}: beredar mengelilingi Matahari dan tidak memancarkan cahaya sendiri.`, `${I('Satelit')}: mengelilingi planet, misalnya Bulan mengelilingi Bumi.`, 'Benda langit lain: asteroid, komet, dan meteoroid.'])],
    contoh: ['Tata surya dalam kehidupan', ['Bintang kejora sebenarnya planet Venus yang memantulkan cahaya Matahari.', 'Bulan tampak bersinar karena memantulkan cahaya Matahari.', '"Bintang jatuh" sebenarnya meteor yang terbakar saat memasuki udara Bumi.', 'Kalender Masehi berdasarkan revolusi Bumi; kalender Hijriah berdasarkan peredaran Bulan.']],
    diskusi: [
      T('Mengapa Bumi menjadi satu-satunya planet yang diketahui memiliki kehidupan?', ['Bagaimana suhu, air, dan udara di Bumi?'], 'Jarak Bumi dari Matahari pas sehingga suhunya tidak terlalu panas atau dingin, ada air dalam bentuk cair, dan ada udara yang mengandung oksigen.'),
      T('Mengapa Venus lebih panas daripada Merkurius, padahal Merkurius lebih dekat ke Matahari?', ['Bandingkan lapisan udara kedua planet.'], 'Venus memiliki lapisan udara yang sangat tebal yang menahan panas, sedangkan Merkurius hampir tidak memiliki udara sehingga panasnya mudah lepas.'),
      T('Mengapa satu tahun di Neptunus jauh lebih lama daripada di Bumi?', ['Ingat model jarak planet di halaman.'], 'Neptunus sangat jauh dari Matahari sehingga lintasan revolusinya sangat panjang dan geraknya lebih lambat.')],
    rangkuman: ['Tata surya terdiri atas Matahari, planet, satelit, dan benda langit lain.', 'Delapan planet: Merkurius, Venus, Bumi, Mars, Jupiter, Saturnus, Uranus, dan Neptunus.', 'Planet berevolusi mengelilingi Matahari sambil berotasi.', 'Makin jauh dari Matahari, makin lama waktu revolusinya.'],
    refleksi: ['Planet apa yang paling menarik bagimu? Mengapa?', 'Bagaimana caramu menghafal urutan planet?'],
  }), soal: [
    ['pg', 'Pusat tata surya adalah …', ['Bumi', 'Bulan', 'Matahari', 'Jupiter'], 'C', 'Semua planet beredar mengelilingi Matahari.', 'mudah'],
    ['pg', 'Planet terbesar dalam tata surya adalah …', ['Saturnus', 'Jupiter', 'Bumi', 'Neptunus'], 'B', 'Jupiter adalah planet gas raksasa terbesar.', 'mudah'],
    ['pg', 'Planet ketiga dari Matahari adalah …', ['Venus', 'Mars', 'Bumi', 'Merkurius'], 'C', 'Urutannya: Merkurius, Venus, Bumi.', 'mudah'],
    ['bs', 'Bulan memancarkan cahayanya sendiri.', [], 'Salah', 'Bulan memantulkan cahaya Matahari.', 'sedang'],
    ['isian', 'Benda langit yang mengelilingi planet disebut …', [], 'satelit', 'Bulan adalah satelit alami Bumi.', 'mudah'],
    ['uraian', 'Mengapa Venus disebut bintang kejora, padahal ia sebuah planet?', [], 'Venus tampak sangat terang di langit pagi atau senja karena memantulkan cahaya Matahari, sehingga orang dulu mengiranya bintang. Venus tidak memancarkan cahaya sendiri.', 'Bintang memancarkan cahaya sendiri; planet tidak.', 'sulit'],
  ] },
];

module.exports = { MATERI };
