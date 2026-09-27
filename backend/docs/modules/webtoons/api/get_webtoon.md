# 📄 API: Manhvaning To'liq Sahifasi (Get Webtoon)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/webtoons/{id_or_slug}`
* **Avtorizatsiya:** Kerak emas (Ochiq)
* **Tavsif:** Manhvaning batafsil ma'lumotlari va faqat e'lon qilingan (`published`) boblari ro‘yxatini chiqaradi. Kirgan foydalanuvchi bo‘lsa, qaysi boblar uchun chaqmoq olgani (`is_claimed`) ko‘rsatiladi.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id_or_slug`: Manhvaning ID si (masalan: `1`) yoki slugi (masalan: `solo-leveling`)

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Yakkaxon Ko'tarilish",
    "slug": "solo-leveling",
    "description": "Eng kuchsiz E-darajali ovchidan eng qudratli soyalar hukmdorigacha bo'lgan yo'l...",
    "cover_image_url": "http://localhost:9000/webtoon-covers/solo-leveling.webp",
    "author_name": "Chugong",
    "status": "completed",
    "view_count": 14201,
    "genres": ["Jangari", "Fantaziya"],
    "chapters": [
      {
        "id": 101,
        "chapter_number": 1.0,
        "title": "Muqaddima: Qo'shaloq xandaq",
        "reward_coins": 5,
        "is_claimed": false,
        "created_at": "2026-09-20T12:00:00Z"
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
    "code": "WEBTOON_NOT_FOUND",
    "message": "Bunday manhva topilmadi",
    "details": null
  }
}
```
