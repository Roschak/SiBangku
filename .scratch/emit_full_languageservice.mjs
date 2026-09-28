import fs from 'fs';

const targetFile = 'D:/mydokumen/myproject/Apk_SiBangku/Apk_SiBangku/src/SiBangku.Web/Services/LanguageService.cs';
const baseDict = JSON.parse(fs.readFileSync('D:/mydokumen/myproject/Apk_SiBangku/Apk_SiBangku/.scratch/dict_id_en.json', 'utf8'));
const baseId = baseDict.id;
const baseEn = baseDict.en;

const content = fs.readFileSync('D:/mydokumen/myproject/Apk_SiBangku/Apk_SiBangku/src/SiBangku.Web/Services/LanguageService.cs', 'utf8');

function extractDict(langKey) {
  const marker = `[${langKey}] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)`;
  const idx = content.indexOf(marker);
  if (idx === -1) return {};
  const start = content.indexOf('{', idx);
  let depth = 1;
  let end = start + 1;
  while (depth > 0 && end < content.length) {
    if (content[end] === '{') depth++;
    else if (content[end] === '}') depth--;
    end++;
  }
  const block = content.substring(start + 1, end - 1);
  const dict = {};
  const re = /\["([^"]+)"\]\s*=\s*"((?:\\"|[^"])*)"/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    dict[m[1]] = m[2];
  }
  return dict;
}

const existingZh = extractDict('Chinese');
const existingRu = extractDict('Russian');
const existingDe = extractDict('German');
const existingJa = extractDict('Japanese');
const existingEs = extractDict('Spanish');
const existingFr = extractDict('French');
const existingAr = extractDict('Arabic');

// Additional keys for Chinese
const extraZh = {
    "Hero_Eyebrow": "高级餐饮预约与智能餐位管理平台",
    "Demo_Try": "演示体验:",
    "Demo_Directory": "餐厅目录",
    "Mockup_Badge": "餐厅平面图互动模拟",
    "Mockup_Title": "空间平面图与选座流程探索",
    "Mockup_Subtitle": "点击下方餐位预览空间分区、氛围感受及即时预订流程。",
    "Mockup_Main_Plan": "主餐厅平面图 — Grand Bistro",
    "Mockup_Capacity_Subtitle": "容纳人数: 24座 • 3大用餐区域",
    "Mockup_Status_Available": "空闲可用",
    "Mockup_Status_Hold": "保留15分钟",
    "Mockup_Status_Booked": "已订满",
    "Mockup_Status_Selected": "已选定",
    "Mockup_Zone_VIP": "贵宾包厢专区",
    "Mockup_Zone_Main": "中央大厅专区",
    "Mockup_Zone_Skyline": "天际露台专区",
    "Mockup_Tag_Private": "私密包间",
    "Mockup_Tag_Lobby": "大堂区域",
    "Mockup_Tag_Outdoor": "户外视野",
    "Mockup_Table": "餐桌",
    "Mockup_Seats": "座",
    "Mockup_Table_Ready": "已就绪",
    "Mockup_Table_Occupied": "已入座",
    "Mockup_Table_Hold_15m": "保留中",
    "Mockup_Table_1_Desc": "奢华软包卡座 • 6人座",
    "Mockup_Table_2_Desc": "浪漫烛光双人桌 • 2人座",
    "Mockup_Table_3_Desc": "家庭圆桌 • 4人座",
    "Mockup_Table_4_Desc": "中心优雅大桌 • 6人座",
    "Mockup_Table_5_Desc": "全景落地窗边桌 • 2人座",
    "Mockup_Table_6_Desc": "露天观景露台桌 • 4人座",
    "Mockup_Selected_Table": "当前选定餐桌",
    "Mockup_Capacity_Spend": "容纳人数与最低消费",
    "Mockup_Ambiance_Feature": "用餐氛围与特色",
    "Mockup_Book_Action": "立即预订",
    "Zone_Vip_Name": "VIP包厢",
    "Zone_Main_Name": "中央主厅",
    "Zone_Skyline_Name": "天际露台",
    "Ambiance_1": "私密尊贵、轻奢沙发、温暖琥珀吊灯",
    "Ambiance_2": "亲密浪漫烛光、双人私语空间",
    "Ambiance_3": "大厅温馨圆桌、舒适社交氛围",
    "Ambiance_4": "惬意家庭聚餐桌、邻近主通道",
    "Ambiance_5": "宽敞外窗视野、微风微醺美景",
    "Ambiance_6": "露天高空露台、璀璨城市夜景",
    "Ambiance_Default": "专属尊贵用餐体验",
    "MinSpend_Free": "免最低消费",
    "Features_Badge": "核心优势",
    "Features_Title": "专为现代餐饮业精密打造",
    "Features_Subtitle": "尖端数学算法调度，杜绝空台亏损，为宾客锁定绝佳餐位。",
    "Features_Self_Booking": "自主便捷预约",
    "Features_Self_Booking_Sub": "顾客随时自主扫码选座，无需等待人工接待。",
    "Testimonial_Quote": "“自从引入 SiBangku，我们餐厅的翻台率提升了35%以上，未到店率彻底清零，再也不用服务员在收银台手动记账。”",
    "Testimonial_Author": "Marco Santoso",
    "Testimonial_Role": "餐饮运营总监 • Grand Bistro Dining & Lounge",
    "Quick_Home": "首页",
    "Quick_Floorplan": "平面图",
    "Quick_Features": "核心优势",
    "Quick_How": "预订流程",
    "Quick_Tech": "技术架构",
    "Quick_CTA": "立即订座",
    "System_Operational": "所有系统平稳运行中",
    "System_Portals": "系统入口:",
    "Lang_Current": "当前使用",
    "Lang_Supported_Pill": "全面支持",
    "Lang_Quick_Title": "常用推荐语言:"
};

// Additional keys for Japanese
const extraJa = {
    "Hero_Eyebrow": "高級レストラン予約＆スマート座席管理プラットフォーム",
    "Demo_Try": "デモを試す:",
    "Demo_Directory": "店舗一覧",
    "Mockup_Badge": "フロアマップシミュレーション",
    "Mockup_Title": "座席マップと予約フローの体験",
    "Mockup_Subtitle": "下のテーブルをクリックして、ゾーン、雰囲気、リアルタイム予約フローを確認できます。",
    "Mockup_Main_Plan": "メインフロアマップ — Grand Bistro",
    "Mockup_Capacity_Subtitle": "収容人数: 24席 • 3つのダイニングゾーン",
    "Mockup_Status_Available": "空席",
    "Mockup_Status_Hold": "15分キープ",
    "Mockup_Status_Booked": "満席",
    "Mockup_Status_Selected": "選択中",
    "Mockup_Zone_VIP": "VIPスイートゾーン",
    "Mockup_Zone_Main": "メインダイニングホール",
    "Mockup_Zone_Skyline": "スカイラインテラス",
    "Mockup_Tag_Private": "個室",
    "Mockup_Tag_Lobby": "ロビー",
    "Mockup_Tag_Outdoor": "テラス席",
    "Mockup_Table": "テーブル",
    "Mockup_Seats": "席",
    "Mockup_Table_Ready": "準備完了",
    "Mockup_Table_Occupied": "使用中",
    "Mockup_Table_Hold_15m": "キープ中",
    "Mockup_Table_1_Desc": "上質ソファブース • 6名様",
    "Mockup_Table_2_Desc": "キャンドルライトペア席 • 2名様",
    "Mockup_Table_3_Desc": "ファミリーラウンドテーブル • 4名様",
    "Mockup_Table_4_Desc": "センターダイニング席 • 6名様",
    "Mockup_Table_5_Desc": "パノラマウィンドウ席 • 2名様",
    "Mockup_Table_6_Desc": "夜景オープンバルコニー • 4名様",
    "Mockup_Selected_Table": "選択されたテーブル",
    "Mockup_Capacity_Spend": "定員 ＆ 最低注文額",
    "Mockup_Ambiance_Feature": "雰囲気と特徴",
    "Mockup_Book_Action": "予約する",
    "Zone_Vip_Name": "VIPスイート",
    "Zone_Main_Name": "メインホール",
    "Zone_Skyline_Name": "スカイラインテラス",
    "Ambiance_1": "プライベート空間、豪華ソファ、温もりあるシャンデリア",
    "Ambiance_2": "親密なキャンドルライト、ロマンチックな2名席",
    "Ambiance_3": "フロア中央の円卓、落ち着いた社交空間",
    "Ambiance_4": "快適なファミリー席、通路アクセスの良さ",
    "Ambiance_5": "窓外の絶景ビュー、心地よいそよ風",
    "Ambiance_6": "夜景を一望できるオープンエアバルコニー",
    "Ambiance_Default": "上質で特別なダイニング体験",
    "MinSpend_Free": "最低注文なし",
    "Features_Badge": "主な強み",
    "Features_Title": "飲食業界のために精密設計された仕組み",
    "Features_Subtitle": "高度なスケジューリング数理モデルにより、二重予約を完全防止し、確実な着席を提供します。",
    "Features_Self_Booking": "セルフオーダー予約",
    "Features_Self_Booking_Sub": "スタッフを待つことなく、いつでも自由にQRコードからご予約いただけます。",
    "Testimonial_Quote": "「SiBangkuを導入して以来、テーブル回転率が35％以上向上し、無断キャンセルが自動で解消されました。」",
    "Testimonial_Author": "Marco Santoso",
    "Testimonial_Role": "F&B オペレーションディレクター • Grand Bistro Dining & Lounge",
    "Quick_Home": "ホーム",
    "Quick_Floorplan": "座席表",
    "Quick_Features": "特徴",
    "Quick_How": "ご利用手順",
    "Quick_Tech": "アーキテクチャ",
    "Quick_CTA": "今すぐ予約",
    "System_Operational": "全システム正常稼働中",
    "System_Portals": "ポータル:",
    "Lang_Current": "現在使用中",
    "Lang_Supported_Pill": "完全対応",
    "Lang_Quick_Title": "よく使われる言語:"
};

// Additional keys for French
const extraFr = {
    "Hero_Eyebrow": "Réservation Gastronomique & Gestion Intelligente des Tables",
    "Demo_Try": "Essayer la démo:",
    "Demo_Directory": "Annuaire des restaurants",
    "Mockup_Badge": "SIMULATION DE PLAN DE SALLE",
    "Mockup_Title": "Explorez le plan et le flux de sélection de table",
    "Mockup_Subtitle": "Cliquez sur une table ci-dessous pour prévisualiser le zonage, l'ambiance et la réservation directe.",
    "Mockup_Main_Plan": "Plan de Salle Principal — Grand Bistro",
    "Mockup_Capacity_Subtitle": "Capacité: 24 Couverts • 3 Espaces de Restauration",
    "Mockup_Status_Available": "Disponible",
    "Mockup_Status_Hold": "En attente 15m",
    "Mockup_Status_Booked": "Complet",
    "Mockup_Status_Selected": "Sélectionnée",
    "Mockup_Zone_VIP": "ESPACE VIP SUITE",
    "Mockup_Zone_Main": "SALLE PRINCIPALE",
    "Mockup_Zone_Skyline": "TERRASSE SKYLINE",
    "Mockup_Tag_Private": "Privé",
    "Mockup_Tag_Lobby": "Hall",
    "Mockup_Tag_Outdoor": "Extérieur",
    "Mockup_Table": "Table",
    "Mockup_Seats": "Couverts",
    "Mockup_Table_Ready": "Prête",
    "Mockup_Table_Occupied": "Occupée",
    "Mockup_Table_Hold_15m": "Réservée 15m",
    "Mockup_Table_1_Desc": "Banquette Luxe • 6 Couverts",
    "Mockup_Table_2_Desc": "Chandelle Romantique • 2 Couverts",
    "Mockup_Table_3_Desc": "Table Ronde Famille • 4 Couverts",
    "Mockup_Table_4_Desc": "Table Centrale • 6 Couverts",
    "Mockup_Table_5_Desc": "Vue Panoramique Vitrée • 2 Couverts",
    "Mockup_Table_6_Desc": "Balcon Vue Ville • 4 Couverts",
    "Mockup_Selected_Table": "TABLE SÉLECTIONNÉE",
    "Mockup_Capacity_Spend": "CAPACITÉ & COMMANDE MIN.",
    "Mockup_Ambiance_Feature": "AMBIANCE & SPÉCIFICITÉS",
    "Mockup_Book_Action": "Réserver",
    "Zone_Vip_Name": "VIP Suite",
    "Zone_Main_Name": "Salle Principale",
    "Zone_Skyline_Name": "Terrasse Skyline",
    "Ambiance_1": "Intimité absolue, banquette cossue, lustre ambré",
    "Ambiance_2": "Lumière tamisée intimiste, idéale en duo",
    "Ambiance_3": "Table ronde chaleureuse au centre de la salle",
    "Ambiance_4": "Espace familial généreux et accessible",
    "Ambiance_5": "Vue dégagée sur l'extérieur et brise agréable",
    "Ambiance_6": "Balcon aérien avec vue sur les lumières urbaines",
    "Ambiance_Default": "Ambiance gastronomique haut de gamme",
    "MinSpend_Free": "Sans commande minimum",
    "Features_Badge": "AVANTAGES CLÉS",
    "Features_Title": "Conçu avec précision pour la haute restauration",
    "Features_Subtitle": "Un moteur mathématique rigoureux qui élimine les pertes de tables et garantit un accueil sans faille.",
    "Features_Self_Booking": "Réservation Autonome",
    "Features_Self_Booking_Sub": "Vos convives réservent à tout instant sans attente téléphonique.",
    "Testimonial_Quote": "« Grâce à SiBangku, notre taux de rotation a grimpé de plus de 35 % et les no-shows ont été totalement éradiqués sans carnet manuel. »",
    "Testimonial_Author": "Marco Santoso",
    "Testimonial_Role": "Directeur des Opérations F&B • Grand Bistro Dining & Lounge",
    "Quick_Home": "Accueil",
    "Quick_Floorplan": "Plan de salle",
    "Quick_Features": "Avantages",
    "Quick_How": "Fonctionnement",
    "Quick_Tech": "Architecture",
    "Quick_CTA": "Réserver",
    "System_Operational": "Tous les systèmes sont opérationnels",
    "System_Portals": "Portails:",
    "Lang_Current": "Actif (Actuel)",
    "Lang_Supported_Pill": "Prise en charge totale",
    "Lang_Quick_Title": "Langues rapides et populaires:"
};

// Additional keys for German
const extraDe = {
    "Hero_Eyebrow": "Fine-Dining Tischreservierung & Intelligentes Raummanagement",
    "Demo_Try": "Demo testen:",
    "Demo_Directory": "Restaurantverzeichnis",
    "Mockup_Badge": "INTERAKTIVE TISCHPLAN-SIMULATION",
    "Mockup_Title": "Tischplan & Buchungsablauf erkunden",
    "Mockup_Subtitle": "Wählen Sie unten einen Tisch aus, um Raumzonen, Atmosphäre und Buchungsablauf zu erleben.",
    "Mockup_Main_Plan": "Haupt-Tischplan — Grand Bistro",
    "Mockup_Capacity_Subtitle": "Kapazität: 24 Plätze • 3 Speisebereiche",
    "Mockup_Status_Available": "Verfügbar",
    "Mockup_Status_Hold": "15 Min. reserviert",
    "Mockup_Status_Booked": "Besetzt",
    "Mockup_Status_Selected": "Ausgewählt",
    "Mockup_Zone_VIP": "VIP SUITE BEREICH",
    "Mockup_Zone_Main": "HAUPTSPEISESAAL",
    "Mockup_Zone_Skyline": "SKYLINE TERRASSE",
    "Mockup_Tag_Private": "Privat",
    "Mockup_Tag_Lobby": "Lobby",
    "Mockup_Tag_Outdoor": "Außenbereich",
    "Mockup_Table": "Tisch",
    "Mockup_Seats": "Plätze",
    "Mockup_Table_Ready": "Bereit",
    "Mockup_Table_Occupied": "Belegt",
    "Mockup_Table_Hold_15m": "Reserviert 15m",
    "Mockup_Table_1_Desc": "Luxus-Sofabox • 6 Plätze",
    "Mockup_Table_2_Desc": "Romantisches Kerzenlicht • 2 Plätze",
    "Mockup_Table_3_Desc": "Familienrundtisch • 4 Plätze",
    "Mockup_Table_4_Desc": "Zentraler Dinnertisch • 6 Plätze",
    "Mockup_Table_5_Desc": "Panoramablick am Fenster • 2 Plätze",
    "Mockup_Table_6_Desc": "Freiluftbalkon mit Stadtblick • 4 Plätze",
    "Mockup_Selected_Table": "AUSGEWÄHLTER TISCH",
    "Mockup_Capacity_Spend": "KAPAZITÄT & MINDESTVERZEHR",
    "Mockup_Ambiance_Feature": "ATMOSPHÄRE & BESONDERHEITEN",
    "Mockup_Book_Action": "Buchen",
    "Zone_Vip_Name": "VIP Suite",
    "Zone_Main_Name": "Hauptsaal",
    "Zone_Skyline_Name": "Skyline Terrasse",
    "Ambiance_1": "Maximale Privatsphäre, Edles Sofa, Warmer Bernstein-Kronleuchter",
    "Ambiance_2": "Intimes Kerzenlicht, romantischer Zweiertisch",
    "Ambiance_3": "Gemütlicher Rundtisch im Zentrum",
    "Ambiance_4": "Bequemer Familientisch mit barrierefreiem Zugang",
    "Ambiance_5": "Großes Panoramafenster mit sanfter Brise",
    "Ambiance_6": "Offener Balkon mit Blick auf die Lichter der Stadt",
    "Ambiance_Default": "Exklusives Gourmet-Ambiente",
    "MinSpend_Free": "Kein Mindestverzehr",
    "Features_Badge": "KERNVORTEILE",
    "Features_Title": "Präzise für die moderne Gastronomie entwickelt",
    "Features_Subtitle": "Mathematische Slot-Algorithmen verhindern Doppelbelegungen und sichern maximale Umsätze.",
    "Features_Self_Booking": "Autonome Gästebuchung",
    "Features_Self_Booking_Sub": "Gäste reservieren digital ohne Wartezeit auf das Personal.",
    "Testimonial_Quote": "„Mit SiBangku stieg unser Tischumsatz um über 35% und No-Shows wurden komplett beseitigt.“",
    "Testimonial_Author": "Marco Santoso",
    "Testimonial_Role": "F&B Operations Director • Grand Bistro Dining & Lounge",
    "Quick_Home": "Startseite",
    "Quick_Floorplan": "Tischplan",
    "Quick_Features": "Vorteile",
    "Quick_How": "Ablauf",
    "Quick_Tech": "Architektur",
    "Quick_CTA": "Tisch buchen",
    "System_Operational": "Alle Systeme arbeiten einwandfrei",
    "System_Portals": "Portale:",
    "Lang_Current": "Aktiv (Ausgewählt)",
    "Lang_Supported_Pill": "Vollständig unterstützt",
    "Lang_Quick_Title": "Beliebte Sofortsprachen:"
};

// Additional keys for Spanish
const extraEs = {
    "Hero_Eyebrow": "Gestión Inteligente de Mesas & Reservas Gastronómicas",
    "Demo_Try": "Probar Demo:",
    "Demo_Directory": "Directorio de Restaurantes",
    "Mockup_Badge": "SIMULACIÓN DEL PLANO DE MESAS",
    "Mockup_Title": "Explore el plano y el flujo de reserva de mesa",
    "Mockup_Subtitle": "Haga clic en una mesa a continuación para previsualizar áreas, ambiente y reserva inmediata.",
    "Mockup_Main_Plan": "Plano Principal — Grand Bistro",
    "Mockup_Capacity_Subtitle": "Capacidad: 24 Plazas • 3 Zonas de Comedor",
    "Mockup_Status_Available": "Disponible",
    "Mockup_Status_Hold": "Retenida 15m",
    "Mockup_Status_Booked": "Ocupada",
    "Mockup_Status_Selected": "Seleccionada",
    "Mockup_Zone_VIP": "ZONA VIP SUITE",
    "Mockup_Zone_Main": "SALÓN PRINCIPAL",
    "Mockup_Zone_Skyline": "TERRAZA SKYLINE",
    "Mockup_Tag_Private": "Privado",
    "Mockup_Tag_Lobby": "Vestíbulo",
    "Mockup_Tag_Outdoor": "Exterior",
    "Mockup_Table": "Mesa",
    "Mockup_Seats": "Asientos",
    "Mockup_Table_Ready": "Lista",
    "Mockup_Table_Occupied": "Ocupada",
    "Mockup_Table_Hold_15m": "Espera 15m",
    "Mockup_Table_1_Desc": "Sofá Booth de Lujo • 6 Plazas",
    "Mockup_Table_2_Desc": "Cena Romántica a la Luz de las Velas • 2 Plazas",
    "Mockup_Table_3_Desc": "Mesa Redonda Familiar • 4 Plazas",
    "Mockup_Table_4_Desc": "Mesa Central de Salón • 6 Plazas",
    "Mockup_Table_5_Desc": "Junto al Ventanal Panorámico • 2 Plazas",
    "Mockup_Table_6_Desc": "Balcón con Vistas Urbanas • 4 Plazas",
    "Mockup_Selected_Table": "MESA SELECCIONADA",
    "Mockup_Capacity_Spend": "CAPACIDAD Y CONSUMO MÍNIMO",
    "Mockup_Ambiance_Feature": "AMBIENTE Y DETALLES",
    "Mockup_Book_Action": "Reservar",
    "Zone_Vip_Name": "VIP Suite",
    "Zone_Main_Name": "Salón Principal",
    "Zone_Skyline_Name": "Terraza Skyline",
    "Ambiance_1": "Máxima privacidad, sofás premium, cálida lámpara de ámbar",
    "Ambiance_2": "Luz tenue íntima y romántica para parejas",
    "Ambiance_3": "Mesa redonda en el corazón del restaurante",
    "Ambiance_4": "Amplia mesa familiar con acceso despejado",
    "Ambiance_5": "Vistas privilegiadas al exterior con brisa agradable",
    "Ambiance_6": "Balcón abierto con vistas nocturnas de la ciudad",
    "Ambiance_Default": "Experiencia gastronómica exclusiva",
    "MinSpend_Free": "Sin consumo mínimo",
    "Features_Badge": "VENTAJAS PRINCIPALES",
    "Features_Title": "Diseñado con precisión para el sector gastronómico",
    "Features_Subtitle": "Un motor matemático que elimina mesas vacías y garantiza disponibilidad exacta para sus clientes.",
    "Features_Self_Booking": "Reserva Autoservicio",
    "Features_Self_Booking_Sub": "Sus clientes reservan al instante sin necesidad de llamar.",
    "Testimonial_Quote": "«Con SiBangku, la rotación de mesas aumentó más de un 35% y los no-shows desaparecieron sin registros manuales.»",
    "Testimonial_Author": "Marco Santoso",
    "Testimonial_Role": "Director de Operaciones F&B • Grand Bistro Dining & Lounge",
    "Quick_Home": "Inicio",
    "Quick_Floorplan": "Plano",
    "Quick_Features": "Ventajas",
    "Quick_How": "Cómo funciona",
    "Quick_Tech": "Arquitectura",
    "Quick_CTA": "Reservar",
    "System_Operational": "Todos los sistemas operativos",
    "System_Portals": "Portales:",
    "Lang_Current": "Activo (Actual)",
    "Lang_Supported_Pill": "Soporte completo",
    "Lang_Quick_Title": "Idiomas rápidos y populares:"
};

// Malay
const dictMs = Object.assign({}, baseId, {
    "Nav_Home": "Laman Utama",
    "Nav_Booking": "Tempahan Meja",
    "Nav_BookNow": "Tempah Meja",
    "Nav_RestoAdmin": "Portal Rakan Restoran",
    "Nav_ControlPlane": "Kawalan Platform",
    "Nav_Language": "Bahasa",
    "Nav_Floorplan": "Pelan Meja",
    "Nav_Features": "Kelebihan",
    "Nav_HowItWorks": "3 Langkah",
    "Nav_Tech": "Seni Bina",
    "Hero_Eyebrow": "Sistem Tempahan Meja & Pengurusan Restoran Mewah",
    "Hero_Title_1": "Tempahan Meja Restoran Pintar",
    "Hero_Title_2": "Moden, Pantas & Tanpa Barisan",
    "Hero_Subtitle": "Tingkatkan pusingan meja sehingga 40% dan hapuskan no-show. Berikan pengalaman santapan istimewa kepada pelanggan dengan imbasan QR interaktif dan pelan meja masa nyata.",
    "Hero_Btn_Book": "Tempah Meja Sekarang",
    "Hero_Btn_ScanQR": "Buka Kamera / Imbas QR",
    "Hero_Btn_RestoPortal": "Portal Pemilik Restoran",
    "Hero_Search_Placeholder": "MASUKKAN KOD OUTLET ATAU IMBAS QR",
    "Hero_Search_Btn": "Buka Portal",
    "Hero_Live_Status": "Sistem Aktif & Lancar",
    "Hero_Stat_Speed": "Pengesahan Pantas",
    "Hero_Stat_Speed_Sub": "Slot disahkan dalam beberapa milisaat",
    "Hero_Stat_Capacity": "Anti Pertindihan Tempahan",
    "Hero_Stat_Capacity_Sub": "Pengagihan meja tepat tanpa sebarang konflik",
    "Hero_Stat_Uptime": "99.9% Kebolehpercayaan",
    "Hero_Stat_Uptime_Sub": "Kesiapsiagaan operasi pada waktu puncak",
    "Demo_Try": "Cuba Demo:",
    "Demo_Directory": "Direktori",
    "Mockup_Badge": "SIMULASI PELAN MEJA RESTORAN",
    "Mockup_Title": "Eksplorasi Pelan & Aliran Pemilihan Meja",
    "Mockup_Subtitle": "Klik meja di bawah untuk melihat zon ruang, suasana santapan dan aliran tempahan terus.",
    "Mockup_Main_Plan": "Pelan Meja Utama — Grand Bistro",
    "Mockup_Capacity_Subtitle": "Kapasiti: 24 Kerusi • 3 Zon Santapan",
    "Mockup_Status_Available": "Tersedia",
    "Mockup_Status_Hold": "Tahan 15m",
    "Mockup_Status_Booked": "Penuh",
    "Mockup_Status_Selected": "Dipilih",
    "Mockup_Zone_VIP": "ZON SUITE VIP",
    "Mockup_Zone_Main": "DEWAN SANTAPAN UTAMA",
    "Mockup_Zone_Skyline": "TERAS SKYLINE",
    "Mockup_Tag_Private": "Privat",
    "Mockup_Tag_Lobby": "Lobi",
    "Mockup_Tag_Outdoor": "Terbuka",
    "Mockup_Table": "Meja",
    "Mockup_Seats": "Kerusi",
    "Mockup_Table_Ready": "Sedia",
    "Mockup_Table_Occupied": "Diduduki",
    "Mockup_Table_Hold_15m": "Ditahan",
    "Mockup_Table_1_Desc": "Sofa Booth Mewah • 6 Kerusi",
    "Mockup_Table_2_Desc": "Lilin Romantik Pasangan • 2 Kerusi",
    "Mockup_Table_3_Desc": "Meja Bulat Keluarga • 4 Kerusi",
    "Mockup_Table_4_Desc": "Santapan Tengah Dewan • 6 Kerusi",
    "Mockup_Table_5_Desc": "Sisi Tingkap Kaca • 2 Kerusi",
    "Mockup_Table_6_Desc": "Balkoni Luar Pemandangan Bandar • 4 Kerusi",
    "Mockup_Selected_Table": "MEJA DIPILIH",
    "Mockup_Capacity_Spend": "KAPASITI & MIN. PESANAN",
    "Mockup_Ambiance_Feature": "SUASANA & CIRI-CIRI",
    "Mockup_Book_Action": "Tempah",
    "Zone_Vip_Name": "VIP Suite",
    "Zone_Main_Name": "Dewan Utama",
    "Zone_Skyline_Name": "Teras Skyline",
    "Ambiance_1": "Eksklusif, Sofa Mewah, Lampu Gantung Warm Amber",
    "Ambiance_2": "Lilin Intim Romantis, Sesuai Pasangan",
    "Ambiance_3": "Meja Bulat Santai Tengah Dewan",
    "Ambiance_4": "Meja Keluarga Selesa, Akses Mudah",
    "Ambiance_5": "Pemandangan Tingkap Kaca, Angin Nyaman",
    "Ambiance_6": "Balkoni Luar Terbuka, Lampu Bandar Malam",
    "Ambiance_Default": "Suasana Santapan Eksklusif",
    "MinSpend_Free": "Tiada Pesanan Minimum",
    "Features_Badge": "KELEBIHAN UTAMA",
    "Features_Title": "Direka Khusus untuk Industri Kulinari Moden",
    "Features_Subtitle": "Asas matematik pintar yang menghapuskan kerugian restoran dan memberi kepastian tempat duduk kepada tetamu.",
    "Features_Self_Booking": "Tempahan Mandiri",
    "Features_Self_Booking_Sub": "Tetamu menempah pada bila-bila masa tanpa perlu menunggu pelayan.",
    "Testimonial_Quote": "“Dengan SiBangku, pusingan meja restoran kami meningkat lebih 35% dan masalah no-show dapat diselesaikan secara automatik tanpa buku tempahan manual.”",
    "Testimonial_Author": "Marco Santoso",
    "Testimonial_Role": "Pengarah Operasi F&B • Grand Bistro Dining & Lounge",
    "Quick_Home": "Laman Utama",
    "Quick_Floorplan": "Pelan Meja",
    "Quick_Features": "Kelebihan",
    "Quick_How": "Cara Kerja",
    "Quick_Tech": "Seni Bina",
    "Quick_CTA": "Tempah Sekarang",
    "System_Operational": "Semua sistem beroperasi lancar",
    "System_Portals": "Pintu Masuk:",
    "Lang_Modal_Title": "Pilih Bahasa",
    "Lang_Modal_Subtitle": "Pilih bahasa paparan yang anda gemari",
    "Lang_Search_Placeholder": "Cari bahasa... (cth: Melayu, English, Japanese)",
    "Lang_Available": "bahasa tersedia",
    "Lang_Showing": "Menunjukkan",
    "Lang_Results": "hasil",
    "Lang_No_Results": "Tiada bahasa yang sepadan dengan carian anda.",
    "Lang_Current": "Aktif (Sedang Digunakan)",
    "Lang_Supported_Pill": "Disokong Penuh",
    "Lang_Quick_Title": "Bahasa Pantas & Disokong:"
});

// Korean
const dictKo = Object.assign({}, baseEn, {
    "Nav_Home": "홈",
    "Nav_Booking": "테이블 예약",
    "Nav_BookNow": "예약하기",
    "Nav_RestoAdmin": "레스토랑 관리자",
    "Nav_ControlPlane": "플랫폼 제어 센터",
    "Nav_Language": "언어",
    "Nav_Floorplan": "좌석 배치도",
    "Nav_Features": "주요 기능",
    "Nav_HowItWorks": "이용 방법",
    "Nav_Tech": "기술 아키텍처",
    "Common_OpenNow": "영업 중",
    "Common_Close": "닫기",
    "Common_Cancel": "취소",
    "Common_Save": "저장",
    "Common_Confirm": "확인",
    "Common_Loading": "로딩 중...",
    "Hero_Eyebrow": "파인 다이닝 스마트 예약 및 공간 관리 솔루션",
    "Hero_Title_1": "스마트 레스토랑 테이블 예약",
    "Hero_Title_2": "모던하고 빠르며 대기 없는 예약",
    "Hero_Subtitle": "테이블 회전율을 최대 40% 향상시키고 노쇼를 방지합니다. 인터랙티브 QR 스캔과 실시간 좌석 배치도를 통해 고객에게 품격 있는 다이닝 경험을 제공합니다.",
    "Hero_Btn_Book": "지금 테이블 예약하기",
    "Hero_Btn_ScanQR": "카메라 켜기 / QR 스캔",
    "Hero_Btn_RestoPortal": "레스토랑 관리자 입장",
    "Hero_Search_Placeholder": "매장 코드 입력 또는 QR 스캔",
    "Hero_Search_Btn": "포털 접속",
    "Hero_Live_Status": "시스템 정상 운영 중",
    "Hero_Stat_Speed": "즉시 확인",
    "Hero_Stat_Speed_Sub": "밀리초 단위 실시간 슬롯 검증",
    "Hero_Stat_Capacity": "중복 예약 방지",
    "Hero_Stat_Capacity_Sub": "수학적 알고리즘을 통한 무충돌 좌석 배정",
    "Hero_Stat_Uptime": "99.9% 가동률",
    "Hero_Stat_Uptime_Sub": "피크 타임에도 안정적인 운영",
    "Demo_Try": "데모 체험:",
    "Demo_Directory": "매장 디렉터리",
    "Mockup_Badge": "레스토랑 좌석 배치 시뮬레이션",
    "Mockup_Title": "좌석 배치도 및 예약 플로우 탐색",
    "Mockup_Subtitle": "원하는 테이블을 클릭하여 구역, 분위기, 실시간 예약 절차를 확인해보세요.",
    "Mockup_Main_Plan": "메인 다이닝 배치도 — Grand Bistro",
    "Mockup_Capacity_Subtitle": "수용 인원: 24석 • 3개 다이닝 구역",
    "Mockup_Status_Available": "예약 가능",
    "Mockup_Status_Hold": "15분 홀드",
    "Mockup_Status_Booked": "예약 완료",
    "Mockup_Status_Selected": "선택됨",
    "Mockup_Zone_VIP": "VIP 스위트 구역",
    "Mockup_Zone_Main": "메인 다이닝 홀",
    "Mockup_Zone_Skyline": "스카이라인 테라스",
    "Mockup_Tag_Private": "프라이빗",
    "Mockup_Tag_Lobby": "로비",
    "Mockup_Tag_Outdoor": "야외석",
    "Mockup_Table": "테이블",
    "Mockup_Seats": "석",
    "Mockup_Table_Ready": "준비 완료",
    "Mockup_Table_Occupied": "사용 중",
    "Mockup_Table_Hold_15m": "홀드 중",
    "Mockup_Table_1_Desc": "고급 소파 부스 • 6인석",
    "Mockup_Table_2_Desc": "로맨틱 캔들라이트 • 2인석",
    "Mockup_Table_3_Desc": "패밀리 라운드 테이블 • 4인석",
    "Mockup_Table_4_Desc": "중앙 다이닝 테이블 • 6인석",
    "Mockup_Table_5_Desc": "창가 파노라마 뷰 • 2인석",
    "Mockup_Table_6_Desc": "도심 야경 오픈 발코니 • 4인석",
    "Mockup_Selected_Table": "선택된 테이블",
    "Mockup_Capacity_Spend": "인원 및 최소 주문금액",
    "Mockup_Ambiance_Feature": "분위기 및 특징",
    "Mockup_Book_Action": "예약하기",
    "Zone_Vip_Name": "VIP 스위트",
    "Zone_Main_Name": "메인 홀",
    "Zone_Skyline_Name": "스카이라인 테라스",
    "Ambiance_1": "프라이빗하고 럭셔리한 소파와 은은한 앰버 샹들리에",
    "Ambiance_2": "로맨틱한 캔들라이트 분위기의 연인석",
    "Ambiance_3": "여유로운 대화가 가능한 중앙 원형 테이블",
    "Ambiance_4": "가족 모임에 적합한 안락한 테이블",
    "Ambiance_5": "창밖 전경과 시원한 바람이 머무는 뷰",
    "Ambiance_6": "도심 야경이 한눈에 들어오는 야외 발코니",
    "Ambiance_Default": "품격 있는 다이닝 분위기",
    "MinSpend_Free": "최소 주문금액 없음",
    "Features_Badge": "핵심 경쟁력",
    "Features_Title": "외식 산업을 위해 정밀하게 설계된 엔진",
    "Features_Subtitle": "첨단 수학 알고리즘을 통해 매장의 손실을 막고 고객에게 확정된 좌석을 보장합니다.",
    "Features_Self_Booking": "고객 셀프 예약",
    "Features_Self_Booking_Sub": "직원을 기다릴 필요 없이 언제 어디서나 바로 예약할 수 있습니다.",
    "Testimonial_Quote": "“SiBangku 도입 후 테이블 회전율이 35% 이상 증가했고, 수기 장부 없이도 노쇼가 완벽히 차단되었습니다.”",
    "Testimonial_Author": "Marco Santoso",
    "Testimonial_Role": "F&B 총괄 디렉터 • Grand Bistro Dining & Lounge",
    "Quick_Home": "홈",
    "Quick_Floorplan": "배치도",
    "Quick_Features": "특징",
    "Quick_How": "이용방법",
    "Quick_Tech": "기술스택",
    "Quick_CTA": "예약하기",
    "System_Operational": "모든 시스템 정상 가동 중",
    "System_Portals": "포털:",
    "Lang_Modal_Title": "언어 선택",
    "Lang_Modal_Subtitle": "원하시는 표시 언어를 선택해주세요",
    "Lang_Search_Placeholder": "언어 검색... (예: 한국어, English, 日本語)",
    "Lang_Available": "개 언어 지원",
    "Lang_Showing": "표시 중",
    "Lang_Results": "개 결과",
    "Lang_No_Results": "검색된 언어가 없습니다.",
    "Lang_Current": "현재 사용 중",
    "Lang_Supported_Pill": "완벽 지원",
    "Lang_Quick_Title": "추천 주요 언어:"
});

// Javanese
const dictJv = Object.assign({}, baseId, {
    "Nav_Home": "Kaca Utama",
    "Nav_Booking": "Pesen Meja",
    "Nav_BookNow": "Pesen Saiki",
    "Nav_RestoAdmin": "Portal Mitra Resto",
    "Nav_ControlPlane": "Kontrol Sistem",
    "Nav_Language": "Basa",
    "Nav_Floorplan": "Peta Meja",
    "Nav_Features": "Kaluwihan",
    "Nav_HowItWorks": "3 Lampah",
    "Nav_Tech": "Arsitektur",
    "Hero_Eyebrow": "Sistem Reservasi Meja & Manajemen Restoran Mewah",
    "Hero_Title_1": "Pesen Meja Restoran",
    "Hero_Title_2": "Modern, Gampang & Tanpa Antri",
    "Hero_Subtitle": "Undhakake peputeran meja nganti 40% lan ilangake no-show. Paringi pengalaman mangan sing istimewa kanthi scan QR interaktif lan peta meja langsung.",
    "Hero_Btn_Book": "Pesen Meja Saiki",
    "Hero_Btn_ScanQR": "Bukak Kamera / Scan QR",
    "Hero_Btn_RestoPortal": "Portal Juragan Resto",
    "Mockup_Badge": "SIMULASI PETA MEJA",
    "Mockup_Title": "Eksplorasi Peta Meja & Alur Pesenan",
    "Mockup_Subtitle": "Pencet meja ing ngisor kanggo ndeleng zona, suasana, lan cara pesen langsung.",
    "Mockup_Main_Plan": "Peta Meja Utama — Grand Bistro",
    "Mockup_Status_Available": "Kasedhiya",
    "Mockup_Status_Hold": "Ditahan 15m",
    "Mockup_Status_Booked": "Kebak",
    "Mockup_Status_Selected": "Dipilih",
    "Mockup_Table": "Meja",
    "Mockup_Seats": "Kursi",
    "Mockup_Table_Ready": "Siap",
    "Mockup_Table_Occupied": "Dienggo",
    "Mockup_Selected_Table": "MEJA DIPILIH",
    "Mockup_Capacity_Spend": "KAPASITAS & MIN. PESENAN",
    "Mockup_Ambiance_Feature": "SUASANA & FITUR",
    "Mockup_Book_Action": "Pesen",
    "Features_Badge": "KALUWIHAN UTAMA",
    "Features_Title": "Dirancang Presisi kanggo Bisnis Kuliner",
    "Features_Self_Booking": "Reservasi Mandiri",
    "Features_Self_Booking_Sub": "Tamu bisa pesen kapan wae tanpa kudu ngenteni pelayan.",
    "Lang_Current": "Aktif (Digunakake)",
    "Lang_Supported_Pill": "Didhukung Lengkap",
    "Lang_Quick_Title": "Basa Populer:"
});

// Sundanese
const dictSu = Object.assign({}, baseId, {
    "Nav_Home": "Tepas",
    "Nav_Booking": "Pesen Meja",
    "Nav_BookNow": "Pesen Ayeuna",
    "Nav_RestoAdmin": "Portal Mitra Resto",
    "Nav_ControlPlane": "Kontrol Sistem",
    "Nav_Language": "Basa",
    "Nav_Floorplan": "Peta Meja",
    "Nav_Features": "Kunggulan",
    "Nav_HowItWorks": "3 Léngkah",
    "Nav_Tech": "Arsitéktur",
    "Hero_Eyebrow": "Sistem Reservasi Meja & Manajemen Réstoran Mewah",
    "Hero_Title_1": "Reservasi Meja Réstoran",
    "Hero_Title_2": "Modérn, Gancang & Teu Kedah Ngantri",
    "Hero_Subtitle": "Ningkatkeun puteran meja dugi ka 40% sareng ngaleungitkeun no-show. Pasihan pangalaman tuang anu mirasa kalayan scan QR interaktif sareng denah meja real-time.",
    "Hero_Btn_Book": "Pesen Meja Ayeuna",
    "Hero_Btn_ScanQR": "Buka Kaméra / Scan QR",
    "Hero_Btn_RestoPortal": "Portal Nu Gaduh Resto",
    "Mockup_Badge": "SIMULASI DENAH RÉSTORAN",
    "Mockup_Title": "Eksplorasi Denah & Alur Milih Meja",
    "Mockup_Subtitle": "Klik meja di handap kanggo ningal zona, suasana, sareng alur pesenan langsung.",
    "Mockup_Main_Plan": "Denah Meja Utama — Grand Bistro",
    "Mockup_Status_Available": "Sadia",
    "Mockup_Status_Hold": "Ditahan 15m",
    "Mockup_Status_Booked": "Pinuh",
    "Mockup_Status_Selected": "Dipilih",
    "Mockup_Table": "Meja",
    "Mockup_Seats": "Korsi",
    "Mockup_Table_Ready": "Siap",
    "Mockup_Table_Occupied": "Nuju Dianggo",
    "Mockup_Selected_Table": "MEJA KAPILIH",
    "Mockup_Capacity_Spend": "KAPASITAS & MIN. PESENAN",
    "Mockup_Ambiance_Feature": "SUASANA & CIRI",
    "Mockup_Book_Action": "Pesen",
    "Features_Badge": "KUNGGULAN UTAMA",
    "Features_Title": "Dirancang Husus kanggo Usaha Kuliner",
    "Features_Self_Booking": "Reservasi Mandiri",
    "Features_Self_Booking_Sub": "Tamu tiasa pesen iraha waé tanpa kedah ngantosan staf.",
    "Lang_Current": "Aktif (Keur Dianggo)",
    "Lang_Supported_Pill": "Dirojong Pinuh",
    "Lang_Quick_Title": "Basa Populer:"
});

// All dictionaries merged
const dicts = {
    id: Object.assign({}, baseId),
    en: Object.assign({}, baseEn),
    ms: dictMs,
    jv: dictJv,
    su: dictSu,
    zh: Object.assign({}, baseEn, existingZh, extraZh),
    ja: Object.assign({}, baseEn, existingJa, extraJa),
    ko: dictKo,
    fr: Object.assign({}, baseEn, existingFr, extraFr),
    de: Object.assign({}, baseEn, existingDe, extraDe),
    es: Object.assign({}, baseEn, existingEs, extraEs),
    ru: Object.assign({}, baseEn, existingRu, { "Lang_Current": "Активен (Текущий)", "Mockup_Badge": "СХЕМА ЗАЛА РЕСТОРАНА", "Mockup_Title": "Схема зала и выбор столика", "Demo_Try": "Демо:", "Demo_Directory": "Каталог" }),
    ar: Object.assign({}, baseEn, existingAr, { "Lang_Current": "الحالي (قيد الاستخدام)", "Mockup_Badge": "محاكاة مخطط الطاولات", "Mockup_Title": "استكشاف المخطط وحجز الطاولة", "Demo_Try": "تجربة:", "Demo_Directory": "دليل المطاعم" })
};

// Build C# code
function escapeCSharp(str) {
    if (!str) return "";
    return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, '').replace(/\n/g, '\\n');
}

function renderDict(dict) {
    const lines = [];
    for (const [k, v] of Object.entries(dict)) {
        lines.push(`            ["${k}"] = "${escapeCSharp(v)}",`);
    }
    return lines.join('\n');
}

// Generate the whole LanguageService.cs
const out = `using System;
using System.Collections.Generic;
using System.Linq;

namespace SiBangku.Web.Services;

public record LanguageInfo(string Code, string NativeName, string EnglishName, string Region, bool IsRtl = false, bool IsFullySupported = false);

public class LanguageService
{
    public const string Indonesian = "id";
    public const string English = "en";
    public const string Malay = "ms";
    public const string Javanese = "jv";
    public const string Sundanese = "su";
    public const string Chinese = "zh";
    public const string Russian = "ru";
    public const string German = "de";
    public const string Japanese = "ja";
    public const string Korean = "ko";
    public const string Spanish = "es";
    public const string French = "fr";
    public const string Arabic = "ar";

    public string CurrentLanguage { get; private set; } = Indonesian;

    public event Action? OnLanguageChanged;

    private static readonly List<LanguageInfo> _languages = new()
    {
        // Southeast Asia
        new("id", "Indonesia", "Indonesian", "Southeast Asia", IsFullySupported: true),
        new("ms", "Bahasa Melayu", "Malay", "Southeast Asia", IsFullySupported: true),
        new("jv", "Basa Jawa", "Javanese", "Southeast Asia", IsFullySupported: true),
        new("su", "Basa Sunda", "Sundanese", "Southeast Asia", IsFullySupported: true),
        new("fil", "Filipino", "Filipino", "Southeast Asia"),
        new("tl", "Tagalog", "Tagalog", "Southeast Asia"),
        new("vi", "Tiếng Việt", "Vietnamese", "Southeast Asia"),
        new("th", "ไทย", "Thai", "Southeast Asia"),
        new("my", "မြန်မာ", "Burmese", "Southeast Asia"),
        new("km", "ភាសាខ្មែរ", "Khmer", "Southeast Asia"),
        new("lo", "ລາວ", "Lao", "Southeast Asia"),

        // East Asia
        new("zh", "中文", "Chinese (Simplified)", "East Asia", IsFullySupported: true),
        new("zh-TW", "繁體中文", "Chinese (Traditional)", "East Asia"),
        new("ja", "日本語", "Japanese", "East Asia", IsFullySupported: true),
        new("ko", "한국어", "Korean", "East Asia", IsFullySupported: true),
        new("mn", "Монгол", "Mongolian", "East Asia"),

        // Middle East & South Asia
        new("ar", "العربية", "Arabic", "Middle East", IsRtl: true, IsFullySupported: true),
        new("fa", "فارسی", "Persian", "Middle East", IsRtl: true),
        new("he", "עברית", "Hebrew", "Middle East", IsRtl: true),
        new("tr", "Türkçe", "Turkish", "Middle East"),
        new("hi", "हिन्दी", "Hindi", "South Asia"),
        new("bn", "বাংলা", "Bengali", "South Asia"),
        new("ur", "اردو", "Urdu", "South Asia", IsRtl: true),

        // Europe (Western)
        new("en", "English", "English", "Europe", IsFullySupported: true),
        new("fr", "Français", "French", "Europe", IsFullySupported: true),
        new("de", "Deutsch", "German", "Europe", IsFullySupported: true),
        new("es", "Español", "Spanish", "Europe", IsFullySupported: true),
        new("pt", "Português", "Portuguese", "Europe"),
        new("it", "Italiano", "Italian", "Europe"),
        new("nl", "Nederlands", "Dutch", "Europe"),

        // Europe (Eastern)
        new("ru", "Русский", "Russian", "Europe", IsFullySupported: true),
        new("pl", "Polski", "Polish", "Europe"),
        new("uk", "Українська", "Ukrainian", "Europe")
    };

    private static readonly HashSet<string> _supportedCodes =
        new(_languages.Select(l => l.Code), StringComparer.OrdinalIgnoreCase);

    public static IReadOnlyList<LanguageInfo> AvailableLanguages => _languages;

    public static IReadOnlyList<LanguageInfo> SupportedLanguages =>
        _languages.Where(l => l.IsFullySupported || Translations.ContainsKey(l.Code)).ToList();

    public static bool IsSupported(string code) =>
        Translations.ContainsKey(code);

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

    private static readonly Dictionary<string, Dictionary<string, string>> Translations = new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase)
    {
        [Indonesian] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.id)}
        },

        [English] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.en)}
        },

        [Malay] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.ms)}
        },

        [Javanese] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.jv)}
        },

        [Sundanese] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.su)}
        },

        [Chinese] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.zh)}
        },

        [Japanese] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.ja)}
        },

        [Korean] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.ko)}
        },

        [French] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.fr)}
        },

        [German] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.de)}
        },

        [Spanish] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.es)}
        },

        [Russian] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.ru)}
        },

        [Arabic] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
${renderDict(dicts.ar)}
        }
    };
}
`;

fs.writeFileSync(targetFile, out, 'utf8');
console.log("Successfully wrote updated LanguageService.cs!");
