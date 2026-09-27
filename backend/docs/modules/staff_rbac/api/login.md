# 📄 API: Xodimlar Tizimga Kirishi (Staff Login)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/staff/auth/login`
* **Avtorizatsiya:** Kerak emas (Ochiq)
* **Tavsif:** Boshqaruv paneli xodimlari email va parol orqali tizimga kiradi. Alohida `staff_sessions` jadvalida seans ochiladi va xodimning roli hamda huquqlari qaytariladi.

---

## So'rov Parametrlari (Request)

### Sarlavhalar (Headers):
```http
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "email": "admin@webtoonhub.uz",
  "password": "AdminSecurePassword123"
}
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "a1b2c3d4-e5f6-4a1b-8c2d-9e0f1a2b3c4d",
    "token_type": "bearer",
    "staff": {
      "id": 1,
      "username": "superadmin",
      "email": "admin@webtoonhub.uz",
      "role": {
        "id": 1,
        "name": "superadmin",
        "description": "To'liq boshqaruv huquqiga ega tizim rahbari"
      },
      "permissions": [
        "webtoons:create",
        "webtoons:edit",
        "webtoons:delete",
        "chapters:approve",
        "shop:manage",
        "roles:manage",
        "users:manage",
        "staff:manage"
      ]
    }
  },
  "message": "Boshqaruv paneliga xush kelibsiz"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STAFF_CREDENTIALS",
    "message": "Kiritilgan email yoki parol xodimlar ro'yxatida topilmadi",
    "details": null
  }
}
```
