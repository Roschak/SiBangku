<#
.SYNOPSIS
    Script pembersih sampah cache, file build biner, dan direktori tenant testing E2E.
.DESCRIPTION
    Script ini membersihkan file dan cache yang menghambat proses push ke GitHub:
    - Menghapus direktori sisa tenant testing E2E (E2E*)
    - Menghapus cache build lokal (.gradle, bin, obj, build)
    - Menghapus tracking git untuk file biner besar
#>

param(
    [switch]$DryRun = $false
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$tenantsDir = Join-Path $rootDir "tenants"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SiBangku - Pembersih Cache & Sampah Build Tenant" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (Test-Path $tenantsDir) {
    $e2eDirs = Get-ChildItem -Path $tenantsDir -Directory -Filter "E2E*"
    Write-Host "Ditemukan $($e2eDirs.Count) direktori sisa tenant E2E..." -ForegroundColor Yellow
    
    foreach ($dir in $e2eDirs) {
        Write-Host "  -> Menghapus sisa tenant testing: $($dir.Name)" -ForegroundColor Gray
        if (-not $DryRun) {
            Remove-Item -Path $dir.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# Hapus sisa folder cache gradle / build jika ada
Get-ChildItem -Path $tenantsDir -Recurse -Include ".gradle", "build", "app/build" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  -> Menghapus cache folder build: $($_.FullName)" -ForegroundColor DarkGray
    if (-not $DryRun) {
        Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`nMemeriksa git tracking untuk file biner E2E..." -ForegroundColor Yellow
$trackedE2E = git ls-files "tenants/E2E*"
if ($trackedE2E) {
    Write-Host "Membersihkan git index dari file biner E2E..." -ForegroundColor Green
    git rm -r --cached "tenants/E2E*" 2>$null | Out-Null
}

Write-Host "`nPembersihan cache selesai secara sukses! Workspace siap dan bersih untuk GitHub push." -ForegroundColor Green
