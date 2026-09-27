# 📄 API: Xodimning Faol Seanslari (Staff Sessions)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/auth/sessions`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Tavsif:** Boshqaruv xodimining Admin panelga kirilgan barcha faol qurilmalari va seanslarini ko‘rsatadi.

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
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "ip_address": "178.218.201.5",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "device_type": "Desktop",
      "is_current": true,
      "last_active_at": "2026-09-27T17:50:00Z",
      "created_at": "2026-09-27T14:00:00Z"
    }
  ]
}
```
