# 📄 API: Xodimlarni Ro'yxatini Olish (List Staff Users)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/users`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `staff:manage`
* **Tavsif:** Barcha admin va ijodiy jamoa a'zolari (`staff_users`) ro'yxatini ularning rollari bilan birga qaytaradi.

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
      "username": "superadmin",
      "email": "admin@webtoonhub.uz",
      "role": {
        "id": 1,
        "name": "superadmin",
        "description": "To'liq boshqaruv huquqiga ega tizim rahbari"
      },
      "is_active": true,
      "created_at": "2026-09-27T10:00:00Z"
    }
  ]
}
```
