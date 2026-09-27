# 📄 API: Joriy Xodim Profili va Huquqlari (Staff Me)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/auth/me`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Tavsif:** Tizimga kirgan xodimning shaxsiy ma'lumotlari, uning joriy roli va ruxsat berilgan barcha `permissions` kodlari to‘plamini qaytaradi. Frontend Admin paneli qaysi menyular va tugmalarni ko‘rsatishni shu huquqlarga qarab hal qiladi.

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
    "id": 2,
    "username": "creator_ali",
    "email": "ali@webtoonhub.uz",
    "role": {
      "id": 2,
      "name": "creator",
      "description": "Komiks yuklovchi tarjimon"
    },
    "permissions": [
      "webtoons:create",
      "webtoons:edit_own",
      "chapters:create",
      "analytics:view_own"
    ]
  }
}
```
