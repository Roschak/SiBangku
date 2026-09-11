# Progress Note 113: Tenant Edit, Billing Subscriptions, and VS Code Modifications

## 1. Ringkasan Pekerjaan (Summary)
Menambahkan kemampuan operasional komprehensif pada Control Plane SiBangku:
1. Fitur Edit Profil Mitra (Nama Restoran, Nama Legal, Email Admin, Reset Password).
2. Sistem Billing & Langganan (Paket Bulanan 30d, 90d, 180d, Tahunan 365d, Kunci Layanan / Auto-Lock Waktu Tenggat).
3. Modifikasi per-Tenant (Buka di VS Code lokal via protokol `vscode://` dan Web Custom Styling Studio).
4. Dokumentasi skema PostgreSQL dan laporan lengkap dalam format Markdown.

## 2. File yang Dibuat & Diperbarui
- `src/SiBangku.ControlApi/Program.cs`:
  - `PUT /api/v1/tenants/{id}` (Update nama resto, tenant name, email admin)
  - `POST /api/v1/tenants/{id}/subscription` (Aktivasi paket langganan / kunci layanan)
- `src/SiBangku.Web/Components/Pages/ControlAdmin.razor`:
  - Tabel direktori tenant dengan status indikator, countdown tenggat, dan 5 tombol aksi (`Paket`, `Modifikasi`, `Billing`, `Edit`, `Hapus`).
  - MODAL 6: Edit Profil Mitra & Kredensial.
  - MODAL 7: Billing & Langganan (Bulanan, Triwulan, Semester, Tahunan, Kunci Layanan).
  - MODAL 8: Modifikasi per Tenant (Buka VS Code lokal, Custom CSS editor, Terminal Simulator).
- `docs/POSTGRESQL_SCHEMAS.md`: Dokumentasi skema DB Control Plane dan Tenant DB.
- `docs/TENANT_CUSTOMIZATION_AND_BILLING_REPORT.md`: Laporan komprehensif arsitektur, fitur, dan pengujian.

## 3. Status Verifikasi
- `dotnet build SiBangku.slnx` -> **0 Warning(s), 0 Error(s)**.
