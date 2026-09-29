import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChapterReaderData, ChapterSummary } from '../../types';
import { RewardClaimCard } from './RewardClaimCard';
import { ChapterComments } from '../comments/ChapterComments';
import { useLanguage } from '../../context/LanguageContext';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Settings,
  Type,
  Sun,
  Moon,
  Coffee,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface NovelReaderProps {
  data: ChapterReaderData;
  allChapters: ChapterSummary[];
  onClaimSuccess: () => void;
}

type NovelTheme = 'dark' | 'sepia' | 'light';
type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type FontFamily = 'serif' | 'sans';

export const NovelReader: React.FC<NovelReaderProps> = ({
  data,
  allChapters,
  onClaimSuccess
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Reader Customizer Settings
  const [theme, setTheme] = useState<NovelTheme>(() => {
    return (localStorage.getItem('webtoonhub_novel_theme') as NovelTheme) || 'sepia';
  });
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    return (localStorage.getItem('webtoonhub_novel_font_size') as FontSize) || 'base';
  });
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    return (localStorage.getItem('webtoonhub_novel_font_family') as FontFamily) || 'serif';
  });
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Flip Animation State
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  const rawText = data.content_text || '';

  // Intelligent text pagination into book pages
  const pages = useMemo(() => {
    if (!rawText.trim()) return [''];

    // Split text into meaningful paragraph blocks
    const paragraphs = rawText.split(/\n\s*\n/);
    const pagesList: string[] = [];
    let currentPageContent: string[] = [];
    let currentWordCount = 0;

    // Approximate words per page based on font size
    const targetWordsPerPage =
      fontSize === 'sm' ? 240 : fontSize === 'base' ? 190 : fontSize === 'lg' ? 140 : 100;

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      const words = trimmed.split(/\s+/).length;

      // If adding this paragraph exceeds limit and page already has content, create new page
      if (currentWordCount + words > targetWordsPerPage && currentPageContent.length > 0) {
        pagesList.push(currentPageContent.join('\n\n'));
        currentPageContent = [trimmed];
        currentWordCount = words;
      } else {
        currentPageContent.push(trimmed);
        currentWordCount += words;
      }
    }

    if (currentPageContent.length > 0) {
      pagesList.push(currentPageContent.join('\n\n'));
    }

    return pagesList.length > 0 ? pagesList : [''];
  }, [rawText, fontSize]);

  const totalPages = pages.length;
  const isLastPage = pageIndex === totalPages - 1;

  // Reset page when chapter changes
  useEffect(() => {
    setPageIndex(0);
    setFlipDirection(null);
    window.scrollTo(0, 0);
  }, [data.id]);

  // Turn to Next Page with 3D Flip
  const handleNextPage = useCallback(() => {
    if (isFlipping || pageIndex >= totalPages - 1) return;
    setIsFlipping(true);
    setFlipDirection('next');
    setTimeout(() => {
      setPageIndex((prev) => Math.min(prev + 1, totalPages - 1));
      setFlipDirection(null);
      setIsFlipping(false);
    }, 450);
  }, [isFlipping, pageIndex, totalPages]);

  // Turn to Prev Page with 3D Flip
  const handlePrevPage = useCallback(() => {
    if (isFlipping || pageIndex <= 0) return;
    setIsFlipping(true);
    setFlipDirection('prev');
    setTimeout(() => {
      setPageIndex((prev) => Math.max(prev - 1, 0));
      setFlipDirection(null);
      setIsFlipping(false);
    }, 450);
  }, [isFlipping, pageIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage]);

  const updateTheme = (newTheme: NovelTheme) => {
    setTheme(newTheme);
    localStorage.setItem('webtoonhub_novel_theme', newTheme);
  };

  const updateFontSize = (newSize: FontSize) => {
    setFontSize(newSize);
    localStorage.setItem('webtoonhub_novel_font_size', newSize);
  };

  const updateFontFamily = (newFont: FontFamily) => {
    setFontFamily(newFont);
    localStorage.setItem('webtoonhub_novel_font_family', newFont);
  };

  // Theme style configurations
  const themeClasses = useMemo(() => {
    switch (theme) {
      case 'dark':
        return {
          wrapper: 'bg-studio-950 text-slate-200',
          book: 'bg-studio-900 border-studio-800 text-slate-200 shadow-2xl',
          pageBg: 'bg-studio-900 text-slate-200',
          accent: 'text-brand-400',
          muted: 'text-studio-400',
          border: 'border-studio-800'
        };
      case 'sepia':
        return {
          wrapper: 'bg-[#18130d] text-[#332415]',
          book: 'bg-[#fbf0d9] border-[#e2d2b5] text-[#2c1f13] shadow-2xl',
          pageBg: 'bg-[#fbf0d9] text-[#2c1f13]',
          accent: 'text-amber-800',
          muted: 'text-[#7a644f]',
          border: 'border-[#e4d4b9]'
        };
      case 'light':
      default:
        return {
          wrapper: 'bg-slate-100 text-slate-800',
          book: 'bg-white border-slate-200 text-slate-900 shadow-2xl',
          pageBg: 'bg-white text-slate-900',
          accent: 'text-amber-600',
          muted: 'text-slate-500',
          border: 'border-slate-200'
        };
    }
  }, [theme]);

  // Font size classes
  const fontClasses = useMemo(() => {
    switch (fontSize) {
      case 'sm':
        return 'text-sm leading-relaxed';
      case 'lg':
        return 'text-lg leading-relaxed';
      case 'xl':
        return 'text-xl leading-loose';
      case 'base':
      default:
        return 'text-base leading-relaxed';
    }
  }, [fontSize]);

  // Simple Markdown Parser to render beautiful book text
  const renderParagraph = (text: string, idx: number) => {
    const trimmed = text.trim();

    // H1 Heading
    if (trimmed.startsWith('# ')) {
      return (
        <h1
          key={idx}
          className="text-2xl sm:text-3xl font-black mb-6 mt-2 tracking-tight text-center border-b pb-4 border-current/15"
        >
          {trimmed.slice(2)}
        </h1>
      );
    }

    // H2 Heading
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-xl sm:text-2xl font-bold mb-4 mt-6 tracking-tight">
          {trimmed.slice(3)}
        </h2>
      );
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      return (
        <blockquote
          key={idx}
          className="my-5 pl-4 border-l-4 border-brand-500/80 italic opacity-90 text-sm sm:text-base font-serif bg-current/5 py-2.5 pr-3 rounded-r-xl"
        >
          {trimmed.slice(2).replace(/\*/g, '')}
        </blockquote>
      );
    }

    // Divider
    if (trimmed === '---') {
      return (
        <div key={idx} className="my-6 flex items-center justify-center gap-2 opacity-30">
          <span className="w-8 h-px bg-current" />
          <span className="text-xs">✦</span>
          <span className="w-8 h-px bg-current" />
        </div>
      );
    }

    // Dialogue (starts with — or -)
    if (trimmed.startsWith('—') || trimmed.startsWith('- ')) {
      return (
        <p key={idx} className="mb-4 pl-3 border-l-2 border-current/20 italic font-medium">
          {trimmed}
        </p>
      );
    }

    // Standard body paragraph
    return (
      <p key={idx} className="mb-4 indent-6 text-justify tracking-normal">
        {trimmed}
      </p>
    );
  };

  return (
    <div className={`min-h-screen ${themeClasses.wrapper} transition-colors duration-300 flex flex-col relative select-none`}>
      {/* Top Novel Reader Navigation Bar */}
      <header className="sticky top-0 inset-x-0 z-40 bg-current/5 backdrop-blur-md border-b border-current/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/webtoons/${data.webtoon_id}`}
            className="p-2 rounded-xl bg-current/10 hover:bg-current/20 transition-colors"
            title={t('reader.backToManhwa')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="text-xs font-bold line-clamp-1">{data.webtoon_title}</div>
            <div className="text-[11px] opacity-75 font-medium flex items-center gap-1.5">
              <span>{t('details.chapterNum', { number: data.chapter_number })}</span>
              {data.title && <span>• {data.title}</span>}
            </div>
          </div>
        </div>

        {/* Reader Customization & Chapters Switcher */}
        <div className="flex items-center gap-2">
          {/* Customizer Settings Button */}
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-current/10 hover:bg-current/20 text-xs font-bold transition-all"
            title="Kitob sozlamalari"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sozlamalar</span>
          </button>

          {/* Chapter Selector Dropdown */}
          {allChapters.length > 0 && (
            <select
              value={data.id}
              onChange={(e) => navigate(`/chapters/${e.target.value}`)}
              className="bg-current/10 border border-current/20 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none"
            >
              {allChapters.map((ch) => (
                <option key={ch.id} value={ch.id} className="text-slate-900 bg-white">
                  {t('details.chapterNum', { number: ch.chapter_number })}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* Floating Settings Drawer / Panel */}
      {showSettings && (
        <div className="max-w-2xl mx-auto w-full px-4 pt-3 z-30 animate-in slide-in-from-top-2 duration-200">
          <div className="p-4 rounded-2xl bg-current/10 backdrop-blur-md border border-current/15 flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
            {/* Theme Selector */}
            <div className="flex items-center gap-2">
              <span className="opacity-70">Mavzu:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateTheme('sepia')}
                  className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all ${
                    theme === 'sepia' ? 'bg-[#fbf0d9] text-[#2c1f13] shadow-md' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Sepiya</span>
                </button>
                <button
                  onClick={() => updateTheme('dark')}
                  className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all ${
                    theme === 'dark' ? 'bg-studio-900 text-white shadow-md' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Tungi</span>
                </button>
                <button
                  onClick={() => updateTheme('light')}
                  className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all ${
                    theme === 'light' ? 'bg-white text-slate-900 shadow-md' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Kunduzgi</span>
                </button>
              </div>
            </div>

            {/* Font Size Selector */}
            <div className="flex items-center gap-2">
              <span className="opacity-70">Hajm:</span>
              <div className="flex items-center gap-1">
                {(['sm', 'base', 'lg', 'xl'] as FontSize[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => updateFontSize(sz)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                      fontSize === sz ? 'bg-brand-500 text-studio-950 shadow-sm' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {sz === 'sm' ? 'A-' : sz === 'base' ? 'A' : sz === 'lg' ? 'A+' : 'A++'}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family Selector */}
            <div className="flex items-center gap-2">
              <span className="opacity-70">Shrift:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateFontFamily('serif')}
                  className={`px-2.5 py-1 rounded-lg font-serif transition-all ${
                    fontFamily === 'serif' ? 'bg-brand-500 text-studio-950 font-bold' : 'opacity-60'
                  }`}
                >
                  Kitobiy
                </button>
                <button
                  onClick={() => updateFontFamily('sans')}
                  className={`px-2.5 py-1 rounded-lg font-sans transition-all ${
                    fontFamily === 'sans' ? 'bg-brand-500 text-studio-950 font-bold' : 'opacity-60'
                  }`}
                >
                  Zamonaviy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main 3D Book Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center perspective-1500">
        <div className="relative w-full rounded-3xl border book-page-shadow overflow-hidden transition-all duration-300">
          {/* Authentic Book Spine Shadow Effect on Left */}
          <div className="absolute top-0 bottom-0 left-0 w-8 pointer-events-none book-spine-shadow z-20 opacity-60" />

          {/* Click Zones for Navigation: Left 40% (Prev), Right 40% (Next) */}
          <div
            onClick={handlePrevPage}
            className={`absolute top-0 bottom-0 left-0 w-1/3 z-20 cursor-w-resize group flex items-center justify-start pl-4 ${
              pageIndex === 0 ? 'pointer-events-none' : ''
            }`}
            title="Oldingi sahifa"
          >
            {pageIndex > 0 && (
              <div className="p-2.5 rounded-full bg-current/15 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <ChevronLeft className="w-5 h-5" />
              </div>
            )}
          </div>

          <div
            onClick={handleNextPage}
            className={`absolute top-0 bottom-0 right-0 w-1/3 z-20 cursor-e-resize group flex items-center justify-end pr-4 ${
              isLastPage ? 'pointer-events-none' : ''
            }`}
            title="Keyingi sahifa"
          >
            {!isLastPage && (
              <div className="p-2.5 rounded-full bg-current/15 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <ChevronRight className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Book Page Content with 3D Flip transition */}
          <article
            className={`p-6 sm:p-12 md:p-16 min-h-[68vh] flex flex-col justify-between ${
              themeClasses.book
            } ${fontClasses} ${
              fontFamily === 'serif' ? 'font-serif' : 'font-sans'
            } transition-all duration-400 transform-style-3d origin-left ${
              flipDirection === 'next'
                ? '-rotate-y-12 scale-[0.98] opacity-80'
                : flipDirection === 'prev'
                ? 'rotate-y-12 scale-[0.98] opacity-80'
                : 'rotate-y-0 scale-100 opacity-100'
            }`}
          >
            {/* Page Header Header info */}
            <div className="flex items-center justify-between text-[11px] opacity-50 pb-4 mb-4 border-b border-current/10">
              <span className="tracking-widest uppercase">{data.webtoon_title}</span>
              <span>{t('details.chapterNum', { number: data.chapter_number })}</span>
            </div>

            {/* Paragraphs of Current Page */}
            <div className="flex-1 py-2">
              {pages[pageIndex] ? (
                pages[pageIndex]
                  .split(/\n\s*\n/)
                  .map((p, idx) => renderParagraph(p, idx))
              ) : (
                <div className="py-20 text-center opacity-60">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>Hozircha matn kiritilmagan</p>
                </div>
              )}
            </div>

            {/* Page Footer & Pagination Counter */}
            <div className="pt-6 mt-6 border-t border-current/10 flex items-center justify-between text-xs opacity-60">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Kitobiy mutolaa</span>
              </div>
              <span className="font-bold tabular-nums">
                {pageIndex + 1} / {totalPages}
              </span>
            </div>
          </article>
        </div>

        {/* Bottom Page Flipping Controls & Progress */}
        <div className="mt-6 flex items-center justify-between px-2">
          <button
            onClick={handlePrevPage}
            disabled={pageIndex === 0 || isFlipping}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-current/10 hover:bg-current/20 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Oldingi bet</span>
          </button>

          {/* Visual Progress bar */}
          <div className="flex items-center gap-3">
            <div className="w-28 sm:w-48 h-1.5 bg-current/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${((pageIndex + 1) / totalPages) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold opacity-80 tabular-nums">
              {Math.round(((pageIndex + 1) / totalPages) * 100)}%
            </span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={isLastPage || isFlipping}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-brand-500 text-studio-950 hover:bg-brand-400 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-all shadow-glow-brand"
          >
            <span>Keyingi bet</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Completion & Rewards Section on Last Page */}
      {isLastPage && (
        <section className="bg-current/5 border-t border-current/15 px-4 py-12 mt-8">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 p-1.5 px-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('reader.chapterCompleted', { webtoon: data.webtoon_title, chapter: data.chapter_number })}</span>
            </div>

            {/* Chapter Navigation Buttons */}
            <div className="flex items-center justify-center gap-3">
              {data.prev_chapter_id && (
                <Link
                  to={`/chapters/${data.prev_chapter_id}`}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-current/10 text-xs font-bold hover:bg-current/20 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t('reader.prevChapter')}</span>
                </Link>
              )}

              <Link
                to={`/webtoons/${data.webtoon_id}`}
                className="px-4 py-2.5 rounded-xl bg-current/10 text-xs font-bold hover:bg-current/20 transition-colors"
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
