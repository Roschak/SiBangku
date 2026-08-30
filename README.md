# SiBangku - Platform Reservasi Meja Restoran Multi-Tenant (C# .NET 9)

SiBangku adalah platform Software-as-a-Service (SaaS) multi-tenant *white-label* untuk reservasi meja restoran. Seluruh basis kode telah sepenuhnya dimigrasi dari Node.js/TypeScript ke **C# .NET 9** dengan dukungan isolasi database PostgreSQL per tenant, visual seating map layout coordinates, schedulers otomatis, dan aplikasi administrasi berbasis CLI & web.

---

## 🏗️ Struktur Solusi (.NET SLN)

Seluruh proyek berada di dalam folder `src/` dan dihubungkan oleh file solusi [SiBangku.slnx](file:///D:/sertifikat/Apk_SiBangku/SiBangku.slnx):

1. **`SiBangku.Shared`** (Class Library): Menyimpan model data domain, DTO, konstanta, dan fungsi utilitas generator ID/slug/password.
2. **`SiBangku.Db`** (Class Library): Mengelola model Entity Framework Core (EF Core) untuk `ControlDbContext` (platform plane) dan `TenantDbContext` (tenant operational plane), lengkap dengan seeder platform.
3. **`SiBangku.ControlApi`** (Minimal API Web API): Mengelola operasional platform (registrasi, provisioning database tenant secara dinamis, subscriptions, dan log audit).
4. **`SiBangku.TenantApi`** (Minimal API Web API): Mengelola operasional spesifik per restoran (autentikasi staff, CRUD meja, visual koordinat layout, pengaturan branding).
5. **`SiBangku.Worker`** (Hosted Worker Service): Daemon scheduler yang berjalan di latar belakang untuk menonaktifkan tenant yang habis masa trial, membatalkan otomatis reservasi unpaid (15 menit), dan mencatat no-show (30 menit).
6. **`SiBangku.Cli`** (Console App): Aplikasi baris perintah administratif untuk login platform, pendaftaran tenant baru, perpanjangan trial, dan penghapusan database tenant.
7. **`SiBangku.Web`** (Blazor Web App): Antarmuka web interaktif yang menyajikan Portal Admin Control Plane (pendaftaran tenant) dan Portal Booking Pelanggan (white-label).
8. **`SiBangku.Tests`** (xUnit Project): Unit testing untuk utilitas generator dan integration testing in-memory untuk API endpoints.

---

## 🚀 Cara Menjalankan Solusi

### 1. Prasyarat
- Install **.NET 9.0 SDK** (atau versi lebih baru)
- Install **Docker & Docker Compose** (jika ingin menjalankan mode kontainer)
- Server **PostgreSQL** lokal (jika ingin menjalankan di lokal tanpa Docker)

### 2. Cara Cepat via Docker Compose (Rekomendasi)
Jalankan perintah berikut di root folder:
```bash
docker compose up --build
```
Hal ini akan secara otomatis mem-build seluruh kontainer .NET dan menjalankan database PostgreSQL:
- **Blazor Web App**: `http://localhost:3000`
- **Control Plane API**: `http://localhost:3001`
- **Tenant Plane API**: `http://localhost:3002`
- **PostgreSQL**: `localhost:5432`

---

## 🧪 Cara Menjalankan Unit & Integration Tests

Semua test (unit test utilitas & integration test API menggunakan database in-memory) dapat dijalankan dengan perintah:
```bash
dotnet test SiBangku.slnx
```

---

## 💻 Cara Menggunakan Administrative CLI Tool

Kompilasi CLI tool ke binari atau jalankan via `dotnet run`:

1. **Login ke Platform**:
   ```bash
   dotnet run --project src/SiBangku.Cli/SiBangku.Cli.csproj login admin admin
   ```
   *Catatan: Akun platform admin default adalah `admin/admin`.*

2. **Melihat Daftar Tenant**:
   ```bash
   dotnet run --project src/SiBangku.Cli/SiBangku.Cli.csproj tenant list
   ```

3. **Provisioning / Membuat Tenant Restoran Baru**:
   Perintah ini akan membuat database PostgreSQL fisik baru secara dinamis, menerapkan skema, dan mencatat log audit:
   ```bash
   dotnet run --project src/SiBangku.Cli/SiBangku.Cli.csproj tenant create "Avenue Coffee" "Avenue Resto" owner@avenue.com 60
   ```

4. **Memperpanjang Masa Trial**:
   ```bash
   dotnet run --project src/SiBangku.Cli/SiBangku.Cli.csproj tenant extend <tenantId> 30
   ```

5. **Menghapus Tenant (Aman & Permanen)**:
   ```bash
   dotnet run --project src/SiBangku.Cli/SiBangku.Cli.csproj tenant delete <tenantId>
   ```

6. **Melihat Log Audit**:
   ```bash
   dotnet run --project src/SiBangku.Cli/SiBangku.Cli.csproj audit
   ```
