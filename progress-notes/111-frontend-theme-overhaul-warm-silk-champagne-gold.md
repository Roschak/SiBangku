# Progress Note 111: Frontend Theme Overhaul (Warm Silk Alabaster & Champagne Gold)

## 1. Ringkasan Pekerjaan (Summary)
Berdasarkan permintaan pengguna untuk mengubah tampilan agar tidak berwarna hitam legam pekat ("warnanya gak hitam seperti itu tapi masih cocok di sandingkan dengan iconnya"), telah dilakukan refactoring dan restyling menyeluruh pada layer frontend Blazor Web (`SiBangku.Web`) dan aset branding terkait tanpa menyentuh layer backend.

## 2. Palet Desain Baru: *Warm Silk Alabaster & Champagne Gold*
Tema baru menggantikan warna hitam pekat (*Obsidian Espresso* `#0B0908` / `#141110`) dengan estetika fine-dining luxury yang cerah, hangat, dan prestisius:

- **Latar Belakang Dasar (`--ms-surface-dark`):** `#FAF8F5` (Warm Alabaster Silk)
- **Kartu & Kontainer Konten (`--ms-surface-card`):** `#FFFFFF` (Porcelain Alabaster)
- **Permukaan Terangkat (`--ms-surface-elevated`):** `#F4EFE6` (Warm Silk Cream)
- **Permukaan Interaksi/Hover (`--ms-surface-hover`):** `#ECE4D6`
- **Warna Teks Utama (`--ms-text-main`):** `#1C1714` (Deep Warm Espresso Noir - kontras tinggi, sangat terbaca)
- **Warna Teks Sekunder (`--ms-text-muted`):** `#5C5245` (Warm Cocoa Bark)
- **Warna Teks Redup (`--ms-text-dim`):** `#8A7C6D`
- **Garis Batas (`--ms-border`):** `rgba(184, 142, 45, 0.22)` (Subtle Warm Champagne Gold)
- **Aksen Emas / Gold Primary (`--ms-gold` / `--ms-primary`):** `#B88E2D` / `#D4AF37`

### Harmonisasi dengan Ikon Logo:
Badge lambang monogram kursi emas di atas ubin gelap (`#1A1512`) dipertahankan secara utuh sebagai *executive crest* / segel lilin prestise. Teks tipografi logo "Si" diperbarui dari warna putih/gading (`#F5F1E8`) menjadi deep espresso (`#1C1613`) dan subjudul "HOSPITALITY" menjadi warm bronze (`#7E6C58`), sehingga tampak menyatu, proporsional, dan sangat elegan di atas header berkaca es putih (`rgba(255, 255, 255, 0.92)`).

## 3. Modul & File yang Diperbarui
1. **Aset Branding & Logo:**
   - `src/SiBangku.Web/wwwroot/brand/Navbar-Header-Logo.svg`
   - `src/SiBangku.Web/wwwroot/brand/Navbar-Header-Logo-Light.svg`
   - `icon-logo.apk/Navbar-Header-Logo.svg`
2. **Design Tokens & Global CSS:**
   - `src/SiBangku.Web/wwwroot/app.css`: Token warna surface, border, text, tabel (`.ms-table th` & `td`), scroll progress bar, floating back-to-top, stat cards, dan form controls.
3. **Layout Publik & Header:**
   - `src/SiBangku.Web/Components/Layout/CustomerLayout.razor`: Header frosted glass cerah, language pill, footer hangat Alabaster.
4. **Landing Page:**
   - `src/SiBangku.Web/Components/Pages/Home.razor`: Hero section, simulasi denah meja interaktif, kartu produk, 3 langkah alur, tech stack, testimoni, dan banner penawaran.
5. **Reservasi Meja:**
   - `src/SiBangku.Web/Components/Pages/Booking.razor`: Banner kartu reservasi, form pencarian, daftar slot meja, modal tiket reservasi.
6. **Pemindai QR Universal:**
   - `src/SiBangku.Web/Components/QrScannerModal.razor`: Kontainer modal, header, status bar, upload fallback, dan footer beralih ke warna kartu porcelain dan elevated silk. (Area viewfinder kamera tetap mempertahankan latar hitam untuk kontras stream video).
7. **Portal Manajemen:**
   - `src/SiBangku.Web/Components/Pages/ControlAdmin.razor`: Header judul login brand disesuaikan dengan kontras tinggi (`--ms-text-main`).
   - `src/SiBangku.Web/Components/Pages/TenantAdmin.razor`: Default warna latar branding tenant diselaraskan ke `#FAF8F5` dan teks `#1C1714`.

## 4. Verifikasi & Integritas Sistem
- **Status Kompilasi:** `dotnet build SiBangku.slnx` -> **0 Warning(s), 0 Error(s)**.
- **Backend Integrity:** Tidak ada perubahan pada backend project (`SiBangku.Db`, `SiBangku.ControlApi`, `SiBangku.TenantApi`, `SiBangku.Worker`, `SiBangku.Shared`).
- **Kepatuhan Brand:** Tidak terdapat penyebutan nama terlarang ("Distro Avenue").
