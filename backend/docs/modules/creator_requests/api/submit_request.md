# 📄 API: Creatorlik Arizasini Topshirish (Submit Creator Request)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/creator-requests`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchi platformada manhvalar tarjimoni bo‘lish uchun ariza va portfolio matnini topshiradi.

---

## So'rov Parametrlari (Request)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "message": "Assalomu alaykum! Men 'Solo Leveling' va 'Tower of God' manhvalarini o'zbek tiliga tarjima qilib joylamoqchiman. Ilgari Telegram kanallarda 2 yil tajribam bor."
}
```

---

## Javoblar (Responses)

### 201 Created (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "pending",
    "created_at": "2026-09-27T17:55:00Z"
  },
  "message": "Arizangiz qabul qilindi va moderatorlar tekshiruviga yuborildi!"
}
```

### 409 Conflict (Avvalgi ariza hali ko'rib chiqilmagan)
```json
{
  "success": false,
  "error": {
    "code": "REQUEST_ALREADY_PENDING",
    "message": "Sizning arizangiz allaqachon moderatorlar tekshiruvida turibdi",
    "details": null
  }
}
```
