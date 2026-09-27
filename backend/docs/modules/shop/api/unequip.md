# 📄 API: Taqilgan Buyumni Yechish (Unequip Item)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/shop/unequip/{item_id}`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchi profiliga taqilgan avatar ramkasi yoki profil fonini yechadi (`is_active = False`).

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
    "is_active": false
  },
  "message": "Buyum profildan yechildi"
}
```
