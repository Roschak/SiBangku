# Skrip otomatis untuk membuat isolated workspace per tenant
param (
    [Parameter(Mandatory=$true)]
    [string]$TenantCode,
    [string]$RestaurantName = "",
    [string]$PrimaryColor = "#D4AF37",
    [string]$SecondaryColor = "#A07E3F",
    # Alamat IP server SiBangku di jaringan lokal (dipakai launcher Android/PWA).
    [string]$LanHost = "192.168.68.103"
)

# Kompatibel dengan Windows PowerShell 5.1 maupun PowerShell 7+; setiap
# kegagalan penulisan berkas harus menghentikan skrip (bukan gagal diam-diam).
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TenantCode = $TenantCode.Trim().ToUpperInvariant()
if ([string]::IsNullOrWhiteSpace($RestaurantName)) {
    $RestaurantName = $TenantCode
}

# Java package segment: hanya huruf/angka, karena '-' tidak sah di dalam nama
# package (kode tenant seperti 'DISTRO-AVENUE' tetap didukung).
$packageSegment = ($TenantCode -replace '[^a-zA-Z0-9]', '').ToLowerInvariant()
if ([string]::IsNullOrWhiteSpace($packageSegment) -or [char]::IsDigit($packageSegment[0])) {
    throw "TenantCode '$TenantCode' tidak bisa dipakai sebagai package Android."
}

# Forward slashes everywhere: PowerShell resolves them on Windows too, and the
# script then also runs on Linux/macOS (used by the CI smoke build).
$baseDir = "tenants/$TenantCode"
$repoRoot = (Get-Location).Path

# UTF-8 tanpa BOM: JSON/Java/Gradle/XML di bawah harus bebas BOM agar diterima
# parser masing-masing. 'Set-Content -Encoding' hanya menerima objek Encoding di
# PowerShell 7+, jadi penulisan memakai System.IO agar konsisten di semua versi.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Out-Utf8File {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Path,
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
        [string]$Content
    )

    process {
        $fullPath = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $Path))
        $directory = [System.IO.Path]::GetDirectoryName($fullPath)
        if (-not (Test-Path -LiteralPath $directory)) {
            New-Item -ItemType Directory -Force -Path $directory | Out-Null
        }

        [System.IO.File]::WriteAllText($fullPath, $Content, $utf8NoBom)
    }
}
Write-Host "[SiBangku] Membuat workspace khusus untuk tenant '$RestaurantName' ($TenantCode)..." -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path "$baseDir/desktop", "$baseDir/web", "$baseDir/android/app/src/main/java/com/sibangku/$packageSegment", "$baseDir/android/app/src/main/res/values" | Out-Null

# 1. README.md
@"
# Workspace Kustomisasi Tenant: $RestaurantName ($TenantCode)

Folder ini adalah ruang kerja terisolasi (*isolated code workspace*) khusus untuk outlet **$RestaurantName** (`$TenantCode`).
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
   * Jalankan berkas di: `desktop/SiBangku-$TenantCode.bat`.
   * Otomatis membuka aplikasi kasir & reservasi dalam jendela mandiri mode POS di port 3000.
2. **Web Portal Mitra:**
   * Buka di browser: `http://localhost:3000/admin?tenant=$TenantCode`
3. **Portal Reservasi Tamu (Booking):**
   * Buka di browser: `http://localhost:3000/booking?tenant=$TenantCode`
4. **Dari Smartphone / Tablet Android (Wi-Fi Lokal):**
   * Buka browser di HP: `http://$LanHost`:3000/booking?tenant=$TenantCode`
   * Ketuk menu Chrome (⋮) -> **"Tambahkan ke Layar Utama"** / **"Instal Aplikasi"**.

---

## Build Android APK Mandiri (.apk)
Proyek `android/` sudah lengkap (Android Gradle Plugin 8.5.2, Gradle 8.7, JDK 17):
1. Otomatis lewat CI: pipeline `.github/workflows/ci.yml` mengompilasi APK setiap folder
   `tenants/<KODE>/android` dan mengunggahnya sebagai artifact `sibangku-<KODE>-apk`.
2. Manual:
   ```bash
   cd tenants/$TenantCode/android
   gradle wrapper --gradle-version 8.7   # sekali saja bila wrapper belum ada
   ./gradlew assembleDebug
   ```
   Hasil: `android/app/build/outputs/apk/debug/app-debug.apk`.
"@ | Out-Utf8File "$baseDir/README.md"

# 2. config.json
@"
{
  "tenantCode": "$TenantCode",
  "restaurantName": "$RestaurantName",
  "endpoints": {        "webBaseUrl": "http://localhost:3000",
    "lanBaseUrl": "http://$LanHost`:3000",
    "customerBookingUrl": "http://localhost:3000/booking?tenant=$TenantCode",
    "adminPortalUrl": "http://localhost:3000/admin?tenant=$TenantCode"
  },
  "branding": {
    "primaryColor": "$PrimaryColor",
    "secondaryColor": "$SecondaryColor"
  }
}
"@ | Out-Utf8File "$baseDir/config.json"

# 3. custom.css
@"
/* Kustomisasi Visual Khusus: $RestaurantName ($TenantCode) */
:root {
  --tenant-brand-primary: $PrimaryColor;
  --tenant-brand-secondary: $SecondaryColor;
}
"@ | Out-Utf8File "$baseDir/custom.css"

# 4. Desktop Launcher (.bat)
@"
@echo off
title SiBangku POS - $RestaurantName ($TenantCode)
echo Menghubungkan ke server SiBangku outlet $TenantCode...
set "TARGET_URL=http://localhost:3000/admin?tenant=$TenantCode"
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%TARGET_URL%" --window-size=1280,800
    exit /b 0
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%TARGET_URL%" --window-size=1280,800
    exit /b 0
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%TARGET_URL%" --window-size=1280,800
    exit /b 0
)
start "" "%TARGET_URL%"
exit /b 0
"@ | Out-Utf8File "$baseDir/desktop/SiBangku-$TenantCode.bat"

# 4b. Web PWA manifest (dipakai tombol "Pasang Aplikasi")
@"
{
  "name": "$RestaurantName - SiBangku",
  "short_name": "$RestaurantName",
  "start_url": "http://localhost:3000/booking?tenant=$TenantCode",
  "display": "standalone",
  "background_color": "#1C1714",
  "theme_color": "$PrimaryColor",
  "orientation": "portrait",
  "icons": []
}
"@ | Out-Utf8File "$baseDir/web/manifest.json"

# 5. Web standalone index.html
@"
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$RestaurantName - SiBangku</title>
  <link rel="manifest" href="manifest.json">
</head>
<body style="background:#1C1714;color:#FAF8F5;font-family:sans-serif;text-align:center;padding:40px;">
  <h2>$RestaurantName</h2>
  <p>Sistem Pemesanan Meja & Kasir</p>
  <p><a href="http://localhost:3000/booking?tenant=$TenantCode" style="color:$PrimaryColor;">Buka Booking Tamu</a></p>
  <p><a href="http://localhost:3000/admin?tenant=$TenantCode" style="color:$PrimaryColor;">Buka Dashboard Admin</a></p>
</body>
</html>
"@ | Out-Utf8File "$baseDir/web/index.html"

# 6. Proyek Android (WebView wrapper) - lengkap dan siap dikompilasi
#    Java/Gradle/XML ditulis sebagai UTF-8 tanpa BOM agar diterima compiler.
$androidDir = "$baseDir/android"

# 6a. settings.gradle
@"
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "SiBangku-$TenantCode"
include ':app'
"@ | Out-Utf8File "$androidDir/settings.gradle"

# 6b. build.gradle (versi Android Gradle Plugin dipin agar build reproducible)
@"
plugins {
    id 'com.android.application' version '8.5.2' apply false
}
"@ | Out-Utf8File "$androidDir/build.gradle"

# 6c. gradle.properties
@"
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.caching=true
android.nonTransitiveRClass=true
android.useAndroidX=true
"@ | Out-Utf8File "$androidDir/gradle.properties"

# 6d. app/build.gradle
@"
plugins {
    id 'com.android.application'
}

android {
    namespace 'com.sibangku.$packageSegment'
    compileSdk 34

    defaultConfig {
        applicationId "com.sibangku.$packageSegment"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    // Android lightweight standard library (tanpa dependensi runtime eksternal)
}
"@ | Out-Utf8File "$androidDir/app/build.gradle"

# 6e. proguard-rules.pro
@"
# R8/ProGuard rules untuk wrapper $TenantCode (minify dinonaktifkan).
-keep class com.sibangku.$packageSegment.MainActivity { *; }
"@ | Out-Utf8File "$androidDir/app/proguard-rules.pro"

# 6f. AndroidManifest.xml (tanpa atribut package: AGP 8 memakai namespace di build.gradle)
@"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:label="@string/app_name"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
"@ | Out-Utf8File "$androidDir/app/src/main/AndroidManifest.xml"

# 6g. res/values/strings.xml
@"
<resources>
    <string name="app_name">$RestaurantName</string>
    <string name="tenant_code">$TenantCode</string>
</resources>
"@ | Out-Utf8File "$androidDir/app/src/main/res/values/strings.xml"

# 6h. MainActivity.java (WebView POS/booking client)
@"
package com.sibangku.$packageSegment;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;

    // Alamat server SiBangku pada jaringan lokal (sesuaikan bila IP server berubah).
    private static final String TARGET_URL = "http://$LanHost`:3000/booking?tenant=$TenantCode";
    // Fallback emulator Android: 10.0.2.2 menunjuk ke localhost komputer host.
    private static final String EMULATOR_FALLBACK = "http://10.0.2.2:3000/booking?tenant=$TenantCode";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                // Bila server IP lokal tidak terjangkau, coba fallback ke host emulator.
                if (failingUrl.contains("$LanHost")) {
                    view.loadUrl(EMULATOR_FALLBACK);
                } else {
                    Toast.makeText(MainActivity.this, "Pastikan server SiBangku (port 3000) berjalan di jaringan yang sama.", Toast.LENGTH_LONG).show();
                }
            }
        });

        webView.loadUrl(TARGET_URL);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
"@ | Out-Utf8File "$androidDir/app/src/main/java/com/sibangku/$packageSegment/MainActivity.java"

# 7. Verifikasi akhir: pastikan seluruh artefak benar-benar tertulis.
$expectedFiles = @(
    "README.md",
    "config.json",
    "custom.css",
    "desktop/SiBangku-$TenantCode.bat",
    "web/index.html",
    "web/manifest.json",
    "android/settings.gradle",
    "android/build.gradle",
    "android/gradle.properties",
    "android/app/build.gradle",
    "android/app/proguard-rules.pro",
    "android/app/src/main/AndroidManifest.xml",
    "android/app/src/main/res/values/strings.xml",
    "android/app/src/main/java/com/sibangku/$packageSegment/MainActivity.java"
)

$missingFiles = @($expectedFiles | Where-Object { -not (Test-Path -LiteralPath (Join-Path $baseDir $_)) })
if ($missingFiles.Count -gt 0) {
    Write-Host "[Gagal] Berkas berikut tidak terbentuk: $($missingFiles -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host "[Sukses] Workspace siap di: $baseDir ($($expectedFiles.Count) berkas)" -ForegroundColor Green
