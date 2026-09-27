# 📄 API: Do'kondagi Buyumlar Ro'yxati (List Shop Items)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/shop/items`
* **Avtorizatsiya:** Ixtiyoriy (Token bo‘lsa, foydalanuvchining xarid holati `is_owned` belgilanadi)
* **Tavsif:** Do‘kondagi sotuvda mavjud barcha avatar ramkalari va profil fonlari ro‘yxatini qaytaradi.

---

## So'rov Parametrlari (Request)

### Query Parametrlari:
* `item_type`: string (ixtiyoriy: `frame` yoki `background`)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (ixtiyoriy)
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
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
