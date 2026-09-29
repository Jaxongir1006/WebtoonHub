"""Default staff permissions shared by bootstrap and development seeding."""

DEFAULT_PERMISSIONS = [
    {"code": "webtoons:create", "description": "Yangi komiks/novel kartochkasi yaratish"},
    {"code": "webtoons:edit", "description": "Mavjud asarlarni tahrirlash"},
    {"code": "webtoons:delete", "description": "Asarlarni o'chirish"},
    {"code": "chapters:create", "description": "Bob ochish va rasmlar/matn yuklash"},
    {"code": "chapters:edit", "description": "Bob ma'lumotlarini tahrirlash"},
    {"code": "chapters:delete", "description": "Bobni tizimdan o'chirish"},
    {"code": "chapters:approve", "description": "Bob moderatsiyasidan o'tkazish"},
    {"code": "genres:manage", "description": "Janrlarni boshqarish"},
    {"code": "shop:manage", "description": "Shop buyumlarini kiritish va tahrirlash"},
    {"code": "wheel:manage", "description": "Omad charxi (ruletka) va yutuqlarni boshqarish"},
    {"code": "users:manage", "description": "Foydalanuvchilar chaqmoq balansi va arizalari"},
    {"code": "coins:view", "description": "Chaqmoq tranzaksiyalari va statistikasini ko'rish"},
    {"code": "coins:adjust", "description": "Foydalanuvchi chaqmoq balansini o'zgartirish"},
    {"code": "coins:distribute", "description": "Ommaviy chaqmoq ulashish"},
    {"code": "roles:manage", "description": "Rollar va ruxsatlarni boshqarish"},
    {"code": "staff:manage", "description": "Xodimlarni boshqarish va rol tayinlash"},
    {"code": "settings:manage", "description": "Tizim sozlamalarini boshqarish"},
    {"code": "comments:moderate", "description": "Nomaqbul sharhlarni o'chirish"},
    {"code": "analytics:view", "description": "Statistika va hisobotlarni ko'rish"},
]
