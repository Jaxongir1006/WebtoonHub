"""Build the printable, offline admin character card guide with no dependencies."""
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = {
    'en': {
        'language': 'English', 'title': 'Character cards for admins',
        'intro': 'Create collectible cards for individual characters. Readers buy them with Lightning, keep them in their collection, and can feature up to three owned cards on their profile. Cards have no gameplay or reading effect.',
        'create_title': 'Create a card',
        'steps': [
            'Sign in to the admin panel and open Shop. Creating cards requires the shop management permission.',
            'Choose New character card, or open the item form and select Character card as the item type.',
            'Enter the card name, character name, price in Lightning, and rarity. Choose Common, Rare, Epic, or Legendary. Add a series name or link an existing work if appropriate.',
            'Choose a JPG, JPEG, PNG, WebP, or GIF file. Review the still preview. For an animated file, use Play and Pause to check its movement.',
            'Save the card. It appears in the reader shop when it is available for sale. Check its artwork, rarity, character, series, and price before readers purchase it.'
        ],
        'media_title': 'Prepare artwork',
        'media': [
            'JPG and PNG work well for still artwork. WebP supports both still images and animation. Animated GIF and WebP uploads retain their animation; the server also creates a separate still preview.',
            'Use portrait artwork where possible. The reader displays the complete artwork within a card, so check the preview for unwanted empty space.',
            'Card uploads may be at most 10 MiB. Animations may have at most 100 frames and last at most 10 seconds per loop. Each source frame may contain at most 4 million pixels, with at most 60 million pixels across all frames. Resize the source rather than only renaming it.',
            'If an animation is rejected, shorten the loop, reduce its frame rate or dimensions, and export it again as GIF or animated WebP. MP4, HTML, and SVG are not card upload formats in this release.'
        ],
        'rarity_title': 'Use rarity consistently',
        'rarity': 'Rarity is an admin classification, not a gameplay advantage or a guarantee of limited supply. Choose a consistent policy for Common, Rare, Epic, and Legendary cards. Readers see their total number of different owned cards and the count in each rarity.',
        'ownership_title': 'Manage existing cards',
        'ownership': [
            'A reader owns one copy of each card. Buying the same card again is prevented. Different artwork editions should be separate cards if readers should collect both.',
            'Cards appear in the collection without being equipped. Readers choose up to three owned cards to feature; their public profile shows those cards and the rarity totals.',
            'Hide a card from sale to stop new purchases while preserving existing collections. Purchased cards and items used by a wheel cannot be deleted.',
            'Once readers own a card, its name, character, series and rarity are locked. Create a separate card for a new identity or edition. Price, sale availability and validated artwork can still be updated; artwork changes are visible to existing owners.'
        ],
        'check_title': 'Before saving',
        'check': 'Check the character and series spelling, rarity, price, portrait preview, and animation. In the reader shop, cards use still previews; animation plays on hover, keyboard focus, or Play, with Pause available. Reduced motion prevents automatic playback.',
    },
    'uz': {
        'language': 'O‘zbekcha', 'title': 'Adminlar uchun qahramon kartalari',
        'intro': 'Alohida qahramonlar uchun kolleksiya kartalarini yarating. O‘quvchilar ularni Chaqmoq bilan sotib oladi, kolleksiyasida saqlaydi va profilida o‘ziga tegishli uchtagacha kartani namoyish qiladi. Kartalar o‘qish yoki o‘yin imkoniyatlariga ta’sir qilmaydi.',
        'create_title': 'Kartani yaratish',
        'steps': [
            'Admin paneliga kiring va Do‘kon bo‘limini oching. Karta yaratish uchun do‘konni boshqarish huquqi kerak.',
            'Yangi karta tugmasini bosing yoki buyum yaratish formasida Qahramon kartasi turini tanlang.',
            'Karta nomi, qahramon nomi, Chaqmoq narxi va noyoblik darajasini kiriting. Oddiy, Noyob, Epik yoki Afsonaviy darajani tanlang. Kerak bo‘lsa, asar nomini yozing yoki mavjud asarni bog‘lang.',
            'JPG, JPEG, PNG, WebP yoki GIF faylini tanlang. Harakatsiz ko‘rinishini tekshiring. Animatsiyali faylda Ijro va Pauza yordamida harakatini tekshiring.',
            'Kartani saqlang. Sotuv faol bo‘lsa, u o‘quvchilar do‘konida ko‘rinadi. Xaridlar boshlanishidan oldin rasm, daraja, qahramon, asar va narxni tekshiring.'
        ],
        'media_title': 'Rasmni tayyorlash',
        'media': [
            'JPG va PNG oddiy rasmlar uchun mos. WebP rasm va animatsiyani qo‘llaydi. Animatsiyali GIF va WebP harakatini saqlaydi; server alohida harakatsiz ko‘rinishni ham yaratadi.',
            'Iloji bo‘lsa, vertikal rasm ishlating. Karta ichida rasm to‘liq ko‘rsatiladi; ko‘rinishda ortiqcha bo‘sh joy yo‘qligini tekshiring.',
            'Fayl 10 MiB dan oshmasin. Animatsiya ko‘pi bilan 100 kadrdan iborat bo‘lib, bir aylanishi 10 soniyadan oshmasin. Har bir kadr 4 million pikseldan, barcha kadrlar yig‘indisi esa 60 million pikseldan oshmasin. Fayl nomini emas, o‘lchamini kamaytiring.',
            'Animatsiya rad etilsa, davomiyligini, kadrlar sonini yoki o‘lchamini kamaytirib, GIF yoki animatsiyali WebP sifatida qayta saqlang. Ushbu versiyada MP4, HTML va SVG karta uchun qabul qilinmaydi.'
        ],
        'rarity_title': 'Noyoblik darajasini izchil tanlash',
        'rarity': 'Noyoblik darajasi admin belgilaydigan tasnifdir. U o‘yin ustunligi bermaydi va nusxalar cheklanganini kafolatlamaydi. Oddiy, Noyob, Epik va Afsonaviy kartalar uchun izchil qoida tanlang. O‘quvchilar turli kartalarining jami sonini va har bir daraja bo‘yicha sonini ko‘radi.',
        'ownership_title': 'Mavjud kartalarni boshqarish',
        'ownership': [
            'Har bir o‘quvchi bitta kartaning bir nusxasiga ega bo‘ladi. Takroriy xarid bloklanadi. Ikkala rasm ham kolleksiyada bo‘lishi kerak bo‘lsa, boshqa rasmli variantni alohida karta sifatida yarating.',
            'Kartalar taqilmasdan kolleksiyada ko‘rinadi. O‘quvchi o‘ziga tegishli uchtagacha kartani profil uchun tanlaydi; ommaviy profilda ular va noyoblik bo‘yicha sonlar ko‘rinadi.',
            'Yangi xaridlarni to‘xtatish uchun kartani sotuvdan yashiring. Avvalgi egalari kartani saqlaydi. Xarid qilingan yoki charxda ishlatilayotgan buyumni o‘chirib bo‘lmaydi.',
            'Karta xarid qilingach, uning nomi, qahramoni, asari va darajasi qulflanadi. Yangi variant uchun alohida karta yarating. Narx, sotuv holati va tekshirilgan rasmni yangilash mumkin; rasm o‘zgarishi mavjud egalarga ham ko‘rinadi.'
        ],
        'check_title': 'Saqlashdan oldin',
        'check': 'Qahramon va asar nomi, daraja, narx, vertikal ko‘rinish va animatsiyani tekshiring. Do‘konda harakatsiz ko‘rinish ishlatiladi. Sichqoncha yoki klaviatura fokusi va Ijro tugmasi animatsiyani boshlaydi; Pauza uni to‘xtatadi. Kamaytirilgan harakat sozlamasi avtomatik ijroni o‘chiradi.',
    },
    'ru': {
        'language': 'Русский', 'title': 'Карточки персонажей для администраторов',
        'intro': 'Создавайте коллекционные карточки отдельных персонажей. Читатели покупают их за молнии, хранят в коллекции и могут показать до трёх своих карточек в профиле. Карточки не влияют на чтение или игровые возможности.',
        'create_title': 'Создание карточки',
        'steps': [
            'Войдите в административную панель и откройте Магазин. Для создания карточек нужно разрешение на управление магазином.',
            'Нажмите Новая карточка или выберите тип Карточка персонажа в форме предмета.',
            'Укажите название карточки, имя персонажа, цену в молниях и редкость: Обычная, Редкая, Эпическая или Легендарная. При необходимости добавьте название произведения или свяжите существующее произведение.',
            'Выберите JPG, JPEG, PNG, WebP или GIF. Проверьте неподвижное превью. Для анимации используйте Воспроизвести и Пауза.',
            'Сохраните карточку. При включённой продаже она появится в магазине читателей. До первых покупок проверьте изображение, редкость, персонажа, произведение и цену.'
        ],
        'media_title': 'Подготовка изображения',
        'media': [
            'JPG и PNG подходят для неподвижных изображений. WebP поддерживает изображения и анимацию. Анимированные GIF и WebP сохраняют движение; сервер также создаёт отдельное неподвижное превью.',
            'По возможности используйте вертикальное изображение. Карточка показывает изображение целиком; проверьте превью на лишнее пустое пространство.',
            'Размер файла не должен превышать 10 MiB. Анимация может содержать не более 100 кадров и длиться не более 10 секунд за цикл. В одном исходном кадре допускается до 4 миллионов пикселей, во всех кадрах вместе — до 60 миллионов. Уменьшайте изображение, а не переименовывайте файл.',
            'Если анимация отклонена, сократите цикл, уменьшите число кадров или размеры и снова экспортируйте GIF либо анимированный WebP. В этой версии MP4, HTML и SVG не принимаются для карточек.'
        ],
        'rarity_title': 'Последовательное использование редкости',
        'rarity': 'Редкость задаёт администратор. Она не даёт игрового преимущества и не гарантирует ограниченный тираж. Используйте последовательные правила для обычных, редких, эпических и легендарных карточек. Читатели видят число разных карточек и количество в каждой категории редкости.',
        'ownership_title': 'Управление существующими карточками',
        'ownership': [
            'Читатель владеет одной копией каждой карточки. Повторная покупка запрещена. Если оба варианта изображения должны входить в коллекцию, создайте отдельную карточку для другого варианта.',
            'Карточки входят в коллекцию без экипировки. Читатель выбирает до трёх своих карточек для профиля; публичный профиль показывает их и количество по редкости.',
            'Скройте карточку из продажи, чтобы остановить новые покупки и сохранить существующие коллекции. Купленные предметы и предметы, используемые колесом, нельзя удалить.',
            'После покупки название, персонаж, произведение и редкость карточки блокируются. Для новой версии создайте отдельную карточку. Цену, доступность продажи и проверенное изображение можно менять; новое изображение будет видно существующим владельцам.'
        ],
        'check_title': 'Перед сохранением',
        'check': 'Проверьте написание имени персонажа и произведения, редкость, цену, вертикальное превью и анимацию. Магазин использует неподвижные превью. Наведение, фокус клавиатуры или Воспроизвести запускают анимацию; Пауза останавливает её. Настройка уменьшенного движения отключает автоматическое воспроизведение.',
    }
}

def sections(data):
    return [(data['create_title'], data['steps'], True), (data['media_title'], data['media'], False), (data['rarity_title'], [data['rarity']], False), (data['ownership_title'], data['ownership'], False), (data['check_title'], [data['check']], False)]

markdown = ['# Admin character card guide', '', 'Languages: O‘zbekcha · English · Русский', '', '[Open the printable guide](../admin/public/guides/character-cards-guide.html)', '']
html_sections = []
for locale in ['uz', 'en', 'ru']:
    data = CONTENT[locale]
    markdown += ['## ' + data['language'], '', data['intro'], '']
    rendered = [f'<section id="{locale}" lang="{locale}"><h2>{escape(data["title"])}</h2><p>{escape(data["intro"])}</p>']
    for title, paragraphs, ordered in sections(data):
        markdown += ['### ' + title, '']
        rendered.append('<h3>' + escape(title) + '</h3>')
        if ordered:
            markdown += [f'{index}. {text}' for index, text in enumerate(paragraphs, 1)] + ['']
            rendered.append('<ol>' + ''.join('<li>' + escape(text) + '</li>' for text in paragraphs) + '</ol>')
        else:
            for paragraph in paragraphs:
                markdown += [paragraph, '']
                rendered.append('<p>' + escape(paragraph) + '</p>')
    html_sections.append(''.join(rendered) + '</section>')

guide_path = ROOT / 'docs/ADMIN_CHARACTER_CARDS_GUIDE.md'
guide_path.parent.mkdir(exist_ok=True)
guide_path.write_text('\n'.join(markdown), encoding='utf-8')
html_path = ROOT / 'admin/public/guides/character-cards-guide.html'
html_path.parent.mkdir(parents=True, exist_ok=True)
html_path.write_text('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Admin character card guide</title><style>
:root{font-family:system-ui,sans-serif;color:#182433;background:#f4f6fa;line-height:1.65}*{box-sizing:border-box}body{margin:0}main{max-width:860px;margin:auto;padding:28px 24px 64px}header,section{background:#fff;border:1px solid #dae1eb;border-radius:16px;padding:24px;margin-bottom:24px}h1,h2,h3{line-height:1.25;color:#15283e}h1{font-size:1.8rem}h2{font-size:1.55rem}h3{font-size:1.1rem;margin-top:28px}p,li{overflow-wrap:anywhere}li{padding-left:4px;margin:10px 0}nav{display:flex;gap:12px;flex-wrap:wrap}a{color:#075b9e;text-underline-offset:3px}nav a{display:block;border:1px solid #c9d8e8;border-radius:8px;padding:8px 14px;min-height:44px}section{scroll-margin-top:16px}@media(max-width:480px){main{padding:16px 12px}header,section{padding:18px}h1{font-size:1.45rem}h2{font-size:1.35rem}}@media print{:root{background:#fff}main{max-width:none;padding:0}header,section{border:0;border-radius:0;padding:0}section{break-before:page}nav{display:none}h3{break-after:avoid}li,p{orphans:3;widows:3}}
</style></head><body><main><header><h1>Admin character card guide</h1><p>O‘zbekcha · English · Русский</p><nav aria-label="Guide language"><a href="#uz">O‘zbekcha</a><a href="#en">English</a><a href="#ru">Русский</a></nav></header>''' + ''.join(html_sections) + '</main></body></html>', encoding='utf-8')
print('Built docs/ADMIN_CHARACTER_CARDS_GUIDE.md and printable HTML guide.')
