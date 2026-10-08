import React, { useState, useRef, useEffect, useId } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Check, ChevronDown } from 'lucide-react';
import { SupportedLocale } from '../../i18n';

interface LanguageSwitcherProps { compact?: boolean; className?: string; align?: 'left' | 'right'; }
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ compact = false, className = '', align = 'right' }) => {
  const { language, setLanguage, languages, currentLocaleMeta, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null); const id = useId();
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) setIsOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && isOpen) { setIsOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [isOpen]);
  const choose = (locale: SupportedLocale) => { setLanguage(locale); setIsOpen(false); trigger.current?.focus(); };
  return <div ref={wrapper} className={`relative inline-block text-left ${className}`}>
    <button ref={trigger} type="button" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-controls={id} aria-label={`${t('ux.language')}: ${currentLocaleMeta.name}`} className="min-h-[44px] flex items-center gap-1.5 px-2.5 rounded-xl bg-studio-900 border border-studio-800 text-studio-200">
      <span aria-hidden="true">{currentLocaleMeta.flag}</span>{!compact && <span className="text-xs font-bold uppercase">{currentLocaleMeta.code}</span>}<ChevronDown className="w-4 h-4" />
    </button>
    {isOpen && <div id={id} className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-44 max-w-[calc(100vw-2rem)] rounded-2xl bg-studio-900 border border-studio-700 shadow-2xl p-1.5 z-50`}>
      <div className="px-3 py-2 text-xs font-semibold text-studio-400">{t('ux.language')}</div>
      {languages.map(locale => <button key={locale.code} type="button" aria-pressed={language === locale.code} onClick={() => choose(locale.code)} className={`w-full min-h-[44px] flex items-center justify-between px-3 rounded-xl text-sm ${language === locale.code ? 'text-brand-400 bg-brand-500/10' : 'text-studio-200 hover:bg-studio-800'}`}><span><span aria-hidden="true">{locale.flag}</span> {locale.name}</span>{language === locale.code && <Check className="w-4 h-4" />}</button>)}
    </div>}
  </div>;
};
