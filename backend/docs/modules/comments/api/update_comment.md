# 📄 API: Sharhni Moderatsiyada Tahrirlash / Senzura (Update Comment - Staff)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/comments/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `comments:moderate`
* **Tavsif:** Moderator tomonidan sharh ichidagi nomaqbul yoki haqoratli so'zlarni tuzatish / senzura qilish.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Sharh ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "content": "[Moderator tomonidan senzura qilindi] Juda ajoyib bob!"
}
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 12,
    "content": "[Moderator tomonidan senzura qilindi] Juda ajoyib bob!"
  },
  "message": "Sharh muvaffaqiyatli tahrirlandi"
}
```
