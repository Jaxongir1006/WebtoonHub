import { uz } from './uz';
import { ru } from './ru';
import { en } from './en';
import { SupportedLocale, TranslationSchema } from './types';
import { readerFixes } from './readerFixes';
import { socialFixes } from './social';
import { uxFixes } from './uxFixes';
import { cardTranslations } from './cards';
import { currentAudit } from './currentAudit';
import { gachaTranslations } from './gacha';
import { clanShopTranslations } from './clanShop';

export * from './types';

export const translations: Record<SupportedLocale, TranslationSchema> = {
  uz,
  ru,
  en
};

export const localeMeta: Record<SupportedLocale, { code: SupportedLocale; name: string; flag: string }> = {
  uz: { code: 'uz', name: "O'zbekcha", flag: `${import.meta.env.BASE_URL}flags/uz.svg` },
  ru: { code: 'ru', name: 'Русский', flag: `${import.meta.env.BASE_URL}flags/ru.svg` },
  en: { code: 'en', name: 'English', flag: `${import.meta.env.BASE_URL}flags/gb.svg` }
};

export const defaultLocale: SupportedLocale = 'uz';

export function getExtraTranslation(locale: SupportedLocale, path: string, params?: Record<string, string | number>): string | undefined {
  const value = clanShopTranslations[locale][path] ?? gachaTranslations[locale][path] ?? currentAudit[locale][path] ?? readerFixes[locale][path] ?? socialFixes[locale][path] ?? uxFixes[locale][path] ?? cardTranslations[locale][path];
  return value?.replace(/\{(\w+)\}/g, (_, key) => params && key in params ? String(params[key]) : `{${key}}`);
}

/**
 * Nested key lookup with parameter interpolation:
 * getTranslation(translations.uz, 'nav.home') -> "Bosh sahifa"
 * getTranslation(translations.uz, 'details.chapterNum', { number: 1 }) -> "1-bob"
 */
export function getTranslation(
  dict: TranslationSchema,
  path: string,
  params?: Record<string, string | number>,
  fallbackDict?: TranslationSchema
): string {
  const keys = path.split('.');
  let current: any = dict;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      current = undefined;
      break;
    }
  }

  // Fallback to primary locale (uz) if key missing
  if (current === undefined && fallbackDict) {
    let fallbackCurrent: any = fallbackDict;
    for (const key of keys) {
      if (fallbackCurrent && typeof fallbackCurrent === 'object' && key in fallbackCurrent) {
        fallbackCurrent = fallbackCurrent[key];
      } else {
        fallbackCurrent = undefined;
        break;
      }
    }
    current = fallbackCurrent;
  }

  if (typeof current !== 'string') {
    return path;
  }

  if (!params) {
    return current;
  }

  return current.replace(/\{(\w+)\}/g, (_, k) => {
    return k in params ? String(params[k]) : `{${k}}`;
  });
}
