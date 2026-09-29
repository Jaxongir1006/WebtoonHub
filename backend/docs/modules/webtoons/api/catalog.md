# 📄 API: Manhvalar Katalogi (Catalog & Search)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/webtoons`
* **Avtorizatsiya:** Kerak emas (Ochiq)
* **Tavsif:** Manhvalar katalogini qidiruv, janrlar bo‘yicha filtr va sahifalash bilan qaytaradi. Redis orqali keshlanadi.

---

## So'rov Parametrlari (Request Query Params)
| Parametr | Tipi | Default | Tavsif |
| :--- | :--- | :--- | :--- |
| `page` | `integer` | `1` | Sahifa raqami |
| `limit` | `integer` | `20` | Har bir sahifadagi elementlar soni |
| `type` | `string` | `null` | Kontent turi: `manhwa`, `manga`, `novel` |
| `genre` | `string` | `null` | Janr slugi bo‘yicha filtr (masalan: `jangari`) |
| `status` | `string` | `null` | Holat: `ongoing` yoki `completed` |
| `search` | `string` | `null` | Nomi yoki muallifi bo‘yicha qidiruv so‘zi |

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
        "title": "Yakkaxon Ko'tarilish (Solo Leveling)",
        "slug": "solo-leveling",
        "type": "manhwa",
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
# Catalog response additions

Each catalog item includes `description`, `first_chapter`, and `latest_chapter`. A chapter summary contains `id`, `chapter_number`, and `created_at`; either chapter field is `null` when there are no published chapters. The reader's Start Reading action uses `first_chapter.id`.
