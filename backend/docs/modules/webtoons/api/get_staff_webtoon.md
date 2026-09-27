# 📄 API: Manhva Tafsilotlarini Olish (Staff / Admin)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/webtoons/{id_or_slug}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `webtoons:create` yoki `webtoons:edit` yoki `analytics:view`
* **Tavsif:** Boshqaruv paneli uchun manhvaning to'liq ma'lumotlari va barcha boblari ro'yxatini olish.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id_or_slug`: integer yoki string (Manhvaning ID si yoki slugi)

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Yakkaxon daraja ko'tarish",
    "slug": "yakkaxon-daraja-kotarish",
    "description": "Eng kuchsiz ovchining eng qudratli hukmdorga aylanish tarixi...",
    "cover_image_url": "http://localhost:9000/webtoon-covers/solo.jpg",
    "author_name": "Chugong",
    "status": "ongoing",
    "view_count": 14200,
    "genres": ["Jangari", "Fantaziya"],
    "chapters": [
      {
        "id": 10,
        "chapter_number": 1.0,
        "title": "1-bob: Boshlanish",
        "reward_coins": 5,
        "status": "published",
        "created_at": "2026-09-27T10:00:00Z"
      }
    ]
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Manhwa topilmadi"
  }
}
```
