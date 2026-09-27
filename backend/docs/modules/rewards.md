# ⚡ Modul Hujjati: `rewards` (Chaqmoq Gamifikatsiyasi va Mukofotlar)

Ushbu modul platformadagi bepul ichki ballar — **Chaqmoq (⚡)** iqtisodiyoti, kunlik Toshkent vaqti bo‘yicha bonus va bob mutolaasi mukofotlarini xavfsiz hisoblash uchun javobgardir.

---

## 1. POST `/api/v1/rewards/daily-checkin`
Har kuni bir marta saytga kirganda olinadigan kunlik bonus (**+15 ⚡ Chaqmoq**).
* **Vaqt mintaqasi**: `Asia/Tashkent` (UTC+5) bo‘yicha 00:00 da yangilanadi.
* **Auth**: `Bearer <access_token>`

### Mantiqiy tekshiruv:
1. Foydalanuvchining `last_daily_login` vaqti `Asia/Tashkent` vaqt zonasiga o‘tkaziladi.
2. Joriy sana bilan oxirgi olingan sana solishtiriladi (`current_tashkent_date > last_claimed_tashkent_date`).
3. Agar bugun hali olinmagan bo‘lsa:
   * `users.lightning_coins += 15`
   * `users.last_daily_login = now()`
4. Agar bugun allaqachon olingan bo‘lsa, xatolik qaytariladi.

### Javob (Response 200 OK — Muvaffaqiyatli):
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

### Javob (Response 400 Bad Request — Allaqachon olingan):
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

---

## 2. POST `/api/v1/chapters/{id}/reward`
Bobni to‘liq o‘qib tugatganda pastdagi "Bobni yakunlash" tugmasini bosganda beriladigan mukofot (**+5 ⚡ Chaqmoq**).
* **Auth**: `Bearer <access_token>`
* **Nakrutkaga qarshi himoya**: Bitta o‘quvchi ayni bitta bob uchun faqat 1 marta mukofot olishi mumkin (`read_rewards` jadvalidagi `UNIQUE(user_id, chapter_id)` orqali qat'iy kafolatlanadi).

### Mantiqiy tekshiruv:
1. `read_rewards` jadvalidan `(user_id, chapter_id)` mavjudligi tekshiriladi.
2. Agar mavjud bo‘lsa -> 400 xatolik ("Mukofot allaqachon olingan").
3. Agar yo‘q bo‘lsa:
   * `read_rewards` ga yangi yozuv qo‘shiladi (`coins_earned = 5`).
   * `users.lightning_coins += 5`.
   * Tranzaksiya tasdiqlanadi (commit).

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": {
    "chapter_id": 101,
    "reward_amount": 5,
    "total_lightning_coins": 70
  },
  "message": "Bob yakunlandi! +5 Chaqmoq hisobingizga muvaffaqiyatli qo'shildi."
}
```

### Javob (Response 400 Bad Request):
```json
{
  "success": false,
  "error": {
    "code": "REWARD_ALREADY_CLAIMED",
    "message": "Siz ushbu bob uchun avval mukofot olgansiz.",
    "details": null
  }
}
```
