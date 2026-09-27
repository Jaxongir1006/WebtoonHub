import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { webtoonsApi } from '../api/webtoons';
import { ChapterReaderData, ChapterSummary, ChapterImage } from '../types';
import { ReaderNav } from '../components/reader/ReaderNav';
import { RewardClaimCard } from '../components/reader/RewardClaimCard';
import { ChapterComments } from '../components/comments/ChapterComments';
import { useLanguage } from '../context/LanguageContext';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

export const ReaderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [data, setData] = useState<ChapterReaderData | null>(null);
  const [allChapters, setAllChapters] = useState<ChapterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reader UI state
  const [navVisible, setNavVisible] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const lastScrollY = useRef(0);

  const fetchChapter = useCallback(async (chapterId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await webtoonsApi.readChapter(chapterId);
      setData(res);

      // Fetch all chapters of this webtoon for chapter selector drawer
      if (res.webtoon_id) {
        try {
          const detail = await webtoonsApi.getWebtoon(res.webtoon_id);
          setAllChapters(detail.chapters || []);
        } catch {
          // ignore
        }
      }
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (id) {
      fetchChapter(parseInt(id, 10));
    }
  }, [id, fetchChapter]);

  // Scroll listener for progress and auto-hiding header
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;

      if (totalHeight > 0) {
        const percent = Math.min(100, Math.max(0, (currentScroll / totalHeight) * 100));
        setScrollProgress(percent);
      }

      // Auto-hide when scrolling down, show when scrolling up
      if (currentScroll > lastScrollY.current + 30 && currentScroll > 150) {
        setNavVisible(false);
      } else if (currentScroll < lastScrollY.current - 15) {
        setNavVisible(true);
      }
      lastScrollY.current = currentScroll;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleNav = () => {
    setNavVisible((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-studio-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
        <span className="text-sm font-semibold">{t('common.loading')}</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-studio-950 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="p-4 rounded-full bg-rose-500/10 text-rose-400 mb-4">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{error || t('common.notFound')}</h2>
        <p className="text-xs text-studio-400 mb-6">{t('reader.pagesNotFoundDesc')}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Floating Reader Navigation */}
      <ReaderNav
        data={data}
        visible={navVisible}
        progress={scrollProgress}
        allChapters={allChapters}
        onSelectChapter={(chapId: number) => navigate(`/chapters/${chapId}`)}
      />

      {/* Main Vertical Strip Image Reader Container */}
      <main
        onClick={toggleNav}
        className="max-w-3xl mx-auto flex flex-col items-center cursor-pointer select-none bg-studio-950 pt-14"
      >
        {data.images && data.images.length > 0 ? (
          [...data.images]
            .sort((a: ChapterImage, b: ChapterImage) => a.order_index - b.order_index)
            .map((img: ChapterImage) => (
              <img
                key={img.id || img.order_index}
                src={img.image_url}
                alt={`Page ${img.order_index}`}
                className="w-full h-auto block select-none pointer-events-none"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.style.display = 'none';
                  const fallbackDiv = document.createElement('div');
                  fallbackDiv.className = 'w-full py-16 px-4 bg-studio-900 border border-studio-800 text-center text-xs text-studio-400 my-1';
                  fallbackDiv.innerHTML = `<span class="text-amber-400 font-bold block mb-1">${t('reader.pageLoadError', { order: img.order_index })}</span><span class="text-studio-500 text-[11px]">${t('reader.pageNetworkError')}</span>`;
                  target.parentNode?.insertBefore(fallbackDiv, target);
                }}
              />
            ))
        ) : (
          <div className="py-32 px-4 text-center text-studio-400">
            <BookOpen className="w-12 h-12 mx-auto text-studio-600 mb-3" />
            <p className="font-semibold text-base text-white">{t('reader.pagesNotFound')}</p>
            <p className="text-xs text-studio-500 mt-1">{t('reader.pagesNotFoundDesc')}</p>
          </div>
        )}
      </main>

      {/* End of Chapter Section */}
      <div className="bg-studio-950 border-t border-studio-800 px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-block p-1 px-4 rounded-full bg-studio-900 border border-studio-800 text-xs font-semibold text-studio-300">
            {t('reader.chapterCompleted', { webtoon: data.webtoon_title, chapter: data.chapter_number })}
          </div>

          {/* Chapter Navigation Buttons */}
          <div className="flex items-center justify-center gap-3">
            {data.prev_chapter_id && (
              <Link
                to={`/chapters/${data.prev_chapter_id}`}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-800 text-studio-200 text-xs font-bold hover:text-white hover:bg-studio-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{t('reader.prevChapter')}</span>
              </Link>
            )}

            <Link
              to={`/webtoons/${data.webtoon_id}`}
              className="px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-800 text-studio-300 text-xs font-bold hover:text-white transition-colors"
            >
              {t('reader.chaptersList')}
            </Link>

            {data.next_chapter_id && (
              <Link
                to={`/chapters/${data.next_chapter_id}`}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-500 text-studio-950 text-xs font-bold hover:bg-brand-400 shadow-glow-brand transition-all"
              >
                <span>{t('reader.nextChapter')}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* Reward Claim Card (+5 Chaqmoq) */}
          <RewardClaimCard
            key={data.id}
            chapterId={data.id}
            initialClaimed={data.is_reward_claimed}
            rewardAmount={data.reward_coins || 5}
            onClaimSuccess={() => {
              setData((prev: ChapterReaderData | null) => (prev ? { ...prev, is_reward_claimed: true } : null));
            }}
          />
        </div>

        {/* Interactive Comments Section */}
        <ChapterComments key={data.id} chapterId={data.id} />
      </div>
    </div>
  );
};
