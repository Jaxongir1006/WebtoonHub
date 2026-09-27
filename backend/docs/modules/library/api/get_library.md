# 📄 API: Kutubxonadagi Manhvalarni Olish (Get Library)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/users/library`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchining shaxsiy kutubxonasiga saqlangan barcha manhvalar ro‘yxatini qaytaradi. Status bo‘yicha filtr mavjud.

---

## So'rov Parametrlari (Request)

### Query Parametrlari:
* `status`: string (ixtiyoriy: `reading` | `plan_to_read` | `completed` | `dropped`)

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
      "webtoon": {
        "id": 1,
        "title": "Yakkaxon Ko'tarilish",
        "slug": "solo-leveling",
        "cover_image_url": "http://localhost:9000/webtoon-covers/solo-leveling.webp",
        "status": "completed"
      },
      "reading_status": "reading",
      "updated_at": "2026-09-27T14:30:00Z"
    }
  ]
}
```
