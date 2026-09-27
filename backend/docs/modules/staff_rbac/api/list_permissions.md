# 📄 API: Ruxsatlar Katalogi (List Permissions)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/permissions`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `roles:manage`
* **Tavsif:** Tizimda mavjud bo‘lgan barcha tizimli ruxsatlar katalogini olish. Yangi rol yaratishda ushbu ro‘yxatdan tanlanadi.

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
  "data": [
    { "id": 1, "code": "webtoons:create", "description": "Yangi manhwa kartochkasi yaratish" },
    { "id": 2, "code": "webtoons:edit", "description": "Mavjud manhvalarni tahrirlash" },
    { "id": 3, "code": "chapters:create", "description": "Bob ochish va rasmlarni yuklash" },
    { "id": 4, "code": "chapters:approve", "description": "Bob moderatsiyasidan o'tkazish" },
    { "id": 5, "code": "shop:manage", "description": "Shop buyumlarini kiritish va tahrirlash" },
    { "id": 6, "code": "users:manage", "description": "Foydalanuvchilar chaqmoq balansi va bloklash" },
    { "id": 7, "code": "roles:manage", "description": "Rollar va xodimlarni boshqarish" },
    { "id": 8, "code": "comments:moderate", "description": "Nomaqbul sharhlarni o'chirish" }
  ]
}
```
