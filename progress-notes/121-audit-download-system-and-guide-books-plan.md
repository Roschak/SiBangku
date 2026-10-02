# Catatan Progress #121: Audit Sistem Download, Rencana & Implementasi Guide Book Multi-Halaman

**Tanggal**: 1 Oktober 2026  
**Status**: In Progress / Checkpoint Pencatatan Sesuai Permintaan User  

---

## 📌 Ringkasan Status Pengerjaan (Sudah & Belum)

Dokumen ini mencatat secara transparan dan detail kondisi sistem saat ini, apa saja yang **sudah ditemukan & diperbaiki**, serta apa saja yang **belum dan siap dikerjakan pada tahap berikutnya**.

---

### 🟢 1. YANG SUDAH SELESAI / SUDAH DILAKUKAN (COMPLETED)

#### A. Audit Mendalam Fungsionalitas Download
1. **Analisis Bug Port Hardcoded (Port 3001):**
   - Ditemukan bahwa tautan unduhan APK Android dan Desktop EXE di `TenantAdmin.razor` (baris 1390, 1405) serta `ControlAdmin.razor` (baris 1156, 1171, 1186) mengarah langsung ke `http://localhost:3001/api/v1/tenants/...`.
   - Hal ini bermasalah jika aplikasi diakses melalui tablet/smartphone di jaringan lokal (misal: `http://192.168.x.x:3000`), karena perangkat mencari ke port 3001 milik dirinya sendiri (*Connection Refused*).
2. **Analisis Bug Dummy Tombol "Ekspor CSV":**
   - Pada `TenantAdmin.razor` (baris 794 pada tab Menu dan baris 1279 pada tab Laporan), tombol "Ekspor CSV" sebelumnya **hanya menampilkan notifikasi alert teks** tanpa mengunduh berkas fisik CSV sama sekali ke perangkat user.
3. **Analisis MIME Type Static Files ASP.NET Core:**
   - Ekstensi biner `.apk`, `.exe`, `.bat`, dan `.csv` belum terdaftar di MIME Provider bawaan `SiBangku.Web`, sehingga pemanggilan statis langsung ke `/downloads/...` berisiko menghasilkan error HTTP 404.

#### B. Perbaikan Fondasi Sistem Unduhan (Backend & Frontend Helper)
1. **Penyediaan Endpoint Unduhan Universal Terintegrasi (`SiBangku.Web/Program.cs`):**
   - `/download/apk/{tenantCode?}`: Mencoba mengambil paket khusus dari ControlApi; jika ControlApi mati/unreachable, otomatis melakukan streaming biner universal `SiBangku-Universal-App.apk` (7.3 MB) dengan nama file `SiBangku-{tenantCode}.apk`.
   - `/download/exe/{tenantCode?}`: Mencoba mengambil dari ControlApi; jika gagal, fallback langsung ke `SiBangku-Desktop-App.exe` (~4.6 KB).
   - `/download/package/{tenantCode?}`: Mengunduh paket ZIP arsip ruang kerja tenant.
   - `/download/bat/{tenantCode?}`: Menghasilkan skrip batch launcher dinamis sesuai domain/host dan tenant yang aktif.
2. **Registrasi MIME Types di StaticFileOptions:**
   - Didaftarkan `.apk` (`application/vnd.android.package-archive`), `.exe` (`application/vnd.microsoft.portable-executable`), `.bat` (`application/x-bat`), `.zip` (`application/zip`), dan `.csv` (`text/csv`).
3. **Penambahan Engine Ekspor Berkas di Browser (`sibangku-app.js`):**
   - Ditambahkan utilitas global `window.SiBangkuDownload.downloadText(filename, content, mimeType)` dan `window.SiBangkuDownload.downloadUrl(url, filename)` yang memungkinkan pengunduhan data tabel lokal langsung ke file CSV/teks tanpa reload.

#### C. Pemetaan & Perancangan Arsitektur Guide Book
1. **Pemetaan Super Admin (`ControlAdmin.razor`):**
   - 4 Halaman/Tab: `tenants` (Direktori Tenant), `provision` (Provisioning DB Baru), `audit` (Log Aktivitas), dan `security` (Keamanan & Profil).
   - Rencana: Master Modal 7 Bab + In-Page Contextual Guide Card di tiap tab.
2. **Pemetaan Tenant Admin (`TenantAdmin.razor`):**
   - 11 Halaman/Tab: `overview`, `reservations`, `tables`, `menu`, `branding`, `operational`, `staff`, `payment`, `reports`, `apk`, `qrcode`.
   - Rencana: Master Modal 11 Bab + In-Page Contextual Guide Card di tiap tab.
3. **Pemetaan Reservasi Meja (`Booking.razor`):**
   - Halaman publik reservasi tamu restoran.
   - Rencana: Banner visual 5 langkah interaktif + Tombol toggle Panduan Reservasi + Modal FAQ & Tata Cara Reservasi Lengkap.

---

### 🟡 2. YANG BELUM SELESAI & AKAN DILANJUTKAN (PENDING TO DO)

1. **Pemasangan & Penyempurnaan Tautan Unduhan di Antarmuka (UI):**
   - Menghubungkan fungsi `ExportMenuCsv()` di tab Menu agar menghasilkan file `menu-{tenantCode}.csv` riil berisikan daftar menu.
   - Menghubungkan tombol "Ekspor CSV" di tab Laporan agar menghasilkan file `laporan-reservasi-{tenantCode}.csv` riil berisikan daftar reservasi.
   - Mengubah semua link biner di `TenantAdmin.razor` dan `ControlAdmin.razor` agar menggunakan endpoint baru `/download/apk/...` dan `/download/exe/...`.
   - Menambahkan tombol unduh APK Android pada modal sukses provisioning Super Admin.
   - Menambahkan tombol unduh langsung gambar QR Code PNG pada tab Standee.
2. **Implementasi Komponen Guide Book di Super Admin (`ControlAdmin.razor`):**
   - Menambahkan tombol "📖 Buku Panduan Super Admin" di header navbar.
   - Membuat markup & modal dialog Master Guide Book (7 Bab panduan komprehensif).
   - Memasang kartu panduan kontekstual (bisa expand/collapse) pada ke-4 tab Super Admin.
3. **Implementasi Komponen Guide Book di Tenant Admin (`TenantAdmin.razor`):**
   - Menambahkan tombol "📖 Buku Panduan Admin Resto" di header & sidebar menu.
   - Membuat markup & modal dialog Master Guide Book (11 Bab panduan operasional resto).
   - Memasang kartu panduan kontekstual (bisa expand/collapse) pada ke-11 tab Tenant Admin.
4. **Implementasi Panduan Reservasi Meja di Halaman Tamu (`Booking.razor`):**
   - Menambahkan tombol dan banner interaktif "📖 Panduan Cara Reservasi Meja".
   - Menampilkan visual step-by-step 5 langkah (Pilih Resto -> Slot & Tamu -> Pilih Meja -> Data Kontak -> Tiket Booking).
   - Membuat Modal FAQ Reservasi (toleransi jam kedatangan, rombongan besar, DP/deposit).
   - Menambahkan micro-hints panduan di setiap kolom formulir pemesanan.
5. **End-to-End Testing & Verifikasi Masalah:**
   - Menjalankan seluruh rangkaian tes (`dotnet test`).
   - Melakukan pengujian integrasi download berkas APK, EXE, CSV.
   - Melakukan audit keamanan, responsivitas, dan validasi aliran booking dari awal sampai tiket terbit.
   - Menyusun laporan audit menyeluruh hasil temuan masalah beserta solusinya.
