# 📖 SiBangku Full Update & Customization Guide

**Version:** 3.0.0  
**Last Updated:** 2026-09-10  
**Author:** SiBangku Documentation Team

---

## 📑 Table of Contents

1. [CLI Commands Reference](#cli-commands-reference)
2. [Tenant Customization Guide](#tenant-customization-guide)
3. [APK Auto-Generation & Sync](#apk-auto-generation--sync)
4. [Complete Workflow](#complete-workflow)
5. [Troubleshooting](#troubleshooting)

---

## 🖥️ CLI Commands Reference

### **Prerequisites**
```bash
# Setup environment variables (optional, defaults to localhost)
export CONTROL_API_URL="http://localhost:3001"
export CONTROL_DATABASE_URL="Host=localhost;Port=5432;Database=sibangku_control;Username=sibangku;Password=sibangku_dev"
export JWT_SECRET="super_secret_jwt_key_platform_admin_2026"
```

---

### **Admin Account Management (Direct Database)**

#### **1. Create Super Admin**
```bash
sibangku-cli admin create <username> <password> [displayName]
```

**Example:**
```bash
sibangku-cli admin create admin mysecurepass123 "Platform Administrator"
```

**Output:**
```
[Sukses] Akun Super Admin berhasil dibuat & disimpan via Control Service!
Username/Email : admin
Nama Tampilan  : Platform Administrator
Anda sekarang dapat login ke portal /control-admin menggunakan kredensial ini.
```

---

#### **2. Reset Super Admin Password**
```bash
sibangku-cli admin reset-password <username> <newPassword>
```

**Example:**
```bash
sibangku-cli admin reset-password admin newpassword456789
```

---

#### **3. List All Super Admins**
```bash
sibangku-cli admin list
```

---

### **Authentication (Required for Tenant Operations)**

#### **4. Login to CLI**
```bash
sibangku-cli login <email> <password>
```

**Example:**
```bash
sibangku-cli login admin mysecurepass123
```

**Output:**
```
[Sukses] Login berhasil! Token disimpan di ~/.sibangku-cli-config.json
Session berlaku hingga: 2026-09-11 10:30:00 UTC
```

---

### **Tenant Management (API Protected - Requires Login)**

#### **5. List All Tenants**
```bash
sibangku-cli tenant list
```

**Output:**
```
------------------------------------------------------------------------------------------------------------
| Tenant ID    | Tenant Code    | Restaurant  | Status  | Sub Status | Database      |
------------------------------------------------------------------------------------------------------------
| TEN-2026-XXX | DISTRO-AVENUE  | Distro Ave  | TRIAL   | PENDING    | tenant_distro |
| TEN-2026-YYY | PADANG-MERDEKA | Padang Mer  | ACTIVE  | ACTIVE     | tenant_padang |
| TEN-2026-ZZZ | KOPI-SENJA     | Kopi Senja  | TRIAL   | EXPIRED    | tenant_kopi   |
------------------------------------------------------------------------------------------------------------
```

---

#### **6. Create New Tenant (Provisioning)**
```bash
sibangku-cli tenant create <tenantName> <restaurantName> <adminEmail> [trialDays] [adminPassword]
```

**Example:**
```bash
sibangku-cli tenant create "RESTO-A" "Restaurant A" owner@restoa.com 60 TempPass123!
```

**Output:**
```
Mengirim permintaan provisioning untuk 'RESTO-A'...

=== Provisioning Tenant Sukses ===
ID Tenant      : TEN-2026-ABC123
Kode Tenant    : RESTO-A
Database       : tenant_resto_a
Email Admin    : owner@restoa.com
Password Pjs   : TempPass123!
Web URL        : https://resto-a.sibangku.app
===================================

⚠️  PENTING:
  - Admin harus login ke /admin dengan email & password di atas
  - Sistem akan meminta ganti password saat login pertama
  - Database terpisah sudah dibuat & siap digunakan
  - Audit log telah dicatat
```

**Automatic Process:**
- ✅ Generate Tenant ID (format: `TEN-YYYY-XXXXXX`)
- ✅ Generate Tenant Slug (lowercase, alphanumeric)
- ✅ Create PostgreSQL database (`tenant_<slug>`)
- ✅ Run EF Core migrations
- ✅ Seed initial admin account
- ✅ Generate temporary password
- ✅ Setup branding defaults
- ✅ Log audit trail

---

#### **7. Reset Tenant Admin Password**
```bash
sibangku-cli tenant reset-password <tenantCode> <newPassword>
```

**Example:**
```bash
sibangku-cli tenant reset-password RESTO-A NewAdminPass789!
```

**Output:**
```
[Sukses] Password admin untuk tenant RESTO-A berhasil direset.
Password baru: NewAdminPass789!
Tenant harus login ulang ke /admin
```

---

#### **8. Extend Trial Period**
```bash
sibangku-cli tenant extend <tenantId> <days>
```

**Example:**
```bash
sibangku-cli tenant extend TEN-2026-ABC123 30
```

**Output:**
```
[Sukses] Trial perpanjangan selama 30 hari berhasil untuk TEN-2026-ABC123
Trial status   : ACTIVE
Expire date    : 2026-10-15 (30 hari dari sekarang)
Audit logged   : YES
```

---

#### **9. Delete Tenant (Destructive - Use with Caution)**
```bash
sibangku-cli tenant delete <tenantId>
```

**Example:**
```bash
sibangku-cli tenant delete TEN-2026-OLD123
```

**Output:**
```
⚠️  PERINGATAN SERIUS: Operasi ini akan MENGHAPUS PERMANEN:
   - Database PostgreSQL: tenant_old123
   - Semua data reservasi & customer
   - Semua konfigurasi restoran (menu, meja, jadwal)
   - Semua pesanan & pembayaran
   - Backup & file terkait
   - Tidak dapat di-undo!
   
Lanjutkan? Ketik 'yes' untuk konfirmasi: yes

[Sukses] Database dan data tenant berhasil dihapus.
Audit log: TENANT_DESTROYED at 2026-09-10 11:45:00 UTC
```

---

#### **10. View Audit Logs**
```bash
sibangku-cli audit
```

**Output:**
```
Menampilkan 100 aktivitas terakhir di platform...

| Timestamp          | Tenant ID       | Action                | User  | Details            |
|----|----|----|----|----|
| 2026-09-10 11:45   | TEN-2026-OLD123 | tenant_destroyed      | admin | Reason: Legacy     |
| 2026-09-10 11:30   | TEN-2026-ABC123 | trial_extended        | admin | Days: 30           |
| 2026-09-10 11:00   | platform        | admin_created         | admin | User: admin        |
| 2026-09-10 10:30   | TEN-2026-ABC123 | tenant_provisioned    | admin | Resto: Resto A     |
```

---

## 🎨 Tenant Customization Guide

Setiap tenant memiliki kontrol penuh atas branding & konfigurasi melalui portal `/admin`.

### **Akses Portal Admin Tenant**

```
URL: https://<tenant-slug>.sibangku.app/admin
Login: Gunakan email & password yang diberikan saat provisioning
```

---

### **1. Branding & Theme Customization**

**Portal:** `/admin` → **Settings** → **Branding**

**Fields yang dapat di-customize:**

#### **Color Palette**
- **Primary Color** (hex): Warna utama brand (contoh: `#FF6B00`)
- **Secondary Color** (hex): Warna accent (contoh: `#FFD700`)
- **Background Color** (hex): Latar belakang (contoh: `#FFFFFF`)
- **Text Color** (hex): Warna teks utama (contoh: `#000000`)

**Preview real-time** saat mengubah warna.

#### **Logo & Assets**
- **Restaurant Logo** (PNG/JPG, max 2MB): Upload logo restoran
- **Favicon** (ICO, max 100KB): Ikon untuk browser tab
- **Banner Image** (PNG/JPG, max 5MB): Banner halaman booking

**Contoh:**
```
Restaurant: Distro Avenue
Primary Color: #FF6B00
Secondary Color: #FFD700
Logo: distro-avenue-logo.png
```

---

### **2. Operational Settings**

**Portal:** `/admin` → **Settings** → **Operational**

#### **Operating Hours**
- **Opening Time** (format: HH:MM): `10:00`
- **Closing Time** (format: HH:MM): `22:00`
- **Open Days** (checkbox): Pilih hari kerja (Mon-Sun)

#### **Reservation Slots**
- **Slot Duration** (minutes): `90` (durasi makan per slot)
- **Slot Start Times** (comma-separated): `11:00,12:00,13:00,18:00,19:00,20:00`
- **Max Guests per Slot** (number): `50`
- **Min Advance Booking** (hours): `1` (minimal pesan 1 jam sebelumnya)
- **Max Advance Booking** (days): `30` (maksimal pesan 30 hari ke depan)

**Contoh Konfigurasi:**
```
Opening: 10:00 - 22:00 (Mon-Sun)
Slot Duration: 90 menit
Kapasitas Max: 50 tamu/jam
Booking: 1 jam sebelumnya hingga 30 hari ke depan
```

---

### **3. Menu Management**

**Portal:** `/admin` → **Menu**

#### **Add Menu Category**
- **Category Name**: `Makanan Utama`, `Minuman`, `Dessert`
- **Display Order**: `1`, `2`, `3`
- **Icon** (optional): Ikon kategori

#### **Add Menu Items**
- **Item Name**: `Nasi Goreng Spesial`
- **Description**: `Nasi goreng dengan telur, ayam, dan sayuran`
- **Price** (IDR): `45000`
- **Category**: Pilih kategori
- **Availability**: Toggle aktif/tidak aktif
- **Image** (optional): Foto menu

**Contoh Menu:**
```
Category: Makanan Utama
├─ Nasi Goreng Spesial (45K)
├─ Mie Goreng Premium (48K)
└─ Soto Ayam Tradisional (35K)

Category: Minuman
├─ Air Jeruk Segar (12K)
├─ Kopi Espresso (25K)
└─ Teh Tarik (15K)
```

---

### **4. Table Management & Layout**

**Portal:** `/admin` → **Tables**

#### **Add Table**
- **Table Number**: `T-01`, `T-02`, `T-03`
- **Capacity**: `2`, `4`, `6`, `8` (jumlah kursi)
- **Location** (optional): `Area Depan`, `Area Belakang`
- **X Coordinate** (pixel): `100` (untuk visual layout)
- **Y Coordinate** (pixel): `150`

#### **Visual Floor Plan**
- Klik & drag untuk mengatur posisi meja di canvas
- Set koordinat X, Y untuk tampilan floor plan
- Preview real-time layout di customer portal

**Contoh Layout:**
```
Table T-01: Capacity 2, Position (100, 100)
Table T-02: Capacity 4, Position (200, 100)
Table T-03: Capacity 4, Position (100, 200)
Table T-04: Capacity 6, Position (200, 200)
```

---

### **5. Payment Settings**

**Portal:** `/admin` → **Settings** → **Payment**

#### **Payment Methods**
- **Enable QRIS**: Toggle on/off
- **Enable Bank Transfer**: Toggle on/off
- **Enable WhatsApp**: Toggle on/off
- **Bank Account** (if enabled):
  - Bank Name: `BCA`
  - Account Number: `1234567890`
  - Account Holder: `Restoran A`

---

### **6. Staff Management**

**Portal:** `/admin` → **Staff**

#### **Add Staff Account**
- **Staff Name**: `Budi Santoso`
- **Email**: `budi@restoa.com`
- **Role**: `Staff` atau `Manager`
- **Permissions** (checkboxes):
  - Manage Reservations
  - Manage Tables
  - View Reports
  - Edit Menu
  - Edit Settings

---

## 🔄 APK Auto-Generation & Sync

### **Fitur Penting: APK Otomatis Update**

Ketika tenant mengubah customization di portal `/admin`, semua perubahan **otomatis disinkronisasi** ke APK yang di-generate!

---

### **Automatic Sync Architecture**

```
Tenant Update di Portal Admin
          ↓
Database Tenant (PostgreSQL)
          ↓
Trigger Sync Event
          ↓
APK Configuration Update
          ↓
Next APK Build = Include Latest Config
```

---

### **Apa yang Otomatis Update di APK?**

#### **1. Branding**
- ✅ App Name
- ✅ App Logo / Icon Launcher
- ✅ Color Theme (Primary & Secondary)
- ✅ Package ID

#### **2. Operational**
- ✅ Operating Hours
- ✅ Reservation Slots
- ✅ Capacity Settings

#### **3. Menu & Tables**
- ✅ Menu Items & Categories
- ✅ Pricing
- ✅ Table Configurations
- ✅ Floor Plan Layout

#### **4. Endpoints**
- ✅ Tenant API URL
- ✅ Web Portal URL
- ✅ Auth Endpoints

---

### **Generate APK via CLI**

#### **Build APK untuk Tenant Tertentu**
```bash
sibangku-cli tenant build-apk <tenantId>
```

**Example:**
```bash
sibangku-cli tenant build-apk TEN-2026-ABC123
```

**Output:**
```
[Fetching] Konfigurasi tenant TEN-2026-ABC123...
[Preparing] Asset replacement:
  - App Name: Restaurant A
  - Icon: distro-avenue-logo.png
  - Primary Color: #FF6B00
  - Package ID: com.sibangku.restoa
[Building] Gradle compilation...
  - Compile source: ✓
  - Generate APK: ✓
  - Sign APK: ✓
[Uploading] Upload ke storage bucket...

[Sukses] APK berhasil di-generate!
Nama File     : SiBangku-Restaurant-A.apk
Package ID    : com.sibangku.restoa
Ukuran File   : 28.5 MB
Download URL  : https://storage.sibangku.app/apk/TEN-2026-ABC123/
Checksum MD5  : a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

#### **Build Semua APK (Batch)**
```bash
sibangku-cli tenant build-apk --all
```

**Output:**
```
[Building] APK untuk 5 tenant...

1/5 TEN-2026-ABC123 - Restaurant A    ✓ SUKSES
2/5 TEN-2026-XYZ456 - Restaurant B    ✓ SUKSES
3/5 TEN-2026-DEF789 - Restaurant C    ✓ SUKSES
4/5 TEN-2026-GHI012 - Restaurant D    ✓ SUKSES
5/5 TEN-2026-JKL345 - Restaurant E    ✓ SUKSES

Summary: 5 APK berhasil di-generate dalam 12 menit
Total Size: 142.5 MB
```

---

### **Scenario: Tenant Update & APK Sync**

#### **Skenario 1: Tenant Update Branding**

```
Waktu 10:00 → Admin Restaurant A login ke /admin
              Ubah Primary Color: #FF6B00 → #0066CC
              Ubah Logo: distro-avenue-logo.png → (upload baru)
              Klik SAVE

Waktu 10:05 → Database terupdate
              Event trigger: TENANT_CONFIG_CHANGED

Waktu 10:10 → Builder service detect perubahan
              Generate APK baru dengan config terbaru

Waktu 10:15 → APK siap download
              Release notes: "Updated branding (blue theme)"
              Download URL: tersedia di /admin → Downloads
```

#### **Skenario 2: Tenant Update Menu**

```
Waktu 14:00 → Admin Restaurant B tambah menu baru
              Item: "Nasi Kuning Premium" (Rp 55.000)
              Category: Makanan Utama
              Klik PUBLISH

Waktu 14:02 → Database update
              Menu list ter-cache

Waktu 14:05 → Customer portal refresh otomatis
              Menu baru tampil di booking portal

Waktu 14:10 → APK cache invalidate
              Pengguna app melihat menu baru di next app launch
              Atau pull-to-refresh manual
```

#### **Skenario 3: Tenant Update Operating Hours**

```
Waktu 16:00 → Admin Restaurant C ubah jam buka
              Sebelumnya: 10:00 - 22:00
              Baru: 09:00 - 23:00

Waktu 16:01 → Database update
              Trigger: SLOTS_CONFIGURATION_CHANGED

Waktu 16:05 → Tenant API invalidate cache
              Endpoint `/api/availability/slots` return data terbaru

Waktu 16:10 → Customer portal & APK sync
              Slot jam 09:00 dan 23:00 kini tersedia
              APK data di-refresh next build atau manual refresh
```

---

## 📋 Complete Workflow

### **Workflow: Provisioning hingga Launch**

```
Step 1: Preparation
├─ Setup platform (docker compose up)
├─ Create super admin (sibangku-cli admin create)
└─ Login CLI (sibangku-cli login)

Step 2: Tenant Provisioning
├─ Create tenant (sibangku-cli tenant create)
├─ Database auto-created
├─ Admin account auto-generated
└─ Temporary password issued

Step 3: Tenant Customization
├─ Admin login ke /admin
├─ Set branding (logo, color)
├─ Configure operations (jam, slot)
├─ Add tables & menu
└─ Test portal /booking

Step 4: APK Generation
├─ Build APK (sibangku-cli tenant build-apk)
├─ Auto-inject branding
├─ Sign APK
└─ Upload to storage

Step 5: Launch
├─ Tenant distribusikan APK (Play Store atau link)
├─ Customer bisa booking via /booking atau APK
├─ Tenant manage reservasi di /admin
└─ Monitor via audit logs

Step 6: Ongoing Updates
├─ Tenant update branding/menu/jadwal
├─ Auto-sync ke APK config
├─ Re-generate APK jika perlu
└─ All updates non-disruptive
```

---

### **Timeline Example**

| Waktu | Aksi | Command/Portal |
|-------|------|---|
| 10:00 | Setup platform | `docker compose up --build -d` |
| 10:05 | Create super admin | `sibangku-cli admin create admin mypass "Admin"` |
| 10:10 | Login CLI | `sibangku-cli login admin mypass` |
| 10:15 | Provision tenant | `sibangku-cli tenant create "RESTO-A" "Restaurant A" owner@restoa.com 60` |
| 10:20 | Tenant customization | Admin login `/admin` → Settings → Branding |
| 10:30 | Add menu & tables | Admin `/admin` → Menu & Tables |
| 10:45 | Build APK | `sibangku-cli tenant build-apk TEN-2026-ABC123` |
| 11:00 | APK ready | Download link available |
| 11:05 | Launch to Play Store | APK uploaded & published |
| 11:30 | Tenant update menu | Admin `/admin` → Menu → Add New Item |
| 11:35 | APK auto-synced | Config updated in next build/refresh |

---

## 🔧 Troubleshooting

### **Issue 1: Tenant Provisioning Failed**

**Problem:** CLI returns error saat `tenant create`

**Solution:**
```bash
# Check database connection
echo "SELECT 1" | psql "Host=localhost;Port=5432;Database=sibangku_control;Username=sibangku;Password=sibangku_dev"

# Check API status
curl http://localhost:3001/health

# Check logs
docker compose logs control-api
```

---

### **Issue 2: APK Not Syncing**

**Problem:** Tenant update menu tapi APK tidak update

**Solution:**
```bash
# Clear APK cache
sibangku-cli tenant build-apk TEN-2026-ABC123 --force-rebuild

# Verify tenant config
sibangku-cli tenant inspect TEN-2026-ABC123

# Check audit logs
sibangku-cli audit | grep "TEN-2026-ABC123"
```

---

### **Issue 3: Admin Password Reset**

**Problem:** Admin lupa password

**Solution:**
```bash
# Use CLI to reset
sibangku-cli tenant reset-password RESTO-A NewPassword123!

# Or regenerate temporary password
sibangku-cli tenant create-new-admin TEN-2026-ABC123
```

---

## 📞 Support

**Documentation:** [docs/](./docs/)  
**PRD:** [PRD.md](./PRD.md)  
**Issue Tracker:** GitHub Issues  
**Email:** support@sibangku.app

---

**Version:** 3.0.0  
**Last Updated:** 2026-09-10  
**Status:** Production Ready ✅
