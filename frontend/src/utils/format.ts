export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString('uz-UZ');
};

export const getStatusLabel = (status: 'ongoing' | 'completed'): string => {
  return status === 'ongoing' ? "Davom etmoqda" : "Tugallangan";
};

export const getBookmarkStatusLabel = (status: string): string => {
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
