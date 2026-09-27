import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { SupportedLocale } from '../../i18n';

interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  compact = false,
  className = ''
}) => {
  const { language, setLanguage, languages, currentLocaleMeta } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: SupportedLocale) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-studio-900 border border-studio-800 hover:border-studio-700 text-studio-200 hover:text-white text-xs font-semibold transition-all focus:outline-none focus:ring-1 focus:ring-brand-500/50 select-none"
        title="Tilni o'zgartirish / Change language / Сменить язык"
      >
        <span className="text-sm leading-none">{currentLocaleMeta.flag}</span>
        {!compact && (
          <span className="uppercase text-[11px] font-bold text-studio-300">
            {currentLocaleMeta.code}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-studio-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-studio-900 border border-studio-800 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-studio-500 border-b border-studio-800/80 mb-1">
            Language / Til
          </div>
          {languages.map((loc) => {
            const isSelected = loc.code === language;
            return (
              <button
                key={loc.code}
                type="button"
                onClick={() => handleSelect(loc.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-brand-500/10 text-brand-400 font-bold'
                    : 'text-studio-300 hover:text-white hover:bg-studio-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{loc.flag}</span>
                  <span>{loc.name}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-brand-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
