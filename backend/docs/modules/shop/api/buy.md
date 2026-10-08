# 📄 API: Buyum Xarid Qilish (Buy Item)

## Price consent (October 2026)

Send JSON `{"expected_price": 100}` with the price shown to the reader. The server
locks the current offer and returns 409 if its price changed; no balance or inventory
change is committed. A successful receipt reports the actual `price_paid`.

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/shop/buy/{item_id}`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchi Chaqmoq ballari evaziga avatar ramkasi yoki profil fonini sotib oladi.

---

## Biznes Mantiqiy Jarayon
1. Buyum bazada mavjudligi va `is_available = True` ekanligi tekshiriladi.
2. `user_inventory` tekshiriladi: agar bu buyum allaqachon sotib olingan bo‘lsa -> 400 Bad Request (`ALREADY_OWNED`).
3. Balans yetarliligi tekshiriladi (`user.lightning_coins >= item.price_coins`). Yetarli bo‘lmasa -> 400 Bad Request (`INSUFFICIENT_FUNDS`).
4. Baza tranzaksiyasi ichida:
   * `user.lightning_coins -= item.price_coins`
   * `user_inventory` ga yozuv qo‘shiladi (`user_id`, `item_id`, `is_active=False`)
   * Tranzaksiya tasdiqlanadi.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `item_id`: integer (Buyum ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "item_id": 1,
    "item_name": "Olovli Ajdar Ramkasi",
    "price_paid": 50,
    "remaining_coins": 15
  },
  "message": "Buyum muvaffaqiyatli xarid qilindi va inventaringizga qo'shildi!"
}
```

### 400 Bad Request (Chaqmoq yetarli emas)
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Ushbu buyumni sotib olish uchun Chaqmoq balansingiz yetarli emas",
    "details": null
  }
}
```

### 400 Bad Request (Allaqachon sotib olingan)
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_OWNED",
    "message": "Siz ushbu buyumni avval sotib olgansiz",
    "details": null
  }
}
```
