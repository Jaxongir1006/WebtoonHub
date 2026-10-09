# 📄 API: Do'kon Buyumini Tahrirlash (Update Shop Item)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/shop/items/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `shop:manage`
* **Tavsif:** Do'kondagi buyum narxi, nomi yoki uning sotuvda mavjudlik holatini (`is_available`) o'zgartirish.

For character cards, omit `price_coins` (zero is the only accepted value). Their
rarity and availability affect every linked gacha pool's version. Once collected,
card identity is locked; artwork and availability can still be updated. A stale
draw confirmation then receives HTTP 409 before charging.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Buyum ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "name": "Dragon Fire Premium Frame",
  "price_coins": 25,
  "is_available": true
}
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Dragon Fire Premium Frame",
    "price_coins": 25,
    "is_available": true
  },
  "message": "Buyum muvaffaqiyatli yangilandi"
}
```
