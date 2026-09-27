# 💬 Modul Hujjati: `comments_library` (Sharhlar, Javoblar va Kutubxona)

Ushbu modul manhvalarni o‘qish statuslari bo‘yicha saqlash (Kutubxona) hamda boblar ostida ierarxik sharhlar va ularga javob yozish (Replies) uchun javobgardir.

---

## 1. Kutubxona (Bookmarks & Reading Statuses)

### 1.1 GET `/api/v1/users/library`
Foydalanuvchining o‘z kutubxonasidagi manhvalarni olish. Statuslar bo‘yicha filtrlash imkoni mavjud.
* **Auth**: `Bearer <access_token>`
* **Query parametrlari**:
  * `status`: `reading` | `plan_to_read` | `completed` | `dropped` (ixtiyoriy)

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": [
    {
      "webtoon": {
        "id": 1,
        "title": "Yakkaxon Ko'tarilish",
        "slug": "solo-leveling",
        "cover_image_url": "http://localhost:9000/webtoon-covers/solo-leveling.webp"
      },
      "status": "reading",
      "updated_at": "2026-09-27T14:30:00Z"
    }
  ]
}
```

### 1.2 POST `/api/v1/users/library/{webtoon_id}`
Manhvani kutubxonaga qo‘shish yoki uning o‘qish holatini o‘zgartirish (Upsert).
* **Auth**: `Bearer <access_token>`

### So‘rov Tanasi:
```json
{
  "status": "reading"
}
```

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": null,
  "message": "Kutubxona holati muvaffaqiyatli saqlandi"
}
```

### 1.3 DELETE `/api/v1/users/library/{webtoon_id}`
Manhvani kutubxonadan butunlay o‘chirib tashlash.

---

## 2. Sharhlar va Ierarxik Javoblar (Comments & Nested Replies)

### 2.1 GET `/api/v1/chapters/{id}/comments`
Bob ostidagi barcha sharhlarni ierarxik daraxt ko‘rinishida olish (har bir asosiy sharh ostida unga yozilgan javoblar — `replies` massivi bilan).

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "user": {
        "id": 5,
        "username": "otaku_uz",
        "active_frame_url": "http://localhost:9000/shop-assets/frames/dragon_fire.png"
      },
      "content": "Juda ajoyib bob bo'libdi! Tarjima uchun rahmat!",
      "created_at": "2026-09-27T16:00:00Z",
      "replies": [
        {
          "id": 15,
          "parent_id": 12,
          "user": {
            "id": 8,
            "username": "hunter99",
            "active_frame_url": null
          },
          "content": "Qo'shilaman, chizilishi ham vapshe zo'r!",
          "created_at": "2026-09-27T16:10:00Z"
        }
      ]
    }
  ]
}
```

### 2.2 POST `/api/v1/chapters/{id}/comments`
Yangi sharh yozish yoki mavjud sharhga javob (Reply) qaytarish.
* **Auth**: `Bearer <access_token>`

### So‘rov Tanasi:
```json
{
  "content": "Tarjima uchun rahmat!",
  "parent_id": null
}
```
*(Agar boshqa sharhga javob bo‘lsa, `parent_id: 12` kiritiladi).*

### Javob (Response 201 Created):
```json
{
  "success": true,
  "data": {
    "id": 16,
    "content": "Tarjima uchun rahmat!",
    "created_at": "2026-09-27T17:50:00Z"
  },
  "message": "Sharhingiz muvaffaqiyatli chop etildi"
}
```

### 2.3 DELETE `/api/v1/comments/{id}`
Sharhni o‘chirish:
* O‘quvchi faqat **o‘zining** sharhini o‘chira oladi.
* Admin esa `comments:moderate` ruxsati bilan istalgan nomaqbul sharhni o‘chira oladi.
