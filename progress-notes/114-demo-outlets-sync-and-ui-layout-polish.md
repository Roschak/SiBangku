# Progress Note: Sinkronisasi Demo Outlet, Direktori Publik, & Perbaikan UI Denah Meja

**Tanggal:** 11 September 2026  
**Status:** Sukses (0 Warnings, 0 Errors, 14/14 Unit Tests Passed)

---

## 1. Rangkuman Perubahan Utama

### A. Sinkronisasi Data Demo Outlet & Direktori Publik Berbasis Privasi
- **Endpoint API Publik:** Mengimplementasikan endpoint aman GET /api/v1/public/outlets di SiBangku.ControlApi yang hanya mengekspos field non-sensitif (	enantCode, estaurantName, status).
- **Pemisahan Kategori:** 
  - **Sudah Berlangganan (ACTIVE):** Menampilkan daftar restoran mitra resmi.
  - **Sedang Demo (TRIAL):** Menampilkan outlet demo yang dapat langsung diuji coba reservasi.
- **Privasi Terjamin:** Kredensial basis data, kata sandi, email admin, dan histori transaksi tetap terisolasi penuh dan tidak diekspos ke antarmuka publik.
- **Modal Direktori Outlet:** Ditambahkan modal pencarian dan tab filter (*Semua*, *Berlangganan*, *Demo*) dengan tombol langsung Kunjungi ke halaman reservasi outlet tersebut.

### B. Perbaikan Data Binding Simulasi Denah Meja (Home.razor)
- **Masalah Sebelumnya:** Teks menampilkan kode mentah Meja 0@SelectedDemoTable.
- **Solusi:** 
  - State variabel C# diperbarui menjadi SelectedDemoTableNumber (string) dan SelectedDemoTable (int).
  - Event @onclick pada kartu meja mengirim nomor meja yang diklik (SelectDemoTable("Meja 01", 1), "Meja 02", "Meja 04", "Meja 06").
  - Kartu ringkasan meja terpilih dan tombol aksi langsung menampilkan @SelectedDemoTableNumber secara dinamis dan rapi.

### C. Penataan Kotak, Ikon Perisai, dan Whitespace Hero Section
- **Ikon Kotak Stabil & Tegak:** Ikon perisai (i-shield-check) dan metrik stat lainnya kini dibungkus dalam tile bundar seragam 44x44px (ounded-circle, background emas transparan, border halus) sehingga tidak miring, tidak meluap (*overflow*), dan proporsional di semua resolusi layar.
- **Konsistensi Radius Kartu:** Seluruh kartu fitur dan komponen denah distandardisasi dengan order-radius: 16px; (ounded-2xl).
- **Whitespace Lega:** Jarak vertikal antara input pencarian, tombol aksi hero, dan chip outlet demo diperlonggar (mb-4, my-4, mt-4).

---

## 2. Hasil Verifikasi Sistem

| Pengujian | Status | Keterangan |
|---|---|---|
| dotnet build SiBangku.slnx | **LULUS** | 0 Warning, 0 Error di seluruh 7 proyek |
| dotnet test SiBangku.Tests | **LULUS** | 14/14 Unit Tests Passed (100%) |
| Data Binding Denah | **LULUS** | Meja 01, 02, 04, 06 terpilih secara dinamis |
| Direktori Publik | **LULUS** | Pemisahan Mitra Berlangganan & Demo dengan isolasi privasi |
