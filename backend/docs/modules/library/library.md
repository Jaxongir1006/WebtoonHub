# 📖 Modul Hujjati: `library` (Foydalanuvchi Kutubxonasi va Xatcho'plar)

## 1. Modul Tavsifi
Ushbu modul foydalanuvchilarning o‘zlariga yoqqan manhvalarni shaxsiy kutubxonalarida 4 xil mutolaa holati (`reading`, `plan_to_read`, `completed`, `dropped`) bo‘yicha saqlash, saralash va o‘chirish imkonini beradi.

---

## 2. Biznes Qoidalari
1. **Yagona holat (Unique Status):** Har bir foydalanuvchi ayni bir manhva uchun faqat bitta holatni tanlashi mumkin (masalan, "O‘qiyapman" yoki "O‘qib bo‘ldim").
2. **Upsert mexanizmi:** Agar manhva kutubxonada allaqachon mavjud bo‘lsa, yangi status yuborilganda u o‘zgartiriladi (update); mavjud bo‘lmasa yangi yozuv sifatida qo‘shiladi (insert).
3. **Profil integratsiyasi:** O‘quvchi o‘z profilida "Kutubxonam" bo‘limida ushbu manhvalarni qulay filtrlar orqali ko‘ra oladi.

---

## 3. Ushbu Modulning API Endpointlari
* [GET /api/v1/users/library](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/library/api/get_library.md) — Kutubxonadagi manhvalar ro‘yxati (status filtri bilan)
* [POST /api/v1/users/library/{webtoon_id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/library/api/update_bookmark.md) — Manhvani kutubxonaga qo‘shish yoki statusini yangilash
* [DELETE /api/v1/users/library/{webtoon_id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/library/api/remove_bookmark.md) — Manhvani kutubxonadan o‘chirish
