# Workspace Kustomisasi Tenant: komik caffe (PTKOMIKCAFFE)

Folder ini adalah ruang kerja terisolasi (*isolated code workspace*) untuk outlet **komik caffe** (`PTKOMIKCAFFE`).
Kode dan aset di folder ini terpisah dari codebase inti SiBangku Platform.

---

## 📁 Struktur Direktori
* `config.json` : Konfigurasi identitas outlet, database, dan URL endpoint.
* `custom.css`  : Styling dan tema visual khusus (warna, font, elemen antarmuka).
* `web/`        : Web launcher dan konfigurasi Progressive Web App (PWA).
* `desktop/`    : Launcher Windows desktop mandiri (`.bat`) bebas ketergantungan.
* `android/`    : Proyek wrapper Android (WebView / TWA) siap build ke `.apk`.

---

## 🚀 Menjalankan & Membuka Aplikasi
1. **Desktop Client (Kasir Windows):**
   * Jalankan berkas di: `desktop/SiBangku-PTKOMIKCAFFE.bat`.
   * Otomatis membuka aplikasi kasir & reservasi dalam jendela mandiri mode POS.
2. **Web Portal Mitra:**
   * Buka di browser: `http://localhost:3000/tenant-admin?tenant=PTKOMIKCAFFE`
3. **Portal Reservasi Tamu (Booking):**
   * Buka di browser: `http://localhost:3000/booking?tenant=PTKOMIKCAFFE`
4. **Dari Smartphone / Tablet Android (Wi-Fi Lokal):**
   * Buka browser di HP: `http://192.168.68.103:3000/booking?tenant=PTKOMIKCAFFE`
   * Ketuk menu Chrome (⋮) -> **"Tambahkan ke Layar Utama"** / **"Instal Aplikasi"**.

---

## 📱 Build Android APK Mandiri (.apk)
Proyek `android/` sudah lengkap dan siap dikompilasi (Android Gradle Plugin 8.5.2, Gradle 8.7,
JDK 17). Berkas Gradle Wrapper tidak disimpan di repositori, jadi pakai salah satu cara berikut:

1. **Otomatis lewat CI (disarankan)**
   * Pipeline `.github/workflows/ci.yml` mengompilasi APK untuk setiap folder `tenants/<KODE>/android`
     dan mengunggahnya sebagai artifact `sibangku-<KODE>-apk`.
   * Jalankan dari tab **Actions → SiBangku CI → Run workflow**.
2. **Manual di komputer sendiri**
   ```bash
   cd tenants/PTKOMIKCAFFE/android
   gradle wrapper --gradle-version 8.7   # sekali saja bila wrapper belum ada
   ./gradlew assembleDebug
   ```
   Hasil: `android/app/build/outputs/apk/debug/app-debug.apk` (siap dipasang ke perangkat).
   Alternatif: buka folder `android/` di Android Studio, lalu **Build → Build APK(s)**.
