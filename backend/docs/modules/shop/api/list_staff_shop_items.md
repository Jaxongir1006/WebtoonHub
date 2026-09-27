# 📄 API: Admin Do'kon Buyumlarini Ko'rish (List Staff Shop Items)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/shop/items`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `shop:manage`
* **Tavsif:** Barcha buyumlar (faol va nofaol bo'lganlar ham) ro'yxatini boshqaruv uchun qaytaradi.

---

## So'rov Parametrlari (Request)

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
  "data": [
    {
      "id": 1,
      "name": "Dragon Fire Frame",
      "item_type": "frame",
      "price_coins": 20,
      "asset_url": "http://localhost:9000/shop-assets/frames/dragon_fire.png",
      "is_available": true,
      "created_at": "2026-09-27T17:00:00Z"
    }
  ]
}
```
