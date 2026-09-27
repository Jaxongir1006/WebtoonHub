# 📄 API: Janrni Tahrirlash (Update Genre)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/genres/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `webtoons:edit`
* **Tavsif:** Mavjud janr nomi yoki slugini tahrirlash.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Janr ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "name": "Kiberpank & Sci-Fi",
  "slug": "kiberpank-sci-fi"
}
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 8,
    "name": "Kiberpank & Sci-Fi",
    "slug": "kiberpank-sci-fi"
  },
  "message": "Janr muvaffaqiyatli yangilandi"
}
```
