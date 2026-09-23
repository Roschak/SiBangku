using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace SiBangku.Shared
{
    public static class TenantWorkspaceScaffolder
    {
        public static bool ScaffoldWorkspace(
            string tenantCode,
            string restaurantName,
            string tenantId,
            string legalEntityName,
            string databaseIdentifier,
            string? baseDirectory = null)
        {
            try
            {
                tenantCode = tenantCode.Trim().ToUpperInvariant();
                if (string.IsNullOrWhiteSpace(restaurantName)) restaurantName = tenantCode;

                // Resolve tenants root folder
                string? tenantsDir = baseDirectory;
                if (string.IsNullOrWhiteSpace(tenantsDir))
                {
                    // Look up from current directory or AppContext.BaseDirectory
                    var candidates = new[]
                    {
                        Path.Combine(Directory.GetCurrentDirectory(), "tenants"),
                        Path.Combine(Directory.GetCurrentDirectory(), "..", "tenants"),
                        Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "tenants"),
                        Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "..", "tenants"),
                        Path.Combine(AppContext.BaseDirectory, "tenants"),
                        Path.Combine(AppContext.BaseDirectory, "..", "tenants"),
                        Path.Combine(AppContext.BaseDirectory, "..", "..", "tenants"),
                        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "tenants"),
                        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "tenants"),
                        @"D:\mydokumen\myproject\Apk_SiBangku\Apk_SiBangku\tenants"
                    };

                    foreach (var candidate in candidates)
                    {
                        try
                        {
                            var full = Path.GetFullPath(candidate);
                            if (Directory.Exists(full))
                            {
                                tenantsDir = full;
                                break;
                            }
                        }
                        catch { }
                    }
                }

                if (string.IsNullOrWhiteSpace(tenantsDir) || !Directory.Exists(tenantsDir))
                {
                    return false;
                }

                var targetDir = Path.Combine(tenantsDir, tenantCode);
                Directory.CreateDirectory(targetDir);
                Directory.CreateDirectory(Path.Combine(targetDir, "desktop"));
                Directory.CreateDirectory(Path.Combine(targetDir, "web"));

                var packageSegment = Regex.Replace(tenantCode, "[^a-zA-Z0-9]", "").ToLowerInvariant();
                if (string.IsNullOrWhiteSpace(packageSegment) || char.IsDigit(packageSegment[0]))
                {
                    packageSegment = "t" + packageSegment;
                }

                var javaDir = Path.Combine(targetDir, "android", "app", "src", "main", "java", "com", "sibangku", packageSegment);
                var resValuesDir = Path.Combine(targetDir, "android", "app", "src", "main", "res", "values");
                Directory.CreateDirectory(javaDir);
                Directory.CreateDirectory(resValuesDir);

                var utf8NoBom = new UTF8Encoding(false);

                // 1. config.json
                var configJson = $@"{{
  ""tenantId"": ""{tenantId}"",
  ""tenantCode"": ""{tenantCode}"",
  ""restaurantName"": ""{restaurantName}"",
  ""legalEntityName"": ""{legalEntityName}"",
  ""databaseIdentifier"": ""{databaseIdentifier}"",
  ""apkIdentifier"": ""com.sibangku.{packageSegment}"",
  ""endpoints"": {{
    ""webBaseUrl"": ""http://localhost:3000"",
    ""lanBaseUrl"": ""http://192.168.68.103:3000"",
    ""emulatorBaseUrl"": ""http://10.0.2.2:3000"",
    ""customerBookingUrl"": ""http://localhost:3000/booking?tenant={tenantCode}"",
    ""adminPortalUrl"": ""http://localhost:3000/tenant-admin?tenant={tenantCode}""
  }},
  ""branding"": {{
    ""primaryColor"": ""#D4AF37"",
    ""secondaryColor"": ""#A07E3F"",
    ""theme"": ""warm-silk-champagne-gold""
  }}
}}";
                File.WriteAllText(Path.Combine(targetDir, "config.json"), configJson, utf8NoBom);

                // 2. custom.css
                var customCss = $@"/* ========================================================
   Kustomisasi Visual Khusus: {restaurantName} ({tenantCode})
   Diterapkan pada portal booking dan tenant admin outlet ini.
   ======================================================== */

:root {{
  --tenant-brand-primary: #D4AF37;
  --tenant-brand-secondary: #A07E3F;
  --tenant-surface-dark: #1C1714;
}}

.btn-tenant-accent {{
  background: linear-gradient(135deg, #D4AF37 0%, #A07E3F 100%);
  color: #FFFFFF;
  border-radius: 8px;
  font-weight: 600;
}}
";
                File.WriteAllText(Path.Combine(targetDir, "custom.css"), customCss, utf8NoBom);

                // 3. Desktop bat
                var desktopBat = $@"@echo off
title SiBangku POS - {restaurantName} ({tenantCode})
echo ========================================================
echo  SiBangku POS Client - Outlet: {restaurantName}
echo  Kode Tenant: {tenantCode}
echo ========================================================
echo  Menghubungkan ke server SiBangku di port 3000...

set TARGET_URL=http://localhost:3000/tenant-admin?tenant={tenantCode}

if exist ""%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"" (
    start """" ""%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"" --app=""%TARGET_URL%"" --window-size=1280,800
    exit /b 0
)
if exist ""%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"" (
    start """" ""%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"" --app=""%TARGET_URL%"" --window-size=1280,800
    exit /b 0
)
if exist ""%ProgramFiles%\Google\Chrome\Application\chrome.exe"" (
    start """" ""%ProgramFiles%\Google\Chrome\Application\chrome.exe"" --app=""%TARGET_URL%"" --window-size=1280,800
    exit /b 0
)
if exist ""%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"" (
    start """" ""%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"" --app=""%TARGET_URL%"" --window-size=1280,800
    exit /b 0
)
start """" ""%TARGET_URL%""
exit /b 0
";
                File.WriteAllText(Path.Combine(targetDir, "desktop", $"SiBangku-{tenantCode}.bat"), desktopBat, utf8NoBom);

                // 4. Web manifest & index.html
                var manifestJson = $@"{{
  ""name"": ""{restaurantName} - SiBangku"",
  ""short_name"": ""{restaurantName}"",
  ""start_url"": ""http://localhost:3000/booking?tenant={tenantCode}"",
  ""display"": ""standalone"",
  ""background_color"": ""#1C1714"",
  ""theme_color"": ""#D4AF37"",
  ""orientation"": ""portrait"",
  ""icons"": []
}}";
                File.WriteAllText(Path.Combine(targetDir, "web", "manifest.json"), manifestJson, utf8NoBom);

                var indexHtml = $@"<!DOCTYPE html>
<html lang=""id"">
<head>
  <meta charset=""UTF-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>{restaurantName} - SiBangku</title>
  <link rel=""manifest"" href=""manifest.json"">
</head>
<body style=""background:#1C1714;color:#FAF8F5;font-family:sans-serif;text-align:center;padding:40px;"">
  <h2>{restaurantName}</h2>
  <p>Sistem Pemesanan Meja & Kasir</p>
  <p><a href=""http://localhost:3000/booking?tenant={tenantCode}"" style=""color:#D4AF37;"">Buka Booking Tamu</a></p>
  <p><a href=""http://localhost:3000/admin?tenant={tenantCode}"" style=""color:#D4AF37;"">Buka Dashboard Admin</a></p>
</body>
</html>";
                File.WriteAllText(Path.Combine(targetDir, "web", "index.html"), indexHtml, utf8NoBom);

                // 5. README.md
                var readmeMd = $@"# Workspace Kustomisasi Tenant: {restaurantName} ({tenantCode})

Folder ini adalah ruang kerja terisolasi (*isolated code workspace*) khusus untuk outlet **{restaurantName}** (`{tenantCode}`).
Kode dan aset di folder ini terpisah dari codebase inti SiBangku Platform.

## 📁 Struktur Direktori
* `config.json` : Konfigurasi identitas outlet, database, dan URL endpoint.
* `custom.css`  : Styling dan tema visual khusus (warna, font, elemen antarmuka).
* `web/`        : Web launcher dan konfigurasi Progressive Web App (PWA).
* `desktop/`    : Launcher Windows desktop mandiri (`.bat`) bebas ketergantungan.
* `android/`    : Proyek wrapper Android (WebView / TWA) siap build ke `.apk`.

## 🚀 Menjalankan & Membuka Aplikasi
1. **Desktop Client (Kasir Windows):**
   * Jalankan berkas di: `desktop/SiBangku-{tenantCode}.bat`.
2. **Web Portal Mitra:**
   * Buka di browser: `http://localhost:3000/admin?tenant={tenantCode}`
3. **Portal Reservasi Tamu (Booking):**
   * Buka di browser: `http://localhost:3000/booking?tenant={tenantCode}`
";
                File.WriteAllText(Path.Combine(targetDir, "README.md"), readmeMd, utf8NoBom);

                // 6. Android project files
                var androidSettings = $@"pluginManagement {{
    repositories {{
        google()
        mavenCentral()
        gradlePluginPortal()
    }}
}}
dependencyResolutionManagement {{
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {{
        google()
        mavenCentral()
    }}
}}
rootProject.name = ""SiBangku-{tenantCode}""
include ':app'
";
                File.WriteAllText(Path.Combine(targetDir, "android", "settings.gradle"), androidSettings, utf8NoBom);

                var androidRootBuild = $@"plugins {{
    id 'com.android.application' version '8.5.2' apply false
}}
";
                File.WriteAllText(Path.Combine(targetDir, "android", "build.gradle"), androidRootBuild, utf8NoBom);

                var androidProperties = @"org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.caching=true
android.nonTransitiveRClass=true
android.useAndroidX=true
";
                File.WriteAllText(Path.Combine(targetDir, "android", "gradle.properties"), androidProperties, utf8NoBom);

                var appBuild = $@"plugins {{
    id 'com.android.application'
}}

android {{
    namespace 'com.sibangku.{packageSegment}'
    compileSdk 34

    defaultConfig {{
        applicationId ""com.sibangku.{packageSegment}""
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName ""1.0.0""
    }}

    compileOptions {{
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }}
}}

dependencies {{
    implementation 'androidx.appcompat:appcompat:1.7.0'
}}
";
                File.WriteAllText(Path.Combine(targetDir, "android", "app", "build.gradle"), appBuild, utf8NoBom);

                var manifestXml = $@"<?xml version=""1.0"" encoding=""utf-8""?>
<manifest xmlns:android=""http://schemas.android.com/apk/res/android"">
    <uses-permission android:name=""android.permission.INTERNET"" />
    <application
        android:allowBackup=""true""
        android:icon=""@mipmap/ic_launcher""
        android:label=""@string/app_name""
        android:roundIcon=""@mipmap/ic_launcher_round""
        android:supportsRtl=""true""
        android:theme=""@style/Theme.AppCompat.NoActionBar"">
        <activity
            android:name="".MainActivity""
            android:exported=""true"">
            <intent-filter>
                <action android:name=""android.intent.action.MAIN"" />
                <category android:name=""android.intent.category.LAUNCHER"" />
            </intent-filter>
        </activity>
    </application>
</manifest>
";
                File.WriteAllText(Path.Combine(targetDir, "android", "app", "src", "main", "AndroidManifest.xml"), manifestXml, utf8NoBom);

                var stringsXml = $@"<resources>
    <string name=""app_name"">{restaurantName}</string>
</resources>
";
                File.WriteAllText(Path.Combine(resValuesDir, "strings.xml"), stringsXml, utf8NoBom);

                var mainActivity = $@"package com.sibangku.{packageSegment};

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {{
    private WebView webView;

    @SuppressLint(""SetJavaScriptEnabled"")
    @Override
    protected void onCreate(Bundle savedInstanceState) {{
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl(""http://10.0.2.2:3000/booking?tenant={tenantCode}"");
    }}

    @Override
    public void onBackPressed() {{
        if (webView.canGoBack()) {{
            webView.goBack();
        }} else {{
            super.onBackPressed();
        }}
    }}
}}
";
                File.WriteAllText(Path.Combine(javaDir, "MainActivity.java"), mainActivity, utf8NoBom);

                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
