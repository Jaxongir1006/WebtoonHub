# 📄 API: O'quvchining Barcha Seanslarini Majburiy Yopish (Terminate Reader Sessions)

## Umumiy Ma'lumot
* **Metod:** `DELETE`
* **Yo'l:** `/api/v1/staff/readers/{id}/sessions`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `users:manage`
* **Tavsif:** Qoidabuzarlik yoki shubhali faollik sodir etgan o'quvchining barcha qurilmalaridagi ochiq seanslarini bekor qilish (Force Logout).

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (O'quvchi ID si)

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
  "message": "Foydalanuvchining barcha seanslari majburiy yakunlandi"
}
```
