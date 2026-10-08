import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SupportedLocale, translations, localeMeta, defaultLocale, getTranslation, getExtraTranslation } from '../i18n';

interface LanguageContextType {
  language: SupportedLocale;
  setLanguage: (lang: SupportedLocale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  languages: Array<{ code: SupportedLocale; name: string; flag: string }>;
  currentLocaleMeta: { code: SupportedLocale; name: string; flag: string };
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'webtoonhub_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLocale>(() => {
    let saved: SupportedLocale | null = null;
    try { saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null; } catch { /* Use the browser locale if storage is unavailable. */ }
    if (saved && (saved === 'uz' || saved === 'ru' || saved === 'en')) {
      return saved;
    }
    // Browser language detection
    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith('ru')) return 'ru';
    if (navLang.startsWith('en')) return 'en';
    return defaultLocale;
  });

  const setLanguage = useCallback((newLang: SupportedLocale) => {
    setLanguageState(newLang);
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch { /* Language changes still work for this session. */ }
    document.documentElement.lang = newLang;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const activeDict = translations[language] || translations[defaultLocale];
      const fallbackDict = translations[defaultLocale];
      return getExtraTranslation(language, path, params) ?? getTranslation(activeDict, path, params, fallbackDict);
    },
    [language]
  );

  const languages = useMemo(() => [localeMeta.uz, localeMeta.ru, localeMeta.en], []);
  const currentLocaleMeta = localeMeta[language] || localeMeta[defaultLocale];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages,
        currentLocaleMeta
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
