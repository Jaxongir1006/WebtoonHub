# 📄 API: Chaqmoq Iqtisodiyoti Statistikasi (Coins Summary)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/coins/summary`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `analytics:view`
* **Tavsif:** Platformadagi chaqmoqlar balansi: jami berilgan, sarflangan, xarid qilingan buyumlar va muomaladagi tangalar miqdori.

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
    "total_coins_in_wallets": 72500,
    "total_coins_earned_all_time": 120000,
    "total_coins_spent_in_shop": 47500,
    "total_transactions_count": 5280
  }
}
```
