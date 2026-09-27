# 💬 Modul Hujjati: `comments` (Sharhlar va Ierarxik Javoblar)

## 1. Modul Tavsifi
Ushbu modul har bir bob ostida o‘quvchilar tomonidan sharh qoldirish, sharhlarga javob (Replies) yozish (daraxtsimon ierarxiya) hamda nomaqbul sharhlarni moderatsiya qilish imkoniyatini taqdim etadi.

---

## 2. Biznes Qoidalari
1. **Ierarxik muloqot:** Sharhlar `parent_id` orqali o‘z-o‘ziga bog‘lanadi. Agar `parent_id` ko‘rsatilsa, u asosiy sharh ostidagi javob (Reply) sifatida aks etadi.
2. **O‘chirish huquqi:** Oddiy o‘quvchi faqat **o‘zining** sharhini o‘chira oladi.
3. **Moderatsiya huquqi:** Adminlar `comments:moderate` ruxsati bilan istalgan nomaqbul yoki qoidabuzar sharhni o‘chira oladilar.
4. **Profil bezaklari integratsiyasi:** Sharh egasining ismi yonida uning o‘sha paytdagi faol avatar ramkasi ham birga ko‘rsatiladi.

---

## 3. Ushbu Modulning API Endpointlari
* [GET /api/v1/chapters/{id}/comments](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/comments/api/list_comments.md) — Bob sharhlarini daraxt ko‘rinishida olish
* [POST /api/v1/chapters/{id}/comments](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/comments/api/create_comment.md) — Yangi sharh yoki mavjud sharhga javob yozish
* [DELETE /api/v1/comments/{id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/comments/api/delete_comment.md) — Sharhni o‘chirish
* [GET /api/v1/staff/comments](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/comments/api/list_all_comments.md) — Moderatsiya uchun barcha sharhlar ro'yxati (Admin)
* [PATCH /api/v1/staff/comments/{id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/comments/api/update_comment.md) — Sharhni moderatsiyada tahrirlash / senzura qilish (Admin)
* [DELETE /api/v1/staff/comments/{id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/comments/api/delete_staff_comment.md) — Sharhni moderatorda o'chirish (Admin)
