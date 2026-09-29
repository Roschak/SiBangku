# CATATAN AUDIT & PROGRESS LAPORAN SISTEM SIBANGKU

Dokumen ini mencatat seluruh temuan audit mendalam, analisis akar masalah (*root cause*), perbaikan keamanan (*security fixes*), serta status operasional platform SiBangku SaaS Multi-Tenant.

---

## 1. Audit Masalah Reset Kata Sandi (*Root Cause Analysis & Fix*)

### Gejala Masalah:
* Saat Super Admin mencoba mereset kata sandi tenant admin restoran (baik dengan password angka seperti `12345` maupun nama/teks biasa), proses gagal di backend dan perubahan tidak tersimpan ke database fisik tenant.

### Temuan Investigasi (*Root Cause*):
1. **Penyebab Utama (Database Column Length Overflow)**:
   * Pada tabel `audit_logs` di database `sibangku_control`, kolom `Id`, `TenantId`, `Action`, dan `UserId` dibatasi dengan panjang `VARCHAR(50)`.
   * Pada saat endpoint reset kata sandi (`POST /api/v1/tenants/{id}/reset-password`) selesai mengupdate kata sandi di database tenant, sistem membuat *audit log record* dengan ID:
     `audit-reset-tenant-pw-tenant-3b1a268b815949d28dbd2c8842605e6b-639123456789012345` (~81 karakter).
   * PostgreSQL menolak penyimpanan entity dengan error:
     `Npgsql.PostgresException (0x80004005): 22001: value too long for type character varying(50)`.
   * Akibatnya, seluruh transaksi DB di-rollback dan endpoint menghasilkan HTTP 500 error.

2. **Perbaikan yang Diterapkan**:
   * **Ekspansi Skema Database PostgreSQL**:
     Menjalankan query SQL untuk memperluas kapasitas kolom audit logs:
     ```sql
     ALTER TABLE audit_logs ALTER COLUMN "Id" TYPE varchar(128);
     ALTER TABLE audit_logs ALTER COLUMN "TenantId" TYPE varchar(128);
     ALTER TABLE audit_logs ALTER COLUMN "Action" TYPE varchar(128);
     ALTER TABLE audit_logs ALTER COLUMN "UserId" TYPE varchar(128);
     ```
   * **Pembaruan Mapping EF Core (`ControlDbContext.cs`)**:
     Mengubah konfigurasi Fluent API `HasMaxLength(128)` pada entity `AuditLog`.
   * **Format ID Audit yang Ringkas & Aman**:
     Mengubah seluruh pembuatan ID audit di backend menjadi format `aud-{Guid:N}` (36 karakter, anti-collision).
   * **Self-Healing Fallback**:
     Jika user admin pada database fisik tenant belum ada atau role berbeda, sistem secara otomatis merecovery dan membuat record admin baru yang valid dengan BCrypt work factor 10.

---

## 2. Audit & Perbaikan Search Bar Direktori Tenant

### Gejala:
* Search bar pada direktori tenant terkadang mempertahankan nilai / tidak bersih secara default atau tidak dapat dibatalkan dengan cepat.

### Perbaikan:
* Menambahkan atribut `autocomplete="off"` pada input pencarian untuk mencegah browser mengisi otomatis kata kunci lama.
* Menambahkan tombol pintas *Clear* `(X)` di ujung kanan input yang muncul otomatis ketika ada teks pencarian, sehingga pengguna dapat mengosongkan filter dengan satu klik.
* Mengisolasi state `SearchQuery = ""` agar saat berpindah tab atau memuat ulang halaman direktori selalu dalam kondisi bersih default.

---

## 3. Audit & Redesain Formulir Provisioning Tenant Baru

### Pembaruan UI/UX:
* Mengubah layout formulir provisioning dari yang sebelumnya berdesak-desakan di sidebar kiri menjadi **Workspace 2-Kolom Terstruktur & Lapang**:
  * **Kolom Kiri**: Formulir bersegmen teratur (Identitas Badan Usaha, Kredensial Administrator Outlet, dan Skema Lisensi dengan tombol preset cepat 14d/30d/60d/365d).
  * **Kolom Kanan**: *Live Architectural Blueprint Preview* yang menampilkan estimasi kode tenant, nama database PostgreSQL terisolasi (`tenant_...`), URL login resto (`/admin`), dan status enkripsi secara real-time.
* Penambahan kolom **Kata Sandi Admin Resto (Opsional)** sehingga Super Admin dapat menentukan kata sandi sendiri secara bebas atau membiarkan sistem membuat kata sandi acak.
* Notifikasi sukses provisioning yang menyajikan ringkasan kredensial lengkap beserta tombol cepat menuju portal resto.

---

## 4. Keamanan & Sinkronisasi Ganti Password Restoran

1. **Portal Super Admin (`/control-admin`)**:
   * Modal verifikasi *Reset Password* dilengkapi opsi *toggle* "Tampilkan teks kata sandi" untuk menghindari salah ketik, konfirmasi ulang kata sandi, dan alert notifikasi hijau yang jelas saat sukses.
2. **Portal Admin Restoran (`/admin`)**:
   * Ditambahkan fitur **Ganti Kata Sandi Administrator Outlet** di tab Pengaturan Outlet (`/api/v1/auth/change-password`) sehingga pemilik restoran dapat memperbarui kata sandinya secara mandiri dari portal operasional mereka.
3. **Standar Keamanan Industri**:
   * Seluruh kata sandi di-hash menggunakan algoritma **BCrypt work factor 10**.
   * Parameter query menggunakan *Parameterized SQL* / EF Core ORM untuk mencegah kerentanan SQL Injection.
   * Model multi-database fisik menjamin isolasi data 100% antar tenant restoran.

---

## 5. Status Verifikasi Pengujian (Unit & Integration Tests)

| Test Project | Total Tests | Passed | Failed | Status |
| :--- | :---: | :---: | :---: | :---: |
| `SiBangku.Tests.dll` | 74 | 74 | 0 | **100% PASSED** |

Seluruh layanan Docker (`sibangku-web-csharp`, `sibangku-control-api-csharp`, `sibangku-tenant-api-csharp`, `sibangku-postgres-csharp`) berstatus **Healthy & Running**.

---

## 6. Audit Siklus Sandi Tenant, Keamanan PostgreSQL, & Kompilasi Terisolasi

1. **Siklus Sandi Tenant & Self-Healing**:
   - Resolusi ganda endpoint reset sandi Control API (`TenantId` & `TenantCode`).
   - Pengecekan ketersediaan database fisik tenant dengan `EnsureDatabaseExistsAsync` sebelum eksekusi EF Core, mencegah crash Npgsql `3D000`.
   - Inisialisasi otomatis akun admin resto jika belum terbentuk di database fisik.
   - Fallback lookup via `ClaimTypes.Email` di Tenant API jika `UserId` claim tidak cocok.
   - Validasi ketat via `PasswordPolicy` dan hashing Argon2id.
2. **Sentralisasi Keamanan PostgreSQL (`PostgresConnectionHelper`)**:
   - Validasi nama database anti-SQL Injection (`[a-zA-Z0-9_]{1,63}`).
   - Normalisasi URI & connection string dengan penegakan SSL di production, network timeout 15s, command timeout 30s, dan keepalive 30s.
   - Multi-tenant connection pool hardening (`MinPoolSize = 0`, `MaxPoolSize = 5..20`, `ConnectionIdleLifetime = 15s`).
   - Masking password kredensial pada logging/diagnostik.
3. **Otomatisasi Kompilasi & Verifikasi Artefak Terisolasi**:
   - Seeding otomatis APK dan EXE ke setiap workspace baru (`tenants/<KODE>/`).
   - Penambahan skrip otomatisasi terintegrasi `scripts/compile-tenant-artifacts.ps1`.
   - Verifikasi sukses terhadap 28 workspace tenant terisolasi (validitas ZIP/Manifest APK dan PE header EXE).
