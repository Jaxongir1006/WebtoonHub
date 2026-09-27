# 📄 API: Xodim Ma'lumotlarini Tahrirlash (Update Staff User)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/users/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `staff:manage`
* **Tavsif:** Xodimning ismi, emaili, paroli yoki uning faollik holatini (`is_active`) tahrirlash.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Xodim ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "username": "ali_senior",
  "is_active": true
}
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "ali_senior",
    "email": "ali@webtoonhub.uz",
    "is_active": true
  },
  "message": "Xodim ma'lumotlari muvaffaqiyatli yangilandi"
}
```
