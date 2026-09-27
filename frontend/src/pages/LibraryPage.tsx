import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { libraryApi } from '../api/library';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BookmarkItem, BookmarkStatus } from '../types';
import { SafeImage } from '../components/common/SafeImage';
import { getStatusLabel } from '../utils/format';
import {
  BookOpen,
  Bookmark,
  Trash2,
  Loader2,
  ChevronDown
} from 'lucide-react';

export const LibraryPage: React.FC = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');

  const statusTabs = useMemo(() => [
    { value: '', label: t('catalog.statusAll'), icon: '📚' },
    { value: 'reading', label: t('library.tabReading'), icon: '📖' },
    { value: 'plan_to_read', label: t('library.tabPlanned'), icon: '📌' },
    { value: 'completed', label: t('library.tabCompleted'), icon: '✅' },
    { value: 'dropped', label: t('library.tabDropped'), icon: '🛑' },
  ], [t]);

  const fetchLibrary = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await libraryApi.getLibrary(
        activeTab ? (activeTab as BookmarkStatus) : undefined
      );
      setItems(data || []);
    } catch (err) {
      console.error("Failed to fetch library", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleStatusChange = async (webtoonId: number, newStatus: BookmarkStatus) => {
    try {
      await libraryApi.updateBookmark(webtoonId, newStatus);
      await fetchLibrary();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleRemove = async (webtoonId: number) => {
    if (!window.confirm(t('library.confirmRemove'))) return;
    try {
      await libraryApi.removeBookmark(webtoonId);
      await fetchLibrary();
    } catch (err) {
      console.error("Failed to remove bookmark", err);
    }
  };

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
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
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
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-studio-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <span className="text-sm">{t('common.loading')}</span>
          </div>
        ) : items.length === 0 ? (
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
            {items.map((item) => (
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
                          value={item.reading_status}
                          onChange={(e) =>
                            handleStatusChange(
                              item.webtoon.id,
                              e.target.value as BookmarkStatus
                            )
                          }
                          className="bg-studio-800 border border-studio-700 text-brand-400 text-[11px] font-bold rounded-lg px-2 py-1 pr-6 focus:outline-none appearance-none cursor-pointer"
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
                        onClick={() => handleRemove(item.webtoon.id)}
                        className="text-studio-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-studio-800 transition-colors"
                        title={t('details.removeBookmark')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Read Button */}
                <Link
                  to={`/webtoons/${item.webtoon.slug || item.webtoon.id}`}
                  className="mt-3 w-full py-1.5 rounded-xl bg-studio-800 hover:bg-brand-500 hover:text-studio-950 text-studio-200 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t('library.continueReading')}</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
