import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BookmarkStatus } from '../../types';
import { libraryApi } from '../../api/library';
import { getApiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Bookmark, ChevronDown, Check, Trash2, Loader2 } from 'lucide-react';

interface BookmarkButtonProps {
  webtoonId: number;
  currentStatus?: BookmarkStatus | null;
  onStatusChange?: (newStatus: BookmarkStatus | null) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  webtoonId,
  currentStatus: initialStatus,
  onStatusChange,
  className = '',
  size = 'md'
}) => {
  const { user, isAuthenticated, isLoading: checkingAccount, openAuthModal } = useAuth();
  const { t } = useLanguage();
  const [currentStatus, setCurrentStatus] = useState<BookmarkStatus | null>(initialStatus || null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const identity = `${user?.id || 'guest'}:${webtoonId}`;
  const currentIdentity = useRef(identity); currentIdentity.current = identity;
  useEffect(() => { setCurrentStatus(initialStatus || null); setIsOpen(false); setError(''); }, [user?.id, webtoonId]);

  const statusOptions = useMemo<{ value: BookmarkStatus; label: string; icon: string; color: string }[]>(() => [
    { value: 'reading', label: t('details.bookmarkReading'), icon: '📖', color: 'text-amber-400' },
    { value: 'plan_to_read', label: t('details.bookmarkPlanned'), icon: '📌', color: 'text-blue-400' },
    { value: 'completed', label: t('details.bookmarkCompleted'), icon: '✅', color: 'text-emerald-400' },
    { value: 'dropped', label: t('details.bookmarkDropped'), icon: '🛑', color: 'text-rose-400' },
  ], [t]);

  useEffect(() => {
    if (initialStatus !== undefined) {
      setCurrentStatus(initialStatus);
    }
  }, [initialStatus]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', escape); };
  }, []);

  const handleSelectStatus = async (status: BookmarkStatus) => {
    if (pending.current || checkingAccount) return;
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    const captured = identity; pending.current = true; setLoading(true); setError('');
    try {
      await libraryApi.updateBookmark(webtoonId, status);
      if (currentIdentity.current !== captured) return;
      setCurrentStatus(status);
      onStatusChange?.(status);
      setIsOpen(false);
    } catch (err) {
      if (currentIdentity.current === captured) setError(getApiErrorMessage(err, t('readerFix.saveError')));
    } finally {
      pending.current = false; setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (pending.current || checkingAccount) return;
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    const captured = identity; pending.current = true; setLoading(true); setError('');
    try {
      await libraryApi.removeBookmark(webtoonId);
      if (currentIdentity.current !== captured) return;
      setCurrentStatus(null);
      onStatusChange?.(null);
      setIsOpen(false);
    } catch (err) {
      if (currentIdentity.current === captured) setError(getApiErrorMessage(err, t('readerFix.saveError')));
    } finally {
      pending.current = false; setLoading(false);
    }
  };

  const currentOption = statusOptions.find((o) => o.value === currentStatus);

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5 font-bold'
  }[size];

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={loading || checkingAccount}
        aria-expanded={isOpen}
        onClick={() => {
          if (!isAuthenticated) {
            openAuthModal('login');
            return;
          }
          setIsOpen(!isOpen);
        }}
        className={`min-h-[44px] rounded-xl font-bold flex items-center justify-between transition-all border ${
          currentStatus
            ? 'bg-studio-800 text-white border-brand-500/50 shadow-glow-brand'
            : 'bg-studio-800/80 text-studio-200 border-studio-700 hover:border-studio-600 hover:text-white'
        } ${sizeClasses}`}
      >
        <span className="flex items-center gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
          ) : (
            <Bookmark
              className={`w-4 h-4 ${
                currentStatus ? 'fill-brand-400 text-brand-400' : 'text-studio-400'
              }`}
            />
          )}
          <span>
            {currentOption ? `${currentOption.icon} ${currentOption.label}` : t('details.bookmarkStatus')}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-studio-400 ml-1.5 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-52 max-w-[calc(100vw-2rem)] bg-studio-900 border border-studio-800 rounded-2xl shadow-2xl p-2 z-30">
          <div className="px-2 py-1 text-[11px] font-semibold text-studio-400 uppercase tracking-wider mb-1">
            {t('common.status')}
          </div>
          <div className="space-y-1">
            {statusOptions.map((opt) => {
              const isSelected = currentStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={loading}
                  aria-pressed={isSelected}
                  onClick={() => handleSelectStatus(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-brand-500/10 text-brand-400'
                      : 'text-studio-200 hover:text-white hover:bg-studio-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-brand-400" />}
                </button>
              );
            })}
          </div>

          {currentStatus && (
            <div className="mt-1 pt-1 border-t border-studio-800">
              <button
                type="button"
                disabled={loading}
                onClick={handleRemove}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('details.removeBookmark')}</span>
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-rose-200 mt-2 max-w-xs">{error}</p>}
    </div>
  );
};
