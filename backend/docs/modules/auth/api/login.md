# 📄 API: Tizimga Kirish (Login)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/auth/login`
* **Avtorizatsiya:** Kerak emas (Ochiq)
* **Tavsif:** Foydalanuvchi email va paroli orqali tizimga kiradi. JWT Access va Refresh tokenlar taqdim etiladi hamda `user_sessions` jadvalida yangi seans ochiladi.

---

## So'rov Parametrlari (Request)

### Sarlavhalar (Headers):
```http
Content-Type: application/json
User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)...
X-Forwarded-For: 178.218.201.5
```

### So'rov Tanasi (Request Body):
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
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
    "refresh_token": "d8e3b1f5-19e3-4c92-80ea-3e28c7042a98",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "reader01",
      "lightning_coins": 50
    }
  },
  "message": "Tizimga xush kelibsiz"
}
```

### 401 Unauthorized (Email yoki Parol noto'g'ri)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Kiritilgan email yoki parol noto'g'ri",
    "details": null
  }
}
```

### 403 Forbidden (Hisob bloklangan)
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_DISABLED",
    "message": "Sizning hisobingiz bloklangan. Qo'llab-quvvatlash xizmatiga murojaat qiling.",
    "details": null
  }
}
```
