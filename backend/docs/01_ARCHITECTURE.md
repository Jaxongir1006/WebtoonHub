# 🏛 WebtoonHub — Tizim Arxitekturasi va Loyiha Standartlari

## 1. Umumiy Ko‘rinish
Ushbu loyiha **Modulli Monolit (Modular Monolith)** arxitekturaviy patterni asosida tashkil etilgan. Barcha biznes domenlar bir-biridan mustaqil modullarga ajratilgan bo‘lib, har bir modul o‘zining ma'lumotlar modeli (`models.py`), ma'lumot validatsiyasi (`schemas.py`), biznes logikasi (`service.py`), marshrutlari (`router.py`) va xavfsizlik tekshiruvlariga (`dependencies.py`) ega.

---

## 2. Loyiha Tuzilmasi (Folder Structure)

```text
WebtoonHub/
├── backend/
│   ├── docker-compose.yml         # Postgres, Redis, MinIO, Mailpit
│   ├── requirements.txt
│   ├── .env.example
│   ├── docs/                      # Document-First API va Tizim hujjatlari (.md)
│   │   ├── 01_ARCHITECTURE.md
│   │   ├── 02_DATABASE_SCHEMA.md
│   │   ├── 03_API_STANDARDS.md
│   │   └── modules/
│   │       ├── auth.md            # Sayt foydalanuvchilari auth va sessiyalari
│   │       ├── staff_rbac.md      # Admin/Xodimlar auth, rollar va ruxsatlar
│   │       ├── webtoons.md        # Manhvalar, boblar va MinIO rasmlar
│   │       ├── rewards.md         # Chaqmoq gamifikatsiyasi va kunlik bonus
│   │       ├── shop.md            # Do'kon va inventar
│   │       ├── comments.md        # Sharhlar va ierarxik javoblar
│   │       └── creator_requests.md# Creatorlik so'rovlari va tasdiqlash
│   ├── app/
│   │   ├── core/                  # Global infratuzilma poydevori
│   │   │   ├── config.py          # Sozlamalar (Pydantic Settings)
│   │   │   ├── database.py        # SQLAlchemy Engine va Session
│   │   │   ├── redis.py           # Redis kesh mijozi
│   │   │   ├── storage.py         # MinIO (S3) mijozi
│   │   │   ├── mailer.py          # Asinxron SMTP xat yuborish
│   │   │   └── security.py        # Bcrypt hash va JWT
│   │   ├── modules/               # Domen modullari (Modular Monolith)
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── staff/
│   │   │   ├── creator_requests/
│   │   │   ├── webtoons/
│   │   │   ├── rewards/
│   │   │   ├── shop/
│   │   │   └── comments/
│   │   └── main.py                # FastAPI ilovasi
│   └── scripts/
│       └── seed.py                # Ixtiyoriy test ma'lumotlari (Superadmin, default rollar)
│
├── frontend/                      # O'quvchilar mijozi (Vue 3, Tailwind, Pinia)
└── admin/                         # Boshqaruv va Studio paneli (Vue 3, Tailwind)
```

---

## 3. Asosiy Tamoyillar (Core Conventions)

1. **Document-First Yondashuvi**:
   * API yoki yangi funksionallik qo‘shishdan oldin uning `backend/docs/` papkasidagi `.md` hujjati yoziladi va kelishiladi.
   * FastAPI ning avtomatik Swagger hujjatiga tayanilmaydi (`docs_url=None`, `redoc_url=None`).
2. **Xavfsizlik va Rollar Ajratilishi**:
   * Oddiy o‘quvchilar (`users`) va boshqaruv xodimlari (`staff_users`) ma'lumotlar bazasida ham, autentifikatsiyada ham butunlay alohida jadvallarda saqlanadi.
   * Xodimlar uchun dinamik RBAC (`roles` va `permissions`) qo‘llaniladi.
3. **Sessiyalar Boshqaruvi (`sessions`)**:
   * Har bir login qilinganda IP, User-Agent va qurilma ma'lumotlari `sessions` jadvaliga yoziladi.
   * Foydalanuvchilar va adminlar o‘zlarining faol qurilmalarini ko‘ra oladilar va masofadan sessiyani to‘xtata oladilar.
4. **Vaqt Mantiqi (Timezone)**:
   * Tizimdagi kunlik bonuslar (Daily login) O‘zbekiston vaqti (`Asia/Tashkent`, UTC+5) bo‘yicha 00:00 da yangilanadi.
   * Ma'lumotlar bazasida barcha `created_at` va `updated_at` maydonlari standart UTC formatida saqlanadi.
