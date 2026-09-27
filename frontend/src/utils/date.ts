export const formatRelativeTimeUz = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "hozirgina";
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} daqiqa oldin`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} soat oldin`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return "kecha";
  }
  if (diffInDays < 30) {
    return `${diffInDays} kun oldin`;
  }
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} oy oldin`;
  }
  return date.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateUz = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Returns hours, minutes, seconds until next 00:00 midnight in Asia/Tashkent (UTC+5)
 */
export const getTimeUntilTashkentMidnight = (): { hours: number; minutes: number; seconds: number; totalSeconds: number } => {
  const now = new Date();
  // Tashkent is UTC+5 (5 * 60 = 300 minutes)
  const tashkentOffsetMs = 5 * 60 * 60 * 1000;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const tashkentTime = new Date(utcMs + tashkentOffsetMs);

  const nextMidnight = new Date(tashkentTime);
  nextMidnight.setHours(24, 0, 0, 0);

  const diffMs = nextMidnight.getTime() - tashkentTime.getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalSeconds };
};

/**
 * Returns YYYY-MM-DD string according to Asia/Tashkent (UTC+5)
 */
export const getTashkentDateString = (dateInput?: string | Date): string => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const tashkentOffsetMs = 5 * 60 * 60 * 1000;
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60 * 1000;
  const tashkentTime = new Date(utcMs + tashkentOffsetMs);
  const year = tashkentTime.getFullYear();
  const month = String(tashkentTime.getMonth() + 1).padStart(2, '0');
  const day = String(tashkentTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
