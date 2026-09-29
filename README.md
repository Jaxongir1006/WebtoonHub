# ⚡ WebtoonHub — Ichki 'Chaqmoq' Valyutali Webtoon/Manhwa O'qish Platformasi

> **KIMYO INTERNATIONAL UNIVERSITY IN TASHKENT (KIUT)**  
> **Amaliy Informatika (ISE) · Project Based Learning III (PBL3)**  
> **Versiya:** 1.0 (2026-yil)

---

## 👥 Loyiha mualliflari
* **Qosimjonov Jaxongir** — Team Lead / Arxitektura va Umumiy integratsiya
* **Muxtorov Akmaljon** — Back-end Dasturchi
* **Tursunaliyev Asilbek** — Front-end Dasturchi

---

## 📖 Loyiha haqida
**WebtoonHub** — vertikal formatdagi raqamli manhva va webtoonlarni qulay mutolaa qilish, o'zbek tilidagi tarjimalarni joylash hamda bepul ichki rag'batlantirish (gamifikatsiya) tizimiga ega zamonaviy platforma.

Platformada **hech qanday real pullik to'lovlar (Payme, Click va h.k.) mavjud emas**. Barcha rag'batlantirish va do'kon xaridlari platformadagi bepul **⚡ Chaqmoq (Lightning Coins)** tizimi orqali amalga oshiriladi:
* **Ro'yxatdan o'tish:** +50 ⚡ boshlang'ich bonus
* **Kunlik kirish (Daily Login):** +15 ⚡ (Toshkent vaqti `Asia/Tashkent` bilan har 00:00 da yangilanadi)
* **Bob mutolaasi:** +5 ⚡ (faqat to'liq o'qilganda, takroriy nakrutkadan himoyalangan)
* **Shop (Do'kon):** Yig'ilgan chaqmoqlarga avatar ramkalari va profil fonlari xarid qilish hamda profilga taqish

---

## 🏗 Arxitektura va Yondashuv

### 1. Document-First Yondashuvi (Qat'iy qoida)
Har bir modul, ma'lumotlar bazasi sxemasi va API endpointlari uchun **avval rasmiy `.md` hujjatlar** yoziladi va tasdiqlanadi. Shundan so'nggina kod yozishga o'tiladi.

### 2. Modulli Monolit (Modular Monolith)
Backend har biri o'zining model, schema, servis va routeriga ega mustaqil domen modullaridan iborat:
* `auth` — Sayt foydalanuvchilari autentifikatsiyasi (Email login, JWT, sessions, SMTP)
* `users` — O'quvchilar profili, xatcho'plar (4 ta o'qish statusi), inventar
* `staff` — Boshqaruv xodimlari va moslashuvchan dinamik RBAC (`roles`, `permissions`)
* `creator_requests` — O'quvchilarning Creator bo'lish arizalari va admin moderatsiyasi
* `webtoons` — Manhvalar, janrlar, boblar va bob rasmlari
* `rewards` — Chaqmoq logikasi (Toshkent 00:00 va bob bonusi)
* `shop` — Avatar ramkalari va fonlar do'koni
* `comments` — Bob sharhlari va ierarxik javoblar (`parent_id`)

### 3. Loyiha strukturasi
```text
WebtoonHub/
├── backend/                  # FastAPI, PostgreSQL, Redis, MinIO, Mailpit
│   ├── docker-compose.yml    # Infratuzilma konteynerlari
│   ├── docs/                 # Document-First API va tizim hujjatlari (.md)
│   ├── app/                  # Modular Monolith backend kodi
│   └── requirements.txt
├── frontend/                 # O'quvchilar uchun mijoz ilovasi (React 18 + TypeScript + Vite + Tailwind)
└── admin/                    # Creator va Admin Studio / Dashboard (Vue 3 + Vite + Tailwind)
```

---

## 🛠 Texnologik stek
* **Backend:** Python 3.12, FastAPI, SQLAlchemy ORM, Alembic, Pydantic v2, bcrypt, PyJWT, Pillow, aiosmtplib
* **Infratuzilma:** PostgreSQL, Redis (caching), MinIO (S3 object storage), Mailpit (local SMTP)
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Axios
* **Admin:** Vue 3, Vite, Tailwind CSS, Pinia, Axios

## Local setup

From `backend/`, create a virtual environment, install `requirements.txt`, and copy `.env.example` to `.env`. The development `.env` may use SQLite; PostgreSQL is supported through `DATABASE_URL`. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before running `python -m scripts.seed`. The seed script no longer creates an account with a published password. Optional demo readers require `SEED_DEMO_ACCOUNTS=true` and `SEED_DEMO_PASSWORD` in a development environment.

Run `python -m alembic upgrade head` before starting the backend. Existing databases that already match the model schema can be baselined with `python -m alembic stamp head` after a backup and schema comparison. New schema changes should be added as Alembic revisions. Outside development and test, startup does not create tables automatically.

Start the API with `python -m uvicorn app.main:app --reload`, then run `npm ci` and `npm run dev` in both `frontend/` and `admin/`. The frontend runs on port 5173 and the admin on 5174; both proxy API requests to port 8000.

For deployment, set a unique `SECRET_KEY` of at least 32 characters, `DEBUG=false`, the real `ALLOWED_ORIGINS`, and a production `APP_ENV`. The backend rejects the development secret and demo seeding outside development. For databases created by an older seed, `python -m scripts.rotate_legacy_seed_credentials` rotates only accounts still using the published seed passwords, writes replacement credentials to the ignored `backend/.local-seed-credentials.txt`, and replaces the default local signing secret. Restart the API afterward, then move the replacement credentials into a password manager and remove the local file.

Chapter uploads are converted to smaller WebP files when that saves space. For existing local chapter images, run `python scripts/optimize_chapter_images.py` from `backend/`; originals remain available, and the reader API serves WebP copies when present.

## VPS staging

The staging stack and access instructions are in [deploy/staging/README.md](deploy/staging/README.md). The reader, admin studio, and API are available at `https://webtoonhub.duckdns.org/`, `https://admin-webtoonhub.duckdns.org/`, and `https://api-webtoonhub.duckdns.org/`. The VPS keeps PostgreSQL and Redis private, and backs up database and media nightly. This is still a staging environment: email is captured by Mailpit and media uses local persistent storage. Configure real SMTP, review content rights, and choose durable object storage before treating it as a full public launch.
