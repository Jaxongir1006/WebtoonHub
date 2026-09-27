# 📄 API: O'quvchiga Tangalar Berish / Ayirish (Adjust User Coins)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/staff/readers/{id}/coins`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `users:manage`
* **Tavsif:** Muayyan o'quvchi balansiga sabab ko'rsatilgan holda tanga qo'shish yoki yechish (tranzaksiyalar tarixiga yoziladi).

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (O'quvchi ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "amount_delta": 50,
  "reason": "Tarjimonlik tanlovi 1-o'rin sohibi"
}
```
*(Manfiy qiymat kiritilsa jarima sifatida balansdan ayriladi, masalan: `-20`).*

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "user_id": 5,
    "previous_coins": 120,
    "new_coins": 170,
    "amount_delta": 50,
    "reason": "Tarjimonlik tanlovi 1-o'rin sohibi"
  },
  "message": "Foydalanuvchi balansi muvaffaqiyatli o'zgartirildi"
}
```
