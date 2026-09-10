# 🎯 Tenant Customization & Update Guide

**Version:** 3.0.0  
**Target Audience:** Restaurant Administrators (Tenant Users)  
**Language:** Bahasa Indonesia + English

---

## 📑 Table of Contents

1. [Portal Admin Akses](#portal-admin-akses)
2. [Branding Customization](#branding-customization)
3. [Operational Settings](#operational-settings)
4. [Menu Management](#menu-management)
5. [Table Management & Floor Plan](#table-management--floor-plan)
6. [Staff Management](#staff-management)
7. [Payment Settings](#payment-settings)
8. [Reports & Analytics](#reports--analytics)
9. [APK Auto-Update](#apk-auto-update)
10. [FAQ](#faq)

---

## 🌐 Portal Admin Akses

### **Login ke Admin Portal**

1. Buka browser ke URL tenant Anda:
   ```
   https://<nama-restoran>.sibangku.app/admin
   ```

   **Contoh:** `https://restoran-a.sibangku.app/admin`

2. Masukkan kredensial:
   - **Email:** Email yang terdaftar saat provisioning
   - **Password:** Password yang diberikan oleh platform admin

3. Klik **Login**

### **First Login Setup**

Saat login pertama kali:
1. ✅ Sistem meminta ganti password (security best practice)
2. ✅ Setup 2-factor authentication (optional)
3. ✅ Terima terms & conditions
4. ✅ Redirect ke dashboard admin

---

## 🎨 Branding Customization

### **Akses Menu Branding**

```
Dashboard → Settings (⚙️) → Branding
```

### **Color Customization**

#### **Primary Color (Warna Utama)**
- **Definisi:** Warna dominan brand, digunakan di button, header, accent
- **Format:** Hex color code (contoh: `#FF6B00`)
- **Contoh penggunaan di portal:**
  - Button "Booking Sekarang"
  - Header navigation bar
  - Link aktif di menu

**Cara set:**
1. Klik field "Primary Color"
2. Pilih warna dari color picker atau ketik hex code
3. Preview real-time di sebelah kanan
4. Klik **Save**

#### **Secondary Color (Warna Aksen)**
- **Definisi:** Warna pendukung untuk hover state, badge, highlight
- **Format:** Hex color code (contoh: `#FFD700`)
- **Contoh penggunaan:**
  - Hover state pada button
  - Badge status (pending, confirmed)
  - Highlight pada selected items

**Cara set:**
1. Klik field "Secondary Color"
2. Pilih warna dari palette
3. Preview terupdate otomatis
4. Klik **Save**

#### **Background Color**
- **Definisi:** Latar belakang utama portal
- **Rekomendasi:** Warna cerah (putih/cream) agar readable
- **Default:** `#FFFFFF` (putih)

#### **Text Color**
- **Definisi:** Warna teks utama
- **Rekomendasi:** Warna gelap (hitam/dark gray)
- **Default:** `#1F2937` (dark gray)

---

### **Logo & Assets Upload**

#### **Restaurant Logo**
- **Lokasi di portal:** Settings → Branding → Upload Logo
- **Format:** PNG atau JPG
- **Ukuran maksimal:** 2 MB
- **Resolusi optimal:** 512 x 512 pixels (square preferred)
- **Penggunaan:**
  - Tampil di header portal
  - Tampil di APK icon launcher
  - Tampil di booking ticket/QR code

**Upload steps:**
1. Klik tombol "Upload Logo"
2. Pilih file dari komputer
3. Crop jika perlu (opsional)
4. Klik "Apply"
5. Klik "Save"

#### **Favicon (Browser Icon)**
- **Lokasi di portal:** Settings → Branding → Favicon
- **Format:** ICO atau PNG
- **Ukuran maksimal:** 100 KB
- **Resolusi optimal:** 64 x 64 pixels
- **Penggunaan:** Ikon di browser tab

#### **Banner Image**
- **Lokasi di portal:** Settings → Branding → Banner
- **Format:** PNG atau JPG
- **Ukuran maksimal:** 5 MB
- **Resolusi optimal:** 1920 x 600 pixels (landscape)
- **Penggunaan:** Hero banner di halaman booking portal

---

### **Typography Settings**

#### **Font Family**
- **Default Options:**
  - Plus Jakarta Sans (Modern, clean)
  - Poppins (Friendly, casual)
  - Lato (Professional, neutral)
  - Roboto (Tech-forward)

**Cara set:**
1. Settings → Branding → Font
2. Pilih dari dropdown
3. Preview terupdate
4. Klik **Save**

---

## ⚙️ Operational Settings

### **Akses Menu Operational**

```
Dashboard → Settings (⚙️) → Operational
```

### **Operating Hours**

#### **Opening & Closing Time**
- **Lokasi:** Settings → Operational → Operating Hours
- **Format:** HH:MM (24-hour format)

**Contoh:**
```
Opening Time: 10:00
Closing Time: 22:00
```

**Cara set:**
1. Klik field "Opening Time"
2. Pilih jam dan menit dari time picker
3. Klik field "Closing Time"
4. Pilih jam dan menit
5. Klik **Save**

#### **Operating Days**
- **Pilih hari kerja** (checkbox):
  - [ ] Monday
  - [ ] Tuesday
  - [ ] Wednesday
  - [ ] Thursday
  - [ ] Friday
  - [x] Saturday
  - [x] Sunday

**Contoh:** Restoran buka Senin-Minggu kecuali hari libur nasional

---

### **Reservation Slot Configuration**

#### **Slot Duration (Durasi Makan)**
- **Definisi:** Berapa lama durasi makan per reservasi (in minutes)
- **Rekomendasi:**
  - Fast food: 30-45 menit
  - Casual dining: 60-90 menit
  - Fine dining: 120+ menit
- **Default:** 90 menit

**Cara set:**
1. Settings → Operational → Slot Settings
2. Masukkan durasi dalam menit
3. Klik **Save**

#### **Available Slot Times**
- **Definisi:** Jam-jam mana saja slot booking bisa dipesan
- **Format:** Comma-separated, HH:MM
- **Contoh:**
  ```
  11:00, 12:00, 12:30, 13:00, 18:00, 18:30, 19:00, 19:30, 20:00
  ```

**Cara set:**
1. Settings → Operational → Slot Times
2. Masukkan waktu (pisahkan dengan koma)
3. Preview slot di calendar
4. Klik **Save**

#### **Max Guests per Slot**
- **Definisi:** Jumlah maksimal tamu yang bisa di-booking per slot
- **Contoh:** 50 (total kapasitas 50 tamu/slot)
- **Note:** Sistem akan reject booking jika sudah penuh

**Cara set:**
1. Settings → Operational → Capacity
2. Masukkan angka
3. Klik **Save**

#### **Min Advance Booking**
- **Definisi:** Berapa jam minimum sebelum slot customer bisa booking
- **Contoh:** 1 (harus booking 1 jam sebelum jadwal)
- **Use case:** Untuk prep time, not last-minute bookings

#### **Max Advance Booking**
- **Definisi:** Berapa hari ke depan customer bisa pre-order
- **Contoh:** 30 (booking bisa dilakukan hingga 30 hari ke depan)
- **Use case:** Long-term planning, capacity planning

---

## 📖 Menu Management

### **Akses Menu Management**

```
Dashboard → Menu
```

---

### **Menu Categories**

#### **Add Category**
1. Klik tombol **"+ Add Category"**
2. Isi form:
   - **Category Name:** "Makanan Utama" / "Minuman" / "Dessert"
   - **Display Order:** 1, 2, 3 (urutan tampil di portal)
   - **Icon** (optional): Pilih ikon kategori
   - **Description** (optional): Deskripsi kategori
3. Klik **Save**

**Contoh Kategori Umum:**
```
1. Makanan Utama (Nasi, Mie, Soup)
2. Appetizer (Snacks, Sides)
3. Minuman (Non-Alco, Alco)
4. Dessert (Kue, Fruit, Ice Cream)
5. Special Menu (Seasonal, Limited)
```

#### **Edit Category**
1. Hover over kategori
2. Klik ikon **Edit** (pencil)
3. Update informasi
4. Klik **Save**

#### **Delete Category**
1. Hover over kategori
2. Klik ikon **Delete** (trash)
3. Confirm deletion
4. **Note:** Menu items dalam kategori harus dipindah/delete dulu

---

### **Menu Items**

#### **Add Menu Item**
1. Klik tombol **"+ Add Item"** di kategori target
2. Isi form:
   - **Item Name:** `Nasi Goreng Spesial`
   - **Description:** `Nasi goreng dengan telur, ayam, dan sayuran segar`
   - **Price (IDR):** `45000`
   - **Category:** Pilih kategori (otomatis terisi)
   - **Availability:** Toggle aktif/tidak
   - **Image** (optional): Upload foto menu
   - **Tags** (optional): "Spicy", "Vegetarian", "Gluten-Free"
3. Klik **Save**

**Contoh Menu Item:**
```
Name: Nasi Goreng Spesial
Description: Nasi goreng dengan telur, ayam, 
             dan sayuran segar. Cita rasa pedas 
             dan gurih khas restoran kami
Price: Rp 45,000
Category: Makanan Utama
Image: nasi-goreng-spesial.jpg
Tags: [Spicy] [Halal] [Popular]
Availability: AVAILABLE ✓
```

#### **Edit Menu Item**
1. Hover over item
2. Klik **Edit**
3. Update field yang ingin diubah
4. Klik **Save**

**Contoh Update:**
```
Scenario: Harga naik dari Rp 45K → Rp 50K
1. Klik Edit pada "Nasi Goreng Spesial"
2. Ubah Price: 45000 → 50000
3. Klik Save
4. Update langsung ke portal & APK (next refresh)
```

#### **Toggle Item Availability**
- **Active:** Item muncul di portal & bisa di-order
- **Inactive:** Item disembunyikan (temporary)

**Use case:**
```
Pagi: Semua item active
Siang (stok habis): Matikan "Soto Ayam"
Sore: Active kembali setelah restock
```

---

### **Bulk Operations**

#### **Import Menu (CSV)**
1. Klik **"Import Menu"**
2. Download template CSV
3. Isi template dengan menu items
4. Upload file
5. Review preview
6. Klik **Import**

**CSV Format:**
```
Category,Item Name,Description,Price,Image URL,Tags
Makanan Utama,Nasi Goreng Spesial,Nasi goreng dengan telur dan ayam,45000,https://...,Spicy|Popular
Makanan Utama,Mie Goreng Premium,Mie kuning dengan seafood,48000,https://...,Popular
Minuman,Jus Jeruk Segar,Jus jeruk asli tanpa gula,12000,https://...,Fresh|Healthy
```

#### **Export Menu (CSV)**
1. Klik **"Export Menu"**
2. Download file CSV
3. Gunakan untuk backup atau edit massal

---

## 🪑 Table Management & Floor Plan

### **Akses Table Management**

```
Dashboard → Tables → Table List
```

---

### **Add Table**

1. Klik tombol **"+ Add Table"**
2. Isi form:
   - **Table Number:** `T-01`, `T-02`, `Corner-01`
   - **Capacity:** 2, 4, 6, 8 (jumlah kursi)
   - **Location** (optional): "Area Depan", "Indoor", "Outdoor"
   - **Type** (optional): "Regular", "VIP", "Counter"
   - **X Coordinate:** Pixel position horizontal (untuk floor plan)
   - **Y Coordinate:** Pixel position vertical (untuk floor plan)
3. Klik **Save**

**Contoh Tabel 4 Meja:**
```
Table T-01 (Capacity 2, X: 100, Y: 100)
Table T-02 (Capacity 4, X: 250, Y: 100)
Table T-03 (Capacity 4, X: 100, Y: 250)
Table T-04 (Capacity 6, X: 250, Y: 250)
```

---

### **Visual Floor Plan**

#### **Interactive Canvas**
1. Akses: Dashboard → Tables → **Floor Plan** tab
2. Canvas besar menampilkan tata letak meja
3. Setiap meja bisa di-drag untuk reposition
4. Klik meja untuk edit informasi

#### **Update Coordinates**
```
Opsi 1: Manual input
├─ Klik meja → Edit
├─ Update X: 150, Y: 180
└─ Save

Opsi 2: Drag & Drop
├─ Klik & drag meja di canvas
├─ Koordinat otomatis update
└─ Auto-save (3 detik)
```

#### **Floor Plan Export**
- Klik **"Export Layout"**
- Format: PNG image (untuk print/dokumentasi)
- Gunakan sebagai reference untuk staff

---

### **Edit & Delete Table**

#### **Edit Table**
1. Klik meja di Floor Plan atau Table List
2. Update field yang perlu
3. Klik **Save**

#### **Delete Table**
1. Klik meja
2. Klik tombol **"Delete"**
3. Confirm (warning: reservasi existing tidak affected)
4. Deleted

---

## 👥 Staff Management

### **Akses Staff Management**

```
Dashboard → Settings (⚙️) → Staff
```

---

### **Add Staff Account**

1. Klik tombol **"+ Add Staff"**
2. Isi form:
   - **Staff Name:** `Budi Santoso`
   - **Email:** `budi@restoa.com`
   - **Phone** (optional): `+62812345678`
   - **Role:** 
     - `Admin` (full access)
     - `Manager` (manage operations)
     - `Staff` (view only)
   - **Permissions** (checklist):
     - [ ] Manage Reservations
     - [ ] Manage Tables
     - [ ] View Reports
     - [ ] Edit Menu
     - [ ] Edit Settings
     - [ ] Manage Staff
3. Klik **Send Invite**

**Output:** Email invite dikirim ke staff dengan temporary password

---

### **Staff Roles & Permissions**

| Permission | Admin | Manager | Staff |
|-----------|-------|---------|-------|
| View Dashboard | ✅ | ✅ | ✅ |
| Manage Reservations | ✅ | ✅ | ✅ |
| Manage Tables | ✅ | ✅ | ❌ |
| View Reports | ✅ | ✅ | ✅ |
| Edit Menu | ✅ | ✅ | ❌ |
| Edit Settings | ✅ | ❌ | ❌ |
| Manage Staff | ✅ | ❌ | ❌ |

---

### **Edit Staff**

1. Hover over staff member
2. Klik **Edit**
3. Update permissions
4. Klik **Save**

---

### **Reset Staff Password**

1. Hover over staff
2. Klik **Reset Password**
3. Email dengan reset link dikirim
4. Staff bisa set password baru via email link

---

## 💳 Payment Settings

### **Akses Payment Settings**

```
Dashboard → Settings (⚙️) → Payment
```

---

### **Payment Method Configuration**

#### **QRIS (QR Indonesian Standard)**
- **Status:** Toggle ON/OFF
- **Merchant ID:** Auto-generated (unique per tenant)
- **Display in Portal:** Customer bisa scan QR untuk bayar

#### **Bank Transfer**
- **Status:** Toggle ON/OFF
- **Account Details:**
  - Bank Name: `BCA`, `BRI`, `Mandiri`, etc.
  - Account Number: `1234567890`
  - Account Holder: `PT Restoran A`
  - Bank Code: Auto-filled
- **Display in Portal:** Customer lihat nomrek untuk transfer

#### **WhatsApp Payment**
- **Status:** Toggle ON/OFF
- **WhatsApp Number:** `+6281234567890`
- **Use Case:** Customer bisa confirm booking + bayar via WA

#### **Cash on Arrival**
- **Status:** Toggle ON/OFF
- **Use Case:** Pembayaran saat tamu tiba di restoran
- **Hold Time:** Berapa lama reserved tanpa pembayaran (default 15 menit)

---

### **Payment Timeout & Reminders**

#### **Payment Timeout**
- **Definisi:** Berapa lama customer harus membayar setelah booking
- **Default:** 1 jam
- **Custom:** 30 menit, 2 jam, 24 jam, etc.

#### **Reminder Notification**
- **Enable:** Toggle ON/OFF
- **Reminder Times:**
  - 30 menit sebelum slot (notify untuk bayar)
  - 15 menit sebelum slot (urgent reminder)

---

## 📊 Reports & Analytics

### **Akses Reports**

```
Dashboard → Reports
```

---

### **Key Metrics**

#### **Reservation Dashboard**
```
Total Reservations (Today): 45
├─ Confirmed: 38 ✓
├─ Pending: 5 ⏳
├─ Cancelled: 2 ✗
└─ No Show: 0

Revenue (Today): Rp 1,850,000
├─ Via QRIS: Rp 1,200,000
├─ Via Bank Transfer: Rp 500,000
└─ COD: Rp 150,000

Average Party Size: 3.2 persons
Peak Hour: 19:00-20:00 (12 reservations)
```

#### **Occupancy Rate**
```
Available Slots: 8 (10:00, 11:00, 12:00, 12:30, 18:00, 18:30, 19:00, 19:30)
Booked Slots: 6
Occupancy Rate: 75%
Capacity Utilization: 85% (seats filled vs total)
```

#### **Monthly Trends**
- Graph showing reservations trend
- Revenue trend
- Customer growth
- Booking channels breakdown

---

### **Export Reports**

- **Format:** PDF, CSV, Excel
- **Date Range:** Custom atau preset (Today, Week, Month)
- **Metrics:** Pilih yang ingin di-export
- **Use Case:** Sharing dengan ownership, analysis, tax reporting

---

## 🔄 APK Auto-Update

### **Penting: APK Otomatis Update Sesuai Customization**

Setiap kali Anda mengubah konfigurasi di portal `/admin`, semua perubahan **otomatis disinkronisasi** ke APK!

---

### **Apa yang Auto-Update?**

| Element | Auto-Updated | Kapan |
|---------|--------------|-------|
| **Logo & Icon** | ✅ | Next APK build |
| **App Name** | ✅ | Next APK build |
| **Color Theme** | ✅ | Next app refresh |
| **Menu Items** | ✅ | Next app refresh |
| **Operating Hours** | ✅ | Immediate |
| **Available Slots** | ✅ | Real-time |
| **Table Configuration** | ✅ | Next APK build |
| **Payment Settings** | ✅ | Next app refresh |
| **Branding Assets** | ✅ | Next APK build |

---

### **How It Works - Real Example**

#### **Scenario 1: Menu Update**
```
Waktu 14:00
└─ Anda tambah menu baru di /admin
   "Nasi Kuning Premium" (Rp 55.000)

Waktu 14:02
└─ Database terupdate
   Event: MENU_CHANGED triggered

Waktu 14:05
└─ APK cache invalidated
   Customer app: Menu baru muncul di next refresh
   Portal web: Menu baru langsung tampil

Waktu 14:30
└─ Next APK rebuild: Baru menu already included
```

#### **Scenario 2: Branding Update**
```
Waktu 10:00
└─ Anda ubah Primary Color (Oranye → Biru)
   Ubah Logo (update gambar)

Waktu 10:01
└─ Portal langsung berubah warna (real-time)

Waktu 10:05
└─ Builder service detect change
   Schedule APK rebuild

Waktu 10:15
└─ APK baru ready download
   Release notes: "Updated branding (blue theme)"

Waktu 10:30
└─ Existing customer dengan APK lama:
   Next refresh → warna baru sesuai server config
```

#### **Scenario 3: Operating Hours Update**
```
Waktu 16:00
└─ Ubah jam buka 10:00 → 09:00
   Ubah jam tutup 22:00 → 23:00

Waktu 16:01
└─ Database immediate update
   API cache invalidate

Waktu 16:05
└─ Customer portal /booking refresh
   Slot jam 09:00 & 23:00 langsung tersedia

Waktu 16:10
└─ APK user: Slot baru available di next app refresh
   No need to update APK (config dari API)
```

---

### **APK Build Process**

Ketika APK di-generate (saat provisioning atau manual rebuild):

1. **Asset Extraction**
   - Fetch logo dari database
   - Fetch warna dari database
   - Fetch app name dari database

2. **Template Modification**
   - Replace app icon dengan logo Anda
   - Replace color theme dengan primary/secondary color
   - Update app name & package ID

3. **Compilation**
   - Gradle build release APK
   - Code signing dengan production key
   - Generate checksum

4. **Distribution**
   - Upload ke storage (Play Store atau direct link)
   - Generate download URL
   - Create release notes

---

## ❓ FAQ

### **Q1: Berapa lama perubahan sinkronisasi ke APK?**

**A:**
- **Web Portal:** Immediate (real-time)
- **APK:** Saat refresh app (manual atau auto-refresh per 5 menit)
- **APK Build:** Jika rebuild dilakukan, ~15-20 menit

---

### **Q2: Apakah customer perlu update APK kalau ada perubahan?**

**A:** **Tidak!** 
- Perubahan menu, jam operasional, harga = **Otomatis sync** via API
- APK build baru = **Hanya untuk** branding/structural changes
- Customer bisa tetap pakai versi lama

---

### **Q3: Bagaimana jika saya atur jam buka 10:00 tapi ingin off pada hari tertentu?**

**A:** 
Fitur "Closed Days" di Operational Settings:
1. Settings → Operational → Closed Days
2. Tambah tanggal (holiday, maintenance, dll)
3. Save
4. Slot tidak akan tersedia pada tanggal tersebut

---

### **Q4: Berapa maksimal items menu yang bisa di-upload?**

**A:** 
- **Recommended:** Sampai 1000 items (performa tetap bagus)
- **Technical Limit:** 10,000+ items (tapi UX jadi lambat)
- **Best Practice:** Organize dalam kategori untuk user experience

---

### **Q5: Bisa ganti warna theme tanpa rebuild APK?**

**A:** 
**Ya!** Sistem cache-aware:
1. Ubah warna di Settings → Branding
2. Portal web immediate update (real-time)
3. APK user: Update saat refresh app
4. No need to rebuild APK (config dari API)

---

### **Q6: Bagaimana tracking perubahan yang dilakukan?**

**A:** 
Semua perubahan ter-log di:
1. **Audit Log:** Dashboard → Settings → Audit Log
2. **Activity History:** Per menu item / table / setting
3. **Timestamp:** Kapan & siapa yang ubah

---

### **Q7: Bisa atur capacity per meja berbeda?**

**A:** 
**Ya!**
1. Table Management → Table List
2. Setiap meja punya "Capacity" field terpisah
3. Contoh:
   - Table T-01: Capacity 2
   - Table T-02: Capacity 4
   - Table T-03: Capacity 6
4. System akan assign customer ke meja yang sesuai

---

### **Q8: Bagaimana update APK di Play Store kalau sudah published?**

**A:**
1. Generate APK baru via CLI
2. Increment version number (`versionCode`)
3. Update release notes
4. Upload ke Play Store (Google Play Console)
5. Play Store akan otomatis serve versi terbaru ke users

---

### **Q9: Bisa backup & restore menu?**

**A:** 
**Ya!**
- **Backup:** Menu → Export (CSV atau JSON)
- **Restore:** Menu → Import (upload file)
- **Use case:** Migrate ke tenant lain, data preservation

---

### **Q10: Berapa durasi makan ideal?**

**A:**
- **Fast Food:** 30-45 menit
- **Casual Dining:** 60-90 menit
- **Fine Dining:** 120+ menit
- **Ideal:** Sesuaikan dengan concept & turnover target

---

## 📞 Support & Help

**Portal Issues?** 
- Email: support@sibangku.app
- Chat: In-app support (Dashboard → Help)

**APK Issues?**
- Check: Is app updated to latest version?
- Troubleshoot: Force close → Clear cache → Reopen

**Need API Reference?**
- Docs: [API Documentation](../docs/)

**Webhook Setup?**
- Guide: [Payment Integration](../docs/PAYMENT.md)

---

**Last Updated:** 2026-09-10  
**Version:** 3.0.0 - Production Ready ✅
