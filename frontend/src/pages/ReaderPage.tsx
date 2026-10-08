import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { webtoonsApi } from '../api/webtoons';
import { ChapterReaderData, ChapterSummary, ChapterImage, ReadingProgress } from '../types';
import { ReaderNav } from '../components/reader/ReaderNav';
import { RewardClaimCard } from '../components/reader/RewardClaimCard';
import { ChapterComments } from '../components/comments/ChapterComments';
import { MangaReader } from '../components/reader/MangaReader';
import { NovelReader } from '../components/reader/NovelReader';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { PositionChange, useReadingProgress } from '../hooks/useReadingProgress';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { Loader2, AlertCircle, BookOpen } from 'lucide-react';

const ChapterPanel: React.FC<{ image: ChapterImage; index: number; onLoaded: () => void }> = ({ image, index, onLoaded }) => {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [dimensions, setDimensions] = useState({ width: image.width || 0, height: image.height || 0 });
  const ratio = dimensions.width && dimensions.height ? dimensions.width / dimensions.height : 1 / 3;
  const source = image.image_url + (attempt ? (image.image_url.includes('?') ? '&' : '?') + 'retry=' + attempt : '');
  return <div data-page-index={index} data-image-id={image.id} className="w-full bg-studio-950" style={{ aspectRatio: String(ratio) }}>
    {failed ? <div role="alert" className="p-6 text-center text-sm text-studio-300 space-y-3">
      <p className="font-bold text-amber-400">{t('reader.pageLoadError', { order: image.order_index })}</p>
      <p>{t('reader.pageNetworkError')}</p>
      <button onClick={event => { event.stopPropagation(); setAttempt(value => value + 1); setFailed(false); }} className="min-h-11 px-5 rounded-xl bg-brand-500 text-studio-950 font-bold">{t('common.retry')}</button>
    </div> : <img src={source} alt={t('reader.pageNum', { number: index + 1 })} width={dimensions.width || undefined} height={dimensions.height || undefined} className="w-full h-auto block select-none" loading={index === 0 ? 'eager' : 'lazy'} decoding="async"
      onLoad={event => { const imageElement = event.currentTarget; setDimensions({ width: imageElement.naturalWidth, height: imageElement.naturalHeight }); onLoaded(); }}
      onError={() => setFailed(true)} />}
  </div>;
};

interface VerticalReaderProps {
  data: ChapterReaderData; allChapters: ChapterSummary[]; initialPosition?: ReadingProgress;
  onProgress: (position: PositionChange) => void; onClaimSuccess: () => void; rewardReady: boolean;
}
const VerticalReader: React.FC<VerticalReaderProps> = ({ data, allChapters, initialPosition, onProgress, onClaimSuccess, rewardReady }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(new Set<number>());
  const [navVisible, setNavVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const images = React.useMemo(() => [...data.images].sort((a, b) => a.order_index - b.order_index), [data.images]);
  const measureRef = useRef<() => void>(() => {});
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    let frame = 0;
    let lastY = window.scrollY;
    let direction = 0;
    let movement = 0;
    let restore = true;
    const anchor = initialPosition?.anchor?.match(/^image:(\d+):([\d.]+)$/);
    const index = Math.max(0, Math.min(images.length - 1, initialPosition?.page_index || 0));
    const target = anchor ? content.querySelector<HTMLElement>('[data-image-id="' + anchor[1] + '"]') : content.querySelector<HTMLElement>('[data-page-index="' + index + '"]');
    const fraction = anchor ? Math.max(0, Math.min(1, Number(anchor[2]))) : 0;
    const restorePosition = () => {
      if (restore && initialPosition && target) {
        window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY + fraction * target.offsetHeight - 64), behavior: 'auto' });
        lastY = window.scrollY;
      }
    };
    const stopRestore = () => { restore = false; };
    const measure = () => {
      const rect = content.getBoundingClientRect();
      const height = Math.max(1, content.scrollHeight - (window.innerHeight - 64));
      const percent = Math.max(0, Math.min(100, (-rect.top + 64) / height * 100));
      setProgress(percent);
      const panels = Array.from(content.querySelectorAll<HTMLElement>('[data-page-index]'));
      let panel = panels[0];
      for (const candidate of panels) if (candidate.getBoundingClientRect().top <= 65) panel = candidate;
      const page = Number(panel?.dataset.pageIndex || 0);
      const offset = panel ? Math.max(0, Math.min(1, (64 - panel.getBoundingClientRect().top) / Math.max(1, panel.offsetHeight))) : 0;
      const completed = images.length > 0 && rect.bottom <= window.innerHeight - 40 && (loaded.current.size === images.length || Boolean(initialPosition?.completed));
      onProgress({ page_index: page, anchor: panel ? 'image:' + panel.dataset.imageId + ':' + offset.toFixed(4) : null, progress_percent: percent, completed: completed || Boolean(initialPosition?.completed) });
    };
    measureRef.current = measure;
    const onScroll = () => {
      const delta = window.scrollY - lastY;
      const nextDirection = Math.sign(delta);
      if (nextDirection && nextDirection !== direction) { direction = nextDirection; movement = 0; }
      movement += Math.abs(delta);
      if (movement >= 24) {
        setNavVisible(direction < 0 || window.scrollY < 150);
        movement = 0;
      }
      lastY = window.scrollY;
      cancelAnimationFrame(frame); frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(() => { restorePosition(); cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); });
    resize.observe(content);
    restorePosition();
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('wheel', stopRestore, { passive: true });
    window.addEventListener('touchstart', stopRestore, { passive: true });
    window.addEventListener('pointerdown', stopRestore);
    window.addEventListener('keydown', stopRestore);
    return () => {
      resize.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', measure);
      window.removeEventListener('wheel', stopRestore); window.removeEventListener('touchstart', stopRestore);
      window.removeEventListener('pointerdown', stopRestore); window.removeEventListener('keydown', stopRestore);
    };
  }, [images, initialPosition, onProgress]);
  return <div className="min-h-screen bg-black text-white">
    <ReaderNav data={data} visible={navVisible} progress={progress} allChapters={allChapters} onToggle={() => setNavVisible(value => !value)} onSelectChapter={id => navigate('/chapters/' + id)} />
    <main className="max-w-3xl mx-auto bg-studio-950 pt-16">
      <div ref={contentRef}>
        {images.length ? images.map((image, index) => <ChapterPanel key={image.id} image={image} index={index} onLoaded={() => { loaded.current.add(image.id); measureRef.current(); }} />) : <div className="py-24 px-4 text-center text-studio-300"><BookOpen className="w-10 h-10 mx-auto mb-4" /><p>{t('reader.pagesNotFound')}</p></div>}
      </div>
    </main>
    <section className="bg-studio-950 border-t border-studio-800 px-3 py-10 pb-24">
      <nav className="flex flex-wrap items-center justify-center gap-3">
        {data.prev_chapter_id && <Link to={'/chapters/' + data.prev_chapter_id} className="min-h-11 px-4 py-3 rounded-xl bg-studio-900">{t('reader.prevChapter')}</Link>}
        <Link to={'/webtoons/' + data.webtoon_id} className="min-h-11 px-4 py-3 rounded-xl bg-studio-900">{t('reader.chaptersList')}</Link>
        {data.next_chapter_id && <Link to={'/chapters/' + data.next_chapter_id} className="min-h-11 px-4 py-3 rounded-xl bg-brand-500 text-studio-950 font-bold">{t('reader.nextChapter')}</Link>}
      </nav>
      <RewardClaimCard chapterId={data.id} initialClaimed={data.is_reward_claimed} rewardAmount={data.reward_coins ?? 5} ready={rewardReady} onClaimSuccess={onClaimSuccess} />
      <ChapterComments chapterId={data.id} />
    </section>
  </div>;
};

export const ReaderPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { user, isLoading: checkingAccount } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<ChapterReaderData | null>(null);
  const [allChapters, setAllChapters] = useState<ChapterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [chaptersRetry, setChaptersRetry] = useState(0);
  const [chaptersError, setChaptersError] = useState(false);
  usePageMetadata(data ? `${data.webtoon_title} · ${t('details.chapterNum', { number: data.chapter_number })}${data.title ? ` · ${data.title}` : ''}` : undefined);
  const restart = search.get('restart') === '1';
  const { initial, report, status, ready, flush } = useReadingProgress(data, restart);

  useEffect(() => {
    if (checkingAccount) return;
    const controller = new AbortController();
    setLoading(true); setError(false); setData(null); setAllChapters([]);
    const chapterId = Number(id);
    if (!Number.isInteger(chapterId) || chapterId < 1) { setError(true); setLoading(false); return () => controller.abort(); }
    webtoonsApi.readChapter(chapterId, controller.signal).then(chapter => {
      if (!controller.signal.aborted) {
        setData(chapter);
        setAllChapters([{ id: chapter.id, chapter_number: chapter.chapter_number, title: chapter.title, reward_coins: chapter.reward_coins, created_at: '' }]);
        setLoading(false);
      }
    }).catch(() => { if (!controller.signal.aborted) { setError(true); setLoading(false); } });
    return () => controller.abort();
  }, [id, user?.id, checkingAccount, retry]);

  useEffect(() => {
    if (!data || checkingAccount) return;
    const controller = new AbortController();
    const workId = data.webtoon_id;
    setChaptersError(false);
    // Chapter-list recovery never reloads the content or resets reading position.
    const loadSummaries = async () => {
      let offset = 0;
      let summaries: ChapterSummary[] = [];
      while (!controller.signal.aborted) {
        const batch = await webtoonsApi.listChapters(workId, offset, 100, controller.signal);
        summaries = [...summaries, ...batch];
        if (!controller.signal.aborted && summaries.length) setAllChapters(summaries);
        if (batch.length < 100) break;
        offset += batch.length;
      }
    };
    void loadSummaries().catch(() => { if (!controller.signal.aborted) setChaptersError(true); });
    return () => controller.abort();
  }, [data?.id, data?.webtoon_id, checkingAccount, chaptersRetry]);

  const claimed = useCallback(() => { const chapterId = data?.id; setData(value => value && value.id === chapterId ? { ...value, is_reward_claimed: true } : value); }, [data?.id]);
  if (loading || checkingAccount) return <div role="status" className="min-h-screen flex flex-col items-center justify-center gap-3 text-studio-300"><Loader2 className="w-9 h-9 animate-spin text-brand-500" />{t('common.loading')}</div>;
  if (error || !data) return <div role="alert" className="min-h-screen flex flex-col items-center justify-center text-center px-4 gap-4">
    <AlertCircle className="w-10 h-10 text-rose-400" /><h1 className="text-xl font-bold">{t('readerFix.loadError')}</h1>
    <div className="flex gap-3"><button onClick={() => setRetry(value => value + 1)} className="min-h-11 px-5 rounded-xl bg-brand-500 text-studio-950">{t('common.retry')}</button><button onClick={() => navigate('/catalog')} className="min-h-11 px-5 rounded-xl bg-studio-800">{t('nav.catalog')}</button></div>
  </div>;
  const props = { data, allChapters, initialPosition: initial, onProgress: report, onClaimSuccess: claimed, rewardReady: ready };
  const key = data.id + ':' + (user?.id ?? 'guest') + ':' + restart;
  return <>
    {data.webtoon_type === 'novel' || (data.content_text && !data.images.length) ? <NovelReader key={key} {...props} /> : data.webtoon_type === 'manga' ? <MangaReader key={key} {...props} /> : <VerticalReader key={key} {...props} />}
    {chaptersError && <div role="alert" className="fixed bottom-3 left-3 z-40 max-w-[calc(100%-24px)] bg-studio-900 border border-rose-500/40 text-rose-200 rounded-xl px-3 py-2 text-xs">{t('readerFix.chapterListError')} <button onClick={() => setChaptersRetry(value => value + 1)} className="min-h-[44px] px-3 font-bold underline">{t('common.retry')}</button></div>}
    {status !== 'saved' && <div role="status" className="fixed bottom-20 left-3 z-30 max-w-[calc(100%-24px)] bg-studio-900/95 border border-studio-700 text-studio-200 rounded-xl px-3 py-2 text-xs">{t(status === 'saving' ? 'readerFix.saving' : 'readerFix.localSaved')}{status === 'local' && user && <button onClick={() => { void flush(); }} className="min-h-[44px] px-3 ml-2 font-bold text-brand-400">{t('common.retry')}</button>}</div>}
  </>;
};
