# 📄 API: Bob Mutolaasi Mukofoti (Chapter Reward)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/chapters/{id}/reward`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchi vertikal Reader ostidagi "Bobni yakunlash" tugmasini bosganda **+5 ⚡ Chaqmoq** beriladi.

---

## Biznes Mantiqiy Jarayon (Nakrutka Himoyasi)
1. `read_rewards` jadvali orqali `(user_id, chapter_id)` juftligi qidiriladi.
2. Agar ushbu foydalanuvchi mazkur bob uchun avval chaqmoq olgan bo‘lsa, so‘rov 400 xatolik bilan to‘xtatiladi.
3. Agar olinmagan bo‘lsa:
   * Baza tranzaksiyasida `read_rewards` jadvaliga `(user_id, chapter_id, coins_earned=5)` qo‘shiladi.
   * `users.lightning_coins` balansi 5 ga oshiriladi.
   * Tranzaksiya commit qilinadi.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Bob ID si)

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
    "chapter_id": 101,
    "reward_amount": 5,
    "total_lightning_coins": 70
  },
  "message": "Bob yakunlandi! +5 Chaqmoq hisobingizga muvaffaqiyatli qo'shildi."
}
```

### 400 Bad Request (Mukofot avval olingan)
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
