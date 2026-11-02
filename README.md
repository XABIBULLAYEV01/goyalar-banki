# ✦ G‘OYALAR BANKI — YANGI AVLOD TASHABBUSLARI PLATFORMASI ✦

> **Loyiha Muallifi va Bosh Koordinatori:** **Azizbek Xabibullayev**  
> **Shior:** *"Har bir g‘oya — kelajak sari qadam."*

Maktab o‘quvchilari uchun maxsus ishlab chiqilgan premium darajadagi, to‘liq ishlaydigan, 3D animatsiyali va sun’iy intellekt (Cefrbek AI) bilan qurollangan rasmiy tashabbuslar platformasi hamda iOS, Android va Windows uchun moslashtirilgan Admin Panel Ilovasi.

---

## 🌟 ASOSIY IMKONIYATLAR

### 1. 💎 Premium Dark Glassmorphism UI va 3D Banka
- **To‘q ko‘k, qora va tillarang vizual uslub:** Chuqur kosmik-midnight fon (`#080d19`), yarim shaffof glassmorphism panellar (`backdrop-filter: blur(16px)`), oltin gradientlar (`#f5cf7b` → `#d4a74b` → `#9e7328`).
- **Markazda 3D animatsiyali shaffof G‘oyalar Bankasi:** Canvas/WebGL texnologiyasida yaratilgan, sichqoncha va teginish harakatlariga sezgir 3D shisha banka. Banka ichida o‘quvchilar tomonidan yuborilgan g‘oyalarni ifodalovchi yorqin nurlar, uchqunlar va 3D zarrachalar aylanadi.

### 2. 🤖 AI Yordamchi — Cefrbek
- **Ovozli kutib olish:** Platformaga kirgan har bir o‘quvchini samimiy ovozli audio bilan qarshilaydi.
- **Ovozli va matnli muloqot:** Brauzerning Web Speech API tizimi orqali mikrofon yordamida ovozli savol berish yoki matn yozish.
- **G‘oyani avtomatik tahlil qilish:**
  1. O‘quvchi yozgan fikrni tushunib, 8 ta yo‘nalishdan eng mosini aniqlaydi.
  2. Loyihani mustahkamlash uchun **3 ta aniq amaliy taklif** beradi.
  3. G‘oya uchun jarangdor nom, muammo tavsifi, to‘liq mazmun va kutilayotgan natijani shakllantiradi.
- **1-Bosishda Formaga Ko‘chirish:** "✦ Formaga ko‘chirish" tugmasi bosilganda arizadagi barcha maydonlar avtomatik to‘ldiriladi!

### 3. 📱💻 iOS, Android va Windows Uchun Admin Panel Ilovasi (PWA)
- **Har qanday qurilmada ishlaydi:** iPhone (iOS Safari), Android (Chrome) va Windows (Edge/Chrome) da mustaqil ilova sifatida o‘rnatiladi.
- **O‘rnatish imkoniyati (Add to Home Screen):** Admin paneliga kirganda "✦ O‘rnatish" tugmasi chiqadi, telefon ekranga ilova belgisi qo‘shiladi.
- **Sensorli ekranlar uchun Kartalar (Mobile Cards) rejimi:** Telefonda ko‘p ustunli jadvalni surib o‘tirish shart emas — har bir g‘oya ixcham, chiroyli sensorli karta sifatida aks etadi va 1 ta bosishda tezkor ma'qullash yoki rad etish imkonini beradi.
- **Mobil Pastki Navigatsiya (Bottom App Bar):** iOS va Android ilovalaridek qulay boshqaruv paneli.
- **Karta / Jadval almashinuvi:** Foydalanuvchi xohishiga ko‘ra `[📱 Kartalar]` yoki `[📑 Jadval]` rejimiga o‘ta oladi.

### 4. 📝 G‘oya Yuborish Tizimi
- **O‘quvchi ma'lumotlari:** Maktab nomi, sinfi (masalan, 9-A), ismi va familiyasi.
- **G‘oya ma'lumotlari:** G‘oya nomi, yo‘nalish (8 ta rasmiy yo‘nalish), muammo tavsifi, to‘liq mazmun, kutilayotgan natija.
- **Fayl biriktirish:** Rasm va hujjatlarni (JPG, PNG, PDF, DOCX, PPTX) yuklash imkoniyati.
- **To‘liq server tekshiruvi:** Barcha majburiy maydonlar mijoz va server tomonida tekshiriladi.

### 4. 🎉 Muvaffaqiyatli Yuborilganlik Oynasi (Celebration Screen)
G‘oya serverga saqlangandan so‘ng chiroyli animatsiyali rasmiy oyna ochiladi:
> **"G‘OYANGIZ MUVAFFAQIYATLI YUBORILDI!**  
> **Sizning tashabbusingiz O‘quvchilar kengashi tomonidan ko‘rib chiqiladi.**  
> **Kelajakka qo‘shgan hissangiz uchun rahmat!"**
- Yashil tasdiqlash nishoni va nur effekti.
- G‘oya uchun noyob ID raqami (masalan: `GB-2026-9481`).
- **"📋 ID NUSXALASH"** va **"🔍 G‘OYAMNI KUZATISH"** tugmalari.

### 5. 🔍 G‘oyani Kuzatish Tizimi (Tracking)
- O‘quvchi o‘z g‘oyasining ID raqamini kiritib, real vaqtda progressni ko‘ra oladi:
  - `1-bosqich: Yuborildi`
  - `2-bosqich: O‘quvchilar kengashi ko‘rib chiqmoqda`
  - `3-bosqich: Yakuniy Xulosa: Ma‘qullandi yoki Rad etildi`
- Mas'ul koordinator tomonidan yozilgan rasmiy izoh va tavsiyalarni o‘qish mumkin.

### 6. 🌐 G‘oyalar Olami (Public Showcase)
- O‘quvchilar kengashi tomonidan ma‘qullangan eng yaxshi loyihalar ko‘rgazmasi.
- 8 ta yo‘nalish bo‘yicha filtrlar va qidiruv tizimi.
- Yoqtirish (Like) tugmasi.
- **Xavfsizlik & Maxfiylik:** Ommaviy ko‘rinishda o‘quvchilarning shaxsiy ma'lumotlari (familiyasi, maktabi, sinfi) begonalardan yashiriladi.

---

## 🔐 8 TA ALOHIDA KOORDINATOR ADMIN PANELI

Har bir yo‘nalish uchun alohida koordinator hisobi mavjud. **Server tomonida qat'iy Role-Based Access Control (RBAC)** joriy qilingan:
- **Ta'lim koordinatori** ta'lim yo'nalishidagi g'oyalarni ko'radi va ko'rib chiqadi.
- **Ekologiya koordinatori** faqat ekologiya g‘oyalarini ko‘radi va tahrirlay oladi.
- **IT koordinatori** faqat IT g‘oyalarini ko‘radi va tahrirlay oladi.
- Boshqa yo‘nalishdagi ma'lumotlarga kirish server tomonida `HTTP 403 Forbidden` xatosi bilan to‘sib qo‘yilgan!

### Koordinator imkoniyatlari:
- Har bir yo‘nalish statistikasi (Yangi kelgan, Ko‘rib chiqilmoqda, Ma‘qullangan, Rad etilgan).
- O‘quvchining to‘liq ma'lumotlari (F.I.SH, maktab, sinf).
- G‘oya holatini o‘zgartirish (`Ko‘rib chiqilmoqda`, `Ma‘qullandi`, `Rad etildi`).
- O‘quvchiga yo‘naltiruvchi rasmiy izoh yozish.
- **Excel formatida (.xlsx) hisobot yuklab olish** — zamonaviy dizayndagi rasmiy jadval.

---

## 👑 SUPER ADMIN BOSHQARUV PANELI

- Barcha 8 ta yo‘nalish g‘oyalarini to‘liq nazorat qilish va filtrlash.
- 8 ta koordinator hisobini boshqarish: yangi koordinator yaratish, o'chirish, bloklash, faollashtirish, parollarni yangilash.
- Barcha yo‘nalishlar kesimidagi batafsil statistika va diagrammalar.
- **Xavfsizlik va Faollik Jurnali (Audit Trail):** Tizimga kirishlar, status o‘zgarishlari, g‘oya topshirishlar IP manzili va vaqti bilan saqlanadi.
- Butun platforma bo‘yicha jamlanma Excel hisobotini yuklab olish.

---

## 🔑 TIZIMGA KIRISH HISOBLARI (LOGIN VA PAROLLAR)

Barcha hisoblar bazada **PBKDF2-HMAC-SHA256** orqali xeshlangan holda xavfsiz saqlangan:

| № | Hisob Turi | Foydalanuvchi nomi / Email | Parol | Mas'ul Yo‘nalish & Izoh |
|---|------------|----------------------------|-------|-------------------------|
| 1 | 👑 **Katta Asosiy Admin & Muallif** | `azizbekxabibullayev419@gmail.com` | `Azizbekkk12@` | **Loyiha Muallifi / IT va AI / Barcha yo'nalishlar (DAXSLSIZ)** |
| 2 | **Super Admin** | `admin` | `AdminPassword2026!` | Umumiy boshqaruvchi |
| 3 | **Koordinator** | `coord_talim` | `Talim2026!` | 🎓 **Ta’lim** |
| 4 | **Koordinator** | `coord_it` | `Azizbekkk12@` | 🤖 **IT va sun’iy intellekt** |
| 5 | **Koordinator** | `coord_ijtimoiy` | `Ijtimoiy2026!` | 🤝 **Ijtimoiy tashabbuslar** |
| 6 | **Koordinator** | `coord_ekologiya` | `Ekologiya2026!` | 🌱 **Ekologiya** |
| 7 | **Koordinator** | `coord_madaniyat` | `Madaniyat2026!` | 🎭 **Madaniyat** |
| 8 | **Koordinator** | `coord_media` | `Media2026!` | 🎙️ **Media** |
| 9 | **Koordinator** | `coord_sport` | `Sport2026!` | ⚡ **Sport** |
| 10 | **Koordinator** | `coord_liderlik` | `Liderlik2026!` | 👑 **Liderlik** |

*(Shuningdek, admin login oynasida "Tezkor Sinov Hisoblari" tugmalari mavjud bo‘lib, bir bosishda login-parolni kiritish mumkin).*

---

## 🚀 LOYIHANI ISHGA TUSHIRISH

Loyiha kompyuteringizda o‘rnatilgan **Python 3.13** orqali hech qanday qo‘shimcha og‘ir dasturlarsiz darhol 100% ishga tushadi:

### 1-Qadam: Terminal yoki PowerShell oching
Ushbu loyiha papkasiga kiring:
```powershell
cd "c:\Users\HP\Videos\Screen Recordings\G'oyalar banki"
```

### 2-Qadam: Serverni ishga tushiring
```powershell
python server.py
```

Terminalda quyidagi xabar paydo bo‘ladi:
```text
===========================================================
🚀 G‘OYALAR BANKI PLATFORMASI ISHGA TUSHDI!
🌐 Veb-interfeys: http://localhost:8000
👑 Super Admin: admin / AdminPassword2026!
👥 8 Koordinator hisoblari tizimda faol
===========================================================
```

### 3-Qadam: Brauzerda oching
Brauzeringizni oching va quyidagi manzilga kiring:
👉 **http://localhost:8000**

---

## 🗄️ MA'LUMOTLAR BAZASI TUZILMASI

Loyiha ma'lumotlarni doimiy saqlovchi relyatsion bazadan foydalanadi (`goyalar_banki.db`). Server qayta yoqilganda ham hech narsa yo‘qolib ketmaydi.

Jadvallar:
1. `categories` — 8 ta yo‘nalish (id, slug, name, icon, description, color)
2. `students` — O‘quvchilar (id, first_name, last_name, school, class_name, created_at)
3. `ideas` — G‘oyalar (id, tracking_code, student_id, category_id, title, problem, description, expected_result, attachment_url, status, likes_count, is_featured, created_at)
4. `admins` — Super admin va koordinatorlar (id, username, password_hash, salt, full_name, role, category_id, is_active, last_login)
5. `idea_comments` — Koordinatorlarning xulosalari (id, idea_id, admin_id, comment, created_at)
6. `activity_logs` — Tizim audit jurnali (id, admin_id, action, details, ip_address, created_at)
7. `sessions` — Xavfsiz avtorizatsiya sessiyalari (token, admin_id, created_at, expires_at)

*(Node.js va PostgreSQL uchun Prisma schema fayli `node_backend/prisma/schema.prisma` da tayyorlab qo‘yilgan).*

---

## 📁 LOYIHA PAPKALARI TUZILMASI

```text
G'oyalar banki/
├── server.py                  # Asosiy yuqori tezlikdagi ko'p oqimli REST API server
├── database.py                # Relyatsion ma'lumotlar bazasi, jadvallar va boshlang'ich ma'lumotlar
├── cefrbek_ai.py              # Cefrbek AI muloqot va tahlil mexanizmi
├── seferbek_ai.py             # Moslik uchun qayta yo'naltiruvchi modul
├── export_service.py          # Rasmiy Excel (.xlsx) hisobotlarini shakllantiruvchi modul
├── goyalar_banki.db           # Doimiy SQLite ma'lumotlar bazasi fayli
├── uploads/                   # O‘quvchilar yuklagan fayllar va rasmlar saqlanadigan xavfsiz papka
├── public/                    # Veb-ilova mijoz qismi (Frontend SPA)
│   ├── index.html             # Asosiy sahifa (Dark UI, barcha modallar va bo'limlar)
│   ├── css/
│   │   └── style.css          # Premium Dark UI dizayni, glassmorphism, responsive qoidalar
│   └── js/
│       ├── app.js             # Asosiy SPA boshqaruvchisi, formalar va sahifalar almashinuvi
│       ├── api.js             # Server bilan xavfsiz aloqa o'rnatuvchi API mijozi
│       ├── jar3d.js           # 3D shaffof banka va aylanuvchi g'oya nurlari animatsiyasi
│       ├── cefrbek.js         # Cefrbek AI ovozli va matnli muloqot boshqaruvchisi
│       ├── admin.js           # 8 Koordinator va Super Admin boshqaruv panellari (iOS/Android/Windows)
└── node_backend/              # Express.js + Prisma + PostgreSQL muqobil Node.js backend
    ├── server.js
    ├── package.json
    └── prisma/
        └── schema.prisma
```

---

## 🛡️ XAVFSIZLIK VA MAXFIYLIK KAFOLATI

1. **Parollar xavfsizligi:** Barcha parollar tasodifiy tuz (salt) bilan PBKDF2 orqali xeshlanadi.
2. **Kross-yo‘nalish blokirovkasi:** Koordinatorlar server darajasida faqat o‘z yo‘nalishlariga cheklangan. Boshqa yo‘nalishdagi ID bo‘yicha so‘rov yuborilsa, server rad etadi (`403 Forbidden`).
3. **O‘quvchilar shaxsiy ma'lumotlari himoyasi:** Ommaviy ko‘rinishda o‘quvchilarning maktabi, sinfi va familiyasi jamoatchilikka ko‘rsatilmaydi; ularni faqat vakolatli koordinatorlar ko‘ra oladi.
4. **Fayllar xavfsizligi:** Yuklanadigan fayllar kengaytmasi va hajmi qat'iy nazorat qilinadi (maksimal 15 MB).

---
© 2026 **G‘OYALAR BANKI**. Barcha huquqlar himoyalangan.
