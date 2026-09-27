# 📄 API: Barcha Rollarni Olish (List Roles)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/roles`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `roles:manage`
* **Tavsif:** Tizimda mavjud bo‘lgan barcha dinamik rollar va ularga tegishli ruxsatlar ro‘yxatini qaytaradi.

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
  "data": [
    {
      "id": 1,
      "name": "superadmin",
      "description": "To'liq boshqaruv huquqiga ega tizim rahbari",
      "permissions_count": 8
    },
    {
      "id": 2,
      "name": "creator",
      "description": "Komiks yuklovchi tarjimon",
      "permissions_count": 4
    },
    {
      "id": 3,
      "name": "viewer",
      "description": "Faqat ko'rish va statistikani kuzatish",
      "permissions_count": 2
    }
  ]
}
```

### 403 Forbidden (Ruxsat yetarli emas)
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Sizda ushbu amalni bajarish uchun 'roles:manage' huquqi mavjud emas",
    "details": null
  }
}
```
