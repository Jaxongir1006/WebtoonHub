import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { libraryApi } from '../api/library';
import { useAuth } from '../context/AuthContext';
import { BookmarkItem, BookmarkStatus } from '../types';
import { SafeImage } from '../components/common/SafeImage';
import { getBookmarkStatusLabel, getStatusLabel } from '../utils/format';
import {
  BookOpen,
  Bookmark,
  Trash2,
  Loader2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

const statusTabs: { value: string; label: string; icon: string }[] = [
  { value: '', label: 'Barchasi', icon: '📚' },
  { value: 'reading', label: "O'qilmoqda", icon: '📖' },
  { value: 'plan_to_read', label: 'Rejada', icon: '📌' },
  { value: 'completed', label: "O'qib bo'lindi", icon: '✅' },
  { value: 'dropped', label: 'Tashlab ketildi', icon: '🛑' },
];

export const LibraryPage: React.FC = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');

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
    if (!window.confirm("Kutubxonadan olib tashlashni tasdiqlaysizmi?")) return;
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
        <h2 className="text-2xl font-black text-white mb-2">Mening Kutubxonam</h2>
        <p className="text-xs text-studio-400 max-w-sm mb-6">
          O'qiyotgan, rejadagi yoki tugatilgan manhvalaringizni bir joyda kuzatib borish uchun hisobingizga kiring.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-3 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand active:scale-95 transition-all"
        >
          Kirish / Ro'yxatdan o'tish
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
              <span>Mening Kutubxonam</span>
            </h1>
            <p className="text-xs text-studio-400 mt-1">
              Shaxsiy xatcho'plar va mutolaa ro'yxatingiz
            </p>
          </div>

          <Link
            to="/catalog"
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-studio-900 border border-studio-800 text-xs font-bold text-studio-200 hover:text-white hover:border-brand-500/50 transition-all flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-brand-400" />
            <span>Katalogdan qo'shish</span>
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
            <span className="text-sm">Kutubxona yuklanmoqda...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center bg-studio-900/40 border border-studio-800 rounded-3xl p-8 max-w-md mx-auto">
            <BookOpen className="w-12 h-12 mx-auto text-studio-600 mb-3" />
            <h3 className="font-bold text-white text-base mb-1">
              {activeTab ? "Ushbu bo'limda manhvalar yo'q" : "Kutubxonangiz bo'sh"}
            </h3>
            <p className="text-xs text-studio-400 mb-6">
              Katalogga o'tib qiziqarli manhvalarni xatcho'plarga qo'shing.
            </p>
            <Link
              to="/catalog"
              className="px-5 py-2.5 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand"
            >
              Katalogga o'tish
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
                        {getStatusLabel(item.webtoon.status)}
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
                          <option value="reading">📖 O'qilmoqda</option>
                          <option value="plan_to_read">📌 Rejada</option>
                          <option value="completed">✅ O'qib bo'lindi</option>
                          <option value="dropped">🛑 Tashlab ketildi</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-studio-400 absolute right-1.5 top-2 pointer-events-none" />
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemove(item.webtoon.id)}
                        className="text-studio-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-studio-800 transition-colors"
                        title="O'chirish"
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
                  <span>Mutolaani davom ettirish</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
