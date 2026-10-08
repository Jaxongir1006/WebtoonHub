import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { libraryApi } from '../api/library';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BookmarkItem, BookmarkStatus } from '../types';
import { SafeImage } from '../components/common/SafeImage';
import { getStatusLabel } from '../utils/format';
import { getApiErrorMessage } from '../api/client';
import { readPosition } from '../utils/readingStorage';
import { readerUrl } from '../utils/reading';
import {
  BookOpen,
  Bookmark,
  Trash2,
  Loader2,
  ChevronDown
} from 'lucide-react';

export const LibraryPage: React.FC = () => {
  const { user, isAuthenticated, isLoading: checkingAccount, openAuthModal } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');
  const [loadError, setLoadError] = useState(false);
  const [mutationError, setMutationError] = useState('');
  const [pending, setPending] = useState<number | null>(null);
  const requestId = useRef(0);
  const owner = useRef(user?.id); owner.current = user?.id;
  const mutating = useRef(false);

  const statusTabs = useMemo(() => [
    { value: '', label: t('catalog.statusAll'), icon: '📚' },
    { value: 'reading', label: t('library.tabReading'), icon: '📖' },
    { value: 'plan_to_read', label: t('library.tabPlanned'), icon: '📌' },
    { value: 'completed', label: t('library.tabCompleted'), icon: '✅' },
    { value: 'dropped', label: t('library.tabDropped'), icon: '🛑' },
  ], [t]);

  const fetchLibrary = useCallback(async () => {
    const request = ++requestId.current;
    if (checkingAccount) return;
    if (!isAuthenticated) {
      setItems([]); setLoadError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const data = await libraryApi.getLibrary(
        activeTab ? (activeTab as BookmarkStatus) : undefined
      );
      if (request === requestId.current) setItems(data || []);
    } catch (err) {
      if (request === requestId.current) setLoadError(true);
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [user?.id, isAuthenticated, checkingAccount, activeTab]);

  useEffect(() => {
    fetchLibrary();
    return () => { requestId.current++; };
  }, [fetchLibrary]);

  const handleStatusChange = async (webtoonId: number, newStatus: BookmarkStatus) => {
    if (mutating.current) return;
    const id = user?.id; mutating.current = true; setPending(webtoonId); setMutationError('');
    try {
      await libraryApi.updateBookmark(webtoonId, newStatus);
      if (owner.current === id) setItems(previous => previous.map(item => item.webtoon.id === webtoonId ? { ...item, reading_status: newStatus } : item).filter(item => !activeTab || item.reading_status === activeTab));
    } catch (err) {
      if (owner.current === id) setMutationError(getApiErrorMessage(err, t('readerFix.saveError')));
    } finally {
      mutating.current = false; setPending(null);
    }
  };

  const handleRemove = async (webtoonId: number) => {
    if (!window.confirm(t('library.confirmRemove'))) return;
    if (mutating.current) return;
    const id = user?.id; mutating.current = true; setPending(webtoonId); setMutationError('');
    try {
      await libraryApi.removeBookmark(webtoonId);
      if (owner.current === id) setItems(previous => previous.filter(item => item.webtoon.id !== webtoonId));
    } catch (err) {
      if (owner.current === id) setMutationError(getApiErrorMessage(err, t('readerFix.saveError')));
    } finally {
      mutating.current = false; setPending(null);
    }
  };

  if (checkingAccount) return <div role="status" className="py-24 text-center text-studio-300">{t('readerFix.checking')}</div>;
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-24 flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 shadow-glow-brand">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">{t('library.title')}</h2>
        <p className="text-xs text-studio-400 max-w-sm mb-6">
          {t('library.loginRequired')}
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-3 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand active:scale-95 transition-all"
        >
          {t('library.loginBtn')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2.5">
              <Bookmark className="w-8 h-8 text-brand-500 fill-brand-500" />
              <span>{t('library.title')}</span>
            </h1>
            <p className="text-xs text-studio-400 mt-1">
              {t('library.subtitle')}
            </p>
          </div>

          <Link
            to="/catalog"
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-studio-900 border border-studio-800 text-xs font-bold text-studio-200 hover:text-white hover:border-brand-500/50 transition-all flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-brand-400" />
            <span>{t('library.addToLibrary')}</span>
          </Link>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none select-none">
          {statusTabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                aria-pressed={isActive}
                onClick={() => setActiveTab(tab.value)}
                className={`min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-brand-500 text-studio-950 shadow-glow-brand'
                    : 'bg-studio-900 border border-studio-800 text-studio-400 hover:text-white hover:border-studio-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {mutationError && <p role="alert" className="mb-4 text-rose-200">{mutationError}</p>}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-studio-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <span className="text-sm">{t('common.loading')}</span>
          </div>
        ) : loadError ? <div role="alert" className="py-12 text-center text-rose-200"><p>{t('readerFix.loadError')}</p><button className="min-h-[44px] px-4 mt-3 bg-brand-500 text-studio-950 rounded-xl font-bold" onClick={fetchLibrary}>{t('common.retry')}</button></div> : items.length === 0 ? (
          <div className="py-20 text-center bg-studio-900/40 border border-studio-800 rounded-3xl p-8 max-w-md mx-auto">
            <BookOpen className="w-12 h-12 mx-auto text-studio-600 mb-3" />
            <h3 className="font-bold text-white text-base mb-1">
              {t('library.emptyTitle')}
            </h3>
            <p className="text-xs text-studio-400 mb-6">
              {t('library.emptyDesc')}
            </p>
            <Link
              to="/catalog"
              className="px-5 py-2.5 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand"
            >
              {t('library.exploreCatalog')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => { const local = readPosition(item.webtoon.id, user?.id); const saved = local && (!item.reading_progress || Date.parse(local.updated_at || '') > Date.parse(item.reading_progress.updated_at || '')) ? local : item.reading_progress; const chapterId = saved?.chapter_id || item.webtoon.first_chapter?.id; return (
              <div
                key={item.webtoon.id}
                className="flex flex-col bg-studio-900 border border-studio-800 rounded-2xl p-3.5 hover:border-studio-700 transition-all group"
              >
                <div className="flex gap-3">
                  {/* Cover */}
                  <Link
                    to={`/webtoons/${item.webtoon.slug || item.webtoon.id}`}
                    className="shrink-0 w-20 aspect-[3/4] rounded-xl overflow-hidden bg-studio-950"
                  >
                    <SafeImage
                      src={item.webtoon.cover_image_url}
                      alt={item.webtoon.title}
                      fallbackTitle={item.webtoon.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-studio-400">
                        {getStatusLabel(item.webtoon.status, t)}
                      </span>
                      <Link
                        to={`/webtoons/${item.webtoon.slug || item.webtoon.id}`}
                        className="font-bold text-sm text-white line-clamp-2 hover:text-brand-400 transition-colors mt-0.5"
                      >
                        {item.webtoon.title}
                      </Link>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      {/* Status selector */}
                      <div className="relative">
                        <select
                          aria-label={`${t('common.status')}: ${item.webtoon.title}`}
                          disabled={pending !== null}
                          value={item.reading_status}
                          onChange={(e) =>
                            handleStatusChange(
                              item.webtoon.id,
                              e.target.value as BookmarkStatus
                            )
                          }
                          className="min-h-[44px] max-w-full bg-studio-800 border border-studio-700 text-brand-400 text-xs font-bold rounded-lg px-2 py-2 pr-6 focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value="reading">📖 {t('library.tabReading')}</option>
                          <option value="plan_to_read">📌 {t('library.tabPlanned')}</option>
                          <option value="completed">✅ {t('library.tabCompleted')}</option>
                          <option value="dropped">🛑 {t('library.tabDropped')}</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-studio-400 absolute right-1.5 top-2 pointer-events-none" />
                      </div>

                      {/* Remove button */}
                      <button
                        aria-label={`${t('details.removeBookmark')}: ${item.webtoon.title}`}
                        disabled={pending !== null}
                        onClick={() => handleRemove(item.webtoon.id)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-studio-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-studio-800 transition-colors"
                        title={t('details.removeBookmark')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Read Button */}
                <Link
                  to={chapterId ? readerUrl(chapterId) : `/webtoons/${item.webtoon.slug || item.webtoon.id}`}
                  className="mt-3 min-h-[44px] w-full py-2 rounded-xl bg-studio-800 hover:bg-brand-500 hover:text-studio-950 text-studio-200 text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t(saved ? 'library.continueReading' : chapterId ? 'details.startReading' : 'details.detailsTitle')}</span>
                </Link>
              </div>
            ); })}
          </div>
        )}
      </div>
    </div>
  );
};
