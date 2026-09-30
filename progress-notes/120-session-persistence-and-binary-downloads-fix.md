# Progress Note 120: Session Persistence, Fast Login & Universal Binary Downloads

**Tanggal**: 29 September 2026  
**Status**: Completed & Verified (74/74 Unit & Integration Tests Passed)

## Ringkasan Perubahan:
1. **Session Persistence**: Menggunakan `localStorage` (`sibangku_control_session` dan `sibangku_tenant_session`) untuk mencegah logout otomatis saat refresh, navigasi halaman, atau buka tab baru.
2. **Fast & Non-Laggy Login**: Login berpindah tampilan secara instan tanpa menunggu query data berat selesai.
3. **Guaranteed Binary Downloads**:
   - `/api/v1/tenants/{id}/apk` dilengkapi fallback universal APK dan auto-seeding.
   - `/api/v1/tenants/{id}/exe` ditambahkan dengan fallback universal Desktop EXE dan auto-seeding.
   - Link unduhan diproteksi dengan `target="_blank"` dan `download` attribute sehingga tidak mengalihkan halaman dashboard ke layar hitam.
4. **Tenant Workspace Auto-Scaffolder**: Otomatis menyalin biner EXE dan APK ke ruang kerja tenant baru.
5. **Seeding PTKOMIKCAFFE**: Biner APK dan EXE langsung tersedia di folder tenant.

Detail lengkap status fitur yang sudah dan belum dapat dilihat pada [STATUS_PROGRESS_YANG_SUDAH_DAN_BELUM.md](../note/STATUS_PROGRESS_YANG_SUDAH_DAN_BELUM.md).
