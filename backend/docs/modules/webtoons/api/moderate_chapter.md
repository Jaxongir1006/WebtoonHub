# 📄 API: Bobni Moderatsiyadan O'tkazish (Moderate Chapter)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/chapters/{id}/status`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `chapters:approve`
* **Tavsif:** Admin yoki Moderator kelib tushgan bobni tekshirib, uning holatini `published` (chop etish) yoki `rejected` (rad etish) ga o‘zgartiradi.

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
  "status": "published"
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
    "status": "published"
  },
  "message": "Bob muvaffaqiyatli tasdiqlandi va ommaga e'lon qilindi!"
}
```

### 400 Bad Request (Noto'g'ri status)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS",
    "message": "Status faqat 'published' yoki 'rejected' bo'lishi mumkin",
    "details": null
  }
}
```
