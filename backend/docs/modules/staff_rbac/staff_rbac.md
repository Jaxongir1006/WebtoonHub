# 🛡 Modul Hujjati: `staff_rbac` (Admin Xodimlari va Dinamik RBAC)

## 1. Modul Tavsifi
Ushbu modul Admin / Studio boshqaruv paneliga kiruvchi xodimlarning hisoblari (`staff_users`), alohida xodim seanslari (`staff_sessions`) hamda moslashuvchan dinamik rollar va ruxsatlar (`roles`, `permissions`, `role_permissions`) tizimini boshqaradi.

---

## 2. Biznes Qoidalari
1. **To‘liq ajratilgan avtorizatsiya:** Boshqaruv xodimlari oddiy sayt foydalanuvchilari bilan aralashmaydi va o‘zlarining maxsus `/api/v1/staff/auth/login` endpointi orqali kiradi.
2. **Moslashuvchan RBAC:** Rollar qat'iy yozilmagan, Superadmin xohlagan yangi rolni (masalan, `viewer`, `moderator`, `translator`) yaratib, unga tizimdagi aniq ruxsatlarni biriktira oladi.
3. **Huquqlar tekshiruvi (Permissions Guard):** Har bir boshqaruv API so‘rovi xodimning roliga biriktirilgan `permissions` ro‘yxati bo‘yicha tekshiriladi (masalan, `webtoons:create`, `chapters:approve`).

---

## 3. Ushbu Modulning API Endpointlari
* [POST /api/v1/staff/auth/login](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/staff_rbac/api/login.md) — Xodimlar tizimga kirishi
* [GET /api/v1/staff/auth/me](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/staff_rbac/api/me.md) — Xodim profili, roli va huquqlari ro‘yxati
* [GET /api/v1/staff/auth/sessions](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/staff_rbac/api/sessions.md) — Xodimning faol seanslari
* [GET /api/v1/staff/roles](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/staff_rbac/api/list_roles.md) — Mavjud rollar ro‘yxatini olish
* [POST /api/v1/staff/roles](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/staff_rbac/api/create_role.md) — Yangi dinamik rol yaratish
* [GET /api/v1/staff/permissions](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/staff_rbac/api/list_permissions.md) — Tizim ruxsatlari katalogi
* [PATCH /api/v1/staff/users/{id}/role](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/staff_rbac/api/update_staff_role.md) — Xodimning rolini o‘zgartirish
