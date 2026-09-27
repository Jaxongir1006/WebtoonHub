export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString('uz-UZ');
};

export const getStatusLabel = (status: 'ongoing' | 'completed' | string, t?: (key: string) => string): string => {
  if (t) {
    return status === 'ongoing' ? t('common.ongoing') : t('common.completed');
  }
  return status === 'ongoing' ? "Davom etmoqda" : "Tugallangan";
};

export const getBookmarkStatusLabel = (status: string, t?: (key: string) => string): string => {
  if (t) {
    switch (status) {
      case 'reading':
        return t('details.bookmarkReading');
      case 'plan_to_read':
        return t('details.bookmarkPlanned');
      case 'completed':
        return t('details.bookmarkCompleted');
      case 'dropped':
        return t('details.bookmarkDropped');
      default:
        return status;
    }
  }
  switch (status) {
    case 'reading':
      return "O'qilmoqda";
    case 'plan_to_read':
      return "Rejada";
    case 'completed':
      return "O'qib bo'lindi";
    case 'dropped':
      return "Tashlab ketildi";
    default:
      return status;
  }
};
