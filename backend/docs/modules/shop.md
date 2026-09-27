# 🛒 Modul Hujjati: `shop` (Do‘kon va Profil Inventari)

Ushbu modul avatar ramkalari va profil fonlarini Chaqmoq evaziga xarid qilish, profilda taqish (`is_active`) va boshqarish uchun javobgardir.

---

## 1. GET `/api/v1/shop/items`
Do‘kondagi barcha mavjud buyumlar ro‘yxati. Kirgan foydalanuvchi uchun uning sotib olganlik holati (`is_owned`) ham ko‘rsatiladi.

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Olovli Ajdar Ramkasi",
      "item_type": "frame",
      "price_coins": 50,
      "asset_url": "http://localhost:9000/shop-assets/frames/dragon_fire.png",
      "is_owned": false
    },
    {
      "id": 2,
      "name": "Qorong'u Kecha Foni",
      "item_type": "background",
      "price_coins": 100,
      "asset_url": "http://localhost:9000/shop-assets/backgrounds/dark_night.webp",
      "is_owned": true
    }
  ]
}
```

---

## 2. POST `/api/v1/shop/buy/{item_id}`
Buyumni Chaqmoq evaziga sotib olish.
* **Auth**: `Bearer <access_token>`

### Mantiqiy tekshiruv:
1. Buyum `shop_items` jadvalida mavjud va `is_available = True` ekanligi tekshiriladi.
2. `user_inventory` tekshiriladi: agar foydalanuvchi bu buyumni allaqachon sotib olgan bo‘lsa -> 400 Bad Request (`ALREADY_OWNED`).
3. Foydalanuvchining chaqmoq balansi yetarliligi tekshiriladi (`user.lightning_coins >= item.price_coins`):
   * Yetarli bo‘lmasa -> 400 Bad Request (`INSUFFICIENT_FUNDS`).
4. Baza tranzaksiyasi ichida:
   * `user.lightning_coins -= item.price_coins`
   * `user_inventory` ga yozuv qo‘shiladi (`user_id`, `item_id`, `is_active=False`)
   * Tranzaksiya commit qilinadi.

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": {
    "item_id": 1,
    "remaining_coins": 15
  },
  "message": "Buyum muvaffaqiyatli xarid qilindi va inventaringizga qo'shildi!"
}
```

---

## 3. POST `/api/v1/shop/equip/{item_id}`
Sotib olingan buyumni profilga taqish / faollashtirish.
* **Auth**: `Bearer <access_token>`

### Mantiqiy tekshiruv:
1. Buyum foydalanuvchining `user_inventory`sida borligi tekshiriladi.
2. Xuddi shu turdagi (`frame` yoki `background`) oldin faollashtirilgan har qanday boshqa buyum uchun `is_active = False` qilinadi.
3. Tanlangan buyum uchun `is_active = True` qilinadi.

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": null,
  "message": "Buyum profilingizga muvaffaqiyatli o'rnatildi"
}
```

---

## 4. POST `/api/v1/shop/unequip/{item_id}`
Taqilgan buyumni profildan yechish (`is_active = False`).
* **Auth**: `Bearer <access_token>`

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": null,
  "message": "Buyum profildan yechildi"
}
```

---

## 5. POST `/api/v1/staff/shop/items` (Admin)
Do‘konga yangi avatar ramkasi yoki profil foni kiritish.
* **Auth**: `Bearer <staff_token>`
* **Permission**: `shop:manage`
* **Content-Type**: `multipart/form-data`

### Form Maydonlari:
* `name`: string ("Neon Chaqmoq Ramkasi")
* `item_type`: string ("frame" | "background")
* `price_coins`: int (masalan: 75)
* `asset_file`: File (PNG yoki WebP rasm)

### Javob (Response 201 Created):
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Neon Chaqmoq Ramkasi",
    "item_type": "frame",
    "price_coins": 75,
    "asset_url": "http://localhost:9000/shop-assets/frames/neon_lightning.png"
  },
  "message": "Do'konga yangi buyum muvaffaqiyatli joylandi"
}
```
