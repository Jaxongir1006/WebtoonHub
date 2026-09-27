# 📄 API: Faol Seanslar Ro'yxati (Sessions)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/auth/sessions`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchining hisobiga kirilgan barcha faol qurilmalar va seanslar ro‘yxatini qaytaradi. Joriy so‘rov yuborayotgan qurilma `is_current: true` deb belgilanadi.

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
      "id": "e81d4a04-9842-4919-b68e-9c5950d83637",
      "ip_address": "178.218.201.5",
      "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...",
      "device_type": "Desktop",
      "is_current": true,
      "last_active_at": "2026-09-27T17:55:00Z",
      "created_at": "2026-09-27T12:00:00Z"
    },
    {
      "id": "c19e5b12-1144-4820-a67f-8d4840d71234",
      "ip_address": "84.54.120.33",
      "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)...",
      "device_type": "Mobile",
      "is_current": false,
      "last_active_at": "2026-09-26T19:30:00Z",
      "created_at": "2026-09-26T19:30:00Z"
    }
  ]
}
```
