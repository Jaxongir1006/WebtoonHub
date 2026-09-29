import React from 'react';
import { Zap } from 'lucide-react';
import { formatNumber } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';

interface CoinBadgeProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

export const CoinBadge: React.FC<CoinBadgeProps> = ({
  amount,
  size = 'md',
  showLabel = false,
  className = '',
  onClick
}) => {
  const { t } = useLanguage();
  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3.5 py-1.5 gap-2 font-semibold'
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center rounded-full font-bold bg-brand-500/10 text-brand-400 border border-brand-500/30 hover:border-brand-500/60 shadow-glow-brand transition-all ${
        onClick ? 'cursor-pointer hover:bg-brand-500/20 active:scale-95' : ''
      } ${sizeStyles} ${className}`}
      title={`${amount} ${t('common.coins')}`}
    >
      <Zap className={`${iconSizes} fill-brand-400 text-brand-400 animate-pulse-subtle`} />
      <span>{formatNumber(amount)}</span>
      {showLabel && <span className="font-normal text-brand-300/80 text-xs">{t('common.coins')}</span>}
    </div>
  );
};
