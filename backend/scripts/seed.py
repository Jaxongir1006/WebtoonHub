import asyncio
import logging
import app.models  # Ensure all SQLAlchemy models are registered
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import EmailStr, TypeAdapter
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.core.security import hash_password
from app.modules.staff.models import Permission, Role, StaffUser, SystemSetting
from app.modules.staff.permissions import DEFAULT_PERMISSIONS
from app.modules.users.models import User
from app.modules.webtoons.models import Chapter, ChapterImage, Genre, Webtoon
from app.modules.shop.models import ShopItem
from app.modules.wheel.models import Wheel, WheelItem, WheelSpin

logger = logging.getLogger(__name__)

DEFAULT_GENRES = [
    {"name": "Jangari", "slug": "jangari"},
    {"name": "Fantaziya", "slug": "fantaziya"},
    {"name": "Dramma", "slug": "dramma"},
    {"name": "Komediya", "slug": "komediya"},
    {"name": "Romantika", "slug": "romantika"},
    {"name": "Tirik qolish", "slug": "tirik-qolish"},
    {"name": "Tizim / Isekai", "slug": "tizim-isekai"},
    {"name": "Sirli / Psixologik", "slug": "sirli-psixologik"}
]

LOTM_CHAPTER_1_TEXT = """# 1-bob: Qizil Oy va Uyg'onish

Bosh suyagi go'yo o'tkir pichoq bilan tilkalangandek qattiq og'rirdi.

Qorong'ulik qa'ridan asta-sekin hushiga kelayotgan Chjou Minrui ongining tub-tubida jaranglayotgan g'alati ovozlarni eshitdi. Bu ovozlar shivirlashga, minglab odamlarning bir vaqtning o'zida telbalarcha pichirlashiga o'xshardi:

> *"Tentak... Omad va sir-asrorlar hukmdori... Kulrang tuman ustidagi boqiy imperator..."*

Chjou Minrui ko'zlarini ochishga urindi, biroq qovoqlari qo'rg'oshin quygandek og'irlashib ketgan edi. Qon hidi — achchiq, nordon va temir ta'mini eslatuvchi qo'lansa hid butun xonani chulg'ab olgandi.

Nihoyat, kuchini to'plab ko'zlarini qiya ochdi.

Uning nigohi g'alati, umrida hech ko'rmagan manzaraga tushdi. Bu uning zamonaviy ijarada yashaydigan shinam xonasi emasdi.

---

### I. G'alati Xona va Qon Izlari

Xonaning devorlari eskirgan sarg'ish gulqog'ozlar bilan qoplangan, burchakda esa misdan yasalgan ingichka quvurli gaz chirog'i miltillab yonardi. Stol ustida qadimgi uslubdagi patqalam, to'ntarilgan siyohdon va ochilgan qalin charm muqovali daftar yotardi.

Lekin eng dahshatlisi — stol chetida yaltirab turgan qora metall buyum edi.

— Bu... revolver?! — Chjou Minrui titrab ketdi.

U qo'lini asta ko'tarib, o'ng chakkasini ushlab ko'rdi. Barmoqlari nimadir quyuq, yopishqoq va iliq suyuqlikka tegdi. Qo'liga qaradi: qon!

Uning o'ng chakkasida teshik bor edi. O'q kalla suyagini yorib o'tgan, miya to'qimalariga shikast yetkazgan bo'lishi kerak edi. Ammo nega u hali ham tirik? Nega u nafas olyapti va fikrlay olyapti?!

Shu lahzada uning miyasida begona xotiralar shiddat bilan portladi.

---

### II. Begona Xotiralar: Klayn Moretti

Xotiralar toshqin daryodek uning ongini qamrab oldi:

*Bu shaxsning ismi — Klayn Moretti.*
*U Loen Qirolligining Aksen okrugi, Tingen shahrida yashovchi 22 yoshli yigit.*
*U yaqindagina Khoy Universitetining tarix fakultetini tamomlagan edi.*
*Uning katta akasi Benson kompaniyada mirza bo'lib ishlaydi, kichik singlisi Melissa esa texnik bilim yurtida o'qiydi. Oilaning nochor tirikchiligi sababli, Klayn Tingen Universiteti yoki Antigonus oilasi tarixini o'rganish bo'yicha ish qidirayotgan edi...*

— Men... boshqa dunyoga tushib qoldimmi? — Chjou Minrui karaxt ahvolda shivirladi.

U oddiy dasturchi va havaskor okkultizm ishqibozi edi. U faqatgina eski xitoy kitobidan topilgan "Omadni jalb qiluvchi to'rt qadam marosimi"ni hazil tariqasida bajarib ko'rgan edi, xolos:
To'rtta osh qoshiq guruch, xona bo'ylab to'rt burchakka soat mili yo'nalishiga qarshi to'rt qadam tashlash va qadimiy kalimalarni aytish...

Shundan so'ng u hushidan ketgan va mana shu qonli xonada uyg'ongan edi!

---

### III. Stol Ustidagi Qora Sir

Klayn chuqur nafas oldi va gavdasini zo'rg'a rostlab o'rnidan turdi. Stol tomon yaqinlashib, qon sachragan daftarga qaradi.

Daftarda Loen tilining qadimiy kalligrafik yozuvida so'nggi jumla qoldirilgan edi:

> **"Hammamiz o'lamiz. Hech kim omon qolmaydi, shu jumladan men ham."**

Klaynning yuragi orqaga tortib ketdi. Stol ustidagi revolver 6 o'qli, po'lat barabanli klassik politsiya quroli edi. Baraban ochilganida, bitta gilza bo'sh ekanligi ko'rindi.

Demak, Klayn Moretti chindan ham o'z chakkasiga qarata o'q uzgan! O'z joniga qasd qilish sababi nima edi? Qanday sir uni bu dahshatli qadamga majbur qildi?

Klayn deraza tomon burildi. Pardani ohista chetga surdi.

Tashqarida tumanli, bug' motorlari shovqini ostidagi shahar osmonida dahshatli va aqlbovar qilmas manzara namoyon bo'ldi:

Osmon markazida ulkan, qon kabi qip-qizil to'lin oy porlab turardi!

— Qizil Oy... Bu mutlaqo boshqa olam! — Klayn pichirladi.

---

### IV. Ko'zgudagi Mo''jiza

Xona burchagidagi singan ko'zgu oldiga borib, o'z aksiga boqdi.

Ko'zgudan qora sochli, chuqur jigarrang ko'zli, ozg'in, ammo ma'noli yuz tuzilishiga ega ziyoli yigit boqib turardi. Uning o'ng chakkasidagi daxshatli o'q yarasi qonab turgan bo'lsa-da, qizil oy nuri ostida yara qirralari o'z-o'zidan birikayotgan, go'yo ko'rinmas iplar bilan tikilayotgandek edi.

Besh daqiqa ichida ochiq yara qotib, faqatgina qoraygan chandiqqa aylandi.

Klayn Moretti tirik qolgan edi. Ammo u qanday sirli fitnaga aralashib qolganini hali to'liq anglamasdi.

U stol ustidagi daftarni yopdi, to'pponchani ehtiyotkorlik bilan cho'ntagiga soldi. Uning yangi hayoti, sir-sinoatlar, qadimiy xudolar, Beyonderlar va Tarot Kengashi tomon ilk qadami aynan shu qonli tunning qizil yog'dusida boshlandi...
"""


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
            system_key = rc["name"] if rc["name"] in {'creator', 'superadmin'} else None
            stmt = select(Role).options(selectinload(Role.permissions)).where(Role.system_key == system_key if system_key else Role.name == rc["name"])
            res = await db.execute(stmt)
            r_obj = res.scalar_one_or_none()
            if not r_obj:
                r_obj = Role(name=rc["name"], system_key=system_key,
                    scope='own_content' if system_key == 'creator' else 'global',
                    description=rc["description"], permissions=rc["perms"])
                db.add(r_obj)
                await db.flush()
            if rc["name"] == "superadmin":
                superadmin_role = r_obj

        logger.info("3. Seeding superadmin user...")
        admin_email = settings.SEED_ADMIN_EMAIL.strip()
        admin_password = settings.SEED_ADMIN_PASSWORD
        if admin_email and admin_password and superadmin_role:
            admin_email = str(TypeAdapter(EmailStr).validate_python(admin_email))
            existing_by_username = (await db.execute(
                select(StaffUser).where(StaffUser.username == "superadmin")
            )).scalar_one_or_none()
            existing_by_email = (await db.execute(
                select(StaffUser).where(StaffUser.email == admin_email)
            )).scalar_one_or_none()
            if existing_by_username and existing_by_username.email != admin_email:
                logger.warning("Superadmin already exists with a different email; seed leaves existing credentials unchanged")
            elif existing_by_email:
                logger.info("Superadmin already exists; seed leaves existing credentials unchanged")
            else:
                db.add(StaffUser(
                    username="superadmin",
                    email=admin_email,
                    hashed_password=hash_password(admin_password),
                    role_id=superadmin_role.id,
                    is_active=True
                ))
        else:
            logger.warning("Superadmin seed skipped: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD")

        logger.info("4. Seeding regular test users...")
        demo_requested = settings.SEED_DEMO_ACCOUNTS
        if demo_requested and settings.APP_ENV.lower() != "development":
            raise ValueError("SEED_DEMO_ACCOUNTS is allowed only in development")
        demo_password = settings.SEED_DEMO_PASSWORD
        if demo_requested and not demo_password:
            raise ValueError("Set SEED_DEMO_PASSWORD to seed demo readers")
        test_users = [
            {"username": "ali", "email": "ali@webtoonhub.uz", "password": demo_password, "coins": 150},
            {"username": "madina", "email": "madina@webtoonhub.uz", "password": demo_password, "coins": 80}
        ] if demo_requested else []
        for u in test_users:
            stmt = select(User).where(User.email == u["email"])
            if not (await db.execute(stmt)).scalar_one_or_none():
                db.add(User(
                    username=u["username"],
                    email=u["email"],
                    hashed_password=hash_password(u["password"]),
                    lightning_coins=u["coins"],
                    is_active=True
                ))

        logger.info("5. Seeding default genres...")
        genre_map = {}
        for g in DEFAULT_GENRES:
            stmt = select(Genre).where(Genre.slug == g["slug"])
            res = await db.execute(stmt)
            genre_obj = res.scalar_one_or_none()
            if not genre_obj:
                genre_obj = Genre(name=g["name"], slug=g["slug"])
                db.add(genre_obj)
                await db.flush()
            genre_map[g["slug"]] = genre_obj

        logger.info("6. Seeding default system settings...")
        DEFAULT_SETTINGS = [
            {"key": "register_bonus_coins", "value": "50", "description": "Boshlang'ich ro'yxatdan o'tish bonusi"},
            {"key": "daily_checkin_coins", "value": "15", "description": "Kunlik kirish bonusi"},
            {"key": "chapter_read_coins", "value": "5", "description": "Bob mutolaasi uchun beriladigan tanga"},
            {"key": "maintenance_mode", "value": "false", "description": "Texnik ishlar rejimi"},
        ]
        for s in DEFAULT_SETTINGS:
            stmt = select(SystemSetting).where(SystemSetting.key == s["key"])
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                db.add(SystemSetting(key=s["key"], value=s["value"], description=s["description"]))

        logger.info("7. Seeding shop items...")
        DEFAULT_SHOP = [
            {"name": "Neon Chaqmoq Ramkasi", "item_type": "frame", "price_coins": 25, "asset_url": "/assets/frames/neon_lightning.png"},
            {"name": "Oltin Qahramon Ramkasi", "item_type": "frame", "price_coins": 50, "asset_url": "/assets/frames/gold_hero.png"},
            {"name": "Ajdaho Olovi Ramkasi", "item_type": "frame", "price_coins": 100, "asset_url": "/assets/frames/dragon_fire.png"},
        ]
        for item in DEFAULT_SHOP:
            stmt = select(ShopItem).where(ShopItem.name == item["name"])
            if not (await db.execute(stmt)).scalar_one_or_none():
                db.add(ShopItem(
                    name=item["name"],
                    item_type=item["item_type"],
                    price_coins=item["price_coins"],
                    asset_url=item["asset_url"],
                    is_available=True
                ))

        logger.info("8. Seeding 3 REAL titles: Manhwa, Manga, and Novel...")

        # ---------------------------------------------------------
        # 1. REAL MANHWA: Solo Leveling
        # ---------------------------------------------------------
        sl_genres = [genre_map["jangari"], genre_map["fantaziya"], genre_map["tizim-isekai"]]
        sl_stmt = select(Webtoon).where(Webtoon.slug == "solo-leveling")
        sl = (await db.execute(sl_stmt)).scalar_one_or_none()
        if not sl:
            sl = Webtoon(
                title="Yakkaxon Ko'tarilish (Solo Leveling)",
                slug="solo-leveling",
                type="manhwa",
                description="O'n yil muqaddam dunyo bo'ylab sirli 'Darvozalar' ochildi va insoniyat orasida sehrli qudratga ega 'Ovchilar' paydo bo'ldi. Seong Jinwoo butun insoniyatdagi eng zaif E-darajali ovchi hisoblanadi. Biroq xavfli D-darajali erosti xandaqida yashiringan sirli 'Qo'shaloq ibodatxona' fojiasidan so'ng, Jinwoo faqat o'zigagina ko'rinadigan noyob o'yin tizimiga ega bo'ladi.",
                author_name="Chugong & DUBU (REDICE Studio)",
                status="completed",
                cover_image_url="/content/covers/solo-leveling.jpg",
                genres=sl_genres
            )
            db.add(sl)
            await db.flush()

            sl_ch1 = Chapter(
                webtoon_id=sl.id,
                chapter_number=1.0,
                title="1-bob: Eng zaif E-darajali ovchi",
                status="published",
                reward_coins=5
            )
            db.add(sl_ch1)
            await db.flush()

            for idx in range(1, 13):
                db.add(ChapterImage(
                    chapter_id=sl_ch1.id,
                    image_url=f"/content/manhwa/solo-leveling/ch1/p{idx:02d}.jpg",
                    order_index=idx
                ))

        # ---------------------------------------------------------
        # 2. REAL MANGA: Death Note
        # ---------------------------------------------------------
        dn_genres = [genre_map["dramma"], genre_map["sirli-psixologik"], genre_map["jangari"]]
        dn_stmt = select(Webtoon).where(Webtoon.slug == "death-note")
        dn = (await db.execute(dn_stmt)).scalar_one_or_none()
        if not dn:
            dn = Webtoon(
                title="O'lim Daftari (Death Note)",
                slug="death-note",
                type="manga",
                description="Yagami Light — Yaponiyaning eng iqtidorli va namunali a'lochi maktab o'quvchisi. Bir kuni u maktab hovlisidan sirli qora daftarni topib oladi. Daftarning birinchi betida: 'Ushbu daftarga ismi yozilgan har qanday inson o'ladi' deb yozilgan edi. O'lim xudosi (Shinigami) Ryuk bilan yuzlashgan Light dunyoni barcha yovuz jinoyatchilardan tozalab, 'Yangi dunyo xudosi — Kira' bo'lishga qaror qiladi.",
                author_name="Tsugumi Ohba & Takeshi Obata",
                status="completed",
                cover_image_url="/content/covers/death-note.jpg",
                genres=dn_genres
            )
            db.add(dn)
            await db.flush()

            dn_ch1 = Chapter(
                webtoon_id=dn.id,
                chapter_number=1.0,
                title="1-bob: Zerikish (Boredom)",
                status="published",
                reward_coins=5
            )
            db.add(dn_ch1)
            await db.flush()

            for idx in range(1, 17):
                db.add(ChapterImage(
                    chapter_id=dn_ch1.id,
                    image_url=f"/content/manga/death-note/ch1/p{idx:02d}.jpg",
                    order_index=idx
                ))

        # ---------------------------------------------------------
        # 3. REAL NOVEL: Lord of Mysteries
        # ---------------------------------------------------------
        lotm_genres = [genre_map["fantaziya"], genre_map["sirli-psixologik"], genre_map["tizim-isekai"]]
        lotm_stmt = select(Webtoon).where(Webtoon.slug == "lord-of-mysteries")
        lotm = (await db.execute(lotm_stmt)).scalar_one_or_none()
        if not lotm:
            lotm = Webtoon(
                title="Sirli Sirlar Hukmdori (Lord of Mysteries)",
                slug="lord-of-mysteries",
                type="novel",
                description="Bug' mashinalari, qadimiy cherkovlar, viktoriya uslubidagi tumanli London xiyobonlari va g'ayritabiiy okkultik maxluqlar uyg'unlashgan sirli dunyo. Chjou Minrui uyg'onib, o'zini Klayn Moretti ismli tarixchi yigit tanasida, qonga belangan revolver yonida ko'radi. Qizil oy nuri ostida u Tarot kartalari va 'Tentak' (The Fool) taxtiga tomon sirli sayohatini boshlaydi.",
                author_name="Cuttlefish That Loves Diving",
                status="ongoing",
                cover_image_url="/content/covers/lord-of-mysteries.jpg",
                genres=lotm_genres
            )
            db.add(lotm)
            await db.flush()

            lotm_ch1 = Chapter(
                webtoon_id=lotm.id,
                chapter_number=1.0,
                title="1-bob: Qizil Oy va Uyg'onish",
                status="published",
                content_text=LOTM_CHAPTER_1_TEXT,
                reward_coins=5
            )
            db.add(lotm_ch1)

        logger.info("9. Seeding default Lucky Wheel (Omad Charxi)...")
        w_stmt = select(Wheel).where(Wheel.slug == "omad-charxi")
        existing_wheel = (await db.execute(w_stmt)).scalar_one_or_none()
        if not existing_wheel:
            wheel = Wheel(
                title="Omad Charxi",
                slug="omad-charxi",
                description="Har kuni 1 marta BEPUL aylantiring va kafolatlangan mukofotlarga ega bo'ling! Keyingi urinishlar 100 ⚡ Chaqmoq.",
                cost_coins=100,
                has_daily_free_spin=True,
                icon="sparkles",
                color="#F59E0B",
                is_active=True,
                order_index=0
            )
            db.add(wheel)
            await db.flush()

            default_slices = [
                {"reward_type": "coins", "reward_coins": 10, "shop_item_id": None, "label": "+10 ⚡", "color": "#1E293B", "text_color": "#F8FAFC", "icon": "coins", "weight": 30, "is_jackpot": False, "order_index": 0},
                {"reward_type": "coins", "reward_coins": 25, "shop_item_id": None, "label": "+25 ⚡", "color": "#0F766E", "text_color": "#FFFFFF", "icon": "coins", "weight": 25, "is_jackpot": False, "order_index": 1},
                {"reward_type": "coins", "reward_coins": 50, "shop_item_id": None, "label": "+50 ⚡", "color": "#0369A1", "text_color": "#FFFFFF", "icon": "coins", "weight": 15, "is_jackpot": False, "order_index": 2},
                {"reward_type": "coins", "reward_coins": 100, "shop_item_id": None, "label": "+100 ⚡", "color": "#4338CA", "text_color": "#FFFFFF", "icon": "coins", "weight": 12, "is_jackpot": False, "order_index": 3},
                {"reward_type": "coins", "reward_coins": 75, "shop_item_id": None, "label": "+75 ⚡", "color": "#7C3AED", "text_color": "#FFFFFF", "icon": "coins", "weight": 8, "is_jackpot": False, "order_index": 4},
                {"reward_type": "coins", "reward_coins": 250, "shop_item_id": None, "label": "+250 ⚡", "color": "#B45309", "text_color": "#FFFFFF", "icon": "coins", "weight": 5, "is_jackpot": False, "order_index": 5},
                {"reward_type": "coins", "reward_coins": 150, "shop_item_id": None, "label": "+150 ⚡", "color": "#BE185D", "text_color": "#FFFFFF", "icon": "coins", "weight": 3, "is_jackpot": False, "order_index": 6},
                {"reward_type": "coins", "reward_coins": 500, "shop_item_id": None, "label": "JACKPOT +500 ⚡", "color": "#E11D48", "text_color": "#FFFFFF", "icon": "flame", "weight": 2, "is_jackpot": True, "order_index": 7},
            ]

            for s in default_slices:
                db.add(WheelItem(
                    wheel_id=wheel.id,
                    reward_type=s["reward_type"],
                    reward_coins=s["reward_coins"],
                    shop_item_id=s["shop_item_id"],
                    label=s["label"],
                    color=s["color"],
                    text_color=s["text_color"],
                    icon=s["icon"],
                    weight=s["weight"],
                    is_jackpot=s["is_jackpot"],
                    order_index=s["order_index"],
                ))

        await db.commit()
        logger.info("Real seed data committed successfully!")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed_data())
