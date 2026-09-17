# Progress Note 115: Full System Audit, E2E Fixes, Security Hardening & Three.js Animation Layer

**Tanggal:** 16 September 2026
**Status:** Selesai — Build 0 Warning / 0 Error, 25/25 Tests Passed, verifikasi E2E live di atas Docker

---

## 1. Temuan Kritis Hasil Audit End-to-End

Pengujian langsung (bukan asumsi) terhadap stack berjalan menemukan 4 bug nyata pada alur bisnis inti:

| # | Endpoint / Alur | Sebelum | Akar Masalah | Sesudah |
|---|---|---|---|---|
| 1 | `POST /api/v1/reservations` dari form booking | **HTTP 400** | Form mengirim `guestName`/`guestEmail`/`guestPhone`, sedangkan DTO server mengharapkan `name`/`email`/`phone`. Deserialisasi menghasilkan null → validasi menolak. **Reservasi tamu tidak pernah bisa dibuat.** | **HTTP 200** |
| 2 | `POST /api/v1/reservations` (payload kanonik) | **HTTP 500** | `dto.Date.Date` memiliki `DateTimeKind.Unspecified`; kolom PostgreSQL `timestamptz` menolak nilai non-UTC (`Cannot write DateTime with Kind=Unspecified`). | **HTTP 200** |
| 3 | `GET /api/v1/reservations?date=...` | **HTTP 500** | Parameter tanggal juga `Unspecified` → error Npgsql yang sama. | **HTTP 200** |
| 4 | `POST` dengan body JSON rusak | **HTTP 500** | `JsonDocument.ParseAsync` tanpa guard; `GetProperty` tanpa `TryGetProperty`. | **HTTP 400** |

**Temuan tambahan:** `/tenant-admin` (dipakai launcher desktop, manifest PWA, dan skrip generator tenant) tidak terdaftar sebagai route — hanya `/admin` yang ada, sehingga launcher membuka halaman 404.

---

## 2. Perbaikan Integritas & Kontrak API

- **DTO booking dual-shape** (`src/SiBangku.TenantApi/Program.cs`): kelas `CreateReservationDto` kini menerima nama kanonik **dan** alias `guest*`, sehingga klien lama maupun baru berfungsi. Field resolver: `Name ?? GuestName`.
- **Normalisasi UTC**: seluruh nilai `Date` (tulis dan baca) dinormalisasi via `DateTime.SpecifyKind(..., DateTimeKind.Utc)`.
- **Validasi ketat**: panjang nama/email/telepon, format email (regex), `GuestCount` 1–50, panjang `Notes` ≤ 500, `EndTime > StartTime`, rentang tanggal −1 s/d +365 hari.
- **Anti double-booking (PRD §45/§46)**: pembuatan reservasi dibungkus transaksi `IsolationLevel.Serializable` sehingga dua permintaan bersamaan untuk meja & slot yang sama tidak dapat keduanya berhasil.
- **Allowlist status**: status reservasi, status pembayaran, status tenant, dan bentuk meja kini divalidasi terhadap daftar tertutup.
- **Route alias** `/tenant-admin` ditambahkan pada `TenantAdmin.razor` (kompatibilitas launcher & dokumentasi lama).

---

## 3. Pengerasan Keamanan (Defensive)

### 3.1 Rahasia & Konfigurasi
- **JWT_SECRET tidak lagi hardcoded.** Sebelumnya kedua API memakai fallback `super_secret_jwt_key_platform_admin_2026`. Kini: wajib dari environment pada non-Development (fail-fast), fallback khusus Development, dan **minimal 32 byte** (syarat HMAC-SHA256) dengan pesan kesalahan yang jelas.
- **MASTER_API_KEY terpisah.** Endpoint internal (`/api/v1/internal/*`) sebelumnya diautentikasi memakai nilai JWT_SECRET. Kini memakai kunci khusus, dibandingkan secara **constant-time** (`CryptographicOperations.FixedTimeEquals`). JWT_SECRET lama sudah tidak berfungsi sebagai master key (terverifikasi → 403).
- **`docker-compose.yml`** dan **`.env.example`** diperbarui dengan `JWT_SECRET`, `MASTER_API_KEY`, dan `CORS_ALLOWED_ORIGINS`.

### 3.2 Kebocoran Data
- **Hash kata sandi tidak lagi bocor.** `GET /api/v1/internal/admin/list` mengembalikan entity `PlatformUser` utuh (termasuk `PasswordHash` BCrypt). Kini diproyeksikan eksplisit tanpa field kredensial.
- **Minimisasi PII pada reservasi publik.** `GET /api/v1/reservations` yang anonim kini hanya mengembalikan field operasional (id, nomor, meja, tanggal, jam, jumlah tamu, status). `notes` dan `customerId` hanya diberikan kepada staf yang terautentikasi.
- **Pesan eksepsi tidak lagi diteruskan ke klien** pada provisioning dan penghapusan tenant; detail teknis hanya masuk log server.

### 3.3 Kontrol Akses & Permukaan Serangan
- **CORS**: kebijakan `AllowAll` / `AllowAnyOrigin` dihapus dari kedua API, diganti allowlist origin eksplisit dari konfigurasi. Origin tidak dikenal tidak menerima header `Access-Control-Allow-Origin` (terverifikasi).
- **Rate limiting** (bawaan ASP.NET Core, tanpa dependency baru): login platform & tenant dibatasi 10 permintaan/menit per IP (terverifikasi: 401 ×10 lalu **429**), pembuatan reservasi 30/menit.
- **Security headers** pada semua respons API: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Resource-Policy`; header `Server` dihapus.
- **CSP aplikasi Web**: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, allowlist CDN font/ikon, `connect-src` untuk SignalR. `frame-ancestors` sengaja tidak diduplikasi karena middleware antiforgery Blazor sudah mengirimnya (dua header CSP dengan direktif berbeda akan saling berpotongan).
- **Kredensial default `admin/admin`** hanya di-seed saat `IsDevelopment()`; tidak pernah pada lingkungan terdeploy (PRD §5).
- **Observability keamanan**: percobaan login gagal dicatat ke `audit_logs` (platform) dan `ILogger` (tenant), tanpa pernah mencatat kata sandi.

---

## 4. Lapisan Animasi & UI/UX

### 4.1 Three.js
- `three@0.186.0` dipasang sebagai dependency npm lokal; build ESM di-vendor ke `wwwroot/lib/three/`.
- `wwwroot/js/sibangku-three.js`: satu scene ambient ringan (280 partikel konstelasi champagne-gold + 3 cincin orbit) di belakang hero. Geometri/material di-dispose eksplisit.
- **Dimuat on-demand** lewat `JS.InvokeAsync<IJSObjectReference>("import", ...)` hanya dari halaman landing — portal lain tidak membayar ~2 MB payload ini.
- **Hemat sumber daya**: `prefers-reduced-motion` → scene tidak dibuat sama sekali; render dijeda saat tab tidak aktif maupun saat canvas keluar viewport (`IntersectionObserver`); `devicePixelRatio` dibatasi 1.75; canvas disembunyikan di layar < 768 px.
- **Fallback aman**: bila WebGL tidak tersedia, scene dilewati secara diam-diam dan latar CSS tetap tampil.

### 4.2 Presisi Ikon
- Aturan baru menjamin setiap tile ikon (`rounded-circle`/`rounded-3`/`rounded-2`, `.ms-stat-icon`, `.ms-sidebar-brand-icon`) menengahkan glyph secara optis (`line-height: 1`, flex center, kotak `1em`).
- Ikon inline pada tombol, judul kartu, badge, dan nav diberi flex-shrink 0 agar tidak pernah terpotong.

### 4.3 Mikro-interaksi & Aksesibilitas
- Transisi masuk permukaan halaman (`.ms-admin-wrapper`, `.ms-customer-portal`, `.ms-alert`) memakai `transform`/`opacity` saja.
- Skeleton loader `.ms-skeleton` tersedia sebagai alternatif spinner.
- Blok `@media (prefers-reduced-motion: reduce)` menyetel durasi animasi/transisi ke ~0, mematikan loop ambient, menampilkan divider & progress track secara langsung, dan menyembunyikan canvas 3D. Badge/teks statistik tetap menampilkan nilai akhir, jadi tidak ada informasi yang hilang.
- `initLandingAnimations` berhenti lebih awal saat reduced motion aktif (termasuk observer).
- Focus-visible ditambahkan untuk elemen interaktif non-native.

---

## 5. Status Paket Aplikasi (APK & EXE)

### 5.1 `SiBangku-Desktop-App.exe` — **BEKERJA**
Diverifikasi eksekusi nyata: exit code `0`, launcher menjalankan proses browser (jumlah proses browser 13 → 14). Berkas adalah PE32 .NET Framework 4.0 yang valid (`mscoree.dll`, `_CorExeMain`).

### 5.2 `SiBangku-Universal-App.apk` — **TIDAK BEKERJA** (artefak dihapus)
Berkas lama bukan paket Android yang valid: hanya berisi `AndroidManifest.xml`, `assets/manifest.json`, `res/drawable/ic_launcher.svg`, dan `META-INF/MANIFEST.MF` — **tanpa `classes.dex`**, **tanpa `resources.arsc`**, tidak ditandatangani, dan referensi `@drawable/ic_launcher` menunjuk SVG (bukan drawable Android valid). Android akan menolaknya dengan *"There was a problem parsing the package"*.

**Perbaikan:** berkas dihapus dari `wwwroot/downloads/` dan tombol unduh APK pada modal provisioning diganti dengan **tombol "Pasang Aplikasi"** yang memicu prompt instalasi PWA native (`beforeinstallprompt`), dengan notifikasi langkah manual bila browser tidak menyediakan prompt. Ini memberi jalur instalasi mobile yang benar-benar berfungsi hari ini.

### 5.3 `SiBangku-Desktop-Launcher.bat` — diperbaiki
Route `/tenant-admin` (404) diganti `/admin`, ditambah dukungan kode tenant sebagai argumen, echo URL tujuan, dan fallback yang informatif bila Edge/Chrome tidak ditemukan.

---

## 6. Verifikasi

| Pengujian | Hasil |
|---|---|
| `dotnet build SiBangku.slnx` | **LULUS** — 0 Warning, 0 Error |
| `dotnet test SiBangku.slnx` | **LULUS** — 25/25 (dari 14; +11 tes regresi baru) |
| E2E reservasi (alias & kanonik) | **200 OK** (sebelumnya 400 / 500) |
| E2E `GET /reservations?date` | **200 OK** (sebelumnya 500) |
| Body JSON rusak | **400** (sebelumnya 500) |
| Rate limit login | **429 setelah 10 percobaan** |
| Master key lama (JWT_SECRET) | **403 ditolak** |
| Kebocoran hash pada `/internal/admin/list` | **tidak ada** |
| CORS origin asing | **tanpa header ACAO** |
| Security headers + CSP | **ada di ketiga service** |
| Halaman `/`, `/booking`, `/admin`, `/tenant-admin`, `/control-admin` | **200** |
| Aset JS/CSS/manifest/service-worker/logo | **200** |
| `node --check` pada kedua berkas JS | **valid** |
| `SiBangku-Desktop-App.exe` | **berjalan (exit 0)** |
| `SiBangku-Universal-App.apk` | **dihapus (404)** |

**Tes regresi baru** yang mencegah bug di atas terulang: payload alias, payload kanonik + asersi `DateTimeKind.Utc`, filter tanggal, body rusak, jumlah tamu tidak valid, serta tes keamanan (master key wajib, tanpa `passwordHash`, allowlist status, security headers).

---

## 7. Tugas Manusia yang Tersisa

1. **Ganti kata sandi basis data `sibangku_dev`** dan rahasiakan `JWT_SECRET`/`MASTER_API_KEY` pada lingkungan produksi (nilai di `docker-compose.yml` hanya placeholder pengembangan).
2. **Build APK native sungguhan** memerlukan Android SDK + Gradle di CI: `tenants/<KODE>/android` masih berupa sumber parsial (belum ada `settings.gradle`, wrapper, dan signing config).
3. **Rotasi kredensial** yang pernah tertulis di repositori (JWT secret lama `super_secret_jwt_key_platform_admin_2026` harus dianggap bocor).
4. Konfigurasi serupa di sisi infrastruktur: TLS/HSTS di reverse proxy, WAF, dan DNS.
