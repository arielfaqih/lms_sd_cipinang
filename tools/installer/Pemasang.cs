// Pemasang LMS IPAS (Windows). Dikompilasi oleh tools/buat-installer.ps1 memakai csc.exe bawaan .NET Framework 4.
// Isi aplikasi (paket.zip) disematkan sebagai resource, jadi installer berupa satu berkas .exe dan bekerja tanpa internet.
// Ditulis dengan C# 5 (tanpa fitur bahasa baru) agar bisa dikompilasi di Windows 10/11 mana pun.
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace LmsIpas
{
    public class Pemasang : Form
    {
        const string NAMA = "LMS IPAS";
        TextBox txtFolder;
        CheckBox cbPintasan, cbFirewall, cbJalankan;
        Button btnPasang, btnPilih;
        ProgressBar bar;
        Label lblStatus;

        [STAThread]
        static int Main(string[] args)
        {
            // Mode tanpa jendela untuk admin/uji otomatis:  LMS-IPAS-Setup.exe /diam "D:\LMS-IPAS"
            if (args.Length >= 1 && args[0].Equals("/diam", StringComparison.OrdinalIgnoreCase))
            {
                try { Ekstrak(args.Length >= 2 ? args[1] : FolderBawaan(), null); return 0; }
                catch (Exception ex) { try { File.WriteAllText(Path.Combine(Path.GetTempPath(), "lms-ipas-pasang-galat.txt"), ex.ToString()); } catch { } return 1; }
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new Pemasang());
            return 0;
        }

        public Pemasang()
        {
            Text = "Pasang " + NAMA;
            Font = new Font("Segoe UI", 10f);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(560, 400);
            BackColor = Color.White;
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

            var judul = new Label { Text = "LMS IPAS (bagian IPA) Kelas 4–6", Font = new Font("Segoe UI Semibold", 15f), AutoSize = true, Location = new Point(24, 20), ForeColor = Color.FromArgb(15, 118, 110) };
            var ket = new Label
            {
                Text = "Media belajar yang berjalan tanpa internet. Laptop ini akan menjadi server;\nHP, laptop lain, dan smartboard membukanya lewat Wi-Fi atau hotspot yang sama.",
                AutoSize = true, Location = new Point(26, 60), ForeColor = Color.FromArgb(70, 80, 85)
            };
            var lblFolder = new Label { Text = "Pasang ke folder:", AutoSize = true, Location = new Point(26, 112) };
            txtFolder = new TextBox { Location = new Point(28, 136), Width = 400, Text = FolderBawaan() };
            btnPilih = new Button { Text = "Pilih…", Location = new Point(436, 134), Width = 96, Height = 30 };
            btnPilih.Click += delegate { PilihFolder(); };

            cbPintasan = new CheckBox { Text = "Buat pintasan \"LMS IPAS\" di Desktop", Checked = true, AutoSize = true, Location = new Point(28, 182) };
            cbFirewall = new CheckBox { Text = "Izinkan HP/laptop lain membuka LMS (Windows Firewall, minta izin Administrator)", Checked = true, AutoSize = true, Location = new Point(28, 210) };
            cbJalankan = new CheckBox { Text = "Jalankan LMS setelah selesai", Checked = true, AutoSize = true, Location = new Point(28, 238) };

            bar = new ProgressBar { Location = new Point(28, 284), Width = 504, Height = 18 };
            lblStatus = new Label { Text = "Data sekolah (akun, materi, soal) yang sudah ada tidak akan terhapus saat memperbarui.", AutoSize = false, Location = new Point(26, 308), Size = new Size(510, 40), ForeColor = Color.FromArgb(90, 100, 105) };

            btnPasang = new Button { Text = "Pasang", Location = new Point(392, 352), Size = new Size(140, 36), BackColor = Color.FromArgb(15, 118, 110), ForeColor = Color.White, FlatStyle = FlatStyle.Flat, Font = new Font("Segoe UI Semibold", 10.5f) };
            btnPasang.FlatAppearance.BorderSize = 0;
            btnPasang.Click += delegate { Pasang(); };
            var btnBatal = new Button { Text = "Batal", Location = new Point(286, 352), Size = new Size(96, 36) };
            btnBatal.Click += delegate { Close(); };

            Controls.AddRange(new Control[] { judul, ket, lblFolder, txtFolder, btnPilih, cbPintasan, cbFirewall, cbJalankan, bar, lblStatus, btnPasang, btnBatal });
            AcceptButton = btnPasang;
        }

        static string FolderBawaan()
        {
            // C:\LMS-IPAS: di luar OneDrive/Desktop (aman untuk basis data SQLite) dan mudah ditemukan.
            string sys = Path.GetPathRoot(Environment.GetFolderPath(Environment.SpecialFolder.System));
            return Path.Combine(string.IsNullOrEmpty(sys) ? "C:\\" : sys, "LMS-IPAS");
        }

        void PilihFolder()
        {
            using (var d = new FolderBrowserDialog())
            {
                d.Description = "Pilih folder induk. LMS akan dipasang di subfolder \"LMS-IPAS\".";
                if (d.ShowDialog(this) == DialogResult.OK) txtFolder.Text = Path.Combine(d.SelectedPath, "LMS-IPAS");
            }
        }

        void Status(string t, int persen)
        {
            if (InvokeRequired) { BeginInvoke(new Action<string, int>(Status), t, persen); return; }
            lblStatus.Text = t;
            if (persen >= 0) bar.Value = Math.Max(0, Math.Min(100, persen));
        }

        void Pasang()
        {
            string folder = txtFolder.Text.Trim();
            if (folder.Length < 4) { MessageBox.Show(this, "Pilih folder pemasangan.", NAMA); return; }
            if (folder.IndexOf("OneDrive", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                var r = MessageBox.Show(this, "Folder ini ada di dalam OneDrive. Sinkronisasi OneDrive dapat merusak basis data LMS.\n\nTetap pasang di sini?", NAMA, MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
                if (r != DialogResult.Yes) return;
            }
            foreach (Control c in Controls) c.Enabled = false;
            lblStatus.Enabled = true; bar.Enabled = true;
            bool pintasan = cbPintasan.Checked, firewall = cbFirewall.Checked, jalankan = cbJalankan.Checked;
            var t = new Thread(delegate () { Kerjakan(folder, pintasan, firewall, jalankan); });
            t.IsBackground = true;
            t.Start();
        }

        void Kerjakan(string folder, bool pintasan, bool firewall, bool jalankan)
        {
            try
            {
                Ekstrak(folder, Status);

                if (pintasan) { Status("Membuat pintasan di Desktop…", 88); BuatPintasan(folder); }
                if (firewall) { Status("Membuka izin firewall (klik Yes jika diminta)…", 93); BukaFirewall(); }
                Status("Selesai.", 100);
                
                string pesan = "LMS IPAS berhasil dipasang di:\n" + folder +
                    "\n\nMasuk pertama kali:\n  Admin: admin / admin123\n  Guru:  guru / guru123\n(kata sandi wajib diganti saat pertama masuk)" +
                    "\n\nUntuk membuka LMS berikutnya: klik dua kali pintasan \"LMS IPAS\" di Desktop." +
                    "\nJendela hitam server jangan ditutup selama LMS dipakai.";
                Invoke(new Action(delegate { MessageBox.Show(this, pesan, NAMA, MessageBoxButtons.OK, MessageBoxIcon.Information); }));
                if (jalankan) Process.Start(new ProcessStartInfo(Path.Combine(folder, "mulai-server.bat")) { WorkingDirectory = folder, UseShellExecute = true });
                Invoke(new Action(Close));
            }
            catch (Exception ex)
            {
                Invoke(new Action(delegate
                {
                    MessageBox.Show(this, "Pemasangan gagal:\n" + ex.Message, NAMA, MessageBoxButtons.OK, MessageBoxIcon.Error);
                    foreach (Control c in Controls) c.Enabled = true;
                    Status("Pemasangan belum selesai. Perbaiki masalah di atas, lalu klik Pasang lagi.", 0);
                }));
            }
        }

        // Membongkar paket.zip ke folder tujuan. Folder data\ (data sekolah) tidak pernah ditimpa.
        static void Ekstrak(string folder, Action<string, int> lapor)
        {
            if (lapor != null) lapor("Menyalin berkas…", 0);
            Directory.CreateDirectory(folder);
            using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("paket.zip"))
            using (var zip = new ZipArchive(s, ZipArchiveMode.Read))
                {
                    int n = zip.Entries.Count, i = 0;
                    foreach (ZipArchiveEntry e in zip.Entries)
                    {
                        i++;
                        string tujuan = Path.GetFullPath(Path.Combine(folder, e.FullName.Replace('/', '\\')));
                        if (!tujuan.StartsWith(Path.GetFullPath(folder), StringComparison.OrdinalIgnoreCase)) continue;
                        if (e.FullName.StartsWith("data/", StringComparison.OrdinalIgnoreCase)) continue; // data sekolah tidak pernah ditimpa
                        if (string.IsNullOrEmpty(e.Name)) { Directory.CreateDirectory(tujuan); continue; }
                        Directory.CreateDirectory(Path.GetDirectoryName(tujuan));
                        try { e.ExtractToFile(tujuan, true); }
                        catch (IOException)
                        {
                            throw new Exception("Berkas sedang dipakai: " + e.FullName + "\n\nTutup dulu jendela hitam server LMS yang masih terbuka, lalu klik Pasang lagi.");
                        }
                        if (lapor != null && i % 20 == 0) lapor("Menyalin berkas… (" + i + " dari " + n + ")", i * 85 / n);
                    }
                }

        }

        static void BuatPintasan(string folder)
        {
            try
            {
                string lnk = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "LMS IPAS.lnk");
                Type t = Type.GetTypeFromProgID("WScript.Shell");
                object sh = Activator.CreateInstance(t);
                object sc = t.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, sh, new object[] { lnk });
                Type st = sc.GetType();
                st.InvokeMember("TargetPath", BindingFlags.SetProperty, null, sc, new object[] { Path.Combine(folder, "mulai-server.bat") });
                st.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, sc, new object[] { folder });
                st.InvokeMember("Description", BindingFlags.SetProperty, null, sc, new object[] { "Jalankan server LMS IPAS" });
                string ikon = Path.Combine(folder, "lms.ico");
                if (File.Exists(ikon)) st.InvokeMember("IconLocation", BindingFlags.SetProperty, null, sc, new object[] { ikon + ",0" });
                st.InvokeMember("Save", BindingFlags.InvokeMethod, null, sc, null);
            }
            catch { /* pintasan bersifat tambahan; LMS tetap bisa dibuka dari folder */ }
        }

        static void BukaFirewall()
        {
            try
            {
                var p = Process.Start(new ProcessStartInfo("cmd.exe",
                    "/c netsh advfirewall firewall delete rule name=\"LMS IPAS (port 3000)\" >nul 2>nul & netsh advfirewall firewall add rule name=\"LMS IPAS (port 3000)\" dir=in action=allow protocol=TCP localport=3000 profile=any")
                { Verb = "runas", UseShellExecute = true, WindowStyle = ProcessWindowStyle.Hidden });
                if (p != null) p.WaitForExit(30000);
            }
            catch { /* pengguna menolak izin Administrator: bisa dijalankan nanti lewat izinkan-akses-jaringan.bat */ }
        }
    }
}
