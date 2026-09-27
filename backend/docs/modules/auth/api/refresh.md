# 📄 API: Tokenni Yangilash (Refresh Token)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/auth/refresh`
* **Avtorizatsiya:** Kerak emas (Refresh token orqali)
* **Tavsif:** Foydalanuvchining Access token muddati tugaganda, mavjud faol seansdagi Refresh token yordamida yangi Access token generatsiya qilinadi.

---

## So'rov Parametrlari (Request)

### So'rov Tanasi (Request Body):
```json
{
  "refresh_token": "d8e3b1f5-19e3-4c92-80ea-3e28c7042a98"
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
    "token_type": "bearer",
    "expires_in": 3600
  },
  "message": "Token muvaffaqiyatli yangilandi"
}
```

### 401 Unauthorized (Refresh token yaroqsiz yoki seans bekor qilingan)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Seans muddati tugagan yoki bekor qilingan. Iltimos, qaytadan kiring.",
    "details": null
  }
}
```
