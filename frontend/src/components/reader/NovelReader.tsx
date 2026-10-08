import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChapterReaderData, ChapterSummary, ReadingProgress } from '../../types';
import { PositionChange } from '../../hooks/useReadingProgress';
import { useNovelPageSwipe } from '../../hooks/useNovelPageSwipe';
import { useNovelPageMotion } from '../../hooks/useNovelPageMotion';
import { RewardClaimCard } from './RewardClaimCard';
import { ChapterComments } from '../comments/ChapterComments';
import { useLanguage } from '../../context/LanguageContext';
import { ReaderImage } from './ReaderImage';
import { clampPage, isInteractiveTarget, pageForWord, paginateNovel } from '../../utils/reading';
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

interface NovelReaderProps {
  data: ChapterReaderData;
  allChapters: ChapterSummary[];
  onClaimSuccess: () => void;
  initialPosition?: ReadingProgress;
  onProgress: (position: PositionChange) => void;
  rewardReady: boolean;
}
type NovelTheme = 'dark' | 'sepia' | 'light';
type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type FontFamily = 'serif' | 'sans';
const wordLimits: Record<FontSize, number> = { sm: 240, base: 190, lg: 140, xl: 100 };
function preference<T extends string>(key: string, values: T[], fallback: T): T {
  try { const value = localStorage.getItem(key) as T; return values.includes(value) ? value : fallback; }
  catch { return fallback; }
}
function storePreference(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Optional preference. */ } }

export const NovelReader: React.FC<NovelReaderProps> = ({ data, allChapters, onClaimSuccess, initialPosition, onProgress, rewardReady }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => preference<NovelTheme>('webtoonhub_novel_theme', ['dark', 'sepia', 'light'], 'sepia'));
  const [fontSize, setFontSize] = useState(() => preference<FontSize>('webtoonhub_novel_font_size', ['sm', 'base', 'lg', 'xl'], 'base'));
  const [fontFamily, setFontFamily] = useState(() => preference<FontFamily>('webtoonhub_novel_font_family', ['serif', 'sans'], 'serif'));
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const illustrations = useMemo(() => [...(data.images || [])].sort((a, b) => a.order_index - b.order_index), [data.images]);
  const [loadedIllustrations, setLoadedIllustrations] = useState<Set<number>>(() => new Set());
  const pages = useMemo(() => paginateNovel(data.content_text || '', wordLimits[fontSize]), [data.content_text, fontSize]);
  const [pageIndex, setPageIndex] = useState(() => {
    const word = initialPosition?.anchor?.match(/^word:(\d+)$/);
    return word ? pageForWord(pages, Number(word[1])) : clampPage(initialPosition?.page_index || 0, pages.length);
  });
  const page = clampPage(pageIndex, pages.length);
  const isLastPage = page === pages.length - 1;
  const articleRef = useRef<HTMLElement>(null);
  const pageFrameRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef(Boolean(initialPosition?.completed));
  const activePage = pages[page];

  const { motion, isSettling, dragPage, cancelDrag, turnPage, finishMotion } = useNovelPageMotion({
    page, pageCount: pages.length, onCommit: setPageIndex,
    contextKey: data.id + ':' + fontSize + ':' + fontFamily + ':' + theme,
    stageRef: pageFrameRef, disabled: showSettings
  });
  const motionActive = useRef(false);
  motionActive.current = Boolean(motion);
  const swipeHandlers = useNovelPageSwipe({
    onTurnPage: turnPage,
    onDrag: dragPage,
    onCancel: cancelDrag,
    pageKey: data.id + ':' + activePage.startWord + ':' + fontSize,
    enabled: pages.length > 1 && !showSettings && !isSettling
  });

  useLayoutEffect(() => {
    if (showSettings) {
      const panel = settingsRef.current;
      if (panel) {
        window.scrollTo({ top: Math.max(0, panel.getBoundingClientRect().top + window.scrollY - (headerRef.current?.offsetHeight || 80)), behavior: 'auto' });
        panel.focus({ preventScroll: true });
      }
      return;
    }
    const article = articleRef.current;
    if (article) window.scrollTo({ top: Math.max(0, article.getBoundingClientRect().top + window.scrollY - 80), behavior: 'auto' });
  }, [page, showSettings]);

  useEffect(() => {
    onProgress({ page_index: page, anchor: 'word:' + activePage.startWord, progress_percent: (page + 1) / pages.length * 100, completed: completeRef.current });
  }, [page, activePage.startWord, pages.length, onProgress]);

  useEffect(() => {
    if (!isLastPage || !endRef.current || !data.content_text?.trim()) return;
    const checkEnd = () => {
      if (!motionActive.current && !completeRef.current && loadedIllustrations.size === illustrations.length && endRef.current && endRef.current.getBoundingClientRect().bottom <= window.innerHeight) {
        completeRef.current = true;
        onProgress({ page_index: page, anchor: 'word:' + activePage.startWord, progress_percent: 100, completed: true });
      }
    };
    const observer = new IntersectionObserver(checkEnd, { threshold: 1 });
    observer.observe(endRef.current);
    const frame = requestAnimationFrame(checkEnd);
    window.addEventListener('scroll', checkEnd, { passive: true });
    window.addEventListener('resize', checkEnd);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', checkEnd); window.removeEventListener('resize', checkEnd); };
  }, [isLastPage, page, activePage.startWord, onProgress, data.content_text, illustrations.length, loadedIllustrations]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showSettings) { event.preventDefault(); setShowSettings(false); settingsButtonRef.current?.focus({ preventScroll: true }); return; }
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isInteractiveTarget(event.target)) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); turnPage(event.key === 'ArrowRight' ? 1 : -1);
      } else if (event.key === 'Escape') setShowSettings(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turnPage, showSettings]);

  const changeSize = (size: FontSize) => {
    // Keep the same text anchor rather than the old page number.
    const repaginated = paginateNovel(data.content_text || '', wordLimits[size]);
    setPageIndex(pageForWord(repaginated, activePage.startWord));
    setFontSize(size); storePreference('webtoonhub_novel_font_size', size);
  };
  const themeClass = theme === 'dark' ? 'bg-studio-950 text-slate-200' : theme === 'sepia' ? 'bg-[#efe0c8] text-[#332415]' : 'bg-slate-100 text-slate-800';
  const paperClass = theme === 'dark' ? 'bg-studio-900 border-studio-700' : theme === 'sepia' ? 'bg-[#fbf0d9] border-[#d4bd96]' : 'bg-white border-slate-200';
  const textClass = { sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-xl' }[fontSize];
  const pageClass = 'novel-page-paper rounded-3xl border p-6 sm:p-12 min-h-[60vh] ' + paperClass + ' ' + textClass + (fontFamily === 'serif' ? ' font-serif' : ' font-sans');
  const motionClass = motion ? ' novel-page-moving novel-page-' + motion.phase : '';
  const turnAmount = motion ? Math.min(1, Math.abs(motion.offset) / motion.width) : 0;
  const outgoingStyle: React.CSSProperties = {
    touchAction: 'pan-y pinch-zoom',
    transform: motion ? `translate3d(${motion.offset}px, 0, 0) rotateY(${-motion.direction * turnAmount * 8}deg)` : undefined,
    transformOrigin: motion?.direction === -1 ? 'right center' : 'left center',
    '--novel-page-shade': turnAmount
  } as React.CSSProperties;

  const inlineText = (text: string) => text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2,-2)}</strong> : part.startsWith('*') && part.endsWith('*') ? <em key={index}>{part.slice(1,-1)}</em> : <React.Fragment key={index}>{part}</React.Fragment>);
  const renderParagraph = (text: string, index: number) => {
    const heading = text.match(/^(#{1,6})\s+(.+)$/);
    if (heading) return heading[1].length <= 2 ? <h2 key={index} className="text-2xl sm:text-3xl font-black mb-6">{inlineText(heading[2])}</h2> : <h3 key={index} className="text-xl font-bold mb-4 mt-6">{inlineText(heading[2])}</h3>;
    if (text.startsWith('> ')) return <blockquote key={index} className="my-5 pl-4 border-l-4 border-brand-500 italic">{inlineText(text.slice(2))}</blockquote>;
    if (text === '---') return <hr key={index} className="my-6 border-current opacity-30" />;
    return <p key={index} className="mb-5 leading-[1.85] break-words">{inlineText(text)}</p>;
  };

  return <div style={{ overflowAnchor: 'none' }} className={'novel-reader min-h-screen ' + themeClass}>
    <header ref={headerRef} className={'sticky top-0 z-40 border-b backdrop-blur-md px-3 sm:px-6 py-3 ' + paperClass}>
      <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2">
        <Link to={'/webtoons/' + data.webtoon_id} aria-label={t('reader.backToManhwa')} className="min-h-11 min-w-11 flex items-center justify-center rounded-xl reader-surface"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{data.webtoon_title}</div>
          <div className="text-xs opacity-80 truncate">{t('details.chapterNum', { number: data.chapter_number })}{data.title ? ' · ' + data.title : ''}</div>
        </div>
        <button ref={settingsButtonRef} aria-label={t('readerFix.settings')} aria-expanded={showSettings} aria-controls="novel-settings" onClick={() => setShowSettings(value => !value)} className="min-h-11 min-w-11 flex items-center justify-center rounded-xl reader-surface"><Settings className="w-5 h-5" /></button>
        {allChapters.length > 0 && <select aria-label={t('readerFix.selectChapter')} value={data.id} onChange={e => navigate('/chapters/' + e.target.value)} className="min-h-11 max-w-[45%] sm:max-w-[180px] text-sm border border-current/30 rounded-xl px-2 reader-surface">
          {allChapters.map(chapter => <option key={chapter.id} value={chapter.id} className="bg-white text-slate-900">{t('details.chapterNum', { number: chapter.chapter_number })}</option>)}
        </select>}
      </div>
    </header>
    {showSettings && <section ref={settingsRef} tabIndex={-1} id="novel-settings" aria-label={t('readerFix.settings')} className="max-w-4xl mx-auto p-4 space-y-4">
      <fieldset className="flex flex-wrap gap-2"><legend className="text-sm font-bold mb-2">{t('readerFix.theme')}</legend>
        {(['sepia', 'dark', 'light'] as NovelTheme[]).map(value => <button key={value} aria-pressed={theme === value} onClick={() => { setTheme(value); storePreference('webtoonhub_novel_theme', value); }} className={'px-4 min-h-11 rounded-xl border ' + (theme === value ? 'bg-brand-500 text-studio-950 border-brand-500 font-bold' : 'border-current/30 reader-surface')}>{t('readerFix.' + value)}</button>)}
      </fieldset>
      <fieldset className="flex flex-wrap gap-2"><legend className="text-sm font-bold mb-2">{t('readerFix.size')}</legend>
        {(['sm', 'base', 'lg', 'xl'] as FontSize[]).map((value, index) => <button key={value} aria-pressed={fontSize === value} onClick={() => changeSize(value)} className={'min-w-11 min-h-11 rounded-xl border ' + (fontSize === value ? 'bg-brand-500 text-studio-950 border-brand-500 font-bold' : 'border-current/30 reader-surface')}>{['A-', 'A', 'A+', 'A++'][index]}</button>)}
      </fieldset>
      <fieldset className="flex flex-wrap gap-2"><legend className="text-sm font-bold mb-2">{t('readerFix.font')}</legend>
        {(['serif', 'sans'] as FontFamily[]).map(value => <button key={value} aria-pressed={fontFamily === value} onClick={() => { setFontFamily(value); storePreference('webtoonhub_novel_font_family', value); }} className={'px-4 min-h-11 rounded-xl border ' + (fontFamily === value ? 'bg-brand-500 text-studio-950 border-brand-500 font-bold' : 'border-current/30 reader-surface')}>{t('readerFix.' + value)}</button>)}
      </fieldset>
    </section>}
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6">
      <div ref={pageFrameRef} className={'novel-page-frame rounded-3xl shadow-xl ' + paperClass} style={{ minHeight: motion?.height }}>
      {motion && <div aria-hidden="true" className={pageClass + motionClass + ' novel-page-preview'} style={{
        top: motion.top, minHeight: Math.max(0, motion.height - motion.top),
        transform: `translate3d(${motion.offset + motion.direction * motion.width}px, 0, 0) rotateY(${motion.direction * (1 - turnAmount) * 8}deg)`,
        transformOrigin: motion.direction === 1 ? 'left center' : 'right center',
        '--novel-page-shade': 1 - turnAmount
      } as React.CSSProperties}>
        <div className="text-xs opacity-80 mb-6">
          <span>{t('readerFix.page', { page: motion.to + 1, total: pages.length })}</span>
          {pages.length > 1 && <p className="mt-2 sm:hidden">{t('readerFix.swipePages')}</p>}
        </div>
        {pages[motion.to]?.text ? pages[motion.to].text.split(/\n\s*\n/).map(renderParagraph) : <p>{t('readerFix.emptyText')}</p>}
      </div>}
      <article ref={articleRef} {...swipeHandlers} style={outgoingStyle} className={pageClass + motionClass} onTransitionEnd={event => {
        if (event.target === event.currentTarget && event.propertyName === 'transform') finishMotion();
      }}>
        <div className="text-xs opacity-80 mb-6">
          <span role="status" aria-live="polite" aria-atomic="true">{t('readerFix.page', { page: page + 1, total: pages.length })}</span>
          {pages.length > 1 && <p className="mt-2 sm:hidden">{t('readerFix.swipePages')}</p>}
        </div>
        {activePage.text ? activePage.text.split(/\n\s*\n/).map(renderParagraph) : <p>{t('readerFix.emptyText')}</p>}
        {illustrations.length === 0 && <div ref={endRef} className="h-1" />}
      </article>
      </div>
      <nav aria-label={t('readerFix.page', { page: page + 1, total: pages.length })} className="flex items-center justify-between gap-2 mt-5">
        <button aria-label={t('reader.prevPage')} disabled={page === 0 || isSettling} onClick={() => turnPage(-1)} className="min-h-11 min-w-11 px-3 rounded-xl reader-surface flex items-center gap-1 disabled:opacity-40"><ChevronLeft className="w-5 h-5" /><span className="hidden sm:inline">{t('reader.prevPage')}</span></button>
        <span className="text-sm tabular-nums">{page + 1} / {pages.length} · {Math.round((page + 1) / pages.length * 100)}%</span>
        <button aria-label={t('reader.nextPage')} disabled={isLastPage || isSettling} onClick={() => turnPage(1)} className="min-h-11 min-w-11 px-3 rounded-xl bg-brand-500 text-studio-950 flex items-center gap-1 disabled:opacity-40"><span className="hidden sm:inline">{t('reader.nextPage')}</span><ChevronRight className="w-5 h-5" /></button>
      </nav>
    </div>
    {isLastPage && illustrations.length > 0 && <section aria-label={t('reader.illustrations')} className="max-w-4xl mx-auto px-3 sm:px-6 pb-8 space-y-4">
      <h2 className="text-xl font-bold">{t('reader.illustrations')}</h2>
      {illustrations.map((image, index) => <ReaderImage key={image.id} image={image} index={index} onLoaded={id => setLoadedIllustrations(previous => previous.has(id) ? previous : new Set([...previous, id]))} />)}
      <div ref={endRef} className="h-1" />
    </section>}
    {isLastPage && <section className="px-3 sm:px-6 py-8">
      <nav className="flex flex-wrap items-center justify-center gap-3">
        {data.prev_chapter_id && <Link to={'/chapters/' + data.prev_chapter_id} className="px-4 py-3 rounded-xl reader-surface">{t('reader.prevChapter')}</Link>}
        <Link to={'/webtoons/' + data.webtoon_id} className="px-4 py-3 rounded-xl reader-surface">{t('reader.chaptersList')}</Link>
        {data.next_chapter_id && <Link to={'/chapters/' + data.next_chapter_id} className="px-4 py-3 rounded-xl bg-brand-500 text-studio-950 font-bold">{t('reader.nextChapter')}</Link>}
      </nav>
      <RewardClaimCard chapterId={data.id} initialClaimed={data.is_reward_claimed} rewardAmount={data.reward_coins ?? 5} ready={rewardReady} onClaimSuccess={onClaimSuccess} />
      <ChapterComments chapterId={data.id} />
    </section>}
  </div>;
};
