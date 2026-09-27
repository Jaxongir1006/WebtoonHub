# 📄 API: O'quvchilarni Ro'yxatini Olish (List Readers)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/readers`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `users:manage`
* **Tavsif:** Platformadagi barcha ro'yxatdan o'tgan o'quvchilar (`users`) ro'yxatini qidiruv va sahifalash imkoniyati bilan qaytaradi.

---

## So'rov Parametrlari (Request)

### Query Parametrlari:
* `search`: string (ixtiyoriy, username yoki email bo'yicha)
* `page`: integer (default: 1)
* `limit`: integer (default: 20)

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
    "items": [
      {
        "id": 1,
        "username": "otaku_uz",
        "email": "otaku@example.com",
        "lightning_coins": 120,
        "is_active": true,
        "created_at": "2026-09-27T12:00:00Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 20
  }
}
```
