# Workspace Kustomisasi Tenant: papatungan (PTPTAJA)

Folder ini adalah ruang kerja terisolasi (*isolated code workspace*) khusus untuk outlet **papatungan** (`PTPTAJA`).
Kode dan aset di folder ini terpisah dari codebase inti SiBangku Platform.

## 📁 Struktur Direktori
* `config.json` : Konfigurasi identitas outlet, database, dan URL endpoint.
* `custom.css`  : Styling dan tema visual khusus (warna, font, elemen antarmuka).
* `web/`        : Web launcher dan konfigurasi Progressive Web App (PWA).
* `desktop/`    : Launcher Windows desktop mandiri (`.bat`) bebas ketergantungan.
* `android/`    : Proyek wrapper Android (WebView / TWA) siap build ke `.apk`.

## 🚀 Menjalankan & Membuka Aplikasi
1. **Desktop Client (Kasir Windows):**
   * Jalankan berkas di: `desktop/SiBangku-PTPTAJA.bat`.
2. **Web Portal Mitra:**
   * Buka di browser: `http://localhost:3000/admin?tenant=PTPTAJA`
3. **Portal Reservasi Tamu (Booking):**
   * Buka di browser: `http://localhost:3000/booking?tenant=PTPTAJA`
