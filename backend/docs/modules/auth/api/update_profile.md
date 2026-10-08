# 📄 API: Profil Ma'lumotlarini Yangilash (Update Profile)

The reader UI now saves username and biography atomically through
[`PATCH /users/profile`](../../users/api/update_profile.md) and changes passwords
as a separate action here. A successful password change revokes every reader and
linked creator session, including the caller; sign in again with the new password.

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
