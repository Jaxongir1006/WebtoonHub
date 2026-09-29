# 📄 API: Yangi Manhwa Qo'shish (Create Webtoon)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/staff/webtoons`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `webtoons:create`
* **Tavsif:** Creator yoki Admin tomonidan yangi manhva yaratish. Muqova rasmi to‘g‘ridan-to‘g‘ri MinIO `webtoon-covers` savatiga yuklanadi.

---

## So'rov Parametrlari (Request)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data
```

### Form Ma'lumotlari (Form-data):
| Maydon | Tipi | Qoidalar | Tavsif |
| :--- | :--- | :--- | :--- |
| `title` | `string` | Majburiy, 2-255 belgi | Manhwa nomi |
| `type` | `string` | Standart: `manhwa` | Kontent turi: `manhwa`, `manga`, `novel` |
| `description` | `string` | Ixtiyoriy | Asar haqida tavsif |
| `author_name` | `string` | Ixtiyoriy | Asl muallif nomi |
| `status` | `string` | `ongoing` yoki `completed` | Chiqarilish holati |
| `genre_ids` | `string` (JSON array) | Masalan: `[1, 3]` | Tanlangan janrlar ID lari |
| `cover_image` | `file` | Majburiy (JPG/PNG/WebP, max 5MB) | Muqova rasmi |

---

## Javoblar (Responses)

### 201 Created (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 2,
    "title": "Sehrgarning Qaytishi",
    "slug": "sehrgarning-qaytishi",
    "cover_image_url": "http://localhost:9000/webtoon-covers/sehrgarning-qaytishi.webp",
    "status": "ongoing"
  },
  "message": "Yangi manhva muvaffaqiyatli yaratildi"
}
```
