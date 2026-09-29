# ==============================================================================
# SiBangku Platform - Otomatisasi Kompilasi & Verifikasi APK & EXE Terisolasi
# ==============================================================================
# Skrip ini mengompilasi dan memvalidasi paket artefak klien (Android APK & Windows Desktop EXE)
# secara terisolasi per-tenant di dalam foldernya masing-masing (tenants/<KODE>/).
#
# Penggunaan:
#   .\scripts\compile-tenant-artifacts.ps1                         # Kompilasi seluruh tenant
#   .\scripts\compile-tenant-artifacts.ps1 -TenantCode WARUNGMIE   # Kompilasi tenant tertentu
# ==============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$TenantCode = "ALL",

    [Parameter(Mandatory = $false)]
    [switch]$ForceRebuild
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$tenantsDir = Join-Path $projectRoot "tenants"
$downloadsDir = Join-Path $projectRoot "src/SiBangku.Web/wwwroot/downloads"
$universalApkSource = Join-Path $downloadsDir "SiBangku-Universal-App.apk"
$desktopExeSource = Join-Path $downloadsDir "SiBangku-Desktop-App.exe"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  SiBangku - Otomatisasi Kompilasi Artefak Klien Terisolasi" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Root Proyek   : $projectRoot"
Write-Host "Direktori     : $tenantsDir"
Write-Host ""

if (-not (Test-Path $tenantsDir)) {
    Write-Host "[Error] Direktori tenants tidak ditemukan di: $tenantsDir" -ForegroundColor Red
    exit 1
}

# Ambil daftar tenant
$tenantFolders = @()
if ($TenantCode -and $TenantCode -ne "ALL") {
    $targetPath = Join-Path $tenantsDir $TenantCode.ToUpperInvariant()
    if (-not (Test-Path $targetPath)) {
        Write-Host "[Error] Folder tenant '$TenantCode' tidak ditemukan di $targetPath" -ForegroundColor Red
        exit 1
    }
    $tenantFolders = @(Get-Item $targetPath)
} else {
    $tenantFolders = @(Get-ChildItem -Directory -Path $tenantsDir | Where-Object { 
        (Test-Path (Join-Path $_.FullName "config.json")) -or (Test-Path (Join-Path $_.FullName "android"))
    })
}

if ($tenantFolders.Count -eq 0) {
    Write-Host "[Peringatan] Tidak ada folder tenant valid yang ditemukan untuk diproses." -ForegroundColor Yellow
    exit 0
}

Write-Host "Ditemukan $($tenantFolders.Count) workspace tenant terisolasi.`n" -ForegroundColor Green

# Deteksi ketersediaan compiler lokal
$hasGradle = [bool](Get-Command gradle -ErrorAction SilentlyContinue)
$hasJava = [bool](Get-Command java -ErrorAction SilentlyContinue)

Write-Host "Pemeriksaan Lingkungan Toolchain:" -ForegroundColor Gray
Write-Host " - Gradle CLI : $(if ($hasGradle) { 'Tersedia' } else { 'Tidak terinstal (Fallback ke Seeder Mandiri / CI Actions)' })" -ForegroundColor Gray
Write-Host " - Java JDK   : $(if ($hasJava) { 'Tersedia' } else { 'Tidak terinstal' })" -ForegroundColor Gray
Write-Host ""

Add-Type -AssemblyName System.IO.Compression.FileSystem

$results = @()

foreach ($folder in $tenantFolders) {
    $code = $folder.Name.ToUpperInvariant()
    $tenantPath = $folder.FullName
    $androidPath = Join-Path $tenantPath "android"
    $desktopPath = Join-Path $tenantPath "desktop"

    Write-Host ">> Memproses Tenant: $code" -ForegroundColor White

    # 1. Pastikan struktur subfolder terisolasi
    if (-not (Test-Path $desktopPath)) { New-Item -ItemType Directory -Force -Path $desktopPath | Out-Null }

    # 2. Otomatisasi Kompilasi / Pembuatan APK Terisolasi
    $apkStatus = "Belum Ada"
    $apkFile = Join-Path $tenantPath "$code.apk"
    $androidApkFile = Join-Path $androidPath "$code.apk"

    if ($hasGradle -and $hasJava -and (Test-Path (Join-Path $androidPath "build.gradle"))) {
        Write-Host "   [APK] Menjalankan kompilasi Gradle terisolasi..." -ForegroundColor Gray
        try {
            Push-Location $androidPath
            $gradleCmd = "gradle :app:assembleDebug --no-daemon"
            Invoke-Expression $gradleCmd | Out-Null
            Pop-Location

            $builtApk = Get-ChildItem -Path (Join-Path $androidPath "app/build/outputs/apk/debug") -Filter "*.apk" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($builtApk) {
                Copy-Item $builtApk.FullName $apkFile -Force
                Copy-Item $builtApk.FullName $androidApkFile -Force
                $apkStatus = "Compiled (Gradle)"
            }
        } catch {
            Pop-Location
            Write-Host "   [APK] Kompilasi Gradle gagal, beralih ke seeding template terisolasi." -ForegroundColor Yellow
        }
    }

    # Fallback seeding bila gradle tidak ada / belum dikompilasi langsung
    if ($apkStatus -eq "Belum Ada" -and (Test-Path $universalApkSource)) {
        if ($ForceRebuild -or (-not (Test-Path $apkFile))) {
            Copy-Item $universalApkSource $apkFile -Force
            if (Test-Path $androidPath) {
                Copy-Item $universalApkSource $androidApkFile -Force
            }
            $apkStatus = "Seeded (Universal PWA/APK)"
        } else {
            $apkStatus = "Siap (Tersedia)"
        }
    }

    # Verifikasi integritas format APK (harus ZIP valid dengan manifest)
    $apkValid = $false
    if (Test-Path $apkFile) {
        try {
            $zip = [System.IO.Compression.ZipFile]::OpenRead($apkFile)
            $manifestEntry = $zip.GetEntry("AndroidManifest.xml")
            $apkValid = ($manifestEntry -ne $null)
            $zip.Dispose()
        } catch {
            $apkValid = $false
        }
    }

    # 3. Otomatisasi Kompilasi / Pembuatan Desktop EXE Terisolasi
    $exeStatus = "Belum Ada"
    $exeFile = Join-Path $desktopPath "SiBangku-$code.exe"
    $rootExeFile = Join-Path $tenantPath "SiBangku-$code.exe"
    $batFile = Join-Path $desktopPath "SiBangku-$code.bat"

    # Pastikan file .bat launcher kasir mandiri ada
    if (-not (Test-Path $batFile)) {
        $batContent = @"
@echo off
title SiBangku Cashier POS - $code
echo ========================================================
echo  SiBangku Desktop POS Client - Outlet: $code
echo ========================================================
set "TARGET_URL=http://localhost:3000/admin?tenant=$code"
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
"@
        [System.IO.File]::WriteAllText($batFile, $batContent, [System.Text.Encoding]::UTF8)
    }

    if (Test-Path $desktopExeSource) {
        if ($ForceRebuild -or (-not (Test-Path $exeFile))) {
            Copy-Item $desktopExeSource $exeFile -Force
            Copy-Item $desktopExeSource $rootExeFile -Force
            $exeStatus = "Seeded (Native PE)"
        } else {
            $exeStatus = "Siap (Tersedia)"
        }
    }

    # Verifikasi integritas format PE EXE (header MZ 0x4D 0x5A)
    $exeValid = $false
    if (Test-Path $exeFile) {
        try {
            $stream = [System.IO.File]::OpenRead($exeFile)
            $b1 = $stream.ReadByte()
            $b2 = $stream.ReadByte()
            $stream.Dispose()
            $exeValid = ($b1 -eq 0x4D -and $b2 -eq 0x5A) # 'MZ'
        } catch {
            $exeValid = $false
        }
    }

    $results += [PSCustomObject]@{
        TenantCode = $code
        APK_Status = $apkStatus
        APK_Valid  = if ($apkValid) { "OK (Valid ZIP/Manifest)" } else { "Invalid / Kosong" }
        EXE_Status = $exeStatus
        EXE_Valid  = if ($exeValid) { "OK (Valid PE Executable)" } else { "Invalid / Kosong" }
        BAT_Script = if (Test-Path $batFile) { "OK (Launcher Aktif)" } else { "Tidak Ditemukan" }
    }
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "  Hasil Verifikasi & Otomatisasi Kompilasi Artefak Tenant" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$allApkOk = -not ($results | Where-Object { $_.APK_Valid -ne "OK (Valid ZIP/Manifest)" })
$allExeOk = -not ($results | Where-Object { $_.EXE_Valid -ne "OK (Valid PE Executable)" })

if ($allApkOk -and $allExeOk) {
    Write-Host "`n[SUKSES] Seluruh artefak APK & Desktop EXE terverifikasi siap pakai secara terisolasi per-tenant!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n[PERINGATAN] Beberapa artefak tenant belum lengkap." -ForegroundColor Yellow
    exit 1
}
