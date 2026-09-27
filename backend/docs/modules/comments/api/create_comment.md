# 📄 API: Sharh yoki Javob Yozish (Create Comment / Reply)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/chapters/{id}/comments`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchi bob ostiga yangi sharh qoldiradi yoki mavjud sharhga javob (Reply) yozadi.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Bob ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "content": "Juda qiziq joyida tugadi-ku!",
  "parent_id": null
}
```
*(Boshqa bir sharhga javob bo‘lganda, `parent_id: 12` ko‘rinishida o‘sha sharhning ID si beriladi).*

---

## Javoblar (Responses)

### 201 Created (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 16,
    "chapter_id": 101,
    "parent_id": null,
    "content": "Juda qiziq joyida tugadi-ku!",
    "created_at": "2026-09-27T17:55:00Z"
  },
  "message": "Sharhingiz muvaffaqiyatli chop etildi"
}
```

### 422 Unprocessable Entity (Bo'sh yoki haddan tashqari uzun matn)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Sharh matni 1 dan 500 tagacha belgidan iborat bo'lishi shart",
    "details": null
  }
}
```
