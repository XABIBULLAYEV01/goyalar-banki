import sqlite3
import os
import sys
import hashlib
import secrets
from datetime import datetime

if getattr(sys, 'frozen', False):
    DB_DIR = os.path.dirname(sys.executable)
else:
    DB_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.path.join(DB_DIR, "goyalar_banki.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    """Hash password using PBKDF2-HMAC-SHA256 with cryptographic salt."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return hashed, salt

def verify_password(password: str, hashed: str, salt: str) -> bool:
    new_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(new_hash, hashed)

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Categories table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        description TEXT NOT NULL,
        color TEXT NOT NULL
    );
    """)

    # 2. Students table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        school TEXT NOT NULL,
        class_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Admins table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL, -- 'super_admin' or 'coordinator'
        category_id INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    """)

    # 4. Ideas table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ideas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracking_code TEXT UNIQUE NOT NULL,
        student_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        problem TEXT NOT NULL,
        description TEXT NOT NULL,
        expected_result TEXT NOT NULL,
        attachment_url TEXT,
        attachment_name TEXT,
        status TEXT DEFAULT 'Ko‘rib chiqilmoqda',
        likes_count INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    """)

    # 5. Idea comments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS idea_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idea_id INTEGER NOT NULL,
        admin_id INTEGER NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES admins(id)
    );
    """)

    # 6. Activity logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        ip_address TEXT DEFAULT '127.0.0.1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES admins(id)
    );
    """)

    # 7. Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        admin_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    );
    """)

    # Seed Categories
    categories_data = [
        ("ijtimoiy", "Ijtimoiy tashabbuslar", "🤝", "Maktab va jamoat hayotini yaxshilash, xayriya va o'zaro ko'mak loyihalari", "#4ade80"),
        ("ekologiya", "Ekologiya", "🌱", "Tabiatni asrash, maktabni ko'kalamzorlashtirish, qayta ishlash tashabbuslari", "#22c55e"),
        ("it", "IT va sun’iy intellekt", "🤖", "Dasturiy ta'minot, sun'iy intellekt, robototexnika va raqamli innovatsiyalar", "#38bdf8"),
        ("talim", "Ta’lim", "🎓", "Ta'lim sifatini oshirish, yangi o'qitish metodikalari, fan to'garaklari va olimpiada tashabbuslari", "#0284c7"),
        ("madaniyat", "Madaniyat", "🎭", "San'at, teatr, adabiyot, musiqa va milliy qadriyatlarni targ'ib qilish", "#f43f5e"),
        ("media", "Media", "🎙️", "Maktab radiosi, gazeta, podkast, video-blog va axborot loyihalari", "#a855f7"),
        ("sport", "Sport", "⚡", "Sog'lom turmush tarzi, maktab sport musobaqalari va to'garaklar", "#f97316"),
        ("liderlik", "Liderlik", "👑", "Yoshlar yetakchiligi, o'z-o'zini boshqarish va jamoaviy ko'nikmalar", "#eab308"),
    ]

    for slug, name, icon, desc, color in categories_data:
        cursor.execute("""
        INSERT OR IGNORE INTO categories (slug, name, icon, description, color)
        VALUES (?, ?, ?, ?, ?)
        """, (slug, name, icon, desc, color))

    # Seed / Update Primary Super Admin (Azizbek Xabibullayev)
    cursor.execute("SELECT id FROM admins WHERE username = 'azizbekxabibullayev419@gmail.com'")
    existing_azizbek = cursor.fetchone()
    pwd_hash, salt = hash_password("Azizbekkk12@")
    if not existing_azizbek:
        cursor.execute("""
        INSERT INTO admins (username, password_hash, salt, full_name, role, category_id, is_active)
        VALUES (?, ?, ?, ?, 'super_admin', 3, 1)
        """, ('azizbekxabibullayev419@gmail.com', pwd_hash, salt, 'Azizbek Xabibullayev (Loyiha Muallifi va Bosh Admin / IT & AI)'))
    else:
        cursor.execute("""
        UPDATE admins SET password_hash = ?, salt = ?, is_active = 1, role = 'super_admin', category_id = 3, full_name = 'Azizbek Xabibullayev (Loyiha Muallifi va Bosh Admin / IT & AI)'
        WHERE username = 'azizbekxabibullayev419@gmail.com'
        """, (pwd_hash, salt))

    # Also keep fallback admin for tests if needed
    cursor.execute("SELECT id FROM admins WHERE username = 'admin'")
    if not cursor.fetchone():
        pwd_hash, salt = hash_password("AdminPassword2026!")
        cursor.execute("""
        INSERT INTO admins (username, password_hash, salt, full_name, role, category_id)
        VALUES (?, ?, ?, ?, 'super_admin', NULL)
        """, ('admin', pwd_hash, salt, 'Bosh Boshqaruvchi (Super Admin)'))

    # Seed Coordinators (including Ta'lim koordinatori)
    coordinators_seed = [
        ("coord_ijtimoiy", "Ijtimoiy2026!", "Azizbek Rahimov", "ijtimoiy"),
        ("coord_ekologiya", "Ekologiya2026!", "Nargiza Karimova", "ekologiya"),
        ("coord_it", "Azizbekkk12@", "Azizbek Xabibullayev", "it"),
        ("coord_talim", "Talim2026!", "Nilufar Oripova (Ta'lim Koordinatori)", "talim"),
        ("coord_madaniyat", "Madaniyat2026!", "Shahlo Yusupova", "madaniyat"),
        ("coord_media", "Media2026!", "Behzod Aliyev", "media"),
        ("coord_sport", "Sport2026!", "Timur Sobirov", "sport"),
        ("coord_liderlik", "Liderlik2026!", "Malika Saidova", "liderlik"),
    ]

    for username, password, full_name, cat_slug in coordinators_seed:
        cursor.execute("SELECT id FROM admins WHERE username = ?", (username,))
        if not cursor.fetchone():
            cursor.execute("SELECT id FROM categories WHERE slug = ?", (cat_slug,))
            cat_row = cursor.fetchone()
            cat_id = cat_row['id'] if cat_row else None
            pwd_hash, salt = hash_password(password)
            cursor.execute("""
            INSERT INTO admins (username, password_hash, salt, full_name, role, category_id)
            VALUES (?, ?, ?, ?, 'coordinator', ?)
            """, (username, pwd_hash, salt, full_name, cat_id))

    # Seed initial ideas if empty so the portal looks rich and alive
    cursor.execute("SELECT COUNT(*) as count FROM ideas")
    if cursor.fetchone()['count'] == 0:
        seed_samples = [
            ("Ali", "Valiyev", "Toshkent shahar 178-maktab", "10-A", "it",
             "Maktab AI Kutubxonasi", "Kitoblarni tez topish va o'quvchilarga mos tavsiyalar beruvchi tizim yo'q",
             "Sun'iy intellektga asoslangan qidiruv va tavsiya beruvchi telegram-bot hamda veb-katalog ishlab chiqish.",
             "Maktab kutubxonasiga a'zo o'quvchilar soni 60% ga ortadi, kitobxonlik madaniyati yuksaladi.",
             "Ma‘qullandi", 1, 15, "GB-2026-1001"),

            ("Zarina", "Usmonova", "Samarqand shahar 42-maktab", "9-B", "ekologiya",
             "Yashil Maktab va Eko-Burchak", "Maktab hududida chiqindilarni alohida yig'ish va ko'kalamzorlashtirish yetarli emas",
             "Plastik va qog'oz uchun maxsus qutilar o'rnatish, quyosh energiyasida ishlovchi gul sug'orish tizimi yaratish.",
             "Har oy 200 kg plastik qayta ishlashga topshiriladi, maktab hovlisi zamonaviy ekologik bog'ga aylanadi.",
             "Ma‘qullandi", 1, 24, "GB-2026-1002"),

            ("Otabek", "Rustamov", "Farg'ona viloyati 14-maktab", "11-V", "liderlik",
             "O'quvchilar Parlamenti va Debate Klubi", "O'quvchilarda nutq so'zlash va tanqidiy fikrlash ko'nikmalari yetarli emas",
             "Haftalik Karl Popper va Britaniya parlamenti formatidagi munozaralar tashkil etish, yosh yetakchilarni tayyorlash.",
             "Maktab o'quvchilari respublika va xalqaro tanlovlarda g'olib bo'lish imkoniyatiga ega bo'ladilar.",
             "Ko‘rib chiqilmoqda", 0, 8, "GB-2026-1003"),

            ("Madina", "Xolmatova", "Buxoro shahar 5-maktab", "8-G", "madaniyat",
             "O'zbek Milliy San'ati VR Muzeyi", "O'quvchilar qadimiy obidalar va muzeylarga har doim ham bora olishmaydi",
             "O'zbekistonning mashhur me'moriy yodgorliklarini 3D va VR ko'zoynaklarda ko'rish imkonini beruvchi burchak yaratish.",
             "Tarix darslari 3 barobar qiziqarli o'tadi, yoshlarda milliy merosga hurmat oshadi.",
             "Ma‘qullandi", 1, 19, "GB-2026-1004"),

            ("Javohir", "Qodirov", "Namangan shahar 2-maktab", "10-B", "sport",
             "Tanaffusda 5 daqiqa gimnastika", "Uzoq darslar davomida o'quvchilar charchab, diqqati pasaymoqda",
             "Katta tanaffusda audio-yo'riqnoma bilan ritmik va yengil badantarbiya mashg'ulotlarini yo'lga qo'yish.",
             "O'quvchilarning darsdagi faolligi va sog'lom turmush tarzi ko'rsatkichi yaxshilanadi.",
             "Ko‘rib chiqilmoqda", 0, 11, "GB-2026-1005"),

            ("Dilnoza", "Akramova", "Andijon shahar 30-maktab", "9-A", "media",
             "Maktab Podkast Studiyasi: Yoshlar Ovozi", "Maktabdagi qobiliyatli yoshlar va yangiliklar yetarlicha yoritilmaydi",
             "O'quvchilar tomonidan olib boriladigan haftalik video va audio podkastlar tayyorlash.",
             "Iste'dodli jurnalist va spikerlar kashf etiladi, o'quvchilar hayoti jonli yoritiladi.",
             "Ma‘qullandi", 1, 31, "GB-2026-1006"),

            ("Sardor", "Nematov", "Toshkent viloyati 3-maktab", "11-A", "ijtimoiy",
             "Katta Qadam: Tengdosh Tengdoshga Ustoz", "Qiyin fanlardan qiynalayotgan kichik sinf o'quvchilariga qo'shimcha yordam kerak",
             "Yuqori sinf iqtidorli o'quvchilari kichik sinflarga bepul bevosita darsdan so'ng repetitorlik qilish tizimi.",
             "Maktabda o'zlashtirish darajasi 25% ga oshadi va do'stona muhit shakllanadi.",
             "Ko‘rib chiqilmoqda", 0, 14, "GB-2026-1007"),

            ("Diyor", "Sultonov", "Buxoro shahar 1-IDUM", "11-A", "talim",
             "Interaktiv Fan To'garaklari va Olimpia Mentorlik", "Murakkab fanlarni chuqurlashtirilgan o'rganish va olimpiadaga tayyorgarlik uchun tizimli platforma kerak",
             "Maktabda iqtidorli o'quvchilar va tajribali ustozlar hamkorligida doimiy ishlovchi fan to'garaklari tarmog'ini yo'lga qo'yish.",
             "Maktab o'quvchilarining fan olimpiadalari va xalqaro tanlovlardagi g'oliblik ko'rsatkichi 45% ga oshadi.",
             "Ma‘qullandi", 1, 24, "GB-2026-1008"),
        ]

        for fname, lname, school, sclass, cslug, title, prob, desc, exp, status, feat, likes, code in seed_samples:
            cursor.execute("""
            INSERT INTO students (first_name, last_name, school, class_name)
            VALUES (?, ?, ?, ?)
            """, (fname, lname, school, sclass))
            student_id = cursor.lastrowid

            cursor.execute("SELECT id FROM categories WHERE slug = ?", (cslug,))
            cat_id = cursor.fetchone()['id']

            cursor.execute("""
            INSERT INTO ideas (tracking_code, student_id, category_id, title, problem, description, expected_result, status, is_featured, likes_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (code, student_id, cat_id, title, prob, desc, exp, status, feat, likes))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully!")
