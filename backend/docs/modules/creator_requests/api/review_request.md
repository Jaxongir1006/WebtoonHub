# 📄 API: Creatorlik Arizasini Ko'rib Chiqish (Review Creator Request)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/creator-requests/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `users:manage`
* **Tavsif:** Admin arizani tasdiqlaydi (`approved`) yoki rad etadi (`rejected`). Tasdiqlanganda, foydalanuvchiga Creator xodim hisobi ochilib, Studio ga kirish huquqi beriladi.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Ariza ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "status": "approved"
}
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "approved",
    "reviewed_at": "2026-09-27T18:00:00Z"
  },
  "message": "Foydalanuvchi muvaffaqiyatli Creator etib tayinlandi!"
}
```
