using System;
using System.Collections.Generic;
using System.Linq;

namespace SiBangku.Web.Services;

public record LanguageInfo(string Code, string NativeName, string EnglishName, string Region, bool IsRtl = false);

public class LanguageService
{
    public const string Indonesian = "id";
    public const string English = "en";

    public string CurrentLanguage { get; private set; } = Indonesian;

    public event Action? OnLanguageChanged;

    private static readonly List<LanguageInfo> _languages = new()
    {
        // Southeast Asia
        new("id", "Indonesia", "Indonesian", "Southeast Asia"),
        new("ms", "Bahasa Melayu", "Malay", "Southeast Asia"),
        new("fil", "Filipino", "Filipino", "Southeast Asia"),
        new("tl", "Tagalog", "Tagalog", "Southeast Asia"),
        new("vi", "Tiếng Việt", "Vietnamese", "Southeast Asia"),
        new("th", "ไทย", "Thai", "Southeast Asia"),
        new("my", "မြန်မာ", "Burmese", "Southeast Asia"),
        new("km", "ភាសាខ្មែរ", "Khmer", "Southeast Asia"),
        new("lo", "ລາວ", "Lao", "Southeast Asia"),
        new("jv", "Basa Jawa", "Javanese", "Southeast Asia"),
        new("su", "Basa Sunda", "Sundanese", "Southeast Asia"),

        // East Asia
        new("zh", "中文", "Chinese (Simplified)", "East Asia"),
        new("zh-TW", "繁體中文", "Chinese (Traditional)", "East Asia"),
        new("ja", "日本語", "Japanese", "East Asia"),
        new("ko", "한국어", "Korean", "East Asia"),
        new("mn", "Монгол", "Mongolian", "East Asia"),

        // South Asia
        new("hi", "हिन्दी", "Hindi", "South Asia"),
        new("bn", "বাংলা", "Bengali", "South Asia"),
        new("ta", "தமிழ்", "Tamil", "South Asia"),
        new("te", "తెలుగు", "Telugu", "South Asia"),
        new("mr", "मराठी", "Marathi", "South Asia"),
        new("gu", "ગુજરાતી", "Gujarati", "South Asia"),
        new("kn", "ಕನ್ನಡ", "Kannada", "South Asia"),
        new("ml", "മലയാളം", "Malayalam", "South Asia"),
        new("pa", "ਪੰਜਾਬੀ", "Punjabi", "South Asia"),
        new("or", "ଓଡ଼ିଆ", "Odia", "South Asia"),
        new("si", "සිංහල", "Sinhala", "South Asia"),
        new("ne", "नेपाली", "Nepali", "South Asia"),
        new("ur", "اردو", "Urdu", "South Asia", IsRtl: true),

        // Middle East
        new("ar", "العربية", "Arabic", "Middle East", IsRtl: true),
        new("fa", "فارسی", "Persian", "Middle East", IsRtl: true),
        new("he", "עברית", "Hebrew", "Middle East", IsRtl: true),
        new("ku", "Kurdî", "Kurdish", "Middle East"),
        new("tr", "Türkçe", "Turkish", "Middle East"),

        // Central Asia
        new("kk", "Қазақ", "Kazakh", "Central Asia"),
        new("ky", "Кыргызча", "Kyrgyz", "Central Asia"),
        new("uz", "Oʻzbek", "Uzbek", "Central Asia"),
        new("tk", "Türkmen", "Turkmen", "Central Asia"),
        new("tg", "Тоҷикӣ", "Tajik", "Central Asia"),

        // Europe (Western)
        new("en", "English", "English", "Europe"),
        new("fr", "Français", "French", "Europe"),
        new("de", "Deutsch", "German", "Europe"),
        new("es", "Español", "Spanish", "Europe"),
        new("pt", "Português", "Portuguese", "Europe"),
        new("it", "Italiano", "Italian", "Europe"),
        new("nl", "Nederlands", "Dutch", "Europe"),
        new("da", "Dansk", "Danish", "Europe"),
        new("sv", "Svenska", "Swedish", "Europe"),
        new("no", "Norsk", "Norwegian", "Europe"),
        new("fi", "Suomi", "Finnish", "Europe"),
        new("is", "Íslenska", "Icelandic", "Europe"),
        new("ca", "Català", "Catalan", "Europe"),
        new("eu", "Euskara", "Basque", "Europe"),
        new("gl", "Galego", "Galician", "Europe"),
        new("cy", "Cymraeg", "Welsh", "Europe"),
        new("ga", "Gaeilge", "Irish", "Europe"),
        new("mt", "Malti", "Maltese", "Europe"),

        // Europe (Eastern)
        new("pl", "Polski", "Polish", "Europe"),
        new("cs", "Čeština", "Czech", "Europe"),
        new("sk", "Slovenčina", "Slovak", "Europe"),
        new("hu", "Magyar", "Hungarian", "Europe"),
        new("ro", "Română", "Romanian", "Europe"),
        new("bg", "Български", "Bulgarian", "Europe"),
        new("hr", "Hrvatski", "Croatian", "Europe"),
        new("sr", "Српски", "Serbian", "Europe"),
        new("bs", "Bosanski", "Bosnian", "Europe"),
        new("sl", "Slovenščina", "Slovenian", "Europe"),
        new("mk", "Македонски", "Macedonian", "Europe"),
        new("sq", "Shqip", "Albanian", "Europe"),
        new("el", "Ελληνικά", "Greek", "Europe"),
        new("et", "Eesti", "Estonian", "Europe"),
        new("lt", "Lietuvių", "Lithuanian", "Europe"),
        new("lv", "Latviešu", "Latvian", "Europe"),
        new("uk", "Українська", "Ukrainian", "Europe"),
        new("be", "Беларуская", "Belarusian", "Europe"),
        new("ru", "Русский", "Russian", "Europe"),
        new("hy", "Հայերեն", "Armenian", "Europe"),
        new("ka", "ქართული", "Georgian", "Europe"),
        new("az", "Azərbaycan", "Azerbaijani", "Europe"),

        // Africa
        new("sw", "Kiswahili", "Swahili", "Africa"),
        new("am", "አማርኛ", "Amharic", "Africa"),
        new("ha", "Hausa", "Hausa", "Africa"),
        new("yo", "Yorùbá", "Yoruba", "Africa"),
        new("af", "Afrikaans", "Afrikaans", "Africa"),
        new("zu", "isiZulu", "Zulu", "Africa"),
        new("xh", "isiXhosa", "Xhosa", "Africa"),
        new("sn", "Shona", "Shona", "Africa"),
        new("st", "Sesotho", "Sesotho", "Africa"),
        new("ny", "Chichewa", "Chichewa", "Africa"),
        new("rw", "Kinyarwanda", "Kinyarwanda", "Africa"),
        new("so", "Soomaali", "Somali", "Africa"),
        new("ti", "ትግርኛ", "Tigrinya", "Africa"),
        new("sd", "سنڌي", "Sindhi", "Africa", IsRtl: true),
    };

    private static readonly HashSet<string> _supportedCodes =
        new(_languages.Select(l => l.Code), StringComparer.OrdinalIgnoreCase);

    public static IReadOnlyList<LanguageInfo> AvailableLanguages => _languages;

    public static IReadOnlyList<LanguageInfo> SearchLanguages(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return _languages;

        var q = query.Trim();
        return _languages
            .Where(l =>
                l.Code.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                l.NativeName.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                l.EnglishName.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                l.Region.Contains(q, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    public void SetLanguage(string lang)
    {
        if (string.IsNullOrWhiteSpace(lang) || !_supportedCodes.Contains(lang))
            lang = Indonesian;

        if (CurrentLanguage != lang)
        {
            CurrentLanguage = lang;
            OnLanguageChanged?.Invoke();
        }
    }

    public void ToggleLanguage()
    {
        SetLanguage(CurrentLanguage == Indonesian ? English : Indonesian);
    }

    public string this[string key] => Get(key);

    public string Get(string key, string? fallback = null)
    {
        // Try current language dictionary
        if (Translations.TryGetValue(CurrentLanguage, out var langDict) && langDict.TryGetValue(key, out var val))
            return val;

        // Fallback to English
        if (CurrentLanguage != English &&
            Translations.TryGetValue(English, out var enDict) && enDict.TryGetValue(key, out var enVal))
            return enVal;

        // Fallback to Indonesian
        if (CurrentLanguage != Indonesian &&
            Translations.TryGetValue(Indonesian, out var idDict) && idDict.TryGetValue(key, out var idVal))
            return idVal;

        return fallback ?? key;
    }

    private static readonly Dictionary<string, Dictionary<string, string>> Translations = new(StringComparer.OrdinalIgnoreCase)
    {
        [Indonesian] = new(StringComparer.OrdinalIgnoreCase)
        {
            // Navbar & Common
            ["Nav_Home"] = "Beranda",
            ["Nav_Booking"] = "Reservasi Meja",
            ["Nav_BookNow"] = "Pesan Meja",
            ["Nav_RestoAdmin"] = "Portal Mitra Resto",
            ["Nav_ControlPlane"] = "Platform Control",
            ["Nav_Language"] = "Bahasa",
            ["Common_OpenNow"] = "Buka Sekarang",
            ["Common_Close"] = "Tutup",
            ["Common_Cancel"] = "Batal",
            ["Common_Save"] = "Simpan",
            ["Common_Confirm"] = "Konfirmasi",
            ["Common_Loading"] = "Memuat...",

            // Hero Section
            ["Hero_Title_1"] = "Reservasi Meja Restoran",
            ["Hero_Title_2"] = "Modern, Cepat & Tanpa Antre",
            ["Hero_Subtitle"] = "Tingkatkan okupansi meja hingga 40% dan eliminasi no-show. Berikan pengalaman bersantap istimewa bagi pelanggan dengan pemindaian QR interaktif dan denah meja real-time.",
            ["Hero_Btn_Book"] = "Reservasi Meja Sekarang",
            ["Hero_Btn_ScanQR"] = "Buka Kamera / Scan QR",
            ["Hero_Btn_RestoPortal"] = "Portal Pemilik Resto",
            ["Hero_Search_Placeholder"] = "MASUKKAN KODE OUTLET RESTORAN ATAU SCAN QR",
            ["Hero_Search_Btn"] = "Buka Portal",
            ["Hero_Live_Status"] = "Sistem Live & Aktif",
            ["Hero_Stat_Speed"] = "Konfirmasi Cepat",
            ["Hero_Stat_Speed_Sub"] = "Slot diverifikasi dalam hitungan milidetik",
            ["Hero_Stat_Capacity"] = "Anti Double-Booking",
            ["Hero_Stat_Capacity_Sub"] = "Alokasi meja presisi dan bebas konflik",
            ["Hero_Stat_Uptime"] = "99.9% Keandalan",
            ["Hero_Stat_Uptime_Sub"] = "Kesiapan operasional di jam tersibuk",

            // Product Explanation
            ["Product_Badge"] = "MENGENAL SIBANGKU",
            ["Product_Title"] = "Platform All-in-One untuk Tamu & Pengelola Restoran",
            ["Product_Subtitle"] = "SiBangku dirancang untuk mengatasi masalah antrean panjang, ketidakpastian meja, dan kehilangan omzet akibat reservasi yang terbengkalai.",
            ["Product_Card_1_Tag"] = "PENGALAMAN TAMU",
            ["Product_Card_1_Title"] = "Pesan Meja Mandiri Tanpa Ribet",
            ["Product_Card_1_Desc"] = "Pelanggan dapat memindai QR code standee akrilik di restoran dari HP maupun laptop, memilih waktu dan jumlah tamu, lalu menerima tiket digital resmi instan.",
            ["Product_Card_2_Tag"] = "MANAJEMEN RESTO",
            ["Product_Card_2_Title"] = "Denah Meja & Kapasitas Real-Time",
            ["Product_Card_2_Desc"] = "Visualisasi denah meja akurat dengan koordinat ruang. Staf dan manajer outlet dapat memantau meja mana yang terisi, kosong, atau dalam antrean kedatangan.",
            ["Product_Card_3_Tag"] = "OPTIMASI OMZET",
            ["Product_Card_3_Title"] = "Sistem Auto-Release 15 Menit",
            ["Product_Card_3_Desc"] = "Pemberi giliran meja otomatis yang melepaskan slot meja jika tamu tidak hadir dalam 15 menit, memastikan meja berputar optimal dan omzet restoran maksimal.",

            // Technology Showcase
            ["Tech_Badge"] = "TEKNOLOGI & ARSITEKTUR TANGGUH",
            ["Tech_Title"] = "Fondasi Digital Berkecepatan Tinggi & Skalabel",
            ["Tech_Subtitle"] = "Menggabungkan teknologi enterprise terkini untuk menjamin performa tanpa kompromi bagi ekosistem kuliner modern.",
            ["Tech_1_Title"] = "Runtime C# .NET 9 Core",
            ["Tech_1_Desc"] = "Pemrosesan transaksi super cepat dengan latensi rendah dan komputasi asinkronus berkapasitas tinggi.",
            ["Tech_2_Title"] = "Isolasi Data Fisik Multi-Tenant",
            ["Tech_2_Desc"] = "Setiap mitra restoran memiliki basis data terdedikasi demi integritas data dan kepatuhan privasi pelanggan.",
            ["Tech_3_Title"] = "Pemindai Kamera Lintas Perangkat",
            ["Tech_3_Desc"] = "Deteksi QR presisi tinggi yang kompatibel dengan kamera ponsel (depan/belakang) serta webcam laptop.",
            ["Tech_4_Title"] = "Mesin Slot Bebas-Konflik",
            ["Tech_4_Desc"] = "Algoritma verifikasi waktu matematis yang mencegah terjadinya tabrakan jam antar tamu di meja yang sama.",
            ["Tech_5_Title"] = "Desain Sistem Adaptif White-Label",
            ["Tech_5_Desc"] = "Tampilan antarmuka dinamis yang otomatis mengadopsi identitas logo, warna, dan tema khas setiap restoran.",
            ["Tech_6_Title"] = "Kit Standee QR Siap Cetak",
            ["Tech_6_Desc"] = "Generator poster QR beresolusi tajam siap cetak ukuran A4/A5 untuk dipasang langsung di meja atau pintu masuk.",

            // How It Works
            ["How_Badge"] = "CARA KERJA",
            ["How_Title"] = "3 Langkah Mudah Menikmati Meja Favorit",
            ["How_Subtitle"] = "Proses mandiri yang cepat, jelas, dan tanpa menunggu antrean fisik.",
            ["Step_1_Num"] = "01",
            ["Step_1_Title"] = "Scan QR atau Masukkan Kode Resto",
            ["Step_1_Desc"] = "Arahkan kamera HP/laptop ke poster standee di restoran atau ketik kode restoran mitra.",
            ["Step_2_Num"] = "02",
            ["Step_2_Title"] = "Tentukan Tanggal & Slot Jam",
            ["Step_2_Desc"] = "Pilih tanggal kedatangan, estimasi jumlah tamu, dan jam santap yang masih tersedia.",
            ["Step_3_Num"] = "03",
            ["Step_3_Title"] = "Terima Tiket Digital Resmi",
            ["Step_3_Desc"] = "Simpan kode booking unik dan tunjukkan kepada staf restoran saat Anda tiba.",

            // Interactive Preview Mockup
            ["Mockup_Title"] = "Simulasi Meja Interaktif SiBangku",
            ["Mockup_Subtitle"] = "Klik untuk mencoba memilih meja dan merasakan alur reservasi digital.",
            ["Mockup_Status_Available"] = "Tersedia",
            ["Mockup_Status_Booked"] = "Terisi",
            ["Mockup_Status_Selected"] = "Dipilih",
            ["Mockup_Table"] = "Meja",
            ["Mockup_Seats"] = "Kursi",

            // CTA Section
            ["CTA_Title"] = "Mulai Transformasi Reservasi Restoran Anda Hari Ini",
            ["CTA_Subtitle"] = "Bergabunglah dengan ratusan meja restoran yang telah terkelola secara efisien, bebas bentrok, dan menguntungkan.",
            ["CTA_Btn_Explore"] = "Pesan Meja Tamu",
            ["CTA_Btn_Partner"] = "Masuk Sebagai Mitra Restoran",

            // Booking Portal
            ["Booking_Title_Default"] = "Portal Reservasi Meja Mandiri",
            ["Booking_Subtitle_Default"] = "Masukkan kode outlet restoran atau scan QR code standee di meja untuk melihat ketersediaan real-time",
            ["Booking_Search_Placeholder"] = "KODE RESTORAN",
            ["Booking_Search_Btn"] = "Cari Resto",
            ["Booking_Scan_Btn"] = "Scan QR Meja",
            ["Booking_Active_Outlet"] = "Outlet Aktif",
            ["Booking_Hours"] = "Jam Buka",
            ["Booking_Slot_Duration"] = "Durasi Slot",
            ["Booking_Minutes"] = "Menit",
            ["Booking_Select_Outlet_Prompt"] = "Tentukan Outlet Restoran Mitra",
            ["Booking_Select_Outlet_Hint"] = "Silakan masukkan kode restoran pada kolom di atas atau scan QR Code standee yang tersedia di meja restoran.",
            ["Booking_Connecting"] = "Menghubungkan ke Basis Data Restoran...",
            ["Booking_Step1_Title"] = "Tentukan Tanggal & Tamu",
            ["Booking_Date_Label"] = "Tanggal Kunjungan",
            ["Booking_Guests_Label"] = "Jumlah Tamu",
            ["Booking_Guests_Suffix"] = "Orang",
            ["Booking_Slots_Title"] = "Slot Waktu Tersedia:",
            ["Booking_Slot_Full"] = "Penuh",
            ["Booking_Slot_Tables_Count"] = "Meja",
            ["Booking_No_Slots"] = "Tidak ada slot waktu tersedia pada tanggal ini.",
            ["Booking_Step2_Title"] = "Informasi Kontak Pemesan",
            ["Booking_Prompt_Select_Slot"] = "Silakan pilih salah satu slot waktu yang tersedia pada panel di sebelah kiri.",
            ["Booking_Selected_Slot_Label"] = "SLOT TERPILIH:",
            ["Booking_Name_Label"] = "Nama Lengkap Pemesan",
            ["Booking_Name_Placeholder"] = "Nama Lengkap Anda",
            ["Booking_Email_Label"] = "Alamat Email",
            ["Booking_Email_Placeholder"] = "alamat@email.com",
            ["Booking_Phone_Label"] = "No. WhatsApp / Telepon",
            ["Booking_Phone_Placeholder"] = "08xxxxxxxxxx",
            ["Booking_Notes_Label"] = "Catatan Khusus (Opsional)",
            ["Booking_Notes_Placeholder"] = "Permintaan khusus: area dekat jendela, kursi bayi, acara keluarga, dll.",
            ["Booking_Submit_Btn"] = "Konfirmasi & Buat Reservasi",
            ["Booking_Submitting"] = "Memproses Reservasi Anda...",
            ["Booking_Security_Note"] = "Terenkripsi & terhubung langsung dengan sistem reservasi outlet.",

            // Ticket Confirmation
            ["Ticket_Success_Title"] = "Reservasi Berhasil Dikonfirmasi!",
            ["Ticket_Success_Desc"] = "Kode booking resmi Anda adalah {0}. Simpan tiket digital ini saat kedatangan.",
            ["Ticket_Header_Title"] = "Tiket Reservasi Meja Digital",
            ["Ticket_Header_Subtitle"] = "Tunjukkan tiket ini kepada staf resepsionis restoran.",
            ["Ticket_Booking_Code"] = "KODE BOOKING",
            ["Ticket_Status_Registered"] = "Terdaftar",
            ["Ticket_Restaurant"] = "Restoran Tujuan",
            ["Ticket_Guest_Name"] = "Nama Pemesan",
            ["Ticket_Date_Time"] = "Tanggal & Waktu",
            ["Ticket_Guests"] = "Jumlah Tamu",
            ["Ticket_Notes"] = "Catatan Khusus:",
            ["Ticket_Btn_Print"] = "Cetak Tiket",
            ["Ticket_Btn_New"] = "Reservasi Baru",
            ["Ticket_Btn_Back"] = "Kembali ke Form",

            // Scanner Modal
            ["Scanner_Modal_Title"] = "Pemindai Kamera QR Restoran",
            ["Scanner_Modal_Subtitle"] = "Arahkan kamera ke QR Code standee meja atau banner restoran. Mendukung kamera HP & laptop.",
            ["Scanner_Camera_Label"] = "Pilih Perangkat Kamera:",
            ["Scanner_Scanning_Status"] = "Mencari QR Code... Pastikan pencahayaan cukup.",
            ["Scanner_Torch_Toggle"] = "Lampu Flash",
            ["Scanner_Flip_Camera"] = "Ganti Kamera",
            ["Scanner_Upload_Hint"] = "Atau upload foto / screenshot QR code:",
            ["Scanner_Upload_Btn"] = "Pilih File Gambar",
            ["Scanner_Close_Btn"] = "Tutup Pemindai",
            ["Scanner_Success"] = "QR Berhasil Dideteksi! Mengalihkan ke outlet...",
            ["Scanner_Permission_Denied"] = "Izin kamera ditolak atau perangkat kamera tidak ditemukan. Silakan izinkan akses kamera di browser Anda atau gunakan upload gambar.",

            // Language Selector
            ["Lang_Modal_Title"] = "Pilih Bahasa",
            ["Lang_Modal_Subtitle"] = "Pilih bahasa tampilan yang Anda inginkan",
            ["Lang_Search_Placeholder"] = "Cari bahasa... (mis. Japanese, العربية, Français)",
            ["Lang_Available"] = "bahasa tersedia",
            ["Lang_Showing"] = "Menampilkan",
            ["Lang_Results"] = "hasil",
            ["Lang_No_Results"] = "Tidak ada bahasa yang cocok dengan pencarian Anda.",
            ["Lang_Current"] = "Aktif",
        },
        [English] = new(StringComparer.OrdinalIgnoreCase)
        {
            // Navbar & Common
            ["Nav_Home"] = "Home",
            ["Nav_Booking"] = "Table Booking",
            ["Nav_BookNow"] = "Book a Table",
            ["Nav_RestoAdmin"] = "Resto Admin Portal",
            ["Nav_ControlPlane"] = "Platform Control",
            ["Nav_Language"] = "Language",
            ["Common_OpenNow"] = "Open Now",
            ["Common_Close"] = "Close",
            ["Common_Cancel"] = "Cancel",
            ["Common_Save"] = "Save",
            ["Common_Confirm"] = "Confirm",
            ["Common_Loading"] = "Loading...",

            // Hero Section
            ["Hero_Title_1"] = "Smart Table Reservations",
            ["Hero_Title_2"] = "Effortless, Instant & Queue-Free",
            ["Hero_Subtitle"] = "Boost table occupancy by up to 40% and eliminate no-shows. Delight guests with self-service QR code scanning and real-time floorplan availability.",
            ["Hero_Btn_Book"] = "Book a Table Now",
            ["Hero_Btn_ScanQR"] = "Open Camera / Scan QR",
            ["Hero_Btn_RestoPortal"] = "Restaurant Owner Portal",
            ["Hero_Search_Placeholder"] = "ENTER RESTAURANT OUTLET CODE OR SCAN QR",
            ["Hero_Search_Btn"] = "Open Portal",
            ["Hero_Live_Status"] = "System Live & Online",
            ["Hero_Stat_Speed"] = "Instant Confirmation",
            ["Hero_Stat_Speed_Sub"] = "Slots verified in milliseconds",
            ["Hero_Stat_Capacity"] = "Zero Double-Booking",
            ["Hero_Stat_Capacity_Sub"] = "Conflict-free mathematical slot engine",
            ["Hero_Stat_Uptime"] = "99.9% Cloud Uptime",
            ["Hero_Stat_Uptime_Sub"] = "High availability during rush hours",

            // Product Explanation
            ["Product_Badge"] = "ABOUT SIBANGKU",
            ["Product_Title"] = "All-in-One Hospitality Engine for Diners & Restaurateurs",
            ["Product_Subtitle"] = "SiBangku is engineered to eliminate endless queues, seating guesswork, and lost revenue caused by unmanaged reservations.",
            ["Product_Card_1_Tag"] = "GUEST EXPERIENCE",
            ["Product_Card_1_Title"] = "Frictionless Self-Service Booking",
            ["Product_Card_1_Desc"] = "Guests scan the tabletop acrylic QR standee using any smartphone or laptop camera, select their preferred time slot and party size, and instantly receive a verified digital pass.",
            ["Product_Card_2_Tag"] = "RESTAURANT OPS",
            ["Product_Card_2_Title"] = "Real-Time Visual Floorplan Grid",
            ["Product_Card_2_Desc"] = "Precise spatial floorplan visualization with table coordinates. Outlet staff and managers immediately see occupied, available, and reserved seating.",
            ["Product_Card_3_Tag"] = "REVENUE OPTIMIZATION",
            ["Product_Card_3_Title"] = "Autonomous 15-Minute Auto-Release",
            ["Product_Card_3_Desc"] = "An intelligent worker daemon automatically purges unconfirmed hold reservations after 15 minutes, maintaining table velocity and maximizing daily turnover.",

            // Technology Showcase
            ["Tech_Badge"] = "ENTERPRISE ARCHITECTURE",
            ["Tech_Title"] = "Engineered on a High-Speed, Scalable Digital Backbone",
            ["Tech_Subtitle"] = "Combining modern enterprise technologies to guarantee uncompromised performance for high-density culinary environments.",
            ["Tech_1_Title"] = "High-Speed C# .NET 9 Core",
            ["Tech_1_Desc"] = "Sub-millisecond reservation transactions with asynchronous concurrency built for heavy peak-hour traffic.",
            ["Tech_2_Title"] = "Isolated Multi-Tenant Physical DBs",
            ["Tech_2_Desc"] = "Each restaurant partner benefits from a physically separated database partition for absolute guest data privacy.",
            ["Tech_3_Title"] = "Cross-Device Universal QR Engine",
            ["Tech_3_Desc"] = "High-speed camera detection supporting Android, iOS, and laptop webcams seamlessly for walk-in testing.",
            ["Tech_4_Title"] = "Conflict-Free Slot Allocation",
            ["Tech_4_Desc"] = "Intelligent real-time mathematical validation strictly preventing overlapping reservations for any table.",
            ["Tech_5_Title"] = "Adaptive White-Label System",
            ["Tech_5_Desc"] = "Dynamic theme token architecture adapting colors, fonts, and branding automatically to match each restaurant.",
            ["Tech_6_Title"] = "Print-Ready Standee Kit",
            ["Tech_6_Desc"] = "Vector-sharp A4/A5 tabletop QR poster templates ready for instant printing and acrylic standee placement.",

            // How It Works
            ["How_Badge"] = "HOW IT WORKS",
            ["How_Title"] = "3 Easy Steps to Your Reserved Table",
            ["How_Subtitle"] = "A streamlined, self-guided experience with instant confirmation.",
            ["Step_1_Num"] = "01",
            ["Step_1_Title"] = "Scan QR or Enter Outlet Code",
            ["Step_1_Desc"] = "Aim your phone or laptop camera at the tabletop standee or enter the restaurant outlet code.",
            ["Step_2_Num"] = "02",
            ["Step_2_Title"] = "Choose Date & Time Slot",
            ["Step_2_Desc"] = "Select your desired visit date, party size, and view real-time open slots without conflict.",
            ["Step_3_Num"] = "03",
            ["Step_3_Title"] = "Receive Your Digital Pass",
            ["Step_3_Desc"] = "Show your verified reservation code to the restaurant reception upon your arrival.",

            // Interactive Preview Mockup
            ["Mockup_Title"] = "Interactive Table Simulation",
            ["Mockup_Subtitle"] = "Click to select a table and preview the digital reservation flow.",
            ["Mockup_Status_Available"] = "Available",
            ["Mockup_Status_Booked"] = "Occupied",
            ["Mockup_Status_Selected"] = "Selected",
            ["Mockup_Table"] = "Table",
            ["Mockup_Seats"] = "Seats",

            // CTA Section
            ["CTA_Title"] = "Ready to Modernize Your Restaurant Reservations?",
            ["CTA_Subtitle"] = "Join hundreds of dining spaces already delivering effortless, queue-free, and profitable seating experiences.",
            ["CTA_Btn_Explore"] = "Explore Guest Booking",
            ["CTA_Btn_Partner"] = "Login as Restaurant Partner",

            // Booking Portal
            ["Booking_Title_Default"] = "Self-Service Table Reservation Portal",
            ["Booking_Subtitle_Default"] = "Enter restaurant outlet code or scan tabletop QR standee to view real-time table availability",
            ["Booking_Search_Placeholder"] = "RESTAURANT CODE",
            ["Booking_Search_Btn"] = "Find Resto",
            ["Booking_Scan_Btn"] = "Scan Table QR",
            ["Booking_Active_Outlet"] = "Active Outlet",
            ["Booking_Hours"] = "Opening Hours",
            ["Booking_Slot_Duration"] = "Slot Duration",
            ["Booking_Minutes"] = "Mins",
            ["Booking_Select_Outlet_Prompt"] = "Select Restaurant Outlet",
            ["Booking_Select_Outlet_Hint"] = "Please enter the restaurant code in the field above or scan the QR Code standee available at the dining table.",
            ["Booking_Connecting"] = "Connecting to Restaurant Database...",
            ["Booking_Step1_Title"] = "Choose Date & Party Size",
            ["Booking_Date_Label"] = "Visit Date",
            ["Booking_Guests_Label"] = "Number of Guests",
            ["Booking_Guests_Suffix"] = "Guests",
            ["Booking_Slots_Title"] = "Available Time Slots:",
            ["Booking_Slot_Full"] = "Full",
            ["Booking_Slot_Tables_Count"] = "Tables",
            ["Booking_No_Slots"] = "No available slots on this date.",
            ["Booking_Step2_Title"] = "Guest Contact Information",
            ["Booking_Prompt_Select_Slot"] = "Please select an available time slot from the panel on the left.",
            ["Booking_Selected_Slot_Label"] = "SELECTED SLOT:",
            ["Booking_Name_Label"] = "Full Name",
            ["Booking_Name_Placeholder"] = "Your Full Name",
            ["Booking_Email_Label"] = "Email Address",
            ["Booking_Email_Placeholder"] = "name@email.com",
            ["Booking_Phone_Label"] = "WhatsApp / Phone Number",
            ["Booking_Phone_Placeholder"] = "+62 / 08xxxxxxxxxx",
            ["Booking_Notes_Label"] = "Special Requests (Optional)",
            ["Booking_Notes_Placeholder"] = "Special requests: window table, baby highchair, celebration, etc.",
            ["Booking_Submit_Btn"] = "Confirm & Book Table",
            ["Booking_Submitting"] = "Processing Your Reservation...",
            ["Booking_Security_Note"] = "Encrypted & synchronized directly with the outlet reservation engine.",

            // Ticket Confirmation
            ["Ticket_Success_Title"] = "Reservation Successfully Confirmed!",
            ["Ticket_Success_Desc"] = "Your official booking code is {0}. Please show this digital pass upon arrival.",
            ["Ticket_Header_Title"] = "Digital Table Reservation Ticket",
            ["Ticket_Header_Subtitle"] = "Show this ticket to the restaurant host upon arrival.",
            ["Ticket_Booking_Code"] = "BOOKING CODE",
            ["Ticket_Status_Registered"] = "Confirmed",
            ["Ticket_Restaurant"] = "Destination Restaurant",
            ["Ticket_Guest_Name"] = "Guest Name",
            ["Ticket_Date_Time"] = "Date & Time",
            ["Ticket_Guests"] = "Party Size",
            ["Ticket_Notes"] = "Special Notes:",
            ["Ticket_Btn_Print"] = "Print Ticket",
            ["Ticket_Btn_New"] = "New Reservation",
            ["Ticket_Btn_Back"] = "Back to Form",

            // Scanner Modal
            ["Scanner_Modal_Title"] = "Restaurant QR Camera Scanner",
            ["Scanner_Modal_Subtitle"] = "Point your camera at the tabletop standee or poster QR code. Supports mobile & laptop cameras.",
            ["Scanner_Camera_Label"] = "Select Camera Device:",
            ["Scanner_Scanning_Status"] = "Searching for QR Code... Ensure adequate lighting.",
            ["Scanner_Torch_Toggle"] = "Flashlight",
            ["Scanner_Flip_Camera"] = "Switch Camera",
            ["Scanner_Upload_Hint"] = "Or upload a QR code image / screenshot:",
            ["Scanner_Upload_Btn"] = "Choose Image File",
            ["Scanner_Close_Btn"] = "Close Scanner",
            ["Scanner_Success"] = "QR Detected! Redirecting to outlet...",
            ["Scanner_Permission_Denied"] = "Camera permission denied or camera device not found. Please grant camera permission in your browser or upload an image.",

            // Language Selector
            ["Lang_Modal_Title"] = "Select Language",
            ["Lang_Modal_Subtitle"] = "Choose your preferred display language",
            ["Lang_Search_Placeholder"] = "Search language... (e.g. Japanese, العربية, Français)",
            ["Lang_Available"] = "languages available",
            ["Lang_Showing"] = "Showing",
            ["Lang_Results"] = "results",
            ["Lang_No_Results"] = "No languages match your search.",
            ["Lang_Current"] = "Active",
        }
    };
}
