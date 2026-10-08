export const parseApiDate = (value: string): Date => new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(value) ? `${value}Z` : value);

export const formatRelativeTime = (dateString?: string, locale: string = 'uz'): string => {
  if (!dateString) return '';
  const date = parseApiDate(dateString);
  if (!Number.isFinite(date.getTime())) return '';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    if (locale === 'ru') return "только что";
    if (locale === 'en') return "just now";
    return "hozirgina";
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    if (locale === 'ru') return `${diffInMinutes} мин. назад`;
    if (locale === 'en') return `${diffInMinutes}m ago`;
    return `${diffInMinutes} daqiqa oldin`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    if (locale === 'ru') return `${diffInHours} ч. назад`;
    if (locale === 'en') return `${diffInHours}h ago`;
    return `${diffInHours} soat oldin`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    if (locale === 'ru') return "вчера";
    if (locale === 'en') return "yesterday";
    return "kecha";
  }
  if (diffInDays < 30) {
    if (locale === 'ru') return `${diffInDays} дн. назад`;
    if (locale === 'en') return `${diffInDays}d ago`;
    return `${diffInDays} kun oldin`;
  }
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    if (locale === 'ru') return `${diffInMonths} мес. назад`;
    if (locale === 'en') return `${diffInMonths}mo ago`;
    return `${diffInMonths} oy oldin`;
  }
  const loc = locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'uz-UZ';
  return date.toLocaleDateString(loc, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatRelativeTimeUz = (dateString?: string, locale: string = 'uz'): string =>
  formatRelativeTime(dateString, locale);

export const formatDate = (dateString?: string, locale: string = 'uz'): string => {
  if (!dateString) return '';
  const date = parseApiDate(dateString);
  if (!Number.isFinite(date.getTime())) return '';
  const loc = locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'uz-UZ';
  return date.toLocaleDateString(loc, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateUz = (dateString?: string, locale: string = 'uz'): string =>
  formatDate(dateString, locale);

/**
 * Returns hours, minutes, seconds until next 00:00 midnight in Asia/Tashkent (UTC+5)
 */
export const getTimeUntilTashkentMidnight = (now = new Date()): { hours: number; minutes: number; seconds: number; totalSeconds: number } => {
  const dayMs = 86400000;
  const localDayMs = ((now.getTime() + 18000000) % dayMs + dayMs) % dayMs;
  const totalSeconds = Math.max(0, Math.floor((dayMs - localDayMs) / 1000));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalSeconds };
};

/**
 * Returns YYYY-MM-DD string according to Asia/Tashkent (UTC+5)
 */
export const getTashkentDateString = (dateInput?: string | Date): string => {
  const d = typeof dateInput === 'string' ? parseApiDate(dateInput) : dateInput || new Date();
  return Number.isFinite(d.getTime()) ? new Date(d.getTime() + 18000000).toISOString().slice(0, 10) : '';
};
