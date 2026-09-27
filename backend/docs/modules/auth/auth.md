# 🔐 Modul Hujjati: `auth` (Sayt Foydalanuvchilari Autentifikatsiyasi)

## 1. Modul Tavsifi
Ushbu modul oddiy sayt o‘quvchilarining (`users`) hisoblarini boshqarish, xavfsiz email orqali tizimga kirish (JWT Access & Refresh), faol sessiyalarni kuzatish hamda SMTP orqali xat jo‘natish vazifalarini bajaradi.

---

## 2. Biznes Qoidalari (Business Rules)
1. **Email orqali kirish:** Foydalanuvchilar o‘zlarining tasdiqlangan email manzillari orqali login qiladi.
2. **Boshlang‘ich bonus:** Yangi ro‘yxatdan o‘tgan har bir foydalanuvchiga tizim tomonidan avtomatik ravishda **+50 ⚡ Chaqmoq** balansi taqdim etiladi.
3. **SMTP Xabarnoma:** Yangi hisob ochilganda asinxron tarzda foydalanuvchining pochtasiga xush kelibsiz xati yuboriladi.
4. **Sessiya nazorati:** Har bir muvaffaqiyatli login jarayonida `user_sessions` jadvalida foydalanuvchining IP manzili, User-Agent va qurilma turi yozib boriladi.
5. **Masofadan boshqarish:** Foydalanuvchi istalgan paytda o‘zining faol seanslarini ko‘rishi va begona/eski qurilmadagi seansni masofadan turib bekor qilishi mumkin.

---

## 3. Aloqador Ma'lumotlar Bazasi Modellari
* `users` — Foydalanuvchi hisobi va chaqmoq balansi.
* `user_sessions` — Foydalanuvchining faol qurilmalari va refresh token heshlari.

---

## 4. Ushbu Modulning API Endpointlari
Har bir API alohida faylda batafsil hujjatlashtirilgan:
* [POST /api/v1/auth/register](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/auth/api/register.md) — Ro‘yxatdan o‘tish (+50 ⚡ Chaqmoq bonus)
* [POST /api/v1/auth/login](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/auth/api/login.md) — Email va parol orqali tizimga kirish
* [POST /api/v1/auth/refresh](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/auth/api/refresh.md) — Access tokenni yangilash
* [GET /api/v1/auth/me](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/auth/api/me.md) — Joriy foydalanuvchi profili va balansi
* [GET /api/v1/auth/sessions](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/auth/api/sessions.md) — Faol qurilmalar / seanslar ro‘yxati
* [DELETE /api/v1/auth/sessions/{id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/auth/api/revoke_session.md) — Muayyan seansni bekor qilish
* [DELETE /api/v1/auth/sessions/other](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/auth/api/revoke_other_sessions.md) — Boshqa barcha qurilmalardan chiqish
* [PATCH /api/v1/auth/profile](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/auth/api/update_profile.md) — Profil ma'lumotlarini yangilash (username / parol)
