# 📋 Panduan Langkah Manual Pengembang (SiBangku C#)

Karena keterbatasan akses sistem AI (seperti mengontrol GUI Docker Desktop di Windows Anda, mendaftar ke portal pihak ketiga, atau mengompilasi SDK Android asli), ada beberapa konfigurasi dan langkah operasional yang **harus Anda tangani secara manual**.

Berikut adalah panduan langkah demi langkah (step-by-step) lengkap untuk menyelesaikannya:

---

## 🐋 Langkah 1: Menjalankan Docker Compose di Windows Lokal

Sebelumnya, perintah `docker ps` gagal karena Docker Desktop belum berjalan di Windows Anda.

### Cara Menangani:
1. **Buka Aplikasi Docker Desktop**:
   * Klik tombol **Start** Windows, cari `Docker Desktop`, lalu buka aplikasinya.
   * Tunggu hingga indikator status di pojok kiri bawah berwarna **Hijau** (status: *Engine Running*).
2. **Jalankan Containers**:
   * Buka terminal (PowerShell/CMD) di root folder proyek `D:\sertifikat\Apk_SiBangku`.
   * Jalankan perintah:
     ```powershell
     docker compose up -d --build
     ```
   * Perintah ini akan mem-build semua Dockerfile C# (`control-api`, `tenant-api`, `worker`, dan `web`) serta menjalankan PostgreSQL.
3. **Verifikasi Kontainer Berjalan**:
   * Jalankan perintah `docker ps` untuk memastikan kelima kontainer (`sibangku-postgres-csharp`, `sibangku-control-api-csharp`, `sibangku-tenant-api-csharp`, `sibangku-worker-csharp`, dan `sibangku-web-csharp`) statusnya **Up**.

---

## 💳 Langkah 2: Konfigurasi Midtrans Payment Gateway (Sandbox)

Untuk memproses reservasi berbayar di restoran, Anda perlu kunci API (API Keys) dari Midtrans Sandbox.

### Cara Menangani:
1. **Daftar Akun Midtrans Sandbox**:
   * Buka browser dan pergi ke [Midtrans Sandbox Registration](https://dashboard.sandbox.midtrans.com/register).
   * Daftarkan akun developer baru dan masuk ke dashboard Sandbox.
2. **Dapatkan Client & Server Keys**:
   * Di dashboard Midtrans Sandbox, navigasi ke menu **Settings** > **Access Keys**.
   * Salin nilai **Server Key** dan **Client Key** Anda.
3. **Konfigurasikan ke API**:
   * Masukkan nilai tersebut ke dalam file konfigurasi atau environment Docker di `docker-compose.yml` pada bagian `tenant-api`:
     ```yaml
     tenant-api:
       ...
       environment:
         - MIDTRANS_SERVER_KEY=Masukkan_Server_Key_Anda_Di_Sini
         - MIDTRANS_CLIENT_KEY=Masukkan_Client_Key_Anda_Di_Sini
         - MIDTRANS_IS_PRODUCTION=false
     ```
   * Simpan file `docker-compose.yml` dan restart kontainer dengan:
     ```powershell
     docker compose down; docker compose up -d
     ```

---

## 📱 Langkah 3: Kompilasi / Build Android APK Wrapper (.NET MAUI)

Untuk membuat aplikasi APK Android *white-label* yang membungkus (wrap) portal booking restoran (PRD §66), Anda perlu menggunakan framework **.NET MAUI** (Multi-platform App UI) dengan **Hybrid WebView**.

### Cara Menangani:
1. **Pastikan Prasyarat MAUI Terinstall**:
   * Buka terminal Windows Anda dan jalankan perintah cek beban kerja MAUI:
     ```powershell
     dotnet workload install maui-android
     ```
2. **Struktur Proyek MAUI**:
   * Anda bisa membuat sub-folder baru di proyek Anda (misal `src/SiBangku.Apk`) dengan perintah:
     ```powershell
     dotnet new maui -n SiBangku.Apk -o src/SiBangku.Apk
     ```
3. **Gunakan WebView untuk Membungkus Web**:
   * Buka file `src/SiBangku.Apk/MainPage.xaml` dan ubah isinya untuk mengarahkan ke URL subdomain tenant Anda (misal Next.js atau Blazor Web URL):
     ```xml
     <ContentPage xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
                  xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
                  x:Class="SiBangku.Apk.MainPage">
         <WebView Source="http://distroavenue.sibangku.example:3000/booking" 
                  VerticalOptions="FillAndExpand" 
                  HorizontalOptions="FillAndExpand" />
     </ContentPage>
     ```
4. **Build APK Android**:
   * Sambungkan HP Android Anda dalam mode USB Debugging atau jalankan emulator.
   * Jalankan perintah kompilasi APK di terminal:
     ```powershell
     dotnet publish src/SiBangku.Apk/SiBangku.Apk.csproj -f net9.0-android -c Release -p:SupportUrl=true
     ```
   * Berkas APK hasil kompilasi akan berada di folder:
     `src/SiBangku.Apk/bin/Release/net9.0-android/publish/`

---

## 🧪 Langkah 4: Pengujian End-to-End Menggunakan Postman / cURL

Setelah Docker compose berjalan, Anda bisa menguji alur kerja penuh platform secara manual.

### Cara Menangani:
1. **Dapatkan Token Admin Platform**:
   * Kirim request POST ke `http://localhost:3001/api/v1/auth/login` dengan JSON body:
     ```json
     {
       "email": "admin",
       "password": "admin"
     }
     ```
   * Salin nilai `token` dari response data.
2. **Pendaftaran / Provisioning Tenant**:
   * Kirim request POST ke `http://localhost:3001/api/v1/tenants` dengan header `Authorization: Bearer <token_admin>` dan JSON body:
     ```json
     {
       "tenantName": "Avenue Coffee",
       "restaurantName": "Avenue Resto",
       "adminEmail": "owner@avenue.com",
       "trialDays": 30
     }
     ```
   * Simpan detail respon yang berisi `temporaryPassword` dan nama database `tenant_avenuecoffee` yang sukses dibuat secara dinamis.
3. **Akses Portal Pelanggan**:
   * Buka halaman `http://localhost:3000/booking` pada browser Anda.
   * Masukkan kode tenant `AVENUECOFFEE` untuk memuat branding warna dan seating layout yang terisolasi.
