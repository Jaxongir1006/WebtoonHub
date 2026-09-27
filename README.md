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
├── frontend/                 # O'quvchilar uchun mijoz ilovasi (Vue 3 + Vite + Tailwind + Pinia)
└── admin/                    # Creator va Admin Studio / Dashboard (Vue 3 + Vite + Tailwind)
```

---

## 🛠 Texnologik stek
* **Backend:** Python 3.10+, FastAPI, SQLAlchemy ORM, Pydantic v2, Passlib (Bcrypt), PyJWT, aiosmtplib
* **Infratuzilma:** PostgreSQL, Redis (caching), MinIO (S3 object storage), Mailpit (local SMTP)
* **Frontend & Admin:** Vue.js 3, Vite, Tailwind CSS, Pinia, Axios
