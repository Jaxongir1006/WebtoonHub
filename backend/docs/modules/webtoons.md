# 📚 Modul Hujjati: `webtoons` (Manhvalar, Boblar va Reader)

Ushbu modul manhvalar katalogi, qidiruv va filtrlar, vertikal Webtoon Reader va MinIO object storage orqali rasmlarni boshqarish uchun javobgardir.

---

## 1. GET `/api/v1/webtoons`
Manhvalar katalogini olish. Qidiruv, janr bo‘yicha filtr va sahifalash imkoniyati mavjud. Redis orqali keshlangan (< 50ms javob beradi).

### Query Parametrlari:
* `page`: int (default: 1)
* `limit`: int (default: 20)
* `genre`: string (ixtiyoriy, masalan: `action`)
* `status`: string (ixtiyoriy: `ongoing` | `completed`)
* `search`: string (nomi yoki muallif bo‘yicha qidiruv)

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "Yakkaxon Ko'tarilish (Solo Leveling)",
        "slug": "solo-leveling",
        "cover_image_url": "http://localhost:9000/webtoon-covers/solo-leveling.webp",
        "author_name": "Chugong",
        "status": "completed",
        "view_count": 14200,
        "genres": ["Jangari", "Fantaziya"],
        "latest_chapter": {
          "number": 179.0,
          "created_at": "2026-09-25T10:00:00Z"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

---

## 2. GET `/api/v1/webtoons/{id_or_slug}`
Bitta manhvaning to‘liq kartochkasi va uning barcha e'lon qilingan (`published`) boblari ro‘yxati.

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Yakkaxon Ko'tarilish",
    "description": "Eng kuchsiz ovchidan eng buyuk hukmdorgacha bo'lgan yo'l...",
    "cover_image_url": "http://localhost:9000/webtoon-covers/solo-leveling.webp",
    "author_name": "Chugong",
    "status": "completed",
    "view_count": 14201,
    "genres": ["Jangari", "Fantaziya"],
    "chapters": [
      {
        "id": 101,
        "chapter_number": 1.0,
        "title": "Muqaddima: D-darajali reyd",
        "reward_coins": 5,
        "is_claimed": false,
        "created_at": "2026-09-20T12:00:00Z"
      }
    ]
  }
}
```

---

## 3. GET `/api/v1/chapters/{id}` (Vertikal Webtoon Reader)
Bob rasmlarini uzluksiz o‘qish uchun olish. Rasmlar `order_index` bo‘yicha to‘g‘ri tartiblangan holda keladi.

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": {
    "id": 101,
    "webtoon_id": 1,
    "webtoon_title": "Yakkaxon Ko'tarilish",
    "chapter_number": 1.0,
    "title": "Muqaddima: D-darajali reyd",
    "reward_coins": 5,
    "is_reward_claimed": false,
    "images": [
      { "id": 1, "image_url": "http://localhost:9000/chapter-images/101/01.webp", "order_index": 1 },
      { "id": 2, "image_url": "http://localhost:9000/chapter-images/101/02.webp", "order_index": 2 }
    ],
    "prev_chapter_id": null,
    "next_chapter_id": 102
  }
}
```

---

## 4. POST `/api/v1/staff/chapters` (Creator / Staff)
Yangi bob ochish va uning barcha rasmlarini to‘plam qilib MinIO ga yuklash. Bob avtomatik ravishda `status = 'pending'` holatida bo‘ladi.
* **Content-Type**: `multipart/form-data`
* **Permission**: `chapters:create`

### Form Maydonlari:
* `webtoon_id`: int
* `chapter_number`: float (masalan: `1.0`)
* `title`: string (ixtiyoriy)
* `images`: File[] (ko‘p miqdordagi rasmlar to‘plami)

### Javob (Response 201 Created):
```json
{
  "success": true,
  "data": {
    "id": 105,
    "chapter_number": 2.0,
    "status": "pending",
    "images_count": 28
  },
  "message": "Bob rasmlari muvaffaqiyatli yuklandi va tekshiruvga yuborildi"
}
```

---

## 5. PATCH `/api/v1/staff/chapters/{id}/status` (Moderatsiya)
Admin tomonidan bobni tekshirib, uni e'lon qilish (`published`) yoki rad etish (`rejected`).
* **Auth**: `Bearer <staff_token>`
* **Permission**: `chapters:approve`

### So‘rov Tanasi:
```json
{
  "status": "published"
}
```

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": null,
  "message": "Bob muvaffaqiyatli tasdiqlandi va ommaga e'lon qilindi"
}
```
