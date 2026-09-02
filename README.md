# 🍽️ SiBangku - Platform Manajemen & Reservasi Meja Restoran Multi-Tenant

**SiBangku** adalah platform *Software-as-a-Service (SaaS)* multi-tenant *white-label* modern untuk sistem pemesanan dan manajemen meja restoran. Seluruh arsitektur dibangun di atas **C# .NET 9** dengan isolasi fisik basis data PostgreSQL per-tenant, alur bisnis mandiri, pemisahan antarmuka (portal) terdedikasi, serta desain antarmuka modern berbasis **Management System UI Kit**.

---

## 🌟 Pemisahan 3 Portal Terdedikasi (Dedicated Portals)

Sistem antarmuka web SiBangku telah dipisahkan secara modular menjadi **3 portal independen**, masing-masing disesuaikan untuk target pengguna dan alur kerja spesifik:

```
                               ┌────────────────────────────────────────┐
                               │       SiBangku Platform Ecosystem      │
                               └───────────────────┬────────────────────┘
                                                   │
         ┌─────────────────────────────────────────┼────────────────────────────────────────┐
         │                                         │                                        │
         ▼                                         ▼                                        ▼
┌─────────────────────────┐               ┌─────────────────────────┐              ┌─────────────────────────┐
│ 1. Portal Tamu / Publik │               │  2. Portal Admin Resto  │              │ 3. Super Admin Control  │
│   (Customer & Booking)  │               │   (Restaurant Client)   │              │   (Platform SaaS Owner) │
├─────────────────────────┤               ├─────────────────────────┤              ├─────────────────────────┤
│ • URL: / & /booking     │               │ • URL: /admin           │              │ • URL: /control-admin   │
│ • Layout: CustomerLayout│               │ • Layout: Resto Admin   │              │ • Layout: Control Plane │
│ • Tanpa sidebar admin   │               │ • Sidebar Restoran      │              │ • Sidebar SaaS Admin    │
│ • Pemesanan meja online │               │ • Kelola Reservasi      │              │ • Provisioning Tenant   │
│ • Pilihan slot & tiket  │               │ • Katalog & Layout Meja │              │ • Isolasi DB PostgreSQL │
│ • QR Code digital pass  │               │ • Standee QR Code Cetak │              │ • Log Audit & Keamanan  │
└─────────────────────────┘               └─────────────────────────┘              └─────────────────────────┘
```

### 1. 🌐 Portal Tamu / Pengunjung (`/` & `/booking`)
*Khusus untuk pelanggan dan pengunjung restoran yang ingin memesan meja secara mandiri.*
- **Akses Langsung**: `/` (Beranda & pencarian resto) dan `/booking?tenant=KODE_RESTO` (Formulir pemesanan meja).
- **Desain Khusus**: Menggunakan `CustomerLayout` dengan *clean top navigation*, banner interaktif, dan tanpa sidebar admin yang mengganggu.
- **Fitur Utama**:
  - **Pencarian Cepat Outlet**: Pelanggan dapat memasukkan kode restoran atau memilih contoh demo (`DISTRO-AVENUE`, `PADANG-MERDEKA`, `KOPI-SENJA`).
  - **White-Label Dynamic Theme**: Warna dan branding halaman booking secara otomatis menyesuaikan konfigurasi palet warna masing-masing restoran mitra.
  - **Interactive Booking Wizard**:
    1. Pemilihan jumlah tamu (1-8+ orang) dan tanggal reservasi.
    2. Pemilihan slot waktu real-time dengan indikator kapasitas kuota per jam.
    3. Pengisian formulir kontak (Nama & WhatsApp) serta catatan khusus / *dietary requirements*.
  - **Digital Confirmation Pass**: Menampilkan tiket booking lengkap dengan ID unik, status pembayaran, QR Code verifikasi, dan tombol cetak bukti reservasi.

---

### 2. 🏪 Portal Admin Restoran / Mitra Klien (`/admin`)
*Khusus untuk pemilik restoran, manajer outlet, dan staf operasional.*
- **Akses**: `/admin` (Memerlukan autentikasi kode restoran, email, dan kata sandi staff).
- **Desain Khusus**: Antarmuka **Management System UI Kit** dengan sidebar navigasi outlet, topbar status online, dan kartu metrik operasional.
- **Fitur Utama**:
  - **Ringkasan & Metrik (Dashboard)**: Statistik total reservasi, reservasi *pending*, terkonfirmasi, dan dibatalkan.
  - **Kelola Reservasi Pelanggan**: Filter pencarian instan berdasarkan kode booking atau nama tamu, tombol persetujuan staf (*Confirm*), penanda lunas (*Paid*), dan pembatalan (*Cancel*).
  - **Katalog & Manajemen Meja**: Menambah meja baru dengan nomor meja dan kapasitas kursi, daftar meja aktif, koordinat layout (X, Y), dan hapus meja.
  - **Marketing Standee & QR Code Kit**: Generator poster akrilik/banner QR Code siap cetak (mendukung format A4 Portrait PDF) untuk dipasang di pintu masuk resto atau meja makan.
  - **Branding & Jam Operasional**: Kustomisasi warna visual (*Primary & Secondary Color*), tipografi font, jam buka/tutup resto, durasi makan per slot, dan batas kapasitas tamu per jam.

---

### 3. ⚙️ Portal Platform Super Admin / Control Panel (`/control-admin`)
*Khusus untuk pemilik SaaS platform (Super Admin) untuk mengelola ekosistem multi-tenant.*
- **Akses**: `/control-admin` (Kredensial bawaan: `admin` / `admin`).
- **Desain Khusus**: Antarmuka **Enterprise SaaS Control Plane UI Kit** dengan sidebar gelap terpadu, cluster health badge, dan kartu analitik global.
- **Fitur Utama**:
  - **Dashboard SaaS Global**: Metrik total tenant terdaftar, tenant dalam masa uji coba (*trial*), pelanggan berbayar (*active*), dan jumlah database PostgreSQL yang terisolasi.
  - **Tenant Provisioning Engine**: Formulir 1-klik untuk mendaftarkan mitra resto baru yang secara otomatis membuat database fisik PostgreSQL baru, menjalankan migrasi skema EF Core, dan men-generate kata sandi sementara.
  - **Direktori Tenant & Kontrol**: Pencarian tenant, perpanjangan masa trial (+30 Hari), dan penghapusan database tenant secara aman.
  - **Log Audit Sistem**: Pemantau 100 aktivitas terakhir di seluruh platform dengan pencatatan waktu UTC, ID tenant, modul aksi, dan parameter JSON.
  - **Keamanan Akun Super Admin**: Formulir pengubahan kata sandi administrator platform.

---

## 🎨 Desain Sistem: Management System UI Kit

Sistem antarmuka web SiBangku menerapkan prinsip desain **Management System UI Kit** modern:
- **Design Tokens & Variabel CSS**: Sistem warna berbasis palet Slate & Indigo modern (`--ms-primary`, `--ms-slate-50` hingga `--ms-slate-950`, `--ms-radius-sm` hingga `--ms-radius-2xl`).
- **Tipografi**: Menggunakan Google Fonts *Plus Jakarta Sans* untuk keterbacaan antarmuka dan *JetBrains Mono* untuk kode booking serta ID teknis.
- **Komponen UI Kit**:
  - *Stat Cards* dengan ikon berlatar belakang lembut (*subtle badges*) dan nilai metrik yang jelas.
  - *Data Tables* dengan baris interaktif (*hover elevation*), status dots beranimasi, dan tombol aksi ringkas.
  - *Interactive Stepper Wizard* untuk alur booking multi-tahap yang intuitif bagi tamu.
  - *Badges & Pills* dengan indikator status warna hijau (aktif/lunas), kuning (pending/trial), dan merah (batal/expired).
  - *Print Stylesheet (`@media print`)* untuk poster QR Code mandiri tanpa elemen web yang tidak perlu.

---

## 🏗️ Arsitektur Solusi (.NET 9 & PostgreSQL)

Seluruh proyek berada di dalam folder `src/` dan dihubungkan oleh file solusi [SiBangku.slnx](file:///D:/sertifikat/Apk_SiBangku/SiBangku.slnx):

```
Apk_SiBangku/
├── src/
│   ├── SiBangku.Shared/        # Domain Models, DTOs, Enums, ID & Hash Generators
│   ├── SiBangku.Db/            # EF Core DbContexts (ControlDbContext & TenantDbContext)
│   ├── SiBangku.ControlApi/    # Super Admin Web API (Tenant CRUD, DB Provisioning, Audit)
│   ├── SiBangku.TenantApi/     # Tenant Web API (Staff Auth, Table CRUD, Reservations, Settings)
│   ├── SiBangku.Worker/        # Background Service (Auto-cancel Unpaid & Expire Trials)
│   ├── SiBangku.Web/           # Blazor Server Web App (.NET 9 UI with 3 Dedicated Portals)
│   ├── SiBangku.Cli/           # Command-Line Management Tool
│   └── SiBangku.Tests/         # Unit & Integration Tests (xUnit + In-Memory Db)
├── docker-compose.yml          # Multi-container orchestration
└── SiBangku.slnx               # Visual Studio / .NET Solution File
```

---

## 🚀 Panduan Menjalankan Sistem

### Opsi 1: Menggunakan Docker Compose (Direkomendasikan)
Jalankan perintah berikut di root direktori proyek:
```bash
docker compose up --build
```
Layanan akan aktif pada endpoint berikut:
- 🌐 **Blazor Web Application**: `http://localhost:3000`
- ⚙️ **Control API (Super Admin)**: `http://localhost:3001`
- 🏪 **Tenant API (Restaurant Plane)**: `http://localhost:3002`
- 🛢️ **PostgreSQL Server**: `localhost:5432`

---

### Opsi 2: Menjalankan Secara Lokal (.NET CLI)

1. **Pastikan PostgreSQL berjalan lokal**, lalu build solusi:
   ```bash
   dotnet build SiBangku.slnx
   ```

2. **Jalankan Control API** (Terminal 1):
   ```bash
   dotnet run --project src/SiBangku.ControlApi/SiBangku.ControlApi.csproj
   ```

3. **Jalankan Tenant API** (Terminal 2):
   ```bash
   dotnet run --project src/SiBangku.TenantApi/SiBangku.TenantApi.csproj
   ```

4. **Jalankan Background Worker** (Terminal 3):
   ```bash
   dotnet run --project src/SiBangku.Worker/SiBangku.Worker.csproj
   ```

5. **Jalankan Web Portal Blazor** (Terminal 4):
   ```bash
   dotnet run --project src/SiBangku.Web/SiBangku.Web.csproj
   ```

---

## 🧪 Pengujian Unit & Integrasi

Seluruh pengujian unit generator dan integration testing API dapat dijalankan dengan perintah:
```bash
dotnet test SiBangku.slnx
```
> **Hasil Pengujian**: 14/14 Tests Passed (0 Warnings, 0 Errors).

---

## 💻 Panduan Penggunaan CLI Admin (`SiBangku.Cli`)

Selain antarmuka web, administrator platform dapat menggunakan CLI tool bawaan:

1. **Autentikasi ke Platform**:
   ```bash
   dotnet run --project src/SiBangku.Cli/SiBangku.Cli.csproj login admin admin
   ```

2. **Melihat Daftar Tenant**:
   ```bash
   dotnet run --project src/SiBangku.Cli/SiBangku.Cli.csproj tenant list
   ```

3. **Provisioning Tenant Baru Secara Dinamis**:
   ```bash
   dotnet run --project src/SiBangku.Cli/SiBangku.Cli.csproj tenant create "Avenue Kuliner" "Avenue Resto" owner@avenue.com 60
   ```

4. **Perpanjang Masa Trial (+30 Hari)**:
   ```bash
   dotnet run --project src/SiBangku.Cli/SiBangku.Cli.csproj tenant extend <tenantId> 30
   ```

5. **Hapus Tenant & Database Fisik**:
   ```bash
   dotnet run --project src/SiBangku.Cli/SiBangku.Cli.csproj tenant delete <tenantId>
   ```

6. **Lihat Log Audit Sistem**:
   ```bash
   dotnet run --project src/SiBangku.Cli/SiBangku.Cli.csproj audit
   ```

---

---

## 🔒 Panduan Mengubah Nama & Kata Sandi di Control Panel

Administrator platform (Super Admin) dapat mengubah nama tampilan profil dan kata sandi login melalui antarmuka web Control Panel:

### 1. Mengubah Nama Administrator & Username/Email
1. Masuk ke **Control Panel** di URL `/control-admin` dengan kredensial Super Admin.
2. Klik menu **"Profil & Kata Sandi"** pada sidebar kiri (atau ikon 👤).
3. Pada kartu **"Profil Super Admin Platform"**:
   - Masukkan **Nama Lengkap / Tampilan Baru** (misal: *Owner Platform SiBangku* atau nama asli Anda).
   - Masukkan **Email / Username Baru** yang ingin digunakan untuk login.
4. Klik tombol **"Simpan Perubahan Nama & Profil"**.
5. Nama Anda akan langsung diperbarui di sidebar, topbar, serta tercatat di log audit sistem.

### 2. Mengubah Kata Sandi (Password)
1. Pada menu **"Profil & Kata Sandi"** di `/control-admin`.
2. Pada kartu **"Ganti Kata Sandi (Password)"**:
   - Masukkan **Kata Sandi Baru** (minimal 5 karakter).
   - Masukkan **Konfirmasi Kata Sandi Baru**.
3. Klik tombol **"Perbarui Kata Sandi Super Admin"**.
4. Kata sandi baru akan di-hash menggunakan algoritma **BCrypt** yang aman dan langsung aktif untuk login berikutnya.

---

## 🔑 Kredensial & Demo Data Bawaan

| Portal | URL | Kredensial Default | Keterangan |
|---|---|---|---|
| **Portal Tamu** | `http://localhost:3000/` & `/booking` | *Tidak memerlukan login* | Khusus pengunjung. Kode demo: `DISTRO-AVENUE`, `PADANG-MERDEKA`, `KOPI-SENJA` |
| **Portal Admin Resto** | `http://localhost:3000/admin` | Kode Resto: `DISTRO-AVENUE`<br>Email: `owner@avenue.com`<br>Kata Sandi: *(Didapat saat provisioning)* | Khusus staf / manajer restoran mitra |
| **Platform Super Admin** | `http://localhost:3000/control-admin` | Username: `admin`<br>Kata Sandi: `admin` | Khusus pemilik platform SaaS (ubah nama & pw di menu Profil) |

