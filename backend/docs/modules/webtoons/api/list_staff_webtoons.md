# 📄 API: Manhvalar Ro'yxatini Olish (Staff / Admin)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/webtoons`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `webtoons:create` yoki `webtoons:edit` yoki `analytics:view`
* **Tavsif:** Boshqaruv paneli uchun barcha manhvalar katalogini filtrlash va qidirish bilan olish.

---

## So'rov Parametrlari (Request)

### Query Parametrlari:
| Parametr | Tipi | Majburiyligi | Tavsif |
| :--- | :--- | :--- | :--- |
| `page` | integer | Ixtiyoriy (default: 1) | Sahifa raqami |
| `limit` | integer | Ixtiyoriy (default: 50) | Sahifadagi manhvalar soni (1-100) |
| `search` | string | Ixtiyoriy | Nomi yoki muallifi bo'yicha qidiruv |
| `status` | string | Ixtiyoriy | `ongoing` yoki `completed` |
| `genre_id` | integer | Ixtiyoriy | Janr bo'yicha filtr |

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
        "title": "Yakkaxon daraja ko'tarish",
        "slug": "yakkaxon-daraja-kotarish",
        "cover_image_url": "http://localhost:9000/webtoon-covers/solo.jpg",
        "author_name": "Chugong",
        "status": "ongoing",
        "view_count": 14200,
        "genres": ["Jangari", "Fantaziya"],
        "latest_chapter": {
          "id": 12,
          "chapter_number": 12.0,
          "created_at": "2026-09-27T10:00:00Z"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```
