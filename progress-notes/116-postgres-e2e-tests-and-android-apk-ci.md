# Progress Note 116: Tes E2E PostgreSQL Nyata & Pipeline CI Kompilasi APK Android

**Tanggal:** 16 September 2026
**Status:** Selesai — Build 0 Warning / 0 Error, **69/69 Tests Passed** (15 tes end-to-end di atas PostgreSQL nyata), YAML workflow tervalidasi

---

## 1. Ringkasan Permintaan & Hasil

| Permintaan | Hasil |
|---|---|
| Perluas cakupan tes E2E ke alur login tenant admin, CRUD meja, provisioning tenant di atas PostgreSQL nyata | **9 tes baru** di `src/SiBangku.Tests/PostgresE2E/TenantLifecycleE2ETests.cs`, semuanya lolos pada server PostgreSQL 15 sungguhan (bukan In-Memory) |
| (Follow-up) Tes E2E alur staff: ubah status & pembayaran reservasi, update branding tenant di PostgreSQL nyata | **6 tes tambahan** di `src/SiBangku.Tests/PostgresE2E/StaffOperationsE2ETests.cs` — total suite E2E kini **15 tes** |
| Buat pipeline CI (GitHub Actions) yang **benar-benar** mengompilasi APK dari `tenants/<KODE>/android` | `.github/workflows/ci.yml`: 4 job, mengompilasi APK per tenant + APK workspace hasil generator, memverifikasi isi APK sebelum diunggah |

---

## 2. Tes End-to-End PostgreSQL (`src/SiBangku.Tests/PostgresE2E/`)

Sebelumnya seluruh integration test memakai `UseInMemoryDatabase=true`, sehingga bug khusus PostgreSQL
(mis. `timestamptz` menolak `DateTimeKind.Unspecified`) tidak tertangkap. Sekarang ada suite E2E yang
menjalankan **kedua API asli** (Control API + Tenant API) di atas server PostgreSQL nyata.

**Berkas baru:**

| Berkas | Isi |
|---|---|
| `PostgresTestEnvironment.cs` | Membaca `SIBANGKU_TEST_POSTGRES` (fallback ke server docker-compose), melakukan probe koneksi, dan menyediakan `[RequiresPostgresFact]` yang **men-skip** (bukan menggagalkan) tes bila server tidak tersedia |
| `PostgresTestServer.cs` | Membuat/menghapus database pada server, plus query pembanding langsung ke database (count/scalar) |
| `SiBangkuE2EFixture.cs` | Fixture koleksi: membuat database control terisolasi `sibangku_e2e_control_<run>`, menjalankan Control API + Tenant API dengan connection string tersebut, provisioning tenant, login tenant admin, dan pembersihan database di akhir |
| `TenantLifecycleE2ETests.cs` | 9 skenario siklus hidup tenant |
| `StaffOperationsE2ETests.cs` | 6 skenario operasional staf |

**Isolasi:** setiap kali dijalankan, suite membuat database control baru, sehingga database pengembang
(`sibangku_control`) tidak tersentuh. Bukti isolasi diuji eksplisit: tes memastikan baris tenant muncul
di database control **milik suite ini**, bukan di database lain.

### 9 Skenario yang Diuji

1. **Provisioning tenant** — `POST /api/v1/tenants` benar-benar membuat database fisik di PostgreSQL:
   database ada, skema + 4 meja default ter-seed, user admin ter-seed dengan hash **Argon2id**
   (`$argon2id$…`, bukan BCrypt/plaintext), baris `tenants` + `audit_logs` tercatat.
2. **Provisioning dengan kata sandi lemah** — `adminPassword: "123"` ditolak `400 WEAK_PASSWORD` oleh
   kebijakan kata sandi, dan **tidak ada** tenant yang terdaftar.
3. **Login tenant admin** dengan kredensial hasil provisioning — token terbit, role `TENANT_ADMIN`,
   `mustChangePassword: true`, dan endpoint terproteksi bisa diakses dengan token tersebut.
4. **Login dengan kata sandi salah** — `401`, respons tidak memuat token/hash.
5. **Login pada kode tenant tak terdaftar** — `400 INVALID_TENANT`.
6. **CRUD meja lengkap** — `GET` (4 meja), `POST` (identitas & timestamp milik server, `shape` lowercase
   dinormalisasi jadi `ROUND`), duplikat nomor meja `409`, `shape`/`capacity` tidak sah `400`,
   `PUT /tables/layout` (rotasi 372° → 12°) dan verifikasi koordinat lewat SQL, `DELETE` (baris hilang
   dari database & listing, delete kedua `404`).
7. **CRUD meja tanpa token** — `401`, dan dibuktikan **tidak ada baris** yang tertulis (otorisasi
   ditegakkan server-side, bukan oleh UI).
8. **Token tenant lain (cross-tenant)** — `403 FORBIDDEN`; penulisan ke database tenant lain tidak terjadi.
9. **Reservasi tamu publik** — tulis-jalan yang dulu gagal (`timestamptz` + `DateTimeKind`): `200`,
   `date` tersimpan sebagai UTC, meja ter-assign otomatis, baris `reservations` + `customers` terverifikasi via SQL.

### 6 Skenario Operasional Staf (follow-up)

10. **Siklus reservasi** — tamu booking lewat endpoint publik, staf mengubah status (`confirmed` lowercase
    dinormalisasi jadi `CONFIRMED`), menandai `SEATED`, lalu membayar (`PAID`) yang **otomatis**
    mengonfirmasi reservasi; setiap perubahan diverifikasi lewat SQL.
11. **Nilai di luar allowlist** — status/pembayaran karangan ditolak `400` **tanpa efek samping**
    (status tetap `PENDING`/`UNPAID`), id reservasi tak dikenal `404`, dan pemanggil anonim `401`.
12. **Token tenant lain** — perubahan status reservasi tenant lain `403 FORBIDDEN`, tidak ada yang tertulis.
13. **Branding & jam operasional** — `PUT /api/v1/branding` menyimpan JSON ke tabel `settings`,
    terbaca lewat endpoint komposit (portal) **dan** endpoint branding publik (portal tamu).
14. **Branding tanpa token** — `401`, dan nilai lama tidak berubah.
15. **Rotasi kata sandi admin** — kata sandi lemah ditolak `400 WEAK_PASSWORD` tanpa mengubah hash;
    kata sandi yang lolos kebijakan berhasil diganti, hash baru `$argon2id$`, terbukti
    `Verify(baru)=true` / `Verify(lama)=false`, flag `MustChangePassword` kembali `false`, dan kredensial
    baru bisa login (diverifikasi lewat HTTP).

### Cara Menjalankan

```bash
docker compose up -d postgres      # user 'sibangku' adalah superuser → punya hak CREATE DATABASE
dotnet test SiBangku.slnx          # 69/69

# atau arahkan ke server lain:
SIBANGKU_TEST_POSTGRES="Host=…;Port=5432;Database=postgres;Username=…;Password=…" dotnet test SiBangku.slnx
```

Tanpa server PostgreSQL: `54 Passed, 15 Skipped, 0 Failed` — kontributor tanpa Docker tetap hijau.

> Anggaran rate limit ikut dijaga: endpoint auth dibatasi 10 permintaan/menit per IP, dan suite E2E
> mengonsumsi ±7 di antaranya (token tenant di-cache oleh fixture, bukan login berulang).

---

## 3. Bug Nyata yang Ditemukan Tes Baru

| # | Temuan | Dampak | Perbaikan |
|---|---|---|---|
| 1 | `Utils.GenerateTemporaryPassword()` bisa menghasilkan kata sandi yang **melanggar kebijakan kata sandi platform sendiri** (tanpa angka & simbol → hanya 2 dari 4 kelas karakter, peluang ~1% per kata sandi) | Tes provisioning menjadi **flaky** dan kata sandi sementara bisa ditolak saat pengguna menggantinya; CI akan merah secara acak | Generator kini menempatkan satu karakter dari **setiap** kelas lebih dulu lalu mengocoknya (Fisher–Yates dengan `RandomNumberGenerator`), panjang tetap 22 karakter URL-safe. Diverifikasi 5× berturut-turut tanpa kegagalan |

---

## 4. Pipeline CI Android (`.github/workflows/ci.yml`)

**Proyek Android tenant sebelumnya tidak bisa di-build sama sekali.** Yang ada hanya 4 berkas
(`app/build.gradle`, manifest, `MainActivity.java`, `strings.xml`) tanpa `settings.gradle`,
`build.gradle` root, `gradle.properties`, maupun `proguard-rules.pro` — dan manifest masih memakai atribut
`package` yang sudah **ditolak AGP 8**. Pipeline yang “mengompilasi APK” tidak akan pernah berhasil tanpa
melengkapi ini.

### Kelengkapan proyek Android tenant

- Ditambahkan: `settings.gradle`, `build.gradle` (pin AGP **8.5.2**), `gradle.properties`,
  `app/proguard-rules.pro` (file yang dirujuk build type release tapi tidak ada), dan `compileOptions` Java 17.
- Manifest: atribut `package` dihapus (namespace tetap di `app/build.gradle`).
- Verified: struktur hasil generator **identik** dengan workspace `PTKOMIKCAFFE` (dibandingkan
  baris-per-baris untuk 8 berkas setelah normalisasi nama).

### 4 Job Pipeline

1. **`dotnet`** — restore, build, `dotnet test` seluruh solusi di atas layanan PostgreSQL 15
   (`SIBANGKU_TEST_POSTGRES` diset → 9 tes E2E benar-benar berjalan). Hasil tes diunggah sebagai artifact.
2. **`discover-tenants`** — memindai `tenants/*/android` dan mengeluarkan matriks JSON (logika shell
   diverifikasi lokal: `["PTKOMIKCAFFE"]`). Tenant baru otomatis ikut ter-build tanpa menyunting workflow.
3. **`android-apk`** — matriks per tenant: JDK 17 → Android SDK (platform 34 + build-tools 34.0.0) →
   Gradle 8.7 → `gradle :app:assembleDebug` → **verifikasi APK** → unggah artifact
   `sibangku-<KODE>-apk`.
4. **`android-generated-workspace`** — menjalankan `scripts/generate-tenant-workspace.ps1` (pwsh) untuk
   tenant baru lalu mengompilasi APK-nya, sehingga skrip generator tidak bisa lagi menghasilkan proyek
   yang tidak bisa di-build.

**Verifikasi isi APK** (langkah `Assert the APK is an installable package`) memeriksa `classes.dex`,
`resources.arsc`, dan `AndroidManifest.xml` di dalam zip — persis kegagalan artefak APK palsu yang dulu
pernah ikut ter-commit (file tanpa `classes.dex`/`resources.arsc`, tidak bisa dipasang).

### Skrip Generator Tenant (`scripts/generate-tenant-workspace.ps1`)

Skrip ini ternyata hanya membuat folder `android/` **kosong** (tanpa satu pun berkas proyek). Sekarang:

- Menghasilkan **14 berkas** (sebelumnya 5): `README.md`, `config.json`, `custom.css`,
  `desktop/*.bat`, `web/index.html`, **`web/manifest.json`** (PWA manifest yang dulu hilang),
  dan seluruh proyek Android siap-build.
- **Portabilitas**: semua path memakai `/` sehingga skrip jalan di Windows PowerShell 5.1, PowerShell 7,
  maupun Linux (dipakai job CI #4).
- **Tanpa BOM**: penulisan memakai `System.IO.File::WriteAllText` + `UTF8Encoding($false)` — sebelumnya
  setiap berkas diberi BOM (BOM pada `.java` membuat `javac` gagal, pada `.json` merusak parser ketat).
- **Gagal keras, bukan diam-diam**: `$ErrorActionPreference = 'Stop'` + verifikasi akhir 14 berkas
  (sebelumnya skrip tetap mencetak “[Sukses]” meskipun 9 berkas gagal ditulis).
- **Package Android aman**: kode seperti `DISTRO-AVENUE` (mengandung `-`) kini menjadi
  package `com.sibangku.distroavenue`, bukan package ilegal `com.sibangku.distro-avenue`.
- Parameter baru `-LanHost` untuk alamat IP server lokal (dipakai launcher Android & PWA).

---

## 5. Verifikasi yang Dijalankan

| Verifikasi | Hasil |
|---|---|
| `dotnet build SiBangku.slnx` | **0 Warning / 0 Error** |
| `dotnet test SiBangku.slnx` (dengan PostgreSQL) | **69/69 Passed**, 2× berturut-turut |
| `dotnet test` tanpa PostgreSQL | **54 Passed, 15 Skipped, 0 Failed** |
| Tes kebijakan kata sandi (5× berturut) | 17/17 Passed setiap kali (flakiness hilang) |
| Parser YAML workflow (PyYAML) | Valid; seluruh job/step terbaca |
| Logika `discover-tenants` dijalankan lokal di bash | `matrix=["PTKOMIKCAFFE"]` |
| Generator dijalankan nyata (2×, kode `TMPGEN` & `CI-SMOKE`) | 14/14 berkas, tanpa BOM, package & URL benar; struktur identik dengan `PTKOMIKCAFFE` |
| Sisa database uji setelah suite selesai | Bersih — semua database `sibangku_e2e_*` terhapus (2 sisa dari run yang di-kill manual juga sudah dibersihkan) |

---

## 6. Batasan yang Jujur (Belum Diverifikasi Otomatis)

- **`gradle :app:assembleDebug` belum pernah dieksekusi** — mesin pengembangan ini tidak memiliki JDK
  maupun Android SDK (`java` dan `ANDROID_HOME` tidak ada). Yang sudah diverifikasi: kelengkapan berkas
  proyek, pin versi AGP/Gradle/JDK, validitas YAML, dan logika step-step pipeline. Eksekusi nyata pertama
  akan terjadi saat workflow dijalankan di GitHub Actions.
- **Workflow belum pernah berjalan di GitHub** (repositori belum punya remote/CI run). Jalankan lewat tab
  Actions → *SiBangku CI* → *Run workflow* untuk verifikasi end-to-end.
- **APK hasil CI belum dipasang ke perangkat fisik.** Artefak `sibangku-<KODE>-apk` diverifikasi
  struktural (dex/arsc/manifest) tetapi belum ada uji instalasi otomatis.
- **Server PostgreSQL untuk tes butuh hak `CREATE DATABASE`** (superuser). Sesuaikan kredensial bila
  memakai server terkelola.

---

## 7. Berkas yang Disentuh

```
.github/workflows/ci.yml                                  (baru)
.gitignore                                                (+ build Gradle, artefak, hasil tes)
README.md                                                 (bagian pengujian & CI diperbarui)
scripts/generate-tenant-workspace.ps1                     (14 berkas, tanpa BOM, lintas platform)
src/SiBangku.Shared/Utils.cs                              (temporary password selalu lolos kebijakan)
src/SiBangku.Tests/PostgresE2E/PostgresTestEnvironment.cs (baru)
src/SiBangku.Tests/PostgresE2E/PostgresTestServer.cs      (baru)
src/SiBangku.Tests/PostgresE2E/SiBangkuE2EFixture.cs      (baru)
src/SiBangku.Tests/PostgresE2E/TenantLifecycleE2ETests.cs (baru)
src/SiBangku.Tests/PostgresE2E/StaffOperationsE2ETests.cs  (baru)
tenants/PTKOMIKCAFFE/android/{settings.gradle, build.gradle, gradle.properties,
    app/proguard-rules.pro}                               (baru)
tenants/PTKOMIKCAFFE/android/app/{build.gradle, AndroidManifest.xml}  (diperbaiki untuk AGP 8)
tenants/PTKOMIKCAFFE/README.md                            (cara build APK yang benar)
```
