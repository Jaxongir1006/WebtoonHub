# 📄 API: Manhvani Tahrirlash (Update Webtoon)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/webtoons/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `webtoons:edit`
* **Tavsif:** Manhvaning nomi, tavsifi, muallifi, janrlari yoki uning holatini (`ongoing` / `completed`) tahrirlash.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Manhwa ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data (yoki application/json agar rasm yangilanmasa)
```

### Form / JSON Maydonlari:
| Maydon | Tipi | Qoidalar | Tavsif |
| :--- | :--- | :--- | :--- |
| `title` | `string` | Ixtiyoriy | Yangi nom |
| `description` | `string` | Ixtiyoriy | Yangi tavsif |
| `author_name` | `string` | Ixtiyoriy | Muallif nomi |
| `status` | `string` | Ixtiyoriy (`ongoing` / `completed`) | Holati |
| `genre_ids` | `string` / `list[int]` | Ixtiyoriy | Janr ID lari |
| `cover_image` | `file` | Ixtiyoriy | Yangi muqova rasmi |

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Yakkaxon Ko'tarilish (Tahrirlangan)",
    "slug": "solo-leveling",
    "status": "completed",
    "cover_image_url": "http://localhost:9000/webtoon-covers/new_cover.webp"
  },
  "message": "Manhwa ma'lumotlari muvaffaqiyatli yangilandi"
}
```
