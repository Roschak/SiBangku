# Progress Note 117: Gerbang CI Audit Kerentanan NuGet & Pemeriksaan Format Kode

**Tanggal:** 16 September 2026
**Status:** Selesai — 2 job CI baru terbukti bisa **gagal** saat ada temuan, dan **hijau** pada kondisi repo sekarang (0 Warning / 0 Error, 69/69 tes, `dotnet format` bersih)

---

## 1. Ringkasan

| Permintaan | Hasil |
|---|---|
| Audit kerentanan paket NuGet | Job `nuget-audit`: gerbang `dotnet restore` (moderate+ = error) **dan** laporan `dotnet list package --vulnerable` yang gagal pada semua tingkat keparahan |
| Pemeriksaan format kode | Job `format-check`: `dotnet format --verify-no-changes` dengan aturan deterministik dari `.editorconfig` baru |

---

## 2. Job `nuget-audit`

```yaml
- name: Restore with the vulnerability gate
  run: dotnet restore SiBangku.slnx -p:NuGetAuditMode=all -warnaserror:NU1902,NU1903,NU1904

- name: Audit report (direct + transitive)
  run: dotnet list SiBangku.slnx package --vulnerable --include-transitive | tee /tmp/nuget-audit.txt
       # lalu gagal bila ada 'has the following vulnerable packages'
```

**Kenapa dua lapis?**

- `NuGetAuditMode=all` memperluas audit bawaan .NET ke **paket transitif**, bukan hanya dependensi langsung.
- `NU1902/NU1903/NU1904` (moderate/tinggi/kritis) diperlakukan sebagai **error**, sedangkan `NU1901` (rendah) tetap peringatan agar gerbang tidak merah karena advisory ringan.
- Peringatan audit hanya muncul saat **restore**, jadi `-warnaserror` dipasang di `dotnet restore` — bukan hanya di `dotnet build`.
- `dotnet list package --vulnerable` **selalu keluar dengan kode 0** meski ada temuan, sehingga laporan itu sendiri dijadikan sinyal: langkah ini gagal pada **semua** tingkat keparahan, termasuk yang direlakan lapis pertama. Laporan lengkap juga ditulis ke step summary GitHub.

**Bukti gerbang berfungsi** (bukan sekadar hijau karena tidak memeriksa apa pun). Saya sengaja membuat
proyek probe sementara dengan `Newtonsoft.Json 12.0.1` (GHSA-5crp-9r3c-p9vr) di `.scratch/`, menjalankan
kedua lapis, lalu menghapus probe tersebut:

| Uji | Hasil |
|---|---|
| `dotnet restore -p:NuGetAuditMode=all -warnaserror:NU1902,NU1903,NU1904` pada probe | **exit 1** — `error NU1903: Package 'Newtonsoft.Json' 12.0.1 has a known high severity vulnerability` |
| Langkah laporan pada probe | marker `has the following vulnerable packages` cocok → **gagal** sesuai desain |
| Kondisi repo sekarang | **LULUS** — tidak ada paket rentan (langsung maupun transitif) |

---

## 3. Job `format-check` — dan masalah newline lintas platform

Menjalankan `dotnet format --verify-no-changes` pada repo ini **tidak bisa** langsung dijadikan gerbang:
tanpa `.editorconfig`, Roslyn mengikuti newline **OS developer**. Repo ini seluruhnya LF, sehingga:

- di Windows: 248 error `WHITESPACE` (formatter ingin `\r\n`) — termasuk pada berkas yang sebenarnya bersih,
- di Linux (runner CI): tidak ada keluhan.

Artinya gerbang tersebut akan hijau di CI tetapi merah bagi setiap kontributor Windows (atau sebaliknya,
jika aturan diubah). Perbaikannya bukan menyerah pada gerbang, melainkan **memakukan aturan**:

**Berkas baru `.editorconfig`** (root) — hanya aturan whitespace/encoding, sengaja **tanpa** preferensi
gaya kode (urutan `using`, `var`, dsb.) agar gerbang tidak merah karena selera yang belum disepakati:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 4

[*.{json,yml,yaml,csproj,props,targets,slnx}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

**Berkas baru `.gitattributes`** — `* text=auto eol=lf` agar isi repositori identik di semua OS dan
tidak bisa dikalahkan oleh `core.autocrlf` seorang developer. Dua pengecualian penting:

- `*.bat`/`*.cmd` → `eol=crlf`, karena cmd.exe bisa salah mengurai skrip LF (launcher tenant adalah `.bat`),
- biner (`.apk`, `.exe`, `.png`, …) dan aset vendored (`wwwroot/lib/**`) ditandai agar tidak dikonversi.

**Perbaikan lekukan yang tersisa** dijalankan dengan formatter resmi: `dotnet format whitespace SiBangku.slnx`
(8 berkas, mis. `ControlApi/Program.cs`, `TenantApi/Program.cs`). Perubahan diverifikasi **hanya whitespace**:
pada berkas yang sebelumnya bersih (mis. `Worker/Program.cs`), `git diff -w` menghasilkan diff kosong —
formatter tidak menyentuh satu token pun. Build dan seluruh tes dijalankan ulang setelah perbaikan.

---

## 4. Verifikasi yang Dijalankan

| Verifikasi | Hasil |
|---|---|
| `dotnet format SiBangku.slnx --verify-no-changes` | **exit 0**, 0 error (sebelum: 248) |
| `dotnet restore -p:NuGetAuditMode=all -warnaserror:NU1902,NU1903,NU1904` | exit 0, tanpa `NU19xx` |
| Laporan `dotnet list package --vulnerable --include-transitive` | 21 baris, tidak ada temuan |
| Gerbang audit diuji terhadap paket rentan nyata | **gagal** pada kedua lapis (NU1903 + marker), probe dihapus |
| `dotnet build SiBangku.slnx` | **0 Warning / 0 Error** |
| `dotnet test SiBangku.slnx` | **69/69 Passed** (termasuk 15 tes E2E PostgreSQL) |
| Validasi YAML workflow (PyYAML) | Valid — kini **6 job**: `dotnet`, `nuget-audit`, `format-check`, `discover-tenants`, `android-apk`, `android-generated-workspace` |
| Berkas probe sementara | Terhapus, tidak ada jejak di git |

---

## 5. Batasan yang Jujur

- Job baru ini **belum pernah berjalan di GitHub Actions**; seluruh perintahnya diverifikasi lokal dengan
  perintah yang identik (termasuk pembuktian kegagalan pada paket rentan).
- Gerbang audit bergantung pada feed `api.nuget.org`; bila data advisory tidak terjangkau, NuGet memunculkan
  peringatan `NU1900` (tidak dijadikan error) sehingga build tidak gagal — namun dengan konsekuensi audit
  tidak memeriksa apa pun pada saat itu.
- Pemeriksaan format hanya mencakup berkas .NET (C#). Repo memiliki `.eslintrc.cjs`/`.prettierrc` tetapi
  prettier/eslint belum menjadi dependensi resmi, sehingga lint JS/CSS belum masuk gerbang CI.
- Pemeriksaan format **tidak** memakai preferensi gaya kode (urutan `using`, `var`, dsb.). Bila diinginkan,
  aturan tersebut bisa ditambahkan nanti ke `.editorconfig` — dengan konsekuensi berpotensi memunculkan
  perubahan gaya besar di seluruh berkas.

---

## 6. Berkas yang Disentuh

```
.editorconfig                                              (baru)
.gitattributes                                             (baru)
.github/workflows/ci.yml                                   (+2 job: nuget-audit, format-check)
README.md                                                  (bagian CI: 5 gerbang)
src/SiBangku.ControlApi/Program.cs                         (trailing whitespace / lekukan)
src/SiBangku.TenantApi/Program.cs                          (trailing whitespace / lekukan)
src/SiBangku.Cli/Program.cs                                (trailing whitespace / lekukan)
src/SiBangku.Web/Program.cs                                (trailing whitespace / lekukan)
src/SiBangku.Worker/{Program.cs, Worker.cs}                (trailing whitespace / lekukan)
src/SiBangku.Shared/Utils.cs                               (trailing whitespace / lekukan)
src/SiBangku.Tests/{ControlApiIntegrationTests.cs, TenantApiIntegrationTests.cs}  (lekukan)
```
