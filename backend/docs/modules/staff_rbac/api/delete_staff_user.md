# 📄 API: Xodimni Tizimdan O'chirish (Delete Staff User)

## Umumiy Ma'lumot
* **Metod:** `DELETE`
* **Yo'l:** `/api/v1/staff/users/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `staff:manage`
* **Tavsif:** Xodimni tizimdan butunlay o'chirish yoki xodimlik huquqini tugatish. Superadmin hisobini o'chirish taqiqlanadi.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Xodim ID si)

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
  "message": "Xodim hisobi muvaffaqiyatli o'chirildi"
}
```
