# 📄 API: Profil Ma'lumotlarini Yangilash (Update Profile)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/auth/profile`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchi o‘zining taxallusini (`username`) yoki parolini yangilaydi.

---

## So'rov Parametrlari (Request)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "username": "new_otaku_name",
  "old_password": "OldPassword123!",
  "new_password": "NewPassword123!"
}
```
*(Barcha maydonlar ixtiyoriy, ammo yangi parol kiritilganda `old_password` talab qilinadi).*

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 5,
    "username": "new_otaku_name",
    "email": "otaku@example.com"
  },
  "message": "Profil ma'lumotlari muvaffaqiyatli yangilandi"
}
```
