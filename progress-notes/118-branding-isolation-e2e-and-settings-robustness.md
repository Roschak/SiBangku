# Progress Note 118: Tes E2E Isolasi Branding & Perbaikan Ketahanan Pengaturan Tenant

**Tanggal:** 16 September 2026
**Status:** Selesai — Build 0 Warning / 0 Error, **74/74 Tests Passed** (20 tes E2E di atas PostgreSQL nyata), gerbang format hijau

---

## 1. Tes E2E Isolasi Branding (5 tes baru)

`src/SiBangku.Tests/PostgresE2E/BrandingIsolationE2ETests.cs` — membuktikan tema dan jam operasional
tersimpan per tenant dan tidak saling bocor, di atas PostgreSQL sungguhan:

| Tes | Yang dibuktikan |
|---|---|
| `Branding_AndTimeSlots_AreIsolatedPerTenant` | Dua tenant menyimpan tema + jam operasional berbeda; masing-masing membacanya kembali lewat endpoint **publik** dan **komposit**; baris tersimpan di **database terpisah** dan tidak pernah memuat nilai tenant lain (`Contains`/`DoesNotContain`); tenant ketiga yang **tidak pernah ditulis** tetap memakai default hasil provisioning |
| `Branding_CrossTenantWriteWithForeignToken_IsForbidden` | Token tenant B + header tenant A ditolak `403 FORBIDDEN` pada **ketiga jalur tulis** (`PUT /branding`, `POST /settings/branding`, `POST /settings/time_slots`), dan pengaturan B tidak berubah sama sekali |
| `Branding_LegacySettingsEndpoints_WriteOnlyToTheirOwnTenant` | Jalur tulis lama (raw JSON body) hanya menulis ke tenant pengirim; tenant tetangga tetap memakai nilainya sendiri dan tidak pernah melihat nilai itu |
| `Branding_MalformedBody_IsRejectedWithoutCorruptingStoredSettings` | Body rusak / bukan objek JSON / melebihi 16 KB ditolak (`400`/`413`) **tanpa** mengubah baris tersimpan, dan endpoint publik tetap `200` |
| `Branding_CorruptStoredRow_DegradesToDefaultsInsteadOfBreakingThePortal` | Baris pengaturan yang sudah rusak (mis. sisa deployment lama) tidak lagi membuat portal `500`, melainkan dilayani dengan default platform |

**Anggaran rate limit dijaga:** tes ini memakai tenant yang sudah di-provisioning kelas E2E lain
("tables", "isolation") sehingga tidak menambah login baru; hanya satu tenant tambahan yang
di-provisioning tanpa pernah login (provisioning lewat Control API, bukan endpoint auth tenant).
Total permintaan auth suite E2E kini ±7 dari batas 10/menit.

---

## 2. Dua Cacat Nyata yang Ditemukan & Diperbaiki

### 2.1 Body rusak disimpan sebelum divalidasi → 500 + baris rusak permanen

`POST /api/v1/settings/branding` dan `POST /api/v1/settings/time_slots` menyimpan **body mentah**
lalu memanggil `JsonSerializer.Deserialize<JsonElement>(body)` untuk responsnya. Untuk body yang
bukan JSON valid, urutannya berarti: nilai rusak **sudah tersimpan**, lalu handler melempar
`JsonException` yang tidak tertangani → **HTTP 500**.

Dampaknya berat, bukan sekadar satu permintaan gagal: kedua portal (booking tamu dan admin mitra)
mem-parse nilai pengaturan ini **setiap kali halaman dimuat** (`GET /api/v1/settings/branding` dan
`GET /api/v1/branding`). Jadi satu permintaan buruk membuat portal publik outlet tersebut **500 terus
menerus** sampai barisnya dibetulkan manual di database.

**Perbaikan:** validasi dijalankan **sebelum** apa pun disimpan (`ReadSettingsJsonBodyAsync`):
- body harus JSON **objek** → selain itu `400 BAD_REQUEST`,
- batas ukuran 16 KB (`Content-Length` diperiksa sebelum dibaca, lalu panjang body) → `413`,
- yang disimpan adalah teks kanonik hasil parse, sehingga kolom tidak mungkin lagi menyimpan JSON tidak sah,
- jalur `PUT /api/v1/branding` memakai validasi yang sama (sebelumnya `JsonDocument.ParseAsync` tanpa guard → `500` untuk body rusak).

### 2.2 Baris pengaturan yang sudah rusak mematikan portal

Perbaikan 2.1 mencegah kerusakan **baru**, tetapi baris yang sudah rusak (sisa deployment lama, atau
hasil sunting manual) masih membuat endpoint baca melempar `JsonException` → `500`. Jalur baca kini
memakai `ReadStoredJson`: nilai yang tidak terbaca atau bukan objek JSON **jatuh ke default platform**,
sehingga outlet tetap bisa melayani tamu alih-alih mati total.

**Bukti cacat ini nyata** (bukan sekadar analisis kode): pada stack Docker yang berjalan (kode
sebelum perbaikan), saya mengubah sementara baris `settings.branding` tenant demo menjadi JSON rusak
lewat SQL, lalu memanggil endpoint publik:

| Langkah | Hasil |
|---|---|
| `GET /api/v1/settings/branding` (baris normal) | `200` |
| `GET /api/v1/settings/branding` (baris rusak, kode lama) | **`500`** |
| Setelah baris dipulihkan | `200` (dan portal `/booking` `200`) |

> **Disclosure jujur:** nilai baris tersebut ditimpa untuk demonstrasi, jadi pemulihannya memakai
> default hasil provisioning. Nilai sebelum ditimpa terlihat identik dengan default itu pada 60
> karakter pertama (`{"primaryColor":"#3b82f6","secondaryColor":"#1e3a8a","font":...`), namun bila
> outlet PTKOMIKCAFFE pernah menyimpan `logo`/`favicon`/`heroImage` khusus, nilai itu perlu disimpan
> ulang dari halaman admin mitra. Tidak ada tabel lain yang disentuh.

---

## 3. Verifikasi yang Dijalankan

| Verifikasi | Hasil |
|---|---|
| `dotnet build SiBangku.slnx` | **0 Warning / 0 Error** |
| `dotnet test SiBangku.slnx` | **74/74 Passed** (naik dari 69) |
| Tes isolasi branding (difilter) | 5/5 Passed |
| Tanpa PostgreSQL | **54 Passed, 20 Skipped, 0 Failed** |
| `dotnet format --verify-no-changes` | exit 0, 0 error |
| Endpoint publik setelah pemulihan data dev | `/api/v1/settings/branding` `200`, `/api/v1/branding` `200`, `/booking` `200` |
| Sisa database uji setelah suite | Bersih (semua `sibangku_e2e_*` terhapus otomatis) |

---

## 4. Batasan & Sisa Pekerjaan

- **Kontainer Docker masih menjalankan kode sebelum perbaikan ini.** Agar perbaikan aktif di stack
  lokal, jalankan `docker compose up -d --build` (belum saya lakukan karena itu tindakan deploy).
- Pola `JsonDocument.ParseAsync` **tanpa guard** masih ada di endpoint lain dan akan menghasilkan `500`
  untuk body rusak (satu kelas bug yang sama, namun tidak menyentuh data tersimpan):
  `PATCH /reservations/{id}/status`, `PATCH /reservations/{id}/payment`, `POST /auth/change-password`
  (Tenant API) serta `PATCH /tenants/{id}/status`, `/extend-trial`, `/reset-password`,
  `PUT /auth/profile`, `POST /auth/change-password`, `PUT /tenants/{id}` (Control API).
  Belum saya ubah karena di luar cakupan permintaan ini — kandidat kuat untuk pekerjaan berikutnya.
- Default branding **berbeda antar endpoint** (`#3b82f6` di `/settings/branding`, `#D4AF37` di
  `/branding`). Ini perilaku lama yang sengaja dipertahankan; tes baru mendokumentasikannya, bukan
  mengubahnya.

---

## 5. Berkas yang Disentuh

```
src/SiBangku.Tests/PostgresE2E/BrandingIsolationE2ETests.cs   (baru, 5 tes)
src/SiBangku.Tests/PostgresE2E/PostgresTestServer.cs          (+ Execute() untuk setup baris rusak)
src/SiBangku.TenantApi/Program.cs                             (validasi body settings, jalur baca tahan rusak)
README.md                                                     (jumlah tes & cakupan E2E)
```
