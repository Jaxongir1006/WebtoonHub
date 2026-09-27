# 📄 API: Yangi Janr Qo'shish (Create Genre)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/staff/genres`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `webtoons:create`
* **Tavsif:** Platformaga yangi janr kiritish.

---

## So'rov Parametrlari (Request)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "name": "Kiberpank",
  "slug": "kiberpank"
}
```

---

## Javoblar (Responses)

### 201 Created (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 8,
    "name": "Kiberpank",
    "slug": "kiberpank"
  },
  "message": "Yangi janr muvaffaqiyatli qo'shildi"
}
```
