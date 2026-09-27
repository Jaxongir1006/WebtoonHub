# 📄 API: Boshqa Barcha Seanslardan Chiqish (Revoke Other Sessions)

## Umumiy Ma'lumot
* **Metod:** `DELETE`
* **Yo'l:** `/api/v1/auth/sessions/other`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchining ayni damda so‘rov yuborayotgan joriy seansidan tashqari barcha boshqa faol qurilmalaridagi seanslarini bir vaqtda bekor qiladi.

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
  "data": null,
  "message": "Boshqa barcha qurilmalardagi seanslar bekor qilindi"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Autentifikatsiyadan o'tilmagan",
    "details": null
  }
}
```
