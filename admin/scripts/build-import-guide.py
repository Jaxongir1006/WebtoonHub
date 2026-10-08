"""Build the admin handout and empty folder template using only Python's stdlib."""
from pathlib import Path
import html
import zipfile

ROOT = Path(__file__).resolve().parents[2]
TREE = """My-Series/
├── Chapter 01/
│   ├── 001.jpg
│   ├── 002.jpg
│   └── 003.jpg
├── Chapter 02/
│   ├── 001.png
│   └── 002.png
└── Chapter 03.5/
    ├── 001.webp
    └── 002.webp"""

GUIDES = {
    'uz': {
        'language': 'O‘zbekcha', 'title': 'Manga va manhwa boblarini yuklash qo‘llanmasi',
        'intro': 'Bitta asarning bir nechta bobini papka yoki ZIP orqali yuklang. Avval bob raqami va sahifalar tartibini tekshiring, so‘ng yuklashni boshlang.',
        'download': 'Papka shablonini yuklab olish',
        'accessTitle': 'Boshlash uchun',
        'access': 'Admin hisobingiz bilan kiring. Import uchun bob yaratish huquqi kerak; tarjimonlar faqat o‘z asarlariga bob qo‘shishi mumkin. Import manga va manhwa rasmlari uchun mo‘ljallangan. Novel matnlarini odatdagi “Bob Yuklash” oynasidan qo‘shing. Brauzeringiz papka tanlashni qo‘llamasa, ZIP yoki rasmlarni tanlang.',
        'headings': ['1. Asarni tanlang', '2. Fayllarni tayyorlang', '3. Boblarni tekshiring', '4. Yuklashni boshlang', '5. Nashr qilish'],
        'steps': [
            'Boshqaruv panelida kerakli manga yoki manhwa sahifasini oching va “Boblarni import qilish” tugmasini bosing. Umumiy asarlar sahifasidan import qilayotgan bo‘lsangiz, “Asar” ro‘yxatidan to‘g‘ri asarni tanlang. Yangi asar uchun avval uning nomi, muqovasi va turini odatdagi asar yaratish oynasida kiriting.',
            'Har bir bob uchun alohida papka yarating: Chapter 01, Chapter 02, Chapter 03.5. Sahifalarni o‘qish tartibida 001.jpg, 002.jpg kabi nomlang. Shablonni ochib, uning matnli eslatmalari yoniga haqiqiy rasmlaringizni qo‘ying. Bir importda faqat bitta asarning boblarini tanlang. “Papka tanlash” orqali My-Series asosiy papkasini, “ZIP tanlash” orqali shu tuzilma saqlangan arxivni tanlang. Bir bob uchun “Rasmlarni tanlash” ham ishlaydi.',
            'Boblar ro‘yxatidan har bir bobni oching. Bob raqami, ixtiyoriy sarlavha, sahifalar soni va tartibini tekshiring. Fayl nomlari raqamga qarab tartiblanadi: 1, 2, 10. Tartibni sudrash yoki yuqoriga/pastga tugmalari bilan o‘zgartiring; keraksiz sahifani olib tashlang. Manga uchun “Bitta sahifa”, manhwa uchun “Vertikal o‘qish” ko‘rinishidan foydalaning. Mavjud bob raqami bo‘lgan papkalar yuklash uchun tanlanmaydi. Asl bobning o‘rnini bu import bilan almashtirib bo‘lmaydi.',
            'Kerakli tayyor boblarni tanlab, “Tanlangan boblarni yuklash” tugmasini bosing. Boblar navbat bilan, har bir rasm alohida yuklanadi. Navbatda sahifalar soni va holatini ko‘rasiz. Import oynasini yopishingiz yoki panelning boshqa sahifasiga o‘tishingiz mumkin. Yuklashni boshlagach, bob ma’lumotlari va sahifalar tartibi davom ettirish uchun qulflanadi.',
            'Odatda tugallangan bob moderatsiyaga yuboriladi va o‘quvchilarga hali ko‘rinmaydi. Bobni tasdiqlash huquqi bo‘lgan admin “Qo‘shimcha sozlamalar” ichidagi “Yuklangach nashr qilish” belgisini oldindan yoqishi mumkin. “Tugallangan” holati barcha sahifalar saqlanib, bob yaratilganini bildiradi; bu o‘z-o‘zidan nashr qilinganini bildirmaydi.'
        ],
        'limitsTitle': 'Fayl cheklovlari',
        'limits': ['JPEG, PNG, WebP yoki GIF; GIF statik sahifaga aylantiriladi.', 'Har bir bob: 1–100 ta rasm, jami 50 MiB gacha.', 'Har bir rasm: 20 MiB gacha va 40 million pikseldan oshmasligi kerak. Juda uzun manhwa rasmlarini qismlarga bo‘ling.', 'Qurilmadagi saqlangan navbat: jami 300 MiB gacha; bitta tanlashda ZIP ichida 1 000 tagacha yozuv. Tugallanganlarni tozalash navbatdagi joyni bo‘shatadi.', 'Bob raqami musbat bo‘lishi kerak; 3.5 kabi qo‘shimcha bob raqami ham mumkin.', 'ZIP parolsiz bo‘lishi kerak. RAR, 7z va ZIP64 qo‘llab-quvvatlanmaydi.'],
        'resumeTitle': 'Yuklashni to‘xtatish va davom ettirish',
        'resume': [
            '“To‘xtatish” joriy sahifa yuborilishi tugagach navbatni to‘xtatadi. “Davom ettirish” yoki “Qayta urinish” saqlangan sahifalarni tekshiradi va yetishmayotganlarini yuboradi.',
            'Brauzer oynasi yopilsa, kompyuter o‘chsa yoki sahifa yangilansa, yuklash to‘xtaydi. Xuddi shu qurilma, brauzer va admin hisobida qayta ochib, saqlangan navbatni davom ettiring. Import oynasini yopish qoralamani o‘chirmaydi; hisobdan chiqish navbatni to‘xtatadi.',
            'Qoralamalar va asl fayllar brauzer xotirasida saqlanadi. Xotira xatosi ko‘rinsa, sahifani ochiq qoldiring; saqlanmagan qoralama yangilashda yo‘qolishi mumkin. Brauzer ma’lumotlarini tozalash yoki boshqa qurilmaga o‘tish fayllarni olib o‘tmaydi.',
            'Serverdagi tugallanmagan yuklash oxirgi muvaffaqiyatli sahifadan 7 kun saqlanadi. Muddat o‘tsa, asl fayllar qurilmada bo‘lsa navbat yangi yuklashni boshlaydi. Asl rasmlaringizni bob muvaffaqiyatli tugaguncha saqlang.'
        ],
        'problemsTitle': 'Muammo bo‘lsa',
        'problems': [
            ('Bob raqami mavjud', 'Shu bobni navbatdan olib tashlang yoki tanlamang. Haqiqatan boshqa bob bo‘lsa, yuklash boshlanishidan oldin uning to‘g‘ri raqamini kiriting.'),
            ('Rasm yoki bob juda katta', 'Rasmlarni kichraytiring yoki siqing, so‘ng qayta tanlang. Uzun manhwa rasmini o‘qish tartibida bir nechta qismga bo‘lish mumkin.'),
            ('Internet uzildi', 'Ulanishni tiklab, “Qayta urinish” tugmasini bosing. Yuklangan sahifalar qayta yuborilmaydi.'),
            ('Rasmlar topilmadi', 'Asl papka yoki ZIP ni qayta tanlang. Faqat matnli eslatmalari bo‘lgan bo‘sh shablon bob yaratmaydi.'),
            ('Tugallangan bob ko‘rinmayapti', 'Boblar ro‘yxatida uning holatini tekshiring. Moderatsiyadagi bobni tasdiqlash huquqi bo‘lgan admin nashr qilishi kerak.'),
            ('Qoralama kerak emas', '“Olib tashlash” qoralama va tugallanmagan yuklashni bekor qiladi. “Tugallanganlarni tozalash” faqat navbat yozuvini olib tashlaydi; yaratilgan bobni o‘chirmaydi.')
        ],
        'checkTitle': 'Yuklashdan oldin',
        'check': ['To‘g‘ri asar tanlangan.', 'Bob raqami takrorlanmaydi.', 'Barcha sahifalar bor va to‘g‘ri tartibda.', 'O‘qish ko‘rinishida matn o‘qiladi.', 'Moderatsiya yoki nashr sozlamasi tekshirilgan.'],
        'templateNote': 'Shablon ichida haqiqiy rasmlar yo‘q. Yuqoridagi daraxt tayyor papka qanday ko‘rinishini ko‘rsatadi; matnli eslatmalar importda o‘tkazib yuboriladi.'
    },
    'en': {
        'language': 'English', 'title': 'Admin guide to importing manga and manhwa chapters',
        'intro': 'Upload several chapters of one series from a folder or ZIP. Review chapter numbers and page order before starting the upload.',
        'download': 'Download folder template',
        'accessTitle': 'Before you begin',
        'access': 'Sign into your staff account. Importing requires chapter creation permission; creators can add chapters only to their own series. This importer handles manga and manhwa images. Use the usual “Upload chapter” form for novel text. If your browser cannot choose folders, select a ZIP or individual images instead.',
        'headings': ['1. Choose the series', '2. Prepare the files', '3. Review the chapters', '4. Start uploading', '5. Publish the chapters'],
        'steps': [
            'Open a manga or manhwa in the staff dashboard and click “Import chapters”. If you open the importer from the series catalogue, choose the correct “Series” first. For a new series, create its title, cover and format using the usual series creation form before importing chapters.',
            'Use one folder per chapter: Chapter 01, Chapter 02, Chapter 03.5. Name pages in reading order, such as 001.jpg and 002.jpg. Extract the template and place your real images alongside its text instructions. Include only one series in each import. Use “Choose folder” for the parent My-Series folder or “Choose ZIP” for an archive with the same structure. “Choose images” also works for a single chapter.',
            'Open each chapter in the review list. Check its number, optional title, page count and order. Filenames sort numerically: 1, 2, 10. Drag pages or use the up/down buttons to reorder them; remove unwanted pages. Check “Single page” for manga and “Vertical scroll” for manhwa. Folders with existing chapter numbers are not selected for upload. This importer cannot replace an existing chapter.',
            'Select the ready chapters you want and click “Upload selected chapters”. Chapters run in sequence, one image at a time. The queue shows page counts and progress. You can close the import window and navigate elsewhere in the dashboard while uploading continues. Once an upload starts, its metadata and file order are locked so it can resume safely.',
            'Completed chapters normally enter moderation and are not yet visible to readers. Staff with chapter approval permission can enable “Publish when upload finishes” in “Advanced options” before starting. “Complete” means all pages were saved and the chapter was created; it does not by itself mean the chapter was published.'
        ],
        'limitsTitle': 'File limits',
        'limits': ['JPEG, PNG, WebP or GIF; GIF is converted to a static page.', 'Each chapter: 1–100 images, up to 50 MiB in total.', 'Each image: up to 20 MiB and 40 million pixels. Split extremely long manhwa images into smaller strips.', 'Saved queue on your device: up to 300 MiB in total; at most 1,000 ZIP entries per file selection. Clear completed imports to free queue space.', 'Chapter numbers must be positive; an extra chapter such as 3.5 is supported.', 'ZIP must have no password. RAR, 7z and ZIP64 are not supported.'],
        'resumeTitle': 'Pause and resume',
        'resume': [
            '“Pause” stops the queue after the current page request finishes. “Resume” or “Retry” checks which pages already reached the server and sends the missing ones.',
            'Closing the browser tab, shutting down the computer or refreshing stops active uploads. Reopen the dashboard on the same device, browser and staff account, then resume the saved queue. Closing only the import window keeps your drafts. Signing out pauses the queue.',
            'Drafts and source files are saved in browser storage. If a storage error appears, keep the tab open; an unsaved draft may be lost on refresh. Clearing browser data or using another device does not transfer your saved files.',
            'Unfinished server uploads remain resumable for 7 days after the most recent successful page. After expiry, the queue starts a fresh upload if the source files are still saved on your device. Keep your original files until the chapter completes successfully.'
        ],
        'problemsTitle': 'If something goes wrong',
        'problems': [
            ('Chapter number already exists', 'Leave it unselected or remove its draft. If this is genuinely a different chapter, enter the correct number before uploading starts.'),
            ('Image or chapter is too large', 'Resize or compress the images and select them again. Long manhwa strips can be split into several images in reading order.'),
            ('Connection failed', 'Restore the connection and click “Retry”. Pages already saved on the server are not sent again.'),
            ('No images found', 'Choose the original folder or ZIP again. An empty template containing only text instructions does not create chapters.'),
            ('Completed chapter is not visible', 'Check its status in the chapter list. A chapter in moderation must be published by staff with approval permission.'),
            ('Draft is no longer needed', '“Remove” discards the draft and cancels an unfinished upload. “Clear completed” removes queue records only; it does not delete created chapters.')
        ],
        'checkTitle': 'Before you upload',
        'check': ['The correct series is selected.', 'Chapter numbers are unique.', 'All pages are present and in reading order.', 'Text is readable in the reading preview.', 'The moderation or publishing setting is correct.'],
        'templateNote': 'The template contains no actual images. The tree illustrates how your completed folder should look; text instruction files are skipped during import.'
    },
    'ru': {
        'language': 'Русский', 'title': 'Руководство администратора по импорту глав манги и манхвы',
        'intro': 'Загрузите несколько глав одного произведения из папки или ZIP. Перед загрузкой проверьте номера глав и порядок страниц.',
        'download': 'Скачать шаблон папок',
        'accessTitle': 'Перед началом',
        'access': 'Войдите в учётную запись сотрудника. Для импорта нужно право создания глав; авторы могут добавлять главы только в свои произведения. Импорт предназначен для изображений манги и манхвы. Для текста новелл используйте обычную форму «Загрузить главу». Если браузер не поддерживает выбор папок, выберите ZIP или отдельные изображения.',
        'headings': ['1. Выберите произведение', '2. Подготовьте файлы', '3. Проверьте главы', '4. Начните загрузку', '5. Опубликуйте главы'],
        'steps': [
            'Откройте мангу или манхву в панели сотрудников и нажмите «Импорт глав». При запуске импорта из общего каталога сначала выберите правильное «Произведение». Для нового произведения предварительно заполните его название, обложку и тип в обычной форме создания.',
            'Каждая глава должна быть в отдельной папке: Chapter 01, Chapter 02, Chapter 03.5. Назовите изображения по порядку чтения: 001.jpg, 002.jpg. Распакуйте шаблон и добавьте настоящие изображения рядом с текстовыми инструкциями. В одном импорте должны быть главы только одного произведения. Нажмите «Выбрать папку» для родительской папки My-Series или «Выбрать ZIP» для архива с такой же структурой. Для одной главы можно использовать «Выбрать изображения».',
            'Откройте каждую главу в списке проверки. Проверьте номер, необязательное название, количество и порядок страниц. Имена сортируются по числам: 1, 2, 10. Меняйте порядок перетаскиванием или кнопками вверх/вниз; удаляйте лишние страницы. Для манги используйте «Одна страница», для манхвы — «Вертикальная прокрутка». Папки с уже существующими номерами не выбираются для загрузки. Импорт не заменяет существующую главу.',
            'Выберите готовые главы и нажмите «Загрузить выбранные главы». Главы загружаются последовательно, по одному изображению. Очередь показывает количество страниц и прогресс. Можно закрыть окно импорта и перейти в другой раздел панели. После начала загрузки сведения о главе и порядок страниц блокируются для безопасного продолжения.',
            'По умолчанию завершённые главы отправляются на модерацию и ещё не видны читателям. Сотрудник с правом утверждения глав может заранее включить «Опубликовать после загрузки» в «Дополнительные настройки». Статус «Завершено» означает, что страницы сохранены и глава создана; это не обязательно означает публикацию.'
        ],
        'limitsTitle': 'Ограничения файлов',
        'limits': ['JPEG, PNG, WebP или GIF; GIF преобразуется в статическую страницу.', 'На главу: 1–100 изображений, суммарно до 50 МиБ.', 'На изображение: до 20 МиБ и 40 миллионов пикселей. Очень длинные изображения манхвы разделите на несколько частей.', 'Сохранённая очередь на устройстве: суммарно до 300 МиБ; до 1 000 записей ZIP за один выбор файлов. Очистите завершённые записи, чтобы освободить место в очереди.', 'Номер главы должен быть положительным; поддерживается дополнительная глава, например 3.5.', 'ZIP должен быть без пароля. RAR, 7z и ZIP64 не поддерживаются.'],
        'resumeTitle': 'Пауза и продолжение',
        'resume': [
            '«Пауза» останавливает очередь после завершения текущего запроса страницы. «Продолжить» или «Повторить» проверяет уже сохранённые страницы и отправляет недостающие.',
            'Закрытие вкладки, выключение компьютера или обновление страницы останавливает загрузку. Откройте панель на том же устройстве, в том же браузере и под той же учётной записью, затем продолжите сохранённую очередь. Закрытие только окна импорта сохраняет черновики. Выход из аккаунта приостанавливает очередь.',
            'Черновики и исходные файлы сохраняются в хранилище браузера. Если появилась ошибка сохранения, оставьте вкладку открытой: несохранённый черновик может пропасть при обновлении. Очистка данных браузера или переход на другое устройство не переносит сохранённые файлы.',
            'Незавершённая загрузка на сервере сохраняется 7 дней после последней успешно загруженной страницы. После истечения срока очередь начинает новую загрузку, если исходные файлы ещё сохранены на устройстве. Не удаляйте оригиналы до успешного завершения главы.'
        ],
        'problemsTitle': 'Если возникла проблема',
        'problems': [
            ('Номер главы уже существует', 'Не выбирайте этот черновик или удалите его. Если это действительно другая глава, укажите правильный номер до начала загрузки.'),
            ('Изображение или глава слишком большая', 'Уменьшите или сожмите изображения и выберите их заново. Длинную манхву можно разделить на несколько изображений по порядку чтения.'),
            ('Соединение прервано', 'Восстановите соединение и нажмите «Повторить». Сохранённые страницы не отправляются заново.'),
            ('Изображения не найдены', 'Повторно выберите исходную папку или ZIP. Пустой шаблон с текстовыми инструкциями не создаёт глав.'),
            ('Завершённая глава не видна', 'Проверьте статус в списке глав. Главу на модерации должен опубликовать сотрудник с соответствующим правом.'),
            ('Черновик больше не нужен', '«Удалить» убирает черновик и отменяет незавершённую загрузку. «Очистить завершённые» убирает только записи очереди и не удаляет созданные главы.')
        ],
        'checkTitle': 'Перед загрузкой',
        'check': ['Выбрано правильное произведение.', 'Номера глав не повторяются.', 'Все страницы на месте и в порядке чтения.', 'Текст читается в предпросмотре.', 'Проверена настройка модерации или публикации.'],
        'templateNote': 'В шаблоне нет настоящих изображений. Дерево показывает пример готовой папки; текстовые инструкции при импорте пропускаются.'
    }
}


def build():
    templates = ROOT / 'admin/public/templates'
    guides = ROOT / 'admin/public/guides'
    docs = ROOT / 'docs'
    for directory in (templates, guides, docs):
        directory.mkdir(parents=True, exist_ok=True)
    markdown = ['# Admin chapter import guide', '', 'Languages: O‘zbekcha · English · Русский', '', '[Download the folder template](../admin/public/templates/chapter-import-template.zip) · [Open the illustrated guide](../admin/public/guides/chapter-import-guide.html)', '']
    sections = []
    for language, guide in GUIDES.items():
        markdown += [f"## {guide['language']}", '', guide['title'], '', guide['intro'], '', '```text', TREE, '```', '', guide['templateNote'], '']
        parts = [f'<section id="{language}" lang="{language}"><span class="eyebrow">{html.escape(guide["language"])}</span><h1>{html.escape(guide["title"])}</h1><p class="intro">{html.escape(guide["intro"])}</p><a class="download" href="../templates/chapter-import-template.zip" download>{html.escape(guide["download"])}</a><div class="folder"><pre aria-label="Folder structure">{html.escape(TREE)}</pre><p>{html.escape(guide["templateNote"])}</p></div>']
        markdown += [f"### {guide['accessTitle']}", '', guide['access'], '']
        parts += [f'<h2>{html.escape(guide["accessTitle"])}</h2><p>{html.escape(guide["access"])}</p>']
        for title, paragraph in zip(guide['headings'], guide['steps']):
            markdown += [f'### {title}', '', paragraph, '']
            parts += [f'<h2>{html.escape(title)}</h2><p>{html.escape(paragraph)}</p>']
        for title_key, items_key in [('limitsTitle', 'limits'), ('resumeTitle', 'resume'), ('checkTitle', 'check')]:
            markdown += [f"### {guide[title_key]}", ''] + [f'- {item}' for item in guide[items_key]] + ['']
            parts += [f'<h2>{html.escape(guide[title_key])}</h2><ul>' + ''.join(f'<li>{html.escape(item)}</li>' for item in guide[items_key]) + '</ul>']
        markdown += [f"### {guide['problemsTitle']}", '']
        parts += [f'<h2>{html.escape(guide["problemsTitle"])}</h2><dl>']
        for problem, solution in guide['problems']:
            markdown += [f'**{problem}.** {solution}', '']
            parts += [f'<dt>{html.escape(problem)}</dt><dd>{html.escape(solution)}</dd>']
        parts += ['</dl></section>']
        sections.append('\n'.join(parts))
    document = '''<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WebtoonHub · Admin chapter import guide</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#1e293b;font:16px/1.65 system-ui,sans-serif}header{background:#0f172a;color:white;padding:24px max(20px,calc((100vw - 940px)/2))}header strong{font-size:20px}nav{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}nav a{color:#c7d2fe;padding:5px 10px;border:1px solid #475569;border-radius:8px}main{max-width:940px;margin:auto;padding:24px 20px 64px}section{background:white;border:1px solid #dce3ef;border-radius:18px;padding:28px;margin-bottom:30px;scroll-margin-top:20px}h1{font-size:clamp(25px,4vw,36px);line-height:1.2;margin:10px 0 16px}h2{font-size:21px;line-height:1.35;margin-top:30px}.intro{color:#475569;font-size:18px}.eyebrow{color:#4f46e5;font-weight:700}.download{display:inline-block;background:#4f46e5;color:white;border-radius:10px;padding:10px 16px;text-decoration:none;font-weight:600}.folder{margin-top:24px;border:1px solid #cbd5e1;border-radius:12px;overflow:hidden}.folder pre{background:#0f172a;color:#e2e8f0;margin:0;padding:20px;overflow:auto;line-height:1.7;font:14px/1.7 ui-monospace,monospace}.folder p{padding:0 16px;color:#475569;font-size:14px}li{margin-bottom:9px}dt{font-weight:700;margin-top:18px}dd{margin:4px 0 0}a:focus-visible{outline:3px solid #f59e0b;outline-offset:3px}@media(max-width:600px){main{padding:16px 12px}section{padding:20px 16px}}@media print{body{background:white}header,nav,.download{display:none}main{max-width:none;padding:0}section{border:0;padding:0;break-before:page}.folder pre{background:white;color:black}}
</style></head><body><header><strong>WebtoonHub · Admin guide</strong><nav aria-label="Language"><a href="#uz">O‘zbekcha</a><a href="#en">English</a><a href="#ru">Русский</a></nav></header><main>CONTENT</main></body></html>'''.replace('CONTENT', '\n'.join(sections))
    (docs / 'ADMIN_CHAPTER_IMPORT_GUIDE.md').write_text('\n'.join(markdown), encoding='utf-8')
    (guides / 'chapter-import-guide.html').write_text(document, encoding='utf-8')
    readme = '\n\n'.join(guide['language'] + '\n' + guide['intro'] + '\n' + guide['steps'][1] + '\n' + guide['templateNote'] for guide in GUIDES.values())
    readme += '\n\nEXAMPLE / NAMUNA / ПРИМЕР\n' + TREE + '\n\nGuide: admin/public/guides/chapter-import-guide.html\n'
    with zipfile.ZipFile(templates / 'chapter-import-template.zip', 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name, text in [('README.txt', readme)] + [(f'My-Series/{folder}/PUT_IMAGES_HERE.txt', 'Add your real images here: 001.jpg, 002.jpg, ...\nHaqiqiy rasmlaringizni shu papkaga joylang.\nПоместите настоящие изображения в эту папку.\nThis instruction file is skipped during import.\n') for folder in ('Chapter 01', 'Chapter 02', 'Chapter 03.5')]:
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 3, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, text.encode('utf-8'))
    print('Built admin guide in 3 languages and empty chapter folder template.')


if __name__ == '__main__':
    build()
