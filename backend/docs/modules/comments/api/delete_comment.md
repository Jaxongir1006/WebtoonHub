# 📄 API: Sharhni O'chirish (Delete Comment)

## Umumiy Ma'lumot
* **Metod:** `DELETE`
* **Yo'l:** `/api/v1/comments/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>` yoki `Bearer <staff_token>`)
* **Tavsif:** Foydalanuvchi faqat o‘zining sharhini o‘chira oladi. Agar so‘rov yuborayotgan xodim bo‘lsa va unda `comments:moderate` huquqi bo‘lsa, u istalgan sharhni o‘chira oladi.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Sharh ID si)

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
  "message": "Sharh muvaffaqiyatli o'chirildi"
}
```

### 403 Forbidden (Begona sharhni o'chirishga urinish)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Siz faqat o'zingiz yozgan sharhlarni o'chira olasiz",
    "details": null
  }
}
```
