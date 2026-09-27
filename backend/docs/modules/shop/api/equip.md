# 📄 API: Buyumni Profilga Taqish (Equip Item)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/shop/equip/{item_id}`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchi sotib olgan ramka yoki fonini profiliga taqadi (`is_active = True`). O‘sha turdagi boshqa barcha buyumlar avtomatik yechiladi (`is_active = False`).

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `item_id`: integer (Inventardagi buyum ID si)

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
    "item_type": "frame",
    "is_active": true
  },
  "message": "Buyum profilingizga muvaffaqiyatli o'rnatildi"
}
```

### 404 Not Found (Inventarda topilmadi)
```json
{
  "success": false,
  "error": {
    "code": "ITEM_NOT_IN_INVENTORY",
    "message": "Siz bu buyumni hali sotib olmagansiz",
    "details": null
  }
}
```
