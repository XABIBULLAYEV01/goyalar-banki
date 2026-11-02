import os
import re
import json
import urllib.request
import urllib.error

CATEGORIES_MAP = [
    {
        "id": 1,
        "slug": "ijtimoiy",
        "name": "Ijtimoiy tashabbuslar",
        "keywords": ["ijtimoiy", "xayriya", "yordam", "yetim", "kengash", "mehr", "maktabdosh", "ustoz", "tengdosh", "bepul", "ko'mak", "inklyuziv", "hamkorlik"]
    },
    {
        "id": 2,
        "slug": "ekologiya",
        "name": "Ekologiya",
        "keywords": ["ekologiya", "yashil", "daraxt", "ko'chat", "suv", "chiqindi", "plastik", "tabiat", "eko", "qayta ishlash", "havo", "energiya", "quyosh"]
    },
    {
        "id": 3,
        "slug": "it",
        "name": "IT va sun’iy intellekt",
        "keywords": ["it", "dastur", "sun'iy intellekt", "ai", "bot", "sayt", "veb", "mobil", "robot", "algoritm", "kod", "telegram", "kompyuter", "texnologiya"]
    },
    {
        "id": 4,
        "slug": "madaniyat",
        "name": "Madaniyat",
        "keywords": ["madaniyat", "san'at", "teatr", "musiqa", "adabiyot", "kitob", "muzey", "tarix", "she'r", "milliy", "meros", "rassom", "hunarmandchilik"]
    },
    {
        "id": 5,
        "slug": "media",
        "name": "Media",
        "keywords": ["media", "radio", "gazeta", "jurnal", "video", "podkast", "blog", "intervyu", "yangilik", "foto", "ijtimoiy tarmoq", "montaj", "ovoz"]
    },
    {
        "id": 6,
        "slug": "sport",
        "name": "Sport",
        "keywords": ["sport", "futbol", "shaxmat", "basketbol", "turnir", "gimnastika", "yugurish", "marafon", "badantarbiya", "salomatlik", "musobaqa", "fitnes"]
    },
    {
        "id": 7,
        "slug": "liderlik",
        "name": "Liderlik",
        "keywords": ["liderlik", "yetakchi", "sardor", "munozara", "parlament", "boshqaruv", "notiq", "jamoa", "kengash", "reja", "maqsad", "strategiya", "tashabbus"]
    },
    {
        "id": 8,
        "slug": "talim",
        "name": "Ta’lim",
        "keywords": ["ta'lim", "talim", "dars", "o'qituvchi", "maktab", "fan", "repetitor", "olimpiada", "imtihon", "bilim", "kurs", "mashg'ulot", "o'qish", "savodxonlik", "metodika"]
    }
]

class CefrbekAI:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "")

    def get_welcome_message(self):
        return {
            "text": "Assalomu alaykum! Men Cefrbek — sening sun’iy intellekt yordamchingman. Kelajakni o‘zgartiruvchi qanday ajoyib g‘oyangiz bor? Uni birgalikda mukammallashtirib, 'G‘oyalar Banki'ga topshirishga yordam beraman!",
            "voice_text": "Assalomu alaykum! Men Cefrbek, sening AI yordamchingman. Bugun qanday ajoyib g‘oya bilan kelding?"
        }

    def detect_category(self, text: str) -> dict:
        text_lower = text.lower()
        best_cat = CATEGORIES_MAP[0] # Default
        max_matches = 0

        for cat in CATEGORIES_MAP:
            matches = sum(1 for kw in cat["keywords"] if kw in text_lower)
            if matches > max_matches:
                max_matches = matches
                best_cat = cat

        return best_cat

    def analyze_and_respond(self, user_text: str, history: list = None) -> dict:
        """Analyze student's idea, categorize, refine and suggest improvements."""
        # Check if OpenAI API key is configured
        if self.api_key:
            try:
                prompt = f"""
                Sen "G'oyalar Banki" platformasining AI yordamchisi Cefrbeksan.
                O'quvchi senga o'z g'oyasi yoki fikrini yozdi:
                "{user_text}"

                Vazifang:
                1. Samimiy va rag'batlantiruvchi qisqa muloqot matni.
                2. G'oyaning qaysi yo'nalishga (Ijtimoiy tashabbuslar, Ekologiya, IT va sun'iy intellekt, Ta’lim, Madaniyat, Media, Sport, Liderlik) tegishli ekanini aniqlash.
                3. G'oyani yaxshilash bo'yicha 3 ta aniq amaliy taklif berish.
                4. Quyidagi JSON formatida javob qaytar:
                {{
                  "reply": "samimiy javob matni",
                  "detected_category": "yo'nalish nomi",
                  "category_slug": "slug (ijtimoiy, ekologiya, it, talim, madaniyat, media, sport, liderlik)",
                  "structured_idea": {{
                     "title": "G'oya uchun jarangdor nom",
                     "problem": "Muammo ifodasi",
                     "description": "G'oyaning kengaytirilgan va mukammal tavsifi",
                     "expected_result": "Kutilayotgan aniq natijalar"
                  }},
                  "improvements": [
                     "1-taklif",
                     "2-taklif",
                     "3-taklif"
                  ]
                }}
                Faqat sof JSON qaytar.
                """
                payload = json.dumps({
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7
                }).encode("utf-8")

                req = urllib.request.Request(
                    "https://api.openai.com/v1/chat/completions",
                    data=payload,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    }
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        content = data["choices"][0]["message"]["content"]
                        match = re.search(r"\{.*\}", content, re.DOTALL)
                        if match:
                            res_json = json.loads(match.group(0))
                            return {
                                "success": True,
                                "reply": res_json.get("reply", ""),
                                "category": res_json.get("detected_category", ""),
                                "category_slug": res_json.get("category_slug", "ijtimoiy"),
                                "structured_idea": res_json.get("structured_idea", {}),
                                "improvements": res_json.get("improvements", [])
                            }
            except Exception:
                pass

        # Check if asked about project author / creator
        lower_txt = user_text.lower()
        if any(w in lower_txt for w in ["muallif", "kim yaratgan", "loyiha muallifi", "azizbek", "yaratuvchi", "kim qilgan"]):
            return {
                "success": True,
                "reply": "✦ 'G‘oyalar Banki — Yangi avlod tashabbuslari' platformasining rasmiy muallifi va bosh koordinatori — Azizbek Xabibullayev! Ushbu platforma yoshlarning innovatsion g‘oyalarini saralash va qo‘llab-quvvatlash uchun maxsus yaratilgan.",
                "category": "IT va sun’iy intellekt",
                "category_slug": "it",
                "structured_idea": {
                    "title": "G‘oyalar Banki — Yangi Avlod Tashabbuslari",
                    "category": "IT va sun’iy intellekt",
                    "category_slug": "it",
                    "problem": "Yoshlarning ilg'or g'oyalarini to'plash va amaliyotga tatbiq etish uchun yagona platforma zarur.",
                    "description": "Loyiha muallifi Azizbek Xabibullayev tomonidan ishlab chiqilgan G'oyalar Banki platformasi.",
                    "expected_result": "Iqtidorli yoshlar o'z tashabbuslarini erkin taqdim etib, kengash tomonidan qo'llab-quvvatlanadilar."
                },
                "improvements": [
                    "✦ Loyiha muallifi: Azizbek Xabibullayev",
                    "✦ Bosh Admin / IT va Sun'iy intellekt koordinatori",
                    "✦ 8 ta yo'nalish bo'yicha integratsiyalangan boshqaruv tizimi"
                ]
            }

        # Built-in High-Accuracy Local Uzbek AI Expert Engine
        cat = self.detect_category(user_text)
        
        words = user_text.strip().split()
        title_words = words[:6] if len(words) >= 3 else ["Mening", "Yangi", "Tashabbusim"]
        raw_title = " ".join(title_words).capitalize()
        if not raw_title.endswith(('.', '!', '?')):
            raw_title += " Loyihasi"

        improvements = [
            f"🎯 1. Loyihani amalga oshirish muddatlari va bosqichlarini aniq belgilang (masalan: 1-oy tayyorgarlik, 2-oy taqdimot).",
            f"👥 2. O'zingizga 3-5 kishilik faol tengdoshlar jamoasini shakllantiring va vazifalarni taqsimlang.",
            f"📊 3. Loyiha muvaffaqiyatini o'lchash mezonlarini qo'shing (masalan, qancha o'quvchi qamrab olinadi)."
        ]

        if cat["slug"] == "ekologiya":
            improvements[0] = "🌱 1. Maktab ma'muriyati bilan eko-hudud ajratish va ko'chat ekish grafigini kelishib oling."
            improvements[2] = "♻️ 3. Yig'ilgan chiqindilarni mahalliy qayta ishlash korxonalariga topshirish mexanizmini belgilang."
        elif cat["slug"] == "it":
            improvements[0] = "💻 1. Dastur yoki botning prototipini (Figma yoki oddiy chizmada) sinab ko'ring."
            improvements[2] = "🔐 3. Foydalanuvchilar ma'lumotlari xavfsizligi va qulay interfeysga e'tibor qarating."
        elif cat["slug"] == "talim":
            improvements[0] = "🎓 1. Fan o'qituvchilari bilan qo'shimcha dars va to'garaklar jadvalini muvofiqlashtirib oling."
            improvements[2] = "📖 3. Kichik sinflar uchun qiziqarli ko'rgazmali va interaktiv materiallar tayyorlang."
        elif cat["slug"] == "liderlik":
            improvements[0] = "👑 1. Maktab o'quvchilar kengashi va sardorlar bilan doimiy davra suhbatlarini yo'lga qo'ying."
            improvements[2] = "🏆 3. O'quvchilar o'rtasida motivatsiyani oshirish uchun rag'batlantirish tizimini joriy eting."
        elif cat["slug"] == "media":
            improvements[0] = "🎙️ 1. Maktab media studiyasi uchun haftalik mavzular rejasi va rubrikalarini tuzib chiqing."
            improvements[2] = "📱 3. Maktabning rasmiy kanallari va ijtimoiy tarmoqlarida kontentni muntazam yoritib boring."
        elif cat["slug"] == "sport":
            improvements[0] = "⚡ 1. Jismoniy tarbiya o'qituvchilari bilan xavfsizlik qoidalarini ishlab chiqing."
            improvements[2] = "🥇 3. Musobaqalar uchun shaffof baholash mezonlari va ramziy sovg'alarni rejalashtiring."
        elif cat["slug"] == "madaniyat":
            improvements[0] = "🎭 1. Sahna ko'rinishlari va ijodiy kechalar uchun ssenariy tayyorlang."
            improvements[2] = "📚 3. Maktab kutubxonasi va ijodkor o'quvchilar bilan hamkorlikda adabiy burchak tashkil qiling."

        reply = f"Ajoyib g‘oya! Bu tashabbus '{cat['name']}' yo‘nalishiga juda mos keladi. Siz ko‘targan masala maktabimiz va jamiyatimiz uchun nihoyatda muhim. Ushbu fikrni mukammal loyiha sifatida shakllantirish uchun Cefrbek sizga quyidagi takliflarni inobatga olishingizni tavsiya qiladi. Tayyor bo‘lsangiz, bir tugma bilan ma'lumotlarni ariza formasiga o‘tkazamiz!"

        structured_idea = {
            "title": raw_title,
            "category": cat["name"],
            "category_slug": cat["slug"],
            "problem": f"Hozirda maktabimizda va jamiyatimizda ushbu masala bo'yicha zamonaviy yechimlar va tizimli tashabbuslar yetarli darajada yo'lga qo'yilmagan.",
            "description": user_text,
            "expected_result": f"Loyiha orqali o'quvchilarning faolligi oshadi, '{cat['name']}' sohasida yangi namunali amaliyot yaratiladi va maktabimiz nufuzi yuksaladi."
        }

        return {
            "success": True,
            "reply": reply,
            "category": cat["name"],
            "category_slug": cat["slug"],
            "structured_idea": structured_idea,
            "improvements": improvements
        }

cefrbek = CefrbekAI()
