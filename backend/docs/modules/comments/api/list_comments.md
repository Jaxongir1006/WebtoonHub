# 📄 API: Bob Sharhlarini Olish (List Comments)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/chapters/{id}/comments`
* **Avtorizatsiya:** Kerak emas (Ochiq)
* **Tavsif:** Bob ostidagi barcha sharhlar va ularga yozilgan ierarxik javoblarni (`replies`) foydalanuvchining faol avatar ramkasi bilan birga qaytaradi.

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
