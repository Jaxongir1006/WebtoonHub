# 🛒 Modul Hujjati: `shop` (Do‘kon va Profil Inventari)

## 1. Modul Tavsifi
Ushbu modul yig‘ilgan Chaqmoq ballariga avatar ramkalari va profil fonlarini xarid qilish, olingan buyumlarni profilga taqish / yechish hamda Admin tomonidan do‘konga yangi vizual buyumlar kiritish jarayonini boshqaradi.

Character cards use this catalog and inventory, but have no purchase price and
can only be obtained through [Character Card Gacha](../../05_CHARACTER_CARD_GACHA.md).
Frames and backgrounds are purchase-only; Lucky Wheel grants Lightning only.

---

## 2. Biznes Qoidalari
1. **Faqat ichki valyuta:** Do‘konda hech qanday real pul ishlatilmaydi; barcha xaridlar faqat o‘qish orqali to‘plangan Chaqmoq evaziga amalga oshiriladi.
2. **Takroriy xarid cheklovi:** Bitta buyumni faqat 1 marta sotib olish mumkin. Xarid qilingan buyum `user_inventory` jadvaliga biriktiriladi.
3. **Faollashtirish mantig‘i:** Foydalanuvchi bir vaqtning o‘zida faqat **1 ta avatar ramkasi** va **1 ta profil foni** taqa oladi. Yangi ramka yoqilganda (`is_active = True`), oldingi faol ramka avtomatik ravishda `is_active = False` holatiga o‘tadi.

---

## 3. Ushbu Modulning API Endpointlari
* [GET /api/v1/shop/items](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/shop/api/list_items.md) — Do‘kondagi mavjud buyumlar ro‘yxati (xarid holati bilan)
* [POST /api/v1/shop/buy/{item_id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/shop/api/buy.md) — Buyumni Chaqmoqqa sotib olish
* [POST /api/v1/shop/equip/{item_id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/shop/api/equip.md) — Buyumni profilga taqish
* [POST /api/v1/shop/unequip/{item_id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/shop/api/unequip.md) — Taqilgan buyumni yechish
* [POST /api/v1/staff/shop/items](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/shop/api/create_item.md) — Do‘konga yangi buyum joylash (Admin)
* [GET /api/v1/staff/shop/items](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/shop/api/list_staff_shop_items.md) — Admin uchun barcha buyumlar ro'yxati
* [PATCH /api/v1/staff/shop/items/{id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/shop/api/update_shop_item.md) — Do'kon buyumini tahrirlash
* [DELETE /api/v1/staff/shop/items/{id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/shop/api/delete_shop_item.md) — Do'kon buyumini o'chirish
