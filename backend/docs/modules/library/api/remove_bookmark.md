# 📄 API: Manhvani Kutubxonadan O'chirish (Remove Bookmark)

## Umumiy Ma'lumot
* **Metod:** `DELETE`
* **Yo'l:** `/api/v1/users/library/{webtoon_id}`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Manhvani foydalanuvchining shaxsiy kutubxonasidan butunlay olib tashlaydi.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `webtoon_id`: integer (Manhwa ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": null,
  "message": "Manhwa kutubxonangizdan o'chirildi"
}
```
