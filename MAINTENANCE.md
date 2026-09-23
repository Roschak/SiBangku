# Panduan Pemeliharaan & Operasional Aman SiBangku (Safe Maintenance Guide)

Dokumen ini adalah SOP resmi dan petunjuk teknis pemeliharaan server, database, dan aplikasi **SiBangku** yang dirancang khusus untuk memastikan **ZERO DATA LOSS** pada data multi-tenant dan **perlindungan mutlak akun Super Admin**.

---

## ⚠️ 1. Aturan Emas Pemeliharaan (Golden Rules)

1. **JANGAN PERNAH MENJALANKAN `docker compose down -v`**
   * Flag `-v` (*volume*) akan **MENGHAPUS** volume penyimpanan data fisik PostgreSQL (`pgdata-csharp`), yang mengakibatkan seluruh database control dan seluruh database tenant terhapus permanen!
   * **Gunakan:** `docker compose down` (tanpa flag `-v`) atau `docker compose restart`.
2. **JANGAN MENGUBAH / MERE-SEED AKUN SUPER ADMIN**
   * Akun superadmin utama platform adalah `master-DEV-ragah`.
   * Sistem [`ControlDbSeeder`](src/SiBangku.Db/ControlDbSeeder.cs) telah dikonfigurasi untuk **tidak pernah menimpa** kredensial atau membuat akun superadmin duplikat jika akun superadmin telah ada di database.
3. **DATA MULTI-TENANT TERISOLASI FISIK**
   * Control Plane berada di database `sibangku_control`.
   * Setiap outlet memiliki database PostgreSQL fisik tersendiri (misal: `tenant_ptkomikcaffe`).
   * Operasi pada satu tenant tidak akan pernah memengaruhi atau merusak data tenant lain.

---

## 🔒 2. Prosedur Rutin Backup Sebelum Maintenance

Sebelum melakukan update kode, migrasi database, atau update container Docker, selalu buat backup dump dengan perintah berikut:

### A. Backup Seluruh Database (Control + Seluruh Tenant)
Jalankan di PowerShell:
```powershell
# Buat folder backup berstempel waktu
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "D:\mydokumen\myproject\Apk_SiBangku\backups\$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# 1. Backup Control Plane Database
docker exec sibangku-postgres-csharp pg_dump -U sibangku -d sibangku_control -F c -b -v -f /tmp/sibangku_control.dump
docker cp sibangku-postgres-csharp:/tmp/sibangku_control.dump "$backupDir\sibangku_control.dump"

# 2. Backup Database Tiap Tenant Aktif (Contoh: tenant_ptkomikcaffe)
docker exec sibangku-postgres-csharp pg_dump -U sibangku -d tenant_ptkomikcaffe -F c -b -v -f /tmp/tenant_ptkomikcaffe.dump
docker cp sibangku-postgres-csharp:/tmp/tenant_ptkomikcaffe.dump "$backupDir\tenant_ptkomikcaffe.dump"

Write-Host "Backup aman berhasil disimpan di: $backupDir" -ForegroundColor Green
```

### B. Backup Otomatis Seluruh Database PostgreSQL Sekaligus
```powershell
docker exec sibangku-postgres-csharp pg_dumpall -U sibangku > "$backupDir\full_cluster_all_databases.sql"
```

---

## 🔄 3. Prosedur Update & Restart Layanan yang Aman

### Memperbarui Container Aplikasi (Code Update):
```bash
# 1. Hentikan container aplikasi tanpa menghapus volume data
docker compose down

# 2. Build ulang image container aplikasi terbaru
docker compose build --no-cache control-api tenant-api web worker

# 3. Jalankan kembali seluruh layanan
docker compose up -d

# 4. Verifikasi status kesehatan container
docker ps
```

---

## 🛠️ 4. Otomatisasi Pembuatan Database Tenant (Auto-Provisioning)

Sistem SiBangku telah dilengkapi dengan **mekanisme fail-safe 2 lapis** untuk pembuatan database PostgreSQL setiap kali tenant dibuat:

1. **Lapis 1 - `TenantProvisioner` (Control API):**
   * Saat operator mendaftarkan tenant via Web Admin (`/control-admin`) atau CLI (`sibangku-cli tenant create`):
   * Sistem otomatis memicu query `CREATE DATABASE "<nama_db>"` di server PostgreSQL.
   * Menjalankan inisialisasi skema tabel lengkap (`users`, `tables`, `menu_categories`, `menu_items`, `customers`, `reservations`, `orders`, `order_items`, `payments`, `settings`).
   * Men-seed akun Admin Tenant awal, konfigurasi warna/branding default, dan visual layout meja.
   * Men-scaffold isolated workspace di folder `tenants/<KODE>` (desktop launcher `.bat`, PWA web, Android project).
2. **Lapis 2 - `TenantResolutionMiddleware` (Tenant API):**
   * Jika ada permintaan masuk ke tenant namun database fisiknya belum siap, middleware akan otomatis mendeteksi ketiadaan database tersebut dan langsung mengeksekusi `CREATE DATABASE` serta schema migration tanpa memutus request (self-healing).

---

## 👤 5. Panduan Kredensial Super Admin Platform

* **Username:** `master-DEV-ragah`
* **Peran:** `SUPER_ADMIN`
* **Login URL Portal:** `http://localhost:3000/control-admin`
* **API Auth Endpoint:** `POST http://localhost:3001/api/v1/auth/login`

### Aturan Keamanan Password Super Admin:
* Jika ingin mengganti kata sandi superadmin, lakukan secara resmi melalui menu **Keamanan & Akun** di UI Control Admin (`/control-admin`) atau via endpoint `/api/v1/auth/change-password`.
* Password baru wajib memenuhi standar keamanan platform:
  * Minimal 12 karakter.
  * Memiliki huruf besar, huruf kecil, angka, dan simbol.
  * Tidak menggunakan kata kamus umum atau nama akun.

---

## 🩺 6. Checklist Verifikasi & Audit Kesehatan Sistem

Jalankan perintah audit berikut secara berkala:

| Pemeriksaan | Perintah / URL | Hasil Normal |
| :--- | :--- | :--- |
| **Control API Health** | `curl http://localhost:3001/api/v1/health` | `{"status":"ok","service":"control-api"}` |
| **Tenant API Health** | `curl http://localhost:3002/api/v1/health` | `{"status":"ok","service":"tenant-api"}` |
| **Web UI Portal** | Buka `http://localhost:3000` di browser | Tampilan landing page SiBangku muncul |
| **Daftar Database PostgreSQL** | `docker exec sibangku-postgres-csharp psql -U sibangku -d sibangku_control -c "\l"` | Memuat `sibangku_control` dan tiap DB `tenant_*` |
| **Verifikasi Tenant Aktif** | `docker exec sibangku-postgres-csharp psql -U sibangku -d sibangku_control -c "SELECT \"TenantCode\", \"RestaurantName\", \"Status\" FROM tenants;"` | Outlet terdaftar dengan status `TRIAL` / `ACTIVE` |
| **Test Suite Otomatis** | `dotnet test` di root project | Seluruh 74 test (Unit, Integration, Postgres E2E) passed |

---

## 🚑 7. Prosedur Pemulihan Bencana (Disaster Recovery)

Jika terjadi gangguan pada satu tenant tertentu:
1. Pastikan container PostgreSQL berjalan: `docker start sibangku-postgres-csharp`.
2. Restore database tenant yang bersangkutan dari berkas dump:
   ```bash
   docker cp ./backup/tenant_ptkomikcaffe.dump sibangku-postgres-csharp:/tmp/restore.dump
   docker exec sibangku-postgres-csharp pg_restore -U sibangku -d tenant_ptkomikcaffe -c -v /tmp/restore.dump
   ```
3. Data tenant lain dan database control plane tetap aman dan tidak terpengaruh sama sekali.
