import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { webtoonsApi } from '../api/webtoons';
import { libraryApi } from '../api/library';
import { useAuth } from '../context/AuthContext';
import { WebtoonDetail, BookmarkStatus, BookmarkItem } from '../types';
import { SafeImage } from '../components/common/SafeImage';
import { BookmarkButton } from '../components/webtoons/BookmarkButton';
import { formatNumber, getStatusLabel } from '../utils/format';
import { formatDateUz } from '../utils/date';
import {
  BookOpen,
  Eye,
  Zap,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';

export const WebtoonDetailPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [webtoon, setWebtoon] = useState<WebtoonDetail | null>(null);
  const [bookmarkStatus, setBookmarkStatus] = useState<BookmarkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    if (!idOrSlug) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await webtoonsApi.getWebtoon(idOrSlug);
        setWebtoon(data);

        // If authenticated, check if in library
        if (isAuthenticated && data) {
          try {
            const library = await libraryApi.getLibrary();
            const found = library?.find((b: BookmarkItem) => b.webtoon.id === data.id);
            if (found) {
              setBookmarkStatus(found.reading_status);
            }
          } catch {
            // ignore
          }
        }
      } catch (err) {
        setError("Manhwa ma'lumotlarini yuklashda xatolik yuz berdi");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [idOrSlug, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen py-32 flex flex-col items-center justify-center text-studio-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
        <span className="text-sm font-semibold">Yuklanmoqda...</span>
      </div>
    );
  }

  if (error || !webtoon) {
    return (
      <div className="min-h-screen py-32 flex flex-col items-center justify-center text-center px-4">
        <div className="p-4 rounded-full bg-rose-500/10 text-rose-400 mb-4">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{error || "Manhwa topilmadi"}</h2>
        <p className="text-xs text-studio-400 mb-6">Ushbu sahifa mavjud emas yoki o'chirilgan bo'lishi mumkin.</p>
        <Link
          to="/catalog"
          className="px-5 py-2.5 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand"
        >
          Katalogga qaytish
        </Link>
      </div>
    );
  }

  const sortedChapters = [...webtoon.chapters].sort((a, b) => {
    return sortAsc
      ? a.chapter_number - b.chapter_number
      : b.chapter_number - a.chapter_number;
  });

  const firstChapter = webtoon.chapters.length > 0 ? webtoon.chapters[0] : null;
  const lastChapter =
    webtoon.chapters.length > 0
      ? webtoon.chapters[webtoon.chapters.length - 1]
      : null;

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Header with Blurred Background */}
      <div className="relative w-full overflow-hidden bg-studio-950 border-b border-studio-800">
        {/* Backdrop Image */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <SafeImage
            src={webtoon.cover_image_url}
            alt={webtoon.title}
            className="w-full h-full object-cover blur-3xl opacity-20 scale-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-studio-950 via-studio-950/80 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 lg:gap-12">
            {/* 3D Cover */}
            <div className="relative shrink-0 w-52 sm:w-64 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-studio-700/80 bg-studio-900">
              <SafeImage
                src={webtoon.cover_image_url}
                alt={webtoon.title}
                fallbackTitle={webtoon.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="flex-1 text-center md:text-left space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                    webtoon.status === 'ongoing'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}
                >
                  {getStatusLabel(webtoon.status)}
                </span>

                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-studio-900 border border-studio-800 text-studio-300">
                  <Eye className="w-3.5 h-3.5 text-studio-400" />
                  <span>{formatNumber(webtoon.view_count)} ko'rishlar</span>
                </span>

                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 border border-brand-500/30 text-brand-400">
                  {webtoon.chapters.length} ta bob
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {webtoon.title}
              </h1>

              {/* Author & Genres */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-studio-300">
                {webtoon.author_name && (
                  <div>
                    Muallif: <b className="text-white">{webtoon.author_name}</b>
                  </div>
                )}
                {webtoon.genres && webtoon.genres.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>•</span>
                    {webtoon.genres.map((g: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-brand-500/10 text-brand-400"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Synopsis */}
              {webtoon.description && (
                <div className="pt-2">
                  <h3 className="text-xs font-bold text-studio-400 uppercase tracking-wider mb-1">
                    Tavsif / Mazmun
                  </h3>
                  <p className="text-xs sm:text-sm text-studio-200 leading-relaxed max-w-3xl whitespace-pre-line">
                    {webtoon.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center justify-center md:justify-start gap-3">
                {firstChapter && (
                  <button
                    onClick={() => navigate(`/chapters/${firstChapter.id}`)}
                    className="px-6 py-3 rounded-xl font-bold bg-brand-500 text-studio-950 hover:bg-brand-400 active:scale-95 shadow-glow-brand transition-all flex items-center gap-2 text-sm"
                  >
                    <BookOpen className="w-4 h-4 fill-studio-950" />
                    <span>1-bobni o'qish</span>
                  </button>
                )}

                {lastChapter && lastChapter.id !== firstChapter?.id && (
                  <button
                    onClick={() => navigate(`/chapters/${lastChapter.id}`)}
                    className="px-5 py-3 rounded-xl font-semibold bg-studio-800 text-white hover:bg-studio-700 active:scale-95 border border-studio-700 transition-all text-sm"
                  >
                    So'nggi bob ({lastChapter.chapter_number})
                  </button>
                )}

                {/* Bookmark dropdown */}
                <BookmarkButton
                  webtoonId={webtoon.id}
                  currentStatus={bookmarkStatus}
                  onStatusChange={setBookmarkStatus}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex items-center justify-between pb-4 border-b border-studio-800 mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-500" />
            <h2 className="text-xl font-black text-white">Boblar Ro'yxati</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-studio-800 text-studio-300">
              {webtoon.chapters.length}
            </span>
          </div>

          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-studio-900 border border-studio-800 text-xs font-semibold text-studio-300 hover:text-white transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortAsc ? "Boshidan tartiblash" : "Oxiridan tartiblash"}</span>
          </button>
        </div>

        {webtoon.chapters.length === 0 ? (
          <div className="py-16 text-center bg-studio-900/40 rounded-3xl border border-studio-800 p-8">
            <BookOpen className="w-10 h-10 mx-auto text-studio-600 mb-2" />
            <p className="text-sm font-semibold text-studio-300">Hozircha boblar yuklanmagan</p>
            <p className="text-xs text-studio-500 mt-1">Tarjimon tez kunda yangi boblarni joylaydi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedChapters.map((ch) => (
              <Link
                key={ch.id}
                to={`/chapters/${ch.id}`}
                className="group flex items-center justify-between p-4 rounded-2xl bg-studio-900/80 border border-studio-800/80 hover:border-brand-500/40 hover:bg-studio-850 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-studio-800 flex items-center justify-center font-mono font-bold text-white text-sm group-hover:bg-brand-500 group-hover:text-studio-950 transition-colors">
                    {ch.chapter_number}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-brand-400 transition-colors">
                      {ch.chapter_number}-bob {ch.title && `— ${ch.title}`}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-studio-500 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDateUz(ch.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Reward badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      ch.is_claimed
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-brand-500/10 text-brand-400 border-brand-500/30 shadow-glow-brand'
                    }`}
                  >
                    {ch.is_claimed ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Olingan</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 fill-brand-400" />
                        <span>+{ch.reward_coins} ⚡</span>
                      </>
                    )}
                  </span>

                  <ChevronRight className="w-4 h-4 text-studio-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
