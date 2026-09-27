# 📄 API: O'quvchi Profilini Yangilash va Tangalarini Boshqarish (Update Reader)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/readers/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `users:manage`
* **Tavsif:** Foydalanuvchi hisobini bloklash/faollashtirish (`is_active`) yoki uning Chaqmoq tangalarini to'g'irlash (`lightning_coins`).

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (O'quvchi ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "lightning_coins": 200,
  "is_active": true
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
    "username": "otaku_uz",
    "email": "otaku@example.com",
    "lightning_coins": 200,
    "is_active": true
  },
  "message": "Foydalanuvchi ma'lumotlari muvaffaqiyatli yangilandi"
}
```
