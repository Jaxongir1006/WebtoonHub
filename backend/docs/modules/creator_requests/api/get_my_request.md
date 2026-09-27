# 📄 API: O'z Arizasini Ko'rish (Get My Creator Request)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/creator-requests/my`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchining topshirgan Creatorlik arizasi holatini (`pending`, `approved`, `rejected`) qaytaradi.

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
  "data": {
    "id": 1,
    "message": "Assalomu alaykum! Men 'Solo Leveling'...",
    "status": "pending",
    "created_at": "2026-09-27T17:55:00Z",
    "reviewed_at": null
  }
}
```

### 404 Not Found (Ariza topshirilmagan)
```json
{
  "success": false,
  "error": {
    "code": "NO_REQUEST_FOUND",
    "message": "Siz hali Creatorlik arizasini topshirmagansiz",
    "details": null
  }
}
```
