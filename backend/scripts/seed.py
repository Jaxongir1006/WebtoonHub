import asyncio
import logging
import app.models  # Ensure all SQLAlchemy models are registered
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.modules.staff.models import Permission, Role, StaffUser
from app.modules.webtoons.models import Genre

logger = logging.getLogger(__name__)

DEFAULT_PERMISSIONS = [
    {"code": "webtoons:create", "description": "Yangi manhwa kartochkasi yaratish"},
    {"code": "webtoons:edit", "description": "Mavjud manhvalarni tahrirlash"},
    {"code": "webtoons:delete", "description": "Manhvalarni o'chirish"},
    {"code": "chapters:create", "description": "Bob ochish va rasmlarni yuklash"},
    {"code": "chapters:approve", "description": "Bob moderatsiyasidan o'tkazish"},
    {"code": "shop:manage", "description": "Shop buyumlarini kiritish va tahrirlash"},
    {"code": "users:manage", "description": "Foydalanuvchilar chaqmoq balansi va arizalari"},
    {"code": "roles:manage", "description": "Rollar va ruxsatlarni boshqarish"},
    {"code": "staff:manage", "description": "Xodimlarni boshqarish va rol tayinlash"},
    {"code": "comments:moderate", "description": "Nomaqbul sharhlarni o'chirish"},
    {"code": "analytics:view", "description": "Statistika va hisobotlarni ko'rish"}
]

DEFAULT_GENRES = [
    {"name": "Jangari", "slug": "jangari"},
    {"name": "Romantika", "slug": "romantika"},
    {"name": "Fantaziya", "slug": "fantaziya"},
    {"name": "Komediya", "slug": "komediya"},
    {"name": "Dramma", "slug": "dramma"},
    {"name": "Tirik qolish", "slug": "tirik-qolish"},
    {"name": "Tizim / Isekai", "slug": "tizim-isekai"}
]


async def seed_data():
    async with AsyncSessionLocal() as db:
        logger.info("1. Seeding permissions...")
        perm_map = {}
        for p in DEFAULT_PERMISSIONS:
            stmt = select(Permission).where(Permission.code == p["code"])
            res = await db.execute(stmt)
            obj = res.scalar_one_or_none()
            if not obj:
                obj = Permission(code=p["code"], description=p["description"])
                db.add(obj)
                await db.flush()
            perm_map[p["code"]] = obj

        logger.info("2. Seeding default roles...")
        roles_config = [
            {
                "name": "superadmin",
                "description": "To'liq boshqaruv huquqiga ega tizim rahbari",
                "perms": list(perm_map.values())
            },
            {
                "name": "creator",
                "description": "Komiks yuklovchi tarjimon",
                "perms": [perm_map["webtoons:create"], perm_map["chapters:create"]]
            },
            {
                "name": "moderator",
                "description": "Boblar va sharhlarni tekshiruvchi",
                "perms": [perm_map["chapters:approve"], perm_map["comments:moderate"]]
            },
            {
                "name": "viewer",
                "description": "Faqat ko'rish va kuzatish",
                "perms": [perm_map["analytics:view"]]
            }
        ]

        superadmin_role = None
        for rc in roles_config:
            stmt = select(Role).where(Role.name == rc["name"])
            res = await db.execute(stmt)
            r_obj = res.scalar_one_or_none()
            if not r_obj:
                r_obj = Role(name=rc["name"], description=rc["description"], permissions=rc["perms"])
                db.add(r_obj)
                await db.flush()
            if rc["name"] == "superadmin":
                superadmin_role = r_obj

        logger.info("3. Seeding Superadmin account...")
        admin_email = "admin@webtoonhub.uz"
        stmt = select(StaffUser).where(StaffUser.email == admin_email)
        res = await db.execute(stmt)
        admin_user = res.scalar_one_or_none()
        if not admin_user and superadmin_role:
            admin_user = StaffUser(
                username="superadmin",
                email=admin_email,
                hashed_password=hash_password("AdminPassword123"),
                role_id=superadmin_role.id,
                is_active=True
            )
            db.add(admin_user)

        logger.info("4. Seeding default genres...")
        for g in DEFAULT_GENRES:
            stmt = select(Genre).where(Genre.slug == g["slug"])
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                db.add(Genre(name=g["name"], slug=g["slug"]))

        logger.info("5. Seeding default system settings...")
        DEFAULT_SETTINGS = [
            {"key": "register_bonus_coins", "value": "50", "description": "Boshlang'ich ro'yxatdan o'tish bonusi"},
            {"key": "daily_checkin_coins", "value": "15", "description": "Kunlik kirish bonusi"},
            {"key": "chapter_read_coins", "value": "5", "description": "Bob mutolaasi uchun beriladigan tanga"},
            {"key": "maintenance_mode", "value": "false", "description": "Texnik ishlar rejimi"},
        ]
        from app.modules.staff.models import SystemSetting
        for s in DEFAULT_SETTINGS:
            stmt = select(SystemSetting).where(SystemSetting.key == s["key"])
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                db.add(SystemSetting(key=s["key"], value=s["value"], description=s["description"]))

        await db.commit()
        logger.info("Seeding completed successfully!")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed_data())
