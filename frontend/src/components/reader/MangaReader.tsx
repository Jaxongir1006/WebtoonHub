import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChapterReaderData, ChapterSummary, ReadingProgress } from '../../types';
import { PositionChange } from '../../hooks/useReadingProgress';
import { clampPage, isInteractiveTarget } from '../../utils/reading';
import { RewardClaimCard } from './RewardClaimCard';
import { ChapterComments } from '../comments/ChapterComments';
import { useLanguage } from '../../context/LanguageContext';
import { useNovelPageSwipe } from '../../hooks/useNovelPageSwipe';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowLeftRight,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Layers,
  ArrowLeft
} from 'lucide-react';

interface MangaReaderProps {
  data: ChapterReaderData;
  allChapters: ChapterSummary[];
  onClaimSuccess: () => void;
  initialPosition?: ReadingProgress;
  onProgress: (position: PositionChange) => void;
  rewardReady: boolean;
}

export const MangaReader: React.FC<MangaReaderProps> = ({
  data,
  allChapters,
  onClaimSuccess,
  initialPosition,
  onProgress,
  rewardReady
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Sort images by order_index
  const sortedImages = React.useMemo(() => {
    return [...(data.images || [])].sort((a, b) => a.order_index - b.order_index);
  }, [data.images]);

  // Current page index (0-based)
  const [currentPage, setCurrentPage] = useState<number>(() => clampPage(initialPosition?.page_index || 0, sortedImages.length));
  const [imageFailed, setImageFailed] = useState(false);
  const [imageAttempt, setImageAttempt] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  // Reading direction: 'rtl' (default for Japanese manga) or 'ltr'
  const [direction, setDirection] = useState<'rtl' | 'ltr'>(() => {
    try { return localStorage.getItem('webtoonhub_manga_direction') === 'ltr' ? 'ltr' : 'rtl'; } catch { return 'rtl'; }
  });
  // Fit mode: 'height' or 'width'
  const [fitMode, setFitMode] = useState<'height' | 'width'>('height');
  // HUD controls visibility
  const [hudVisible, setHudVisible] = useState<boolean>(true);
  const totalPages = sortedImages.length;
  const isLastPage = currentPage === totalPages - 1;

  // Page turns always begin at the top, including tall fit-width pages.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [data.id, currentPage]);

  useEffect(() => {
    setImageFailed(false); setImageAttempt(0);
    onProgress({ page_index: currentPage, anchor: 'image:' + currentPage, progress_percent: totalPages ? (currentPage + 1) / totalPages * 100 : 0, completed: Boolean(initialPosition?.completed) });
  }, [currentPage, totalPages, initialPosition?.completed, onProgress]);

  useEffect(() => {
    if (headerRef.current) headerRef.current.inert = !hudVisible;
    if (footerRef.current) footerRef.current.inert = !hudVisible;
  }, [hudVisible]);

  const toggleDirection = () => {
    const next = direction === 'rtl' ? 'ltr' : 'rtl';
    setDirection(next);
    try { localStorage.setItem('webtoonhub_manga_direction', next); } catch { /* The current session can still use the selected direction. */ }
  };

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => clampPage(prev + 1, totalPages));
  }, [totalPages]);

  const goToPrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  }, []);

  // In RTL mode:
  // - Clicking left side or pressing Left Arrow goes FORWARD (next page)
  // - Clicking right side or pressing Right Arrow goes BACKWARD (previous page)
  // In LTR mode:
  // - Clicking right side or pressing Right Arrow goes FORWARD (next page)
  // - Clicking left side or pressing Left Arrow goes BACKWARD (previous page)
  const handleLeftAction = useCallback(() => {
    if (direction === 'rtl') {
      goToNextPage();
    } else {
      goToPrevPage();
    }
  }, [direction, goToNextPage, goToPrevPage]);

  const handleRightAction = useCallback(() => {
    if (direction === 'rtl') {
      goToPrevPage();
    } else {
      goToNextPage();
    }
  }, [direction, goToNextPage, goToPrevPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in comment input
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isInteractiveTarget(e.target)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleLeftAction();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleRightAction();
      } else if (e.key === 'f' || e.key === 'F') {
        setFitMode((prev) => (prev === 'height' ? 'width' : 'height'));
      } else if (e.key === 'd' || e.key === 'D') {
        toggleDirection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLeftAction, handleRightAction]);

  const swipeHandlers = useNovelPageSwipe({
    pageKey: `${data.id}:${currentPage}:${direction}`,
    enabled: totalPages > 1,
    onTurnPage: turn => {
      const forward = direction === 'rtl' ? turn < 0 : turn > 0;
      if (forward) goToNextPage(); else goToPrevPage();
    }
  });

  const currentImage = sortedImages[currentPage];

  return (
    <div
      className="min-h-screen bg-studio-950 text-white flex flex-col relative select-none"
    >
      {/* Top Floating HUD Header */}
      <header
        ref={headerRef}
        aria-hidden={!hudVisible}
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 bg-studio-950/90 backdrop-blur-md border-b border-studio-800/80 px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2 ${
          hudVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-1 min-w-0 items-center gap-3">
          <Link
            to={`/webtoons/${data.webtoon_id}`}
            className="p-2 rounded-xl bg-studio-900 border border-studio-800 text-studio-400 hover:text-white transition-colors"
            title={t('reader.backToManhwa')}
            aria-label={t('reader.backToManhwa')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white line-clamp-1">{data.webtoon_title}</div>
            <div className="text-xs text-brand-400 font-medium truncate">
              <span>{t('details.chapterNum', { number: data.chapter_number })}</span>
              {data.title && <span className="text-studio-500">• {data.title}</span>}
            </div>
          </div>
        </div>

        {/* Chapter Switcher & Reader Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
          {/* Reading Direction Toggle (RTL / LTR) */}
          <button
            onClick={toggleDirection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-studio-900 border border-studio-800 hover:border-brand-500/50 text-xs font-bold text-studio-300 transition-all shadow-sm"
            title={t('reader.readingDirection')}
            aria-label={t('reader.readingDirection') + ': ' + direction.toUpperCase()}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-brand-400" />
            <span className="hidden sm:inline">
              {direction === 'rtl' ? t('reader.mangaRTL') : t('reader.mangaLTR')}
            </span>
            <span className="sm:hidden font-mono uppercase text-[10px] text-brand-400">
              {direction.toUpperCase()}
            </span>
          </button>

          {/* Fit Mode Toggle */}
          <button
            onClick={() => setFitMode((prev) => (prev === 'height' ? 'width' : 'height'))}
            className="p-2 rounded-xl bg-studio-900 border border-studio-800 text-studio-300 hover:text-white transition-colors"
            title={fitMode === 'height' ? t('readerFix.fitWidth') : t('readerFix.fitHeight')}
            aria-label={fitMode === 'height' ? t('readerFix.fitWidth') : t('readerFix.fitHeight')}
          >
            {fitMode === 'height' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>

          {/* Chapter Selector Dropdown */}
          {allChapters.length > 0 && (
            <select
              aria-label={t('readerFix.selectChapter')}
              value={data.id}
              onChange={(e) => navigate(`/chapters/${e.target.value}`)}
              className="min-w-0 flex-1 sm:flex-none min-h-11 bg-studio-900 border border-studio-800 rounded-xl px-2.5 py-1.5 text-sm text-studio-200 font-bold focus:outline-none focus:border-brand-500"
            >
              {allChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {t('details.chapterNum', { number: ch.chapter_number })}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* Main Manga Reader Viewport */}
      {!hudVisible && <button onClick={() => setHudVisible(true)} aria-label={t('readerFix.showControls')} className="fixed top-3 right-3 z-40 rounded-xl min-h-11 px-3 bg-studio-900 text-white border border-studio-700">{t('readerFix.showControls')}</button>}
      <main {...swipeHandlers} style={{ touchAction: 'pan-y pinch-zoom', overflowAnchor: 'none' }} className="flex-1 flex flex-col items-center justify-center relative pt-28 sm:pt-20 pb-20 overflow-hidden min-h-[85vh]">
        {/* Click Zone Left (35% width) */}
        <div
          onClick={handleLeftAction}
          className="absolute inset-y-0 left-0 w-[35%] z-20 cursor-w-resize group flex items-center justify-start pl-4"
          title={direction === 'rtl' ? t('reader.nextPage') : t('reader.prevPage')}
        >
          <div className="p-3 rounded-full bg-studio-950/70 border border-studio-800/80 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-xl">
            <ChevronLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Click Zone Center (30% width: toggles HUD) */}
        <div
          onClick={() => setHudVisible((prev) => !prev)}
          className="absolute inset-y-0 left-[35%] w-[30%] z-20 cursor-pointer"
        />

        {/* Click Zone Right (35% width) */}
        <div
          onClick={handleRightAction}
          className="absolute inset-y-0 right-0 w-[35%] z-20 cursor-e-resize group flex items-center justify-end pr-4"
          title={direction === 'rtl' ? t('reader.prevPage') : t('reader.nextPage')}
        >
          <div className="p-3 rounded-full bg-studio-950/70 border border-studio-800/80 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-xl">
            <ChevronRight className="w-6 h-6" />
          </div>
        </div>

        {/* Manga Page Display */}
        {imageFailed ? <div role="alert" className="relative z-30 p-8 text-center space-y-4 text-studio-300"><p>{t('reader.pageLoadError', { order: currentPage + 1 })}</p><button onClick={() => { setImageAttempt(attempt => attempt + 1); setImageFailed(false); }} className="min-h-11 px-5 rounded-xl bg-brand-500 text-studio-950">{t('common.retry')}</button></div> : currentImage ? (
          <div className="flex items-center justify-center w-full max-w-5xl px-2 select-none">
            <img
              src={imageAttempt ? currentImage.image_url + (currentImage.image_url.includes('?') ? '&' : '?') + 'retry=' + imageAttempt : currentImage.image_url}
              alt={t('reader.pageNum', { number: currentPage + 1 })}
              className={`object-contain transition-all duration-200 select-none shadow-2xl rounded-lg ${
                fitMode === 'height' ? 'max-h-[84vh] w-auto' : 'w-full max-w-4xl h-auto'
              }`}
              loading="eager"
              width={currentImage.width || undefined}
              height={currentImage.height || undefined}
              onError={() => setImageFailed(true)}
              onLoad={() => onProgress({ page_index: currentPage, anchor: 'image:' + currentPage, progress_percent: (currentPage + 1) / totalPages * 100, completed: isLastPage || Boolean(initialPosition?.completed) })}
            />
          </div>
        ) : (
          <div className="py-24 text-center text-studio-400">
            <BookOpen className="w-12 h-12 mx-auto text-studio-600 mb-3" />
            <p className="font-semibold">{t('reader.pagesNotFound')}</p>
          </div>
        )}
      </main>

      {/* Bottom Floating Navigation Bar */}
      <footer
        ref={footerRef}
        aria-hidden={!hudVisible}
        className={`fixed bottom-0 inset-x-0 z-40 transition-all duration-300 bg-studio-950/90 backdrop-blur-md border-t border-studio-800/80 px-4 py-3 flex items-center justify-between ${
          hudVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Left Side: Prev Button (direction aware) */}
        <button
          aria-label={direction === 'rtl' ? t('reader.nextPage') : t('reader.prevPage')}
          onClick={handleLeftAction}
          disabled={direction === 'rtl' ? isLastPage : currentPage === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-studio-900 border border-studio-800 text-xs font-bold text-studio-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">
            {direction === 'rtl' ? t('reader.nextPage') : t('reader.prevPage')}
          </span>
        </button>

        {/* Center: Page Slider & Indicator */}
        <div className="flex items-center gap-3">
          <input
            aria-label={t('readerFix.page', { page: totalPages ? currentPage + 1 : 0, total: totalPages })}
            type="range"
            min={0}
            max={Math.max(0, totalPages - 1)}
            value={currentPage}
            onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
            className="w-28 sm:w-44 accent-brand-500 cursor-pointer"
          />
          <span className="text-xs font-bold text-white tabular-nums bg-studio-900 px-3 py-1 rounded-lg border border-studio-800">
            {totalPages ? currentPage + 1 : 0} / {totalPages}
          </span>
        </div>

        {/* Right Side: Next Button (direction aware) */}
        <button
          aria-label={direction === 'rtl' ? t('reader.prevPage') : t('reader.nextPage')}
          onClick={handleRightAction}
          disabled={direction === 'rtl' ? currentPage === 0 : isLastPage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-studio-900 border border-studio-800 text-xs font-bold text-studio-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <span className="hidden sm:inline">
            {direction === 'rtl' ? t('reader.prevPage') : t('reader.nextPage')}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

      {/* Completion & Rewards Section when reaching the end */}
      {isLastPage && (
        <section className="bg-studio-900/90 border-t border-studio-800 px-4 py-12">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 p-1.5 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('reader.chapterCompleted', { webtoon: data.webtoon_title, chapter: data.chapter_number })}</span>
            </div>

            {/* Chapter Navigation Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {data.prev_chapter_id && (
                <Link
                  to={`/chapters/${data.prev_chapter_id}`}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-800 text-studio-200 text-xs font-bold hover:text-white transition-colors"
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

            {/* Reward Claim Card */}
            <RewardClaimCard
              key={data.id}
              chapterId={data.id}
              initialClaimed={data.is_reward_claimed}
              rewardAmount={data.reward_coins ?? 5}
              ready={rewardReady}
              onClaimSuccess={onClaimSuccess}
            />
          </div>

          {/* Interactive Comments */}
          <ChapterComments key={data.id} chapterId={data.id} />
        </section>
      )}
    </div>
  );
};
