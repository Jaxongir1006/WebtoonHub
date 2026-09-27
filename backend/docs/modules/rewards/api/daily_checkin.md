# 📄 API: Kunlik Bonus Olish (Daily Check-in)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/rewards/daily-checkin`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchi saytga kirganda kunlik **+15 ⚡ Chaqmoq** balansini oladi.

---

## Biznes Mantiqiy Jarayon
1. Server joriy vaqtni `Asia/Tashkent` mintaqasiga o‘tkazadi: `now_uz`.
2. Foydalanuvchining `last_daily_login` qiymati ham `Asia/Tashkent` ga o‘tkaziladi: `last_login_uz`.
3. Agar `now_uz.date() == last_login_uz.date()` bo‘lsa, bugun allaqachon olingan hisoblanadi.
4. Agar `now_uz.date() > last_login_uz.date()` (yoki umuman hali olinmagan) bo‘lsa:
   * `user.lightning_coins += 15`
   * `user.last_daily_login = now()`
   * Javobda yangi balans qaytariladi.

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
    "reward_amount": 15,
    "total_lightning_coins": 65,
    "claimed_at": "2026-09-27T17:50:00+05:00"
  },
  "message": "Kunlik bonus: +15 Chaqmoq hisobingizga qo'shildi!"
}
```

### 400 Bad Request (Bugun allaqachon olingan)
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_CLAIMED_TODAY",
    "message": "Bugungi kunlik bonus allaqachon olingan. Keyingi bonus Toshkent vaqti bilan 00:00 da ochiladi.",
    "details": null
  }
}
```
