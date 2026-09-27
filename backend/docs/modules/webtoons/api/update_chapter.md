# 📄 API: Bob Ma'lumotlarini Tahrirlash (Update Chapter)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/chapters/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `chapters:create` yoki `chapters:approve`
* **Tavsif:** Bob raqami, sarlavhasi yoki mutolaa mukofoti miqdorini tahrirlash.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Bob ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "chapter_number": 2.5,
  "title": "2.5-bob: Maxsus epizod",
  "reward_coins": 10
}
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 105,
    "chapter_number": 2.5,
    "title": "2.5-bob: Maxsus epizod",
    "reward_coins": 10
  },
  "message": "Bob ma'lumotlari muvaffaqiyatli yangilandi"
}
```
