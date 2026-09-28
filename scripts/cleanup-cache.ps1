<#
.SYNOPSIS
    Script pembersih cache, artefak build, dan workspace tenant lama/uji coba di SiBangku.

.DESCRIPTION
    Script ini membersihkan:
    1. Direktori tenant uji coba otomatis / orphaned (tenants/E2E*).
    2. Cache dan artefak kompilasi lokal (.NET bin/obj) jika diinginkan.
    3. File build sementara, cache Gradle lokal pada tenant, dan file sampah lainnya.

.EXAMPLE
    .\scripts\cleanup-cache.ps1
    .\scripts\cleanup-cache.ps1 -CleanBuildArtifacts
#>

param (
    [switch]$CleanBuildArtifacts = $false
)

$ErrorActionPreference = "Stop"
$rootDir = (Resolve-Path "$PSScriptRoot/..").Path

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " SiBangku System Cache & Workspace Cleaner" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

# 1. Membersihkan Workspace Tenant Uji Coba (tenants/E2E*)
$tenantsDir = Join-Path $rootDir "tenants"
if (Test-Path $tenantsDir) {
    $e2eTenants = Get-ChildItem -Path $tenantsDir -Directory -Filter "E2E*"
    if ($e2eTenants.Count -gt 0) {
        Write-Host "`n[1/3] Menghapus $($e2eTenants.Count) workspace tenant uji coba lama (E2E)..." -ForegroundColor Yellow
        foreach ($tenant in $e2eTenants) {
            Write-Host "  [-] Menghapus: $($tenant.Name)" -ForegroundColor DarkGray
            Remove-Item -Path $tenant.FullName -Recurse -Force
        }
        Write-Host "  [OK] Seluruh cache tenant uji coba berhasil dibersihkan." -ForegroundColor Green
    } else {
        Write-Host "`n[1/3] Tidak ditemukan workspace tenant uji coba (E2E)." -ForegroundColor Green
    }
}

# 2. Membersihkan Cache Android Gradle & Build pada Tenant yang Tersisa
if (Test-Path $tenantsDir) {
    Write-Host "`n[2/3] Memeriksa cache Gradle & build di direktori tenants..." -ForegroundColor Yellow
    $gradleCaches = Get-ChildItem -Path $tenantsDir -Recurse -Directory -Include ".gradle", "build", ".cxx" -ErrorAction SilentlyContinue
    if ($gradleCaches.Count -gt 0) {
        foreach ($gc in $gradleCaches) {
            Write-Host "  [-] Menghapus cache: $($gc.FullName)" -ForegroundColor DarkGray
            Remove-Item -Path $gc.FullName -Recurse -Force
        }
        Write-Host "  [OK] Cache Gradle/Android build dibersihkan." -ForegroundColor Green
    } else {
        Write-Host "  [OK] Tidak ada cache Gradle/Android build yang tertinggal." -ForegroundColor Green
    }
}

# 3. Membersihkan Artefak Build .NET jika diminta
if ($CleanBuildArtifacts) {
    Write-Host "`n[3/3] Membersihkan bin/ dan obj/ .NET..." -ForegroundColor Yellow
    $srcDir = Join-Path $rootDir "src"
    $binObj = Get-ChildItem -Path $srcDir -Recurse -Directory -Include "bin", "obj" -ErrorAction SilentlyContinue
    foreach ($item in $binObj) {
        Write-Host "  [-] Menghapus: $($item.FullName)" -ForegroundColor DarkGray
        Remove-Item -Path $item.FullName -Recurse -Force
    }
    Write-Host "  [OK] Seluruh bin dan obj berhasil dibersihkan." -ForegroundColor Green
} else {
    Write-Host "`n[3/3] Pembersihan bin/obj dilewati (gunakan -CleanBuildArtifacts untuk membersihkan)." -ForegroundColor DarkGray
}

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Pembersihan cache & tenant selesai dengan sukses!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
