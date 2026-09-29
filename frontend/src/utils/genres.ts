import { SupportedLocale } from '../i18n';

const genreNames: Record<string, Record<SupportedLocale, string>> = {
  Jangari: { uz: 'Jangari', ru: 'Экшен', en: 'Action' },
  Fantaziya: { uz: 'Fantaziya', ru: 'Фэнтези', en: 'Fantasy' },
  Dramma: { uz: 'Dramma', ru: 'Драма', en: 'Drama' },
  Komediya: { uz: 'Komediya', ru: 'Комедия', en: 'Comedy' },
  Romantika: { uz: 'Romantika', ru: 'Романтика', en: 'Romance' },
  'Tirik qolish': { uz: 'Tirik qolish', ru: 'Выживание', en: 'Survival' },
  'Tizim / Isekai': { uz: 'Tizim / Isekai', ru: 'Система / Исекай', en: 'System / Isekai' },
  'Sirli / Psixologik': { uz: 'Sirli / Psixologik', ru: 'Мистика / Психология', en: 'Mystery / Psychological' },
};

export const localizeGenre = (name: string, language: SupportedLocale): string =>
  genreNames[name]?.[language] || name;
