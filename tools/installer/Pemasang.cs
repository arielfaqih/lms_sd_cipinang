// Pemasang LMS IPAS (Windows). Dikompilasi oleh tools/buat-installer.ps1 memakai csc.exe bawaan .NET Framework 4.
// - LMS-IPAS-Setup.exe : berisi paket.zip (aplikasi + Node.js portabel) sebagai resource; satu berkas, tanpa internet.
// - Uninstall memakai hapus-lms.js yang dijalankan runtime\node.exe (bertanda tangan resmi, lolos Smart App Control).
// Ditulis dengan C# 5 agar bisa dikompilasi di Windows 10/11 mana pun.
using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace LmsIpas
{
    static class Inti
    {
        public const string NAMA = "LMS IPAS";
        public const string KUNCI_UNINSTALL = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\LMS-IPAS";
        public const string ATURAN_FIREWALL = "LMS IPAS (port 3000)";
        public static readonly Color Hijau = Color.FromArgb(15, 118, 110);
        public static readonly Color HijauTua = Color.FromArgb(11, 84, 79);
        public static readonly Color Abu = Color.FromArgb(95, 107, 112);
        public static readonly Color Garis = Color.FromArgb(226, 232, 235);
        public static readonly Color Latar = Color.FromArgb(246, 248, 249);
        public static readonly Color Merah = Color.FromArgb(185, 28, 28);

        public static string FolderBawaan()
        {
            string sys = Path.GetPathRoot(Environment.GetFolderPath(Environment.SpecialFolder.System));
            return Path.Combine(string.IsNullOrEmpty(sys) ? "C:\\" : sys, "LMS-IPAS");
        }

        public static Image Logo()
        {
            try
            {
                Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("logo.png");
                if (s != null) return Image.FromStream(s);
            }
            catch { }
            return null;
        }

        // ---------- Pasang ----------
        public static void Ekstrak(string folder, Action<string, int> lapor)
        {
            if (lapor != null) lapor("Menyalin berkas…", 0);
            Directory.CreateDirectory(folder);
            string akar = Path.GetFullPath(folder);
            using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("paket.zip"))
            {
                if (s == null) throw new Exception("Paket aplikasi tidak ditemukan di installer.");
                using (var zip = new ZipArchive(s, ZipArchiveMode.Read))
                {
                    int n = zip.Entries.Count, i = 0;
                    foreach (ZipArchiveEntry e in zip.Entries)
                    {
                        i++;
                        string nama = e.FullName.Replace('\\', '/');
                        if (nama.StartsWith("data/", StringComparison.OrdinalIgnoreCase)) continue; // data sekolah tidak pernah ditimpa
                        string tujuan = Path.GetFullPath(Path.Combine(folder, nama.Replace('/', '\\')));
                        if (!tujuan.StartsWith(akar, StringComparison.OrdinalIgnoreCase)) continue;
                        if (string.IsNullOrEmpty(e.Name)) { Directory.CreateDirectory(tujuan); continue; }
                        Directory.CreateDirectory(Path.GetDirectoryName(tujuan));
                        try { e.ExtractToFile(tujuan, true); }
                        catch (IOException)
                        {
                            throw new Exception("Berkas sedang dipakai: " + nama + "\n\nTutup dulu jendela hitam server LMS yang masih terbuka, lalu coba lagi.");
                        }
                        if (lapor != null && i % 15 == 0) lapor("Menyalin berkas… (" + i + " dari " + n + ")", i * 80 / n);
                    }
                }
            }
        }

        public static string Versi(string folder)
        {
            try
            {
                Match m = Regex.Match(File.ReadAllText(Path.Combine(folder, "package.json")), "\"version\"\\s*:\\s*\"([^\"]+)\"");
                if (m.Success) return m.Groups[1].Value;
            }
            catch { }
            return "1.0.0";
        }

        public static long UkuranKb(string folder)
        {
            long total = 0;
            try { foreach (string f in Directory.GetFiles(folder, "*", SearchOption.AllDirectories)) total += new FileInfo(f).Length; } catch { }
            return total / 1024;
        }

        // Mendaftarkan LMS di Settings → Apps (per pengguna, tanpa izin Administrator)
        public static void Daftarkan(string folder)
        {
            using (RegistryKey k = Registry.CurrentUser.CreateSubKey(KUNCI_UNINSTALL))
            {
                string hapus = "\"" + Path.Combine(folder, "runtime", "node.exe") + "\" \"" + Path.Combine(folder, "hapus-lms.js") + "\"";
                k.SetValue("DisplayName", NAMA + " (LMS IPA SD Kelas 4-6)");
                k.SetValue("DisplayVersion", Versi(folder));
                k.SetValue("Publisher", "SDN Cipinang II");
                k.SetValue("DisplayIcon", Path.Combine(folder, "lms.ico"));
                k.SetValue("InstallLocation", folder);
                k.SetValue("UninstallString", hapus);
                k.SetValue("QuietUninstallString", hapus + " --diam");
                k.SetValue("InstallDate", DateTime.Now.ToString("yyyyMMdd"));
                k.SetValue("EstimatedSize", (int)Math.Min(int.MaxValue, UkuranKb(folder)), RegistryValueKind.DWord);
                k.SetValue("NoModify", 1, RegistryValueKind.DWord);
                k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
            }
        }

        static string LokasiPintasan(Environment.SpecialFolder f, string nama) { return Path.Combine(Environment.GetFolderPath(f), nama + ".lnk"); }

        public static void BuatPintasan(string folder, bool desktop)
        {
            string bat = Path.Combine(folder, "mulai-server.bat");
            if (desktop) BuatSatuPintasan(LokasiPintasan(Environment.SpecialFolder.DesktopDirectory, "LMS IPAS"), bat, "", folder, "Jalankan server LMS IPAS");
            BuatSatuPintasan(LokasiPintasan(Environment.SpecialFolder.Programs, "LMS IPAS"), bat, "", folder, "Jalankan server LMS IPAS");
            BuatSatuPintasan(LokasiPintasan(Environment.SpecialFolder.Programs, "Hapus LMS IPAS"), Path.Combine(folder, "runtime", "node.exe"),
                "\"" + Path.Combine(folder, "hapus-lms.js") + "\"", folder, "Hapus (uninstall) LMS IPAS");
        }

        static void BuatSatuPintasan(string lnk, string target, string argumen, string folder, string ket)
        {
            try
            {
                Type t = Type.GetTypeFromProgID("WScript.Shell");
                object sh = Activator.CreateInstance(t);
                object sc = t.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, sh, new object[] { lnk });
                Type st = sc.GetType();
                st.InvokeMember("TargetPath", BindingFlags.SetProperty, null, sc, new object[] { target });
                if (argumen.Length > 0) st.InvokeMember("Arguments", BindingFlags.SetProperty, null, sc, new object[] { argumen });
                st.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, sc, new object[] { folder });
                st.InvokeMember("Description", BindingFlags.SetProperty, null, sc, new object[] { ket });
                string ikon = Path.Combine(folder, "lms.ico");
                if (File.Exists(ikon)) st.InvokeMember("IconLocation", BindingFlags.SetProperty, null, sc, new object[] { ikon + ",0" });
                st.InvokeMember("Save", BindingFlags.InvokeMethod, null, sc, null);
            }
            catch { /* pintasan bersifat tambahan */ }
        }

        static void JalankanAdmin(string perintah)
        {
            try
            {
                var p = Process.Start(new ProcessStartInfo("cmd.exe", "/c " + perintah) { Verb = "runas", UseShellExecute = true, WindowStyle = ProcessWindowStyle.Hidden });
                if (p != null) p.WaitForExit(30000);
            }
            catch { /* pengguna menolak izin Administrator */ }
        }

        public static void BukaFirewall()
        {
            JalankanAdmin("netsh advfirewall firewall delete rule name=\"" + ATURAN_FIREWALL + "\" >nul 2>nul & netsh advfirewall firewall add rule name=\"" + ATURAN_FIREWALL + "\" dir=in action=allow protocol=TCP localport=3000 profile=any");
        }

    }

    // Tombol datar dengan sudut membulat
    class Tombol : Button
    {
        public Color Warna = Inti.Hijau;
        public bool Utama;
        public Tombol(string teks, bool utama)
        {
            Text = teks; Utama = utama;
            FlatStyle = FlatStyle.Flat; FlatAppearance.BorderSize = 0;
            Font = new Font("Segoe UI Semibold", 10.5f); Cursor = Cursors.Hand; Size = new Size(130, 40);
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
        }
        bool hover;
        protected override void OnMouseEnter(EventArgs e) { hover = true; Invalidate(); base.OnMouseEnter(e); }
        protected override void OnMouseLeave(EventArgs e) { hover = false; Invalidate(); base.OnMouseLeave(e); }
        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Parent != null ? Parent.BackColor : Color.White);
            var r = new Rectangle(0, 0, Width - 1, Height - 1);
            using (var p = Bulat(r, 9))
            {
                Color isi = Utama ? (hover ? Gelap(Warna) : Warna) : (hover ? Color.FromArgb(240, 244, 245) : Color.White);
                if (!Enabled) isi = Utama ? Color.FromArgb(160, 190, 187) : Color.White;
                using (var b = new SolidBrush(isi)) g.FillPath(b, p);
                if (!Utama) using (var pen = new Pen(Color.FromArgb(203, 213, 218), 1.2f)) g.DrawPath(pen, p);
            }
            TextRenderer.DrawText(g, Text, Font, r, Utama ? Color.White : (Enabled ? Color.FromArgb(30, 41, 46) : Color.Silver),
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        }
        static Color Gelap(Color c) { return Color.FromArgb(c.R * 8 / 10, c.G * 8 / 10, c.B * 8 / 10); }
        public static GraphicsPath Bulat(Rectangle r, int rad)
        {
            var p = new GraphicsPath(); int d = rad * 2;
            p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90); p.CloseFigure();
            return p;
        }
    }

    // Kartu pilihan: kotak centang + judul tebal + keterangan abu-abu
    class KartuPilihan : Panel
    {
        public CheckBox Cek;
        public KartuPilihan(string judul, string ket, bool nilai, int lebar)
        {
            Size = new Size(lebar, 58); BackColor = Color.White; Cursor = Cursors.Hand;
            Cek = new CheckBox { Checked = nilai, Location = new Point(14, 19), Size = new Size(18, 18) };
            var j = new Label { Text = judul, Font = new Font("Segoe UI Semibold", 10f), AutoSize = true, Location = new Point(40, 9), BackColor = Color.Transparent };
            var k = new Label { Text = ket, ForeColor = Inti.Abu, Font = new Font("Segoe UI", 9f), AutoSize = false, Location = new Point(40, 30), Size = new Size(lebar - 52, 20), BackColor = Color.Transparent };
            Controls.Add(Cek); Controls.Add(j); Controls.Add(k);
            EventHandler balik = delegate { Cek.Checked = !Cek.Checked; };
            Click += balik; j.Click += balik; k.Click += balik;
            Cek.CheckedChanged += delegate { Invalidate(); };
            SetStyle(ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
        }
        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using (var p = Tombol.Bulat(new Rectangle(0, 0, Width - 1, Height - 1), 10))
            using (var pen = new Pen(Cek.Checked ? Color.FromArgb(94, 177, 168) : Inti.Garis, 1.3f))
                e.Graphics.DrawPath(pen, p);
        }
    }

    public class Jendela : Form
    {
        Panel isi, kaki;
        Tombol btnUtama, btnKedua;
        Label lblJudul, lblSub;

        // halaman pasang
        TextBox txtFolder;
        KartuPilihan kPintasan, kFirewall, kJalankan;
        ProgressBar bar;
        Label lblStatus;

        [STAThread]
        static int Main(string[] args)
        {
            bool diam = Array.Exists(args, a => a.Equals("/diam", StringComparison.OrdinalIgnoreCase));
            string folderArg = Array.Find(args, a => !a.StartsWith("/"));
            if (diam)
            {
                // Pasang tanpa jendela (untuk admin/uji otomatis):  LMS-IPAS-Setup.exe /diam "D:\LMS-IPAS"
                try { string f = folderArg ?? Inti.FolderBawaan(); Inti.Ekstrak(f, null); Inti.Daftarkan(f); return 0; }
                catch (Exception ex) { Catat(ex); return 1; }
            }
            Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new Jendela());
            return 0;
        }

        static void Catat(Exception ex) { try { File.WriteAllText(Path.Combine(Path.GetTempPath(), "lms-ipas-galat.txt"), ex.ToString()); } catch { } }

        public Jendela()
        {
            Text = "Pasang LMS IPAS";
            Font = new Font("Segoe UI", 10f);
            AutoScaleMode = AutoScaleMode.Dpi;
            FormBorderStyle = FormBorderStyle.FixedSingle; MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(620, 500);
            BackColor = Inti.Latar;
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

            // Header berwarna dengan logo
            var kepala = new Panel { Dock = DockStyle.Top, Height = 104 };
            kepala.Paint += (s, e) =>
            {
                using (var b = new LinearGradientBrush(kepala.ClientRectangle, Inti.HijauTua, Inti.Hijau, 0f))
                    e.Graphics.FillRectangle(b, kepala.ClientRectangle);
                using (var b = new SolidBrush(Color.FromArgb(22, 255, 255, 255)))
                { e.Graphics.SmoothingMode = SmoothingMode.AntiAlias; e.Graphics.FillEllipse(b, kepala.Width - 150, -60, 220, 220); }
            };
            var logo = new PictureBox { Size = new Size(60, 60), Location = new Point(28, 22), SizeMode = PictureBoxSizeMode.Zoom, BackColor = Color.Transparent, Image = Inti.Logo() };
            lblJudul = new Label { Text = "Pasang LMS IPAS", Font = new Font("Segoe UI Semibold", 17f), ForeColor = Color.White, AutoSize = true, Location = new Point(102, 20), BackColor = Color.Transparent };
            lblSub = new Label
            {
                Text = "LMS IPA SD Kelas 4–6 · berjalan tanpa internet",
                Font = new Font("Segoe UI", 10f), ForeColor = Color.FromArgb(215, 240, 236), AutoSize = true, Location = new Point(104, 58), BackColor = Color.Transparent
            };
            kepala.Controls.Add(logo); kepala.Controls.Add(lblJudul); kepala.Controls.Add(lblSub);

            // Kaki dengan tombol
            kaki = new Panel { Dock = DockStyle.Bottom, Height = 72, BackColor = Color.White };
            kaki.Paint += (s, e) => { using (var p = new Pen(Inti.Garis)) e.Graphics.DrawLine(p, 0, 0, kaki.Width, 0); };
            btnUtama = new Tombol("Pasang", true) { Location = new Point(462, 16) };
            btnKedua = new Tombol("Batal", false) { Location = new Point(320, 16) };
            btnKedua.Click += delegate { Close(); };
            kaki.Controls.Add(btnUtama); kaki.Controls.Add(btnKedua);

            isi = new Panel { Dock = DockStyle.Fill, BackColor = Inti.Latar, Padding = new Padding(28, 20, 28, 10) };
            Controls.Add(isi); Controls.Add(kaki); Controls.Add(kepala);
            AcceptButton = btnUtama;

            HalamanPasang();
        }

        Label Teks(string t, int x, int y, float ukuran, bool tebal, Color warna, int lebar)
        {
            var l = new Label { Text = t, Location = new Point(x, y), Font = new Font(tebal ? "Segoe UI Semibold" : "Segoe UI", ukuran), ForeColor = warna, BackColor = Color.Transparent };
            if (lebar > 0) { l.AutoSize = false; l.Size = new Size(lebar, 40); l.MaximumSize = new Size(lebar, 0); l.AutoSize = true; } else l.AutoSize = true;
            isi.Controls.Add(l); return l;
        }

        // ---------------- PASANG ----------------
        void HalamanPasang()
        {
            isi.Controls.Clear();
            Teks("Lokasi pemasangan", 28, 18, 10f, true, Color.FromArgb(30, 41, 46), 0);
            var kotak = new Panel { Location = new Point(28, 44), Size = new Size(564, 40), BackColor = Color.White };
            kotak.Paint += (s, e) => { e.Graphics.SmoothingMode = SmoothingMode.AntiAlias; using (var p = Tombol.Bulat(new Rectangle(0, 0, kotak.Width - 1, kotak.Height - 1), 8)) using (var pen = new Pen(Color.FromArgb(203, 213, 218), 1.2f)) e.Graphics.DrawPath(pen, p); };
            txtFolder = new TextBox { Text = Inti.FolderBawaan(), BorderStyle = BorderStyle.None, Location = new Point(12, 10), Width = 440, Font = new Font("Segoe UI", 10.5f) };
            var pilih = new Tombol("Ubah…", false) { Location = new Point(468, 4), Size = new Size(90, 32) };
            pilih.Font = new Font("Segoe UI", 9.5f);
            pilih.Click += delegate
            {
                using (var d = new FolderBrowserDialog { Description = "Pilih folder induk. LMS dipasang di subfolder \"LMS-IPAS\"." })
                    if (d.ShowDialog(this) == DialogResult.OK) txtFolder.Text = Path.Combine(d.SelectedPath, "LMS-IPAS");
            };
            kotak.Controls.Add(txtFolder); kotak.Controls.Add(pilih); isi.Controls.Add(kotak);
            Teks("Hindari folder OneDrive, Desktop, atau Documents agar basis data tidak rusak.", 28, 90, 9f, false, Inti.Abu, 0);

            kPintasan = new KartuPilihan("Buat pintasan di Desktop", "Ikon \"LMS IPAS\" untuk menyalakan LMS setiap hari.", true, 564) { Location = new Point(28, 122) };
            kFirewall = new KartuPilihan("Izinkan HP, laptop lain, dan smartboard", "Membuka Windows Firewall (port 3000). Windows akan meminta izin Administrator.", true, 564) { Location = new Point(28, 186) };
            kJalankan = new KartuPilihan("Jalankan LMS setelah selesai", "Browser terbuka otomatis ke http://localhost:3000", true, 564) { Location = new Point(28, 250) };
            isi.Controls.Add(kPintasan); isi.Controls.Add(kFirewall); isi.Controls.Add(kJalankan);

            btnUtama.Text = "Pasang"; btnUtama.Click -= KlikPasang; btnUtama.Click += KlikPasang;
        }

        void KlikPasang(object s, EventArgs e)
        {
            string folder = txtFolder.Text.Trim();
            if (folder.Length < 4) { MessageBox.Show(this, "Pilih folder pemasangan.", Inti.NAMA); return; }
            if (folder.IndexOf("OneDrive", StringComparison.OrdinalIgnoreCase) >= 0 &&
                MessageBox.Show(this, "Folder ini ada di dalam OneDrive. Sinkronisasi OneDrive dapat merusak basis data LMS.\n\nTetap pasang di sini?", Inti.NAMA, MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) return;
            bool desktop = kPintasan.Cek.Checked, firewall = kFirewall.Cek.Checked, jalankan = kJalankan.Cek.Checked;
            bool perbarui = Directory.Exists(Path.Combine(folder, "data"));
            HalamanProses(perbarui ? "Memperbarui LMS IPAS…" : "Memasang LMS IPAS…", "Data sekolah (akun, materi, soal, media) tetap aman.");
            var t = new Thread(() =>
            {
                try
                {
                    Inti.Ekstrak(folder, Lapor);
                    Lapor("Mendaftarkan aplikasi dan membuat pintasan…", 85);
                    Inti.Daftarkan(folder);
                    Inti.BuatPintasan(folder, desktop);
                    if (firewall) { Lapor("Membuka izin firewall (klik Yes jika diminta)…", 92); Inti.BukaFirewall(); }
                    Lapor("Selesai.", 100);
                    Invoke(new Action(() => HalamanSelesaiPasang(folder, jalankan, perbarui)));
                }
                catch (Exception ex)
                {
                    Invoke(new Action(() =>
                    {
                        MessageBox.Show(this, "Pemasangan gagal:\n" + ex.Message, Inti.NAMA, MessageBoxButtons.OK, MessageBoxIcon.Error);
                        HalamanPasang(); txtFolder.Text = folder; btnKedua.Visible = true; btnUtama.Enabled = true;
                    }));
                }
            });
            t.IsBackground = true; t.Start();
        }

        void HalamanSelesaiPasang(string folder, bool jalankan, bool perbarui)
        {
            isi.Controls.Clear();
            var bulat = new Panel { Size = new Size(64, 64), Location = new Point(28, 20), BackColor = Inti.Latar };
            bulat.Paint += (s, e) => { e.Graphics.SmoothingMode = SmoothingMode.AntiAlias; using (var b = new SolidBrush(Inti.Hijau)) e.Graphics.FillEllipse(b, 0, 0, 63, 63); TextRenderer.DrawText(e.Graphics, "✓", new Font("Segoe UI Semibold", 24f), new Rectangle(0, 0, 64, 64), Color.White, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter); };
            isi.Controls.Add(bulat);
            Teks(perbarui ? "LMS IPAS berhasil diperbarui" : "LMS IPAS berhasil dipasang", 108, 24, 15f, true, Color.FromArgb(20, 30, 35), 0);
            isi.Controls.Add(new Label { Text = folder, Location = new Point(110, 58), Size = new Size(480, 22), AutoEllipsis = true, Font = new Font("Segoe UI", 9.5f), ForeColor = Inti.Abu, BackColor = Color.Transparent });

            var kartu = new Panel { Location = new Point(28, 104), Size = new Size(564, 168), BackColor = Color.White };
            kartu.Paint += (s, e) => { e.Graphics.SmoothingMode = SmoothingMode.AntiAlias; using (var p = Tombol.Bulat(new Rectangle(0, 0, kartu.Width - 1, kartu.Height - 1), 10)) using (var pen = new Pen(Inti.Garis, 1.3f)) e.Graphics.DrawPath(pen, p); };
            isi.Controls.Add(kartu);
            Func<string, int, int, float, bool, Color, Label> tk = (t, x, y, u, b, c) =>
            { var l = new Label { Text = t, Location = new Point(x, y), AutoSize = true, Font = new Font(b ? "Segoe UI Semibold" : "Segoe UI", u), ForeColor = c, BackColor = Color.White }; kartu.Controls.Add(l); return l; };
            if (perbarui)
            {
                tk("Akun dan data sekolah tetap seperti sebelumnya.", 18, 16, 10f, true, Color.FromArgb(30, 41, 46));
            }
            else
            {
                tk("Masuk pertama kali (kata sandi wajib diganti):", 18, 14, 10f, true, Color.FromArgb(30, 41, 46));
                tk("Admin", 18, 42, 10f, false, Inti.Abu); tk("admin  /  admin123", 90, 42, 10f, true, Color.FromArgb(30, 41, 46));
                tk("Guru", 18, 66, 10f, false, Inti.Abu); tk("guru  /  guru123", 90, 66, 10f, true, Color.FromArgb(30, 41, 46));
            }
            tk("• Buka LMS: klik dua kali ikon \"LMS IPAS\" di Desktop atau Start Menu.", 18, perbarui ? 50 : 100, 9.5f, false, Inti.Abu);
            tk("• Jendela hitam server jangan ditutup selama LMS dipakai.", 18, perbarui ? 74 : 124, 9.5f, false, Inti.Abu);
            tk("• Menghapus LMS: Settings → Apps → LMS IPAS → Uninstall (data bisa disimpan).", 18, perbarui ? 98 : 148, 9.5f, false, Inti.Abu);

            btnKedua.Visible = true; btnKedua.Text = "Tutup";
            btnUtama.Enabled = true; btnUtama.Text = "Buka LMS"; btnUtama.Size = new Size(130, 40);
            btnUtama.Click -= KlikPasang;
            btnUtama.Click += delegate
            {
                try { Process.Start(new ProcessStartInfo(Path.Combine(folder, "mulai-server.bat")) { WorkingDirectory = folder, UseShellExecute = true }); } catch { }
                Close();
            };
            if (jalankan) { try { Process.Start(new ProcessStartInfo(Path.Combine(folder, "mulai-server.bat")) { WorkingDirectory = folder, UseShellExecute = true }); } catch { } btnUtama.Visible = false; btnKedua.Text = "Selesai"; btnKedua.Location = btnUtama.Location; }
        }

        // ---------------- PROSES ----------------
        void HalamanProses(string judul, string ket)
        {
            isi.Controls.Clear();
            Teks(judul, 28, 40, 14f, true, Color.FromArgb(20, 30, 35), 0);
            Teks(ket, 28, 74, 9.5f, false, Inti.Abu, 0);
            bar = new ProgressBar { Location = new Point(28, 120), Size = new Size(564, 14), Style = ProgressBarStyle.Continuous };
            isi.Controls.Add(bar);
            lblStatus = Teks("Menyiapkan…", 28, 144, 9.5f, false, Inti.Abu, 0);
            btnUtama.Enabled = false; btnKedua.Visible = false;
        }

        void Lapor(string t, int persen)
        {
            if (InvokeRequired) { BeginInvoke(new Action<string, int>(Lapor), t, persen); return; }
            if (lblStatus != null) lblStatus.Text = t;
            if (bar != null && persen >= 0) bar.Value = Math.Max(0, Math.Min(100, persen));
        }
    }
}
