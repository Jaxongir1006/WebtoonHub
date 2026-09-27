# 📄 API: Admin Boshqaruv Paneli Statistikasi (Analytics Dashboard)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/analytics/dashboard`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `analytics:view`
* **Tavsif:** Boshqaruv paneli (Dashboard) uchun platformadagi umumiy ko'rsatkichlar: o'quvchilar soni, manhvalar, kutilayotgan arizalar va boblar, umumiy tangalar aylanmasi.

---

## So'rov Parametrlari (Request)

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
  "data": {
    "total_readers": 1250,
    "total_webtoons": 48,
    "total_chapters": 420,
    "pending_chapters": 5,
    "pending_creator_requests": 3,
    "total_comments": 3120,
    "total_coins_in_circulation": 62500
  }
}
```
