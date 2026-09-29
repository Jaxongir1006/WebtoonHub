# 📄 API: Vertikal Reader (Read Chapter)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/chapters/{id}`
* **Avtorizatsiya:** Ixtiyoriy (Mehmonlar ham o‘qiy oladi, lekin kirgan foydalanuvchilar mukofot holatini ko‘ra oladi)
* **Tavsif:** Bobning barcha rasmlarini tartiblangan (`order_index`) holda vertikal o‘qish uchun taqdim etadi. Shuningdek oldingi va keyingi bob ID larini qaytaradi.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Bob ID si)

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 101,
    "webtoon_id": 1,
    "webtoon_title": "Yakkaxon Ko'tarilish",
    "webtoon_type": "manhwa",
    "chapter_number": 1.0,
    "title": "Muqaddima: Qo'shaloq xandaq",
    "reward_coins": 5,
    "is_reward_claimed": false,
    "content_text": null,
    "images": [
      {
        "id": 1,
        "image_url": "http://localhost:9000/chapter-images/101/01.webp",
        "order_index": 1
      },
      {
        "id": 2,
        "image_url": "http://localhost:9000/chapter-images/101/02.webp",
        "order_index": 2
      }
    ],
    "prev_chapter_id": null,
    "next_chapter_id": 102
  }
}
```
*Eslatma:* Agar `webtoon_type === 'novel'` bo'lsa, `content_text` maydonida Markdown / Rich text qaytadi, `images` esa bo'sh yoki ixtiyoriy illyustratsiyalardan iborat bo'ladi. Agar `webtoon_type === 'manga'` bo'lsa, rasmlar o'ngdan chapga gorizontal o'qish uchun mo'ljallanadi.

### 403 Forbidden (Bob hali chop etilmagan)
```json
{
  "success": false,
  "error": {
    "code": "CHAPTER_NOT_PUBLISHED",
    "message": "Ushbu bob hali moderatorlar tomonidan tekshirilmoqda",
    "details": null
  }
}
```
