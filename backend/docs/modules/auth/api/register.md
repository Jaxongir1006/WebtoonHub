# 📄 API: Ro'yxatdan O'tish (Register)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/auth/register`
* **Avtorizatsiya:** Kerak emas (Ochiq)
* **Tavsif:** Yangi foydalanuvchini ro‘yxatdan o‘tkazadi, boshlang‘ich 50 ⚡ Chaqmoq balansi beradi va SMTP orqali xat jo‘natadi.

---

## So'rov Parametrlari (Request)

### Sarlavhalar (Headers):
```http
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "email": "user@example.com",
  "username": "reader01",
  "password": "SecurePassword123"
}
```

### Validatsiya Qoidalari:
| Maydon | Tipi | Qoidalar |
| :--- | :--- | :--- |
| `email` | `string` | Majburiy, haqiqiy email, maksimal 255 ta belgi, takrorlanmas |
| `username` | `string` | Majburiy, 3-50 ta belgi, faqat lotin harflari va raqamlar, takrorlanmas |
| `password` | `string` | Majburiy, kamida 8 ta belgi |

---

## Javoblar (Responses)

### 201 Created (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "reader01",
      "lightning_coins": 50,
      "created_at": "2026-09-27T17:40:00Z"
    }
  },
  "message": "Ro'yxatdan muvaffaqiyatli o'tdingiz. Hisobingizga 50 Chaqmoq qo'shildi!"
}
```

### 409 Conflict (Email yoki Username allaqachon mavjud)
```json
{
  "success": false,
  "error": {
    "code": "USER_ALREADY_EXISTS",
    "message": "Ushbu email yoki username orqali avval ro'yxatdan o'tilgan",
    "details": null
  }
}
```

### 422 Unprocessable Entity (Validatsiya xatosi)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Parol kamida 8 ta belgidan iborat bo'lishi kerak",
    "details": [
      {
        "field": "password",
        "issue": "String should have at least 8 characters"
      }
    ]
  }
}
```
