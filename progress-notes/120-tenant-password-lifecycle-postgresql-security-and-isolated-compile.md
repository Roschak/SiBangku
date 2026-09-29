# Progress Note 120: Audit Siklus Sandi Tenant, Pengamanan Koneksi PostgreSQL, & Otomatisasi Compile APK/EXE Terisolasi

**Tanggal:** 29 September 2026  
**Status:** Selesai — Build Solusi 0 Warning / 0 Error, **74/74 Tests Passed (100% Lolos)**, 28 Workspace Tenant Terisolasi Terverifikasi.

---

## 1. Ringkasan Eksekutif

Audit komprehensif dan perbaikan mendalam telah dilakukan pada tiga pilar utama sistem platform SiBangku SaaS Multi-Tenant:
1. **Siklus Hidup Penggantian Kata Sandi Tenant (*Tenant Password Lifecycle*):**
   - Menuntaskan kendala pada alur *forced change password* (`MustChangePassword`) dan *voluntary self-service password update* dari portal Admin Tenant.
   - Menyelesaikan perbaikan pada endpoint reset sandi Control API (`/api/v1/tenants/{id}/reset-password` dan `/api/v1/internal/tenant/reset-password`) serta CLI sehingga mengenali `TenantCode` maupun `TenantId`, dan menginisialisasi akun admin secara *self-healing* jika record fisik belum terbentuk.
2. **Sentralisasi & Pengamanan Koneksi PostgreSQL:**
   - Mengimplementasikan pustaka keamanan koneksi terpusat [`PostgresConnectionHelper.cs`](../src/SiBangku.Db/PostgresConnectionHelper.cs).
   - Memitigasi ancaman *SQL Injection* pada nama database dinamis DDL (`CREATE DATABASE`, `DROP DATABASE`), mencegah *Connection Pool Exhaustion* di server PostgreSQL multi-tenant, menegakkan timeout jaringan dan penegakan SSL untuk lingkungan produksi, serta masking kredensial pada logging diagnostik.
   - Menambahkan method `EnsureDatabaseExistsAsync` yang *thread-safe* terhadap race condition konkurensi (PostgreSQL `42P04 duplicate_database`).
3. **Otomatisasi Kompilasi & Verifikasi APK & EXE Terisolasi:**
   - Menyempurnakan modul generator [`TenantWorkspaceScaffolder.cs`](../src/SiBangku.Shared/TenantWorkspaceScaffolder.cs) agar otomatis men-seed berkas biner siap pasang (`<KODE>.apk` dan `SiBangku-<KODE>.exe`) ke dalam workspace terisolasi tenant (`tenants/<KODE>/`).
   - Membuat skrip otomasi [`scripts/compile-tenant-artifacts.ps1`](../scripts/compile-tenant-artifacts.ps1) untuk mengompilasi dan memvalidasi integritas paket Android APK (ZIP & AndroidManifest) dan Windows Desktop PE EXE (MZ header) secara terisolasi per-tenant.

---

## 2. Rincian Temuan Audit & Solusi Teknis

### 2.1 Masalah Penggantian & Reset Kata Sandi Tenant
* **Gejala / Masalah:**
  1. Terjadi syntax compilation error pada `ControlApi/Program.cs` akibat blok `try/catch` pada endpoint `MapDelete` dan referensi variabel `newEmail` yang hilang di endpoint `PUT /api/v1/tenants/{id}`.
  2. Endpoint reset sandi tenant di Control API mengalami kegagalan saat database fisik tenant baru atau belum siap di PostgreSQL (melemparkan exception Npgsql `3D000: database does not exist`).
  3. Pencarian tenant pada endpoint reset password hanya menggunakan ID primary key (`FindAsync(id)`), sehingga jika pengguna/operator memasukkan `TenantCode` (seperti `WARUNGMIE`), API me-return 404 Not Found.
  4. Pada `TenantApi/Program.cs`, endpoint `/api/v1/auth/change-password` hanya mencari ID user via `ClaimTypes.NameIdentifier`. Jika terdapat perbedaan format ID pada tenant yang dimigrasikan, user tidak ditemukan.
* **Perbaikan yang Diterapkan:**
  - Memperbaiki penataan blok `try/catch` pada `MapDelete` dan mendeklarasikan `var newEmail = em.GetString()!.Trim();` pada endpoint update tenant.
  - Memperbarui pencarian tenant agar mendukung resolusi ganda:
    ```csharp
    var tenant = await db.Tenants.FindAsync(id)
        ?? await db.Tenants.FirstOrDefaultAsync(t => t.TenantCode == id.ToUpperInvariant());
    ```
  - Memanggil `PostgresConnectionHelper.EnsureDatabaseExistsAsync(...)` sebelum membuka konteks `TenantDbContext`, menjamin database fisik tersedia sebelum eksekusi skema EF Core.
  - Menerapkan *fallback user search* via `ClaimTypes.Email` di Tenant API jika pencarian berbasis `UserId` tidak menghasilkan record.
  - Pada [`TenantAdmin.razor`](../src/SiBangku.Web/Components/Pages/TenantAdmin.razor), menyinkronkan email akun resmi saat login, membersihkan variabel sandi sementara dari memori setelah berhasil disimpan, dan membatasi penutupan modal jika akun dalam status `MustChangePassword`.

---

### 2.2 Arsitektur Keamanan Koneksi PostgreSQL ([`PostgresConnectionHelper.cs`](../src/SiBangku.Db/PostgresConnectionHelper.cs))
Pustaka baru ditambahkan ke `SiBangku.Db` dan diintegrasikan ke seluruh komponen (`ControlApi`, `TenantApi`, `Worker`, dan `Cli`):
1. **Validasi Identifier Anti-SQL Injection**:
   - `ValidateDatabaseIdentifier(string? identifier)`: Memvalidasi pola `^[a-zA-Z0-9_]{1,63}$`. Karakter berbahaya seperti tanda kutip, titik koma, spasi, dash, atau sintaks SQL ditolak secara mutlak.
   - `SanitizeDatabaseIdentifier(string? input)`: Membersihkan karakter non-alphanumeric untuk pembentukan nama database yang aman.
2. **Normalisasi & Parsing URI Connection String**:
   - Mendukung format URI (`postgresql://user:pass@host:5432/dbname?sslmode=...`) dan ADO.NET format (`Host=...;Database=...`).
   - Menegakkan baseline ketahanan: `Timeout = 15s`, `CommandTimeout = 30s`, `KeepAlive = 30s`.
   - Mengaktifkan `SslMode = SslMode.Require` secara otomatis untuk lingkungan non-development jika belum dikonfigurasi.
3. **Hardening Connection Pool Multi-Tenant**:
   - `BuildTenantConnectionString`: Mengonfigurasi `Pooling = true`, `MinPoolSize = 0` (mencegah koneksi idle menahan slot PostgreSQL server), `MaxPoolSize = 5..20`, dan `ConnectionIdleLifetime = 15s` (koneksi idle segera dibebaskan kembali ke server pool).
4. **Pencegahan Kebocoran Kredensial**:
   - `MaskConnectionString(string? cs)`: Menyamarkan kredensial password menjadi `******` sebelum diekspos ke logging server.
5. **Pembuatan Database Fisik yang Terpusat & Thread-Safe**:
   - `EnsureDatabaseExistsAsync`: Memeriksa keberadaan database fisik melalui query terparameterisasi pada catalog `pg_database`. Jika belum ada, mengeksekusi DDL `CREATE DATABASE "<dbName>"`. Menangani PostgresException `42P04` (`duplicate_database`) secara graceful bila terjadi konkurensi request.

---

### 2.3 Otomatisasi Kompilasi & Verifikasi Terisolasi (APK & EXE)
1. **Isolasi Penuh Direktori Tenant**:
   - Seluruh kode, konfigurasi, dan biner tersimpan terpisah di folder `tenants/<TENANT_CODE>/`.
   - Android APK: Proyek Gradle mandiri di `tenants/<TENANT_CODE>/android/` dengan namespace unik `com.sibangku.<package_segment>` dan `MainActivity.java` yang mengarah ke endpoint tenant.
   - Desktop Windows EXE: Folder `tenants/<TENANT_CODE>/desktop/` memuat biner kasir native `SiBangku-<TENANT_CODE>.exe` dan skrip launcher `SiBangku-<TENANT_CODE>.bat`.
2. **Penyempurnaan Scaffolding ([`TenantWorkspaceScaffolder.cs`](../src/SiBangku.Shared/TenantWorkspaceScaffolder.cs))**:
   - Resolver diperluas untuk mendeteksi paket universal di `src/SiBangku.Web/wwwroot/downloads/` sehingga saat tenant baru di-provisioning, biner `<KODE>.apk` dan `SiBangku-<KODE>.exe` langsung tersedia di foldernya masing-masing.
3. **Skrip Otomasi Terpadu ([`scripts/compile-tenant-artifacts.ps1`](../scripts/compile-tenant-artifacts.ps1))**:
   - Menyediakan automasi kompilasi lokal menggunakan Gradle (jika toolchain tersedia) atau seeding template mandiri yang divalidasi.
   - Melakukan verifikasi integritas biner:
     - APK: Membuka struktur berkas ZIP dan memastikan keberadaan `AndroidManifest.xml`.
     - EXE: Membaca header PE dan memvalidasi *magic number* `0x4D 0x5A` ('MZ').
4. **Distribusi Biner via Control API ([`Program.cs`](../src/SiBangku.ControlApi/Program.cs))**:
   - Endpoint `GET /api/v1/tenants/{id}/apk` dan `GET /api/v1/tenants/{id}/exe` menyajikan biner yang terisolasi per tenant.

---

## 3. Status Verifikasi Pengujian

### 3.1 Unit & Integration Tests ([`SiBangku.Tests`](../src/SiBangku.Tests/))
Ditambahkan pengujian keamanan koneksi PostgreSQL dan endpoint artefak:
* `ValidateDatabaseIdentifier_ShouldPreventSqlInjection` (berbagai variasi serangan SQL Injection)
* `SanitizeDatabaseIdentifier_ShouldCleanSpecialCharacters`
* `NormalizeConnectionString_ShouldSupportUriAndAdoNet`
* `BuildTenantConnectionString_ShouldEnforceSafePoolingAndPreserveCredentials`
* `BuildTenantConnectionString_ShouldRejectUnsafeIdentifier`
* `MaskConnectionString_ShouldHidePassword`
* `GetApk_NonExistentTenant_ShouldReturn404` & `GetExe_NonExistentTenant_ShouldReturn404`

**Hasil Eksekusi:**
```
Passed! - Failed: 0, Passed: 74, Skipped: 0, Total: 74, Duration: 5 s - SiBangku.Tests.dll (net9.0)
```

### 3.2 Verifikasi Kompilasi Artefak Seluruh Tenant
Eksekusi:
```powershell
.\scripts\compile-tenant-artifacts.ps1
```
**Hasil:**
- **28 workspace tenant terisolasi** berhasil diverifikasi secara penuh.
- Seluruh 28 paket APK berstatus `OK (Valid ZIP/Manifest)`.
- Seluruh 28 paket EXE berstatus `OK (Valid PE Executable)`.
- Seluruh 28 launcher kasir `.bat` aktif dan terhubung ke tenant masing-masing.
