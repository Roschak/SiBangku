# C# FASE 10: Redesain Frontend Animated Scroll & Eksekusi Tenant Update Guide

**Status:** ✅ COMPLETED  
**Tanggal:** 2026-09-10  
**Lingkup:** Frontend (`src/SiBangku.Web`), CSS, JavaScript Interop, Asset Branding, Dokumentasi Perubahan. Backend API tidak disentuh sama sekali.

---

## 1. Latar Belakang & Tujuan
1. **Redesain Frontend Bertema Fine-Dining Hospitality:**
   - Menghadirkan identitas visual bertaraf fine dining (*Grand Noir Luxury*): latar belakang *Obsidian Espresso* (`#0B0908`), aksen *Champagne Gold* (`#D4AF37`), serta perpaduan tipografi elegan *Playfair Display* dan *Plus Jakarta Sans*.
   - Menerapkan sistem **Animated Scroll** yang responsif dan halus untuk meningkatkan keterlibatan tamu restoran dan impresi brand.
2. **Eksekusi Penuh Panduan Tenant (`tenant-update-guide.md`):**
   - Mengimplementasikan seluruh 10 modul fungsional serta perlengkapan outlet pada portal pengelola restoran (`/admin`) agar tenant dapat mengontrol operasional, reservasi, denah meja, menu, branding, staf, pembayaran, laporan, dan sinkronisasi APK secara mandiri.
3. **Integritas Backend:**
   - Memastikan tidak ada perubahan sama sekali pada arsitektur maupun logika backend (`SiBangku.Db`, `SiBangku.ControlApi`, `SiBangku.TenantApi`, `SiBangku.Worker`, `SiBangku.Shared`).

---

## 2. Rincian Berkas yang Ditambahkan & Dimodifikasi

### A. Konfigurasi Sistem & Build
- `global.json`:
  - Menambahkan `"rollForward": "major"` dan `"allowPrerelease": true` agar build solution kompatibel dengan runtime .NET 10 SDK yang terpasang tanpa konflik target `net9.0`.

### B. Desain Global, Aset Visual & Interaktivitas (Frontend Assets)
- `src/SiBangku.Web/wwwroot/app.css`:
  - Menambahkan styling `html { scroll-behavior: smooth; }`.
  - Mengimplementasikan bar progres scroll atas (`#sibangku-scroll-progress`) dengan gradasi gold berkilau.
  - Mengimplementasikan tombol *Back to Top* dinamis (`#sibangku-back-to-top`) lengkap dengan kalkulasi lingkaran SVG progress stroke offset.
  - Menambahkan styling visual untuk divider hairline emas (`.ms-scroll-divider`), rel lompat cepat (`.ms-quick-jump-rail`), kartu counter angka (`.stat-counter-card`), lintasan alur reservasi (`.step-flow-wrapper`), kartu zonasi denah (`.floorplan-zone-card`), dan simulasi meja fine-dining (`.table-sim-luxury`).
- `src/SiBangku.Web/wwwroot/js/sibangku-app.js`:
  - Membangun modul `window.SiBangkuScroll` yang menangani scroll event throttling berbasis `requestAnimationFrame`, kalkulasi persentase pembacaan halaman, efek parallax pada ambient bloom, dan scrollspy untuk navigasi cepat.
  - Memperbarui modul `window.SiBangkuAnime` dengan dukungan `IntersectionObserver` untuk menganimasikan angka statistik, garis pandu langkah, ekspansi garis aksen emas, serta mempertahankan fungsionalitas pemindai QR kamera (`html5-qrcode`) dan preferensi bahasa lokal.
- `src/SiBangku.Web/wwwroot/brand/`:
  - Menambahkan aset SVG resolusi tinggi: `Navbar-Header-Logo.svg`, `Navbar-Header-Logo-Light.svg`, `Favicon Browser.svg`, dan `App-Icon_PWA-Icon.svg`.
- `icon-logo.apk/`:
  - Menyimpan aset master icon dan favicon untuk paket distribusi aplikasi.

### C. Layout & Navigasi Publik
- `src/SiBangku.Web/Components/App.razor`:
  - Menghubungkan Google Fonts (*Playfair Display*, *Plus Jakarta Sans*, *JetBrains Mono*) dan script pendukung interaktivitas (`sibangku-app.js`, `anime.min.js`, `html5-qrcode.min.js`).
- `src/SiBangku.Web/Components/Layout/CustomerLayout.razor`:
  - Memasang bar progres scroll atas dan tombol floating circular scroll indicator.
  - Menambahkan rel shortcut cepat dan link anchor navigasi (`#simulasi`, `#keunggulan`, `#alur`, `#teknologi`).
- `src/SiBangku.Web/Components/Layout/PortalLayout.razor`:
  - Dibuat khusus sebagai kerangka tata letak terisolasi untuk portal admin tenant (`/admin`) dan portal platform (`/control-admin`).

### D. Halaman Publik (Landing Page & Reservasi Meja)
- `src/SiBangku.Web/Components/Pages/Home.razor`:
  - Merombak total Hero Section dengan pulse radar live, tombol aksi cepat, dan chip demo outlet instan (`GRAND-BISTRO`, `PADANG-MERDEKA`, `KOPI-SENJA`).
  - Menambahkan simulator denah 3-zonasi interaktif (*VIP Suite*, *Main Dining Hall*, *Skyline Terrace*) dengan pemilihan meja real-time dan CTA reservasi langsung.
  - Memasang 4 counter metrik bisnis berkekuatan animasi scroll (*100% Anti Double-Booking*, *< 30s Konfirmasi Cepat*, *99.9% Keandalan*, *24/7 Reservasi*).
  - Mengintegrasikan timeline 3 langkah reservasi mandiri dan kartu kutipan eksekutif hospitality.
- `src/SiBangku.Web/Components/Pages/Booking.razor`:
  - Menyediakan chip pemilihan outlet instan untuk memudahkan uji coba dan pemesanan tamu langsung.

### E. Portal Pengelola Restoran (`TenantAdmin.razor`) Sesuai `tenant-update-guide.md`
- `src/SiBangku.Web/Components/Pages/TenantAdmin.razor`:
  Dirombak secara komprehensif menjadi 10 modul operasional lengkap:
  1. **Modul Overview (Ringkasan & Metrik):** Indikator okupansi harian, perkiraan omzet, status kapasitas meja, dan panel tindakan cepat.
  2. **Modul Kelola Reservasi:** Tabel reservasi dengan filter status (Semua, Menunggu Pembayaran, Terkonfirmasi, Selesai, Batal), pencarian nama/kode booking, serta tombol aksi konfirmasi dan pembatalan.
  3. **Modul Denah Meja (Interactive Canvas):** Kanvas visualisasi tata letak meja 2D berbasis koordinat X/Y, pemilih bentuk meja (persegi, bundar, panjang), penambahan meja baru, dan pengubahan status operasional meja secara interaktif.
  4. **Modul Manajemen Menu:** Pengelompokan kategori makanan/minuman, pengelolaan item harga, toggle ketersediaan, badge filter, serta fungsi Ekspor dan Impor CSV katalog menu.
  5. **Modul Kustomisasi Branding:** Color picker real-time untuk warna primer, sekunder, latar belakang, dan teks, pemilihan font tipografi, konfigurasi logo/favicon/banner, dan panel simulasi visual (*Live Preview Simulator*).
  6. **Modul Jam Operasional:** Pengaturan jam buka-tutup, pilihan hari aktif mingguan, durasi per slot makan, kapasitas maksimum tamu, dan batas reservasi di muka.
  7. **Modul Manajemen Staf:** Pembuatan akun staf outlet, selektor peran (*Admin Resto*, *Manajer*, *Staf Meja/Kasir*), matriks hak akses transparan, dan fitur reset kata sandi.
  8. **Modul Konfigurasi Pembayaran:** Opsi gateway QRIS Dinamis, integrasi rekening bank (BCA, Mandiri, BRI, BNI), konfirmasi bukti bayar via WhatsApp Business, dan pembayaran tunai di tempat (*Cash on Arrival*).
  9. **Modul Laporan & Analitik:** Visualisasi gauge rata-rata okupansi, analitik breakdown omzet per kanal pembayaran, identifikasi jam-jam sibuk (*Peak Hours*), dan tombol ekspor laporan bisnis.
  10. **Modul Auto-Update & Sinkronisasi APK:** Matriks status sinkronisasi portal web dengan APK native tenant, log riwayat update, dan tombol picu *Build & Deploy Update*.
  11. **Hospitality Kit Standee QR:** Generator poster akrilik siap cetak ukuran A4/A5 yang memuat QR code unik tenant untuk ditaruh di pintu masuk atau meja pelanggan.

---

## 3. Verifikasi & Eksekusi

1. **Verifikasi Kompilasi Solution:**
   - Dijalankan perintah: `dotnet build SiBangku.slnx`
   - Hasil: **`0 Warning(s), 0 Error(s)`** pada seluruh proyek.
2. **Rebuild & Deployment Docker Container:**
   - Dijalankan perintah: `docker compose up -d --build web`
   - Kontainer `sibangku-web-csharp` berhasil di-build ulang dengan image terbaru dan langsung aktif di port `3000`.
3. **Verifikasi Akses Halaman Web:**
   - Beranda Pelanggan (`http://localhost:3000`): Berjalan normal dengan animated scroll dan tema fine-dining.
   - Halaman Reservasi (`http://localhost:3000/booking`): Berjalan normal dengan chip demo tenant.
   - Portal Admin Tenant (`http://localhost:3000/admin`): Form login tenant dan seluruh 10 modul manajemen outlet terintegrasi dengan baik.

---

## 4. Status Integritas Backend
- Proyek backend (`SiBangku.Db`, `SiBangku.ControlApi`, `SiBangku.TenantApi`, `SiBangku.Worker`, `SiBangku.Shared`) **tidak dimodifikasi**. Seluruh fungsionalitas murni dijalankan pada lapisan presentasi front-end Blazor Server dan CSS/JS client.
