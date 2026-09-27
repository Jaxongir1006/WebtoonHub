# 🌐 WebtoonHub Frontend (O'quvchilar Mijozi)

WebtoonHub platformasining o'quvchilar (kitobxonlar) uchun mo'ljallangan zamonaviy, vertikal manhva mutolaasi va gamifikatsiya veb-ilovasi.

---

## 🛠 Texnologik Stek
* **Freymvork:** React 18 (TypeScript)
* **Yig'uvchi (Bundler):** Vite 6
* **Stillash:** Tailwind CSS v3 (Dark-mode first, studio/charcoal va Lightning Amber palitrasi)
* **Ikonkalar:** Lucide React
* **Router:** React Router DOM v6
* **API Klient:** Axios (avtomatik JWT `access_token` va `refresh_token` interceptorlari bilan)

---

## ⚡ Asosiy Imkoniyatlar va Modullar

1. **Autentifikatsiya & Foydalanuvchi Profili (`/profile`)**:
   - Kirish va Ro'yxatdan o'tish modali (yangi ro'yxatdan o'tganlarga **+50 ⚡ Chaqmoq** bonusi).
   - Profil ma'lumotlarini o'zgartirish (foydalanuvchi nomi, parol).
   - O'rnatilgan aktiv avatar ramkasini jonli ko'rsatish (`AvatarFrame`).
   - Faol sessiyalar ro'yxati (IP, qurilma turi, oxirgi faollik) va boshqa seanslarni bir bosishda yakunlash.
   - Xavfsiz JWT autentifikatsiya (muddati tugaganda `POST /auth/refresh` orqali yangilanish).

2. **Bosh Sahifa (`/`) va Manhvalar Katalogi (`/catalog`)**:
   - Mashhur manhvalar uchun dinamik Hero Banner (blur fon, trend nishoni, tezkor o'qish).
   - Janrlar bo'yicha saralash tablari (`/genres` orqali dinamik yuklanadi).
   - Holat filtrlari (`Davom etmoqda`, `Tugallangan`).
   - Qidiruv satri (debounced live qidiruv).
   - Sahifalash (Pagination).

3. **Manhwa Sahifasi (`/webtoons/:idOrSlug`) va Shaxsiy Kutubxona (`/library`)**:
   - Tavsif, muallif, janrlar, ko'rishlar soni va boblar ro'yxati.
   - Xatcho'p (Bookmark) tugmasi:
     - 📖 *O'qilmoqda* (`reading`)
     - 📌 *Rejada* (`plan_to_read`)
     - ✅ *O'qib bo'lindi* (`completed`)
     - 🛑 *Tashlab ketildi* (`dropped`)
   - Kutubxona sahifasida o'quvchi xatcho'plari statuslar bo'yicha ajratilgan.

4. **Vertikal Webtoon Reader (`/chapters/:id`)**:
   - Choksiz (zero gap) vertikal chiziqli tasvirlar tasmasi.
   - Yuqori va pastki suzuvchi (floating) navigatsiya paneli (o'qish maydoniga bosganda yashirish/ko'rsatish).
   - O'qish jarayoni foiz indikatori (0% - 100%).
   - Boblar ro'yxati yon menyusi (Drawer).
   - Oldingi va keyingi bobga tezkor o'tish.
   - Bob yakunida **+5 ⚡ Chaqmoq** olish interaktiv kartasi (takroriy olishdan himoyalangan).

5. **Interaktiv Sharhlar Tizimi (Comments)**:
   - Har bir bob tagida o'quvchilar sharhlari.
   - Sharh muallifining o'rnatilgan avatar ramkasi ko'rinishi.
   - Ierarxik javoblar (nested replies `parent_id` bilan).
   - O'z sharhlarini o'chirish imkoniyati.

6. **Chaqmoq Gamifikatsiyasi va Do'kon (`/shop`)**:
   - Navbarda va sahifalarda ⚡ Chaqmoq balansi.
   - Kunlik kirish bonusi modali (**+15 ⚡ Chaqmoq**) — Toshkent vaqti (`Asia/Tashkent` UTC+5) bilan 00:00 gacha hisoblagich bilan.
   - Do'konda avatar ramkalari va fonlarni Chaqmoq orqali xarid qilish.
   - 1-bosish bilan ramkani profilga taqish (Equip) va yechish (Unequip).

7. **Muallif / Tarjimon Bo'lish Arizasi (`/become-creator`)**:
   - Tarjimonlikka ariza topshirish formasi.
   - Mavjud ariza holatini kuzatish (Kutilmoqda / Tasdiqlangan / Rad etilgan).
   - Moderator izohi (`admin_feedback`) va Admin Studio portaliga o'tish tugmasi.

8. **To'liq O'zbek Tili (Lotin Alifbosi)**:
   - Sayt interfeysidagi barcha matnlar sof o'zbek tilida.

---

## 🚀 Ishga Tushirish

### Ishlab chiqish (Development):
```bash
npm install
npm run dev
```
Sayt `http://localhost:5173` manzilida ishga tushadi.

### Ishlab chiqarish uchun yig'ish (Production Build):
```bash
npm run build
```
Yig'ilgan fayllar `dist/` papkasiga joylashadi.

### Tekshirish (Preview):
```bash
npm run preview
```
