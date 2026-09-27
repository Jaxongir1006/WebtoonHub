# 📄 API: Manhvani O'chirish (Delete Webtoon)

## Umumiy Ma'lumot
* **Metod:** `DELETE`
* **Yo'l:** `/api/v1/staff/webtoons/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `webtoons:delete`
* **Tavsif:** Manhva va unga bog'liq barcha boblar, rasmlar, sharhlar hamda xatcho'plarni butunlay o'chirish (Kaskadli o'chirish).

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Manhwa ID si)

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
  "message": "Manhwa va uning barcha materiallari muvaffaqiyatli o'chirildi"
}
```
