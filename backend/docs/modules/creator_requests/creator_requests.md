# ✍️ Modul Hujjati: `creator_requests` (Creatorlik So‘rovlari va Moderatsiya)

## 1. Modul Tavsifi
Ushbu modul oddiy sayt o‘quvchilarining platformada yangi manhvalar va boblar tarjimalarini yuklovchi Creator (tarjimon) bo‘lish arizalarini qabul qilish va Adminlar tomonidan ushbu arizalarni moderatsiyadan o‘tkazish (tasdiqlash yoki rad etish) vazifasini bajaradi.

---

## 2. Biznes Qoidalari
1. **Ariza topshirish:** Har bir ro‘yxatdan o‘tgan foydalanuvchi o‘z profilidan "Tarjimon/Muallif bo‘lish" arizasini topshirishi mumkin.
2. **Kutish holati (Pending):** Ariza yuborilgach, u `pending` holatda bo‘ladi va foydalanuvchi faqat 1 ta faol arizaga ega bo‘lishi mumkin.
3. **Tasdiqlash jarayoni (Approval):** Admin arizani tasdiqlaganda (`approved`), foydalanuvchi uchun `staff_users` jadvalida Creator roli biriktirilgan hisob ochiladi va unga Admin / Studio (`admin/`) paneliga kirish huquqi beriladi.

---

## 3. Ushbu Modulning API Endpointlari
* [POST /api/v1/creator-requests](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/creator_requests/api/submit_request.md) — Creator bo‘lish arizasini yuborish
* [GET /api/v1/creator-requests/my](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/creator_requests/api/get_my_request.md) — O‘zining yuborgan arizasi holatini ko‘rish
* [GET /api/v1/staff/creator-requests](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/creator_requests/api/list_requests.md) — Barcha tushgan arizalar ro‘yxati (Admin)
* [PATCH /api/v1/staff/creator-requests/{id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/creator_requests/api/review_request.md) — Arizani tasdiqlash yoki rad etish (Admin)
