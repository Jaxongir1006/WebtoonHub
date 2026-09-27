# 📄 API: Moderatsiya Uchun Barcha Boblar Ro'yxati (Staff / Admin)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/chapters`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `chapters:approve` yoki `chapters:create`
* **Tavsif:** Boshqaruv paneli moderatsiya navbatida barcha manhvalar bo'yicha boblarni statusi bo'yicha filtrlash bilan olish.

---

## So'rov Parametrlari (Request)

### Query Parametrlari:
| Parametr | Tipi | Majburiyligi | Tavsif |
| :--- | :--- | :--- | :--- |
| `status` | string | Ixtiyoriy | `pending`, `published`, `rejected` |
| `webtoon_id` | integer | Ixtiyoriy | Muayyan manhva bo'yicha filtr |
| `page` | integer | Ixtiyoriy (default: 1) | Sahifa raqami |
| `limit` | integer | Ixtiyoriy (default: 20) | Sahifadagi boblar soni |

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 15,
        "webtoon_id": 1,
        "webtoon_title": "Yakkaxon daraja ko'tarish",
        "webtoon_cover": "http://localhost:9000/webtoon-covers/solo.jpg",
        "chapter_number": 2.0,
        "title": "2-bob: Ikki karra uyg'onish",
        "status": "pending",
        "reward_coins": 5,
        "images_count": 18,
        "created_at": "2026-09-27T12:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```
