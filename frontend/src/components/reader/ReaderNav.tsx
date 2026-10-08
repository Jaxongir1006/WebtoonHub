import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChapterReaderData } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../common/Modal';
import { ChevronLeft, ChevronRight, Menu, Zap, ArrowLeft, Check } from 'lucide-react';

interface ReaderNavProps {
  data: ChapterReaderData;
  visible: boolean;
  progress: number;
  allChapters?: { id: number; chapter_number: number; title?: string | null }[];
  onSelectChapter?: (id: number) => void;
  onToggle: () => void;
}
export const ReaderNav: React.FC<ReaderNavProps> = ({ data, visible, progress, allChapters = [], onSelectChapter, onToggle }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (headerRef.current) headerRef.current.inert = !visible;
    if (footerRef.current) footerRef.current.inert = !visible;
  }, [visible]);
  const reward = data.reward_coins ?? 5;
  return <>
    <div aria-hidden className="fixed top-0 inset-x-0 h-1 bg-studio-900 z-50 pointer-events-none"><div className="h-full bg-brand-500" style={{ width: Math.max(0, Math.min(100, progress)) + '%' }} /></div>
    <header ref={headerRef} aria-hidden={!visible} className={'fixed top-0 inset-x-0 z-40 bg-studio-950/95 backdrop-blur-md border-b border-studio-800 transition-transform ' + (visible ? '' : '-translate-y-full')}>
      <div className="max-w-4xl mx-auto px-3 h-16 flex items-center justify-between gap-2">
        <div className="flex flex-1 min-w-0 items-center gap-2">
          <Link to={'/webtoons/' + data.webtoon_id} aria-label={t('reader.backToManhwa')} className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-studio-300 hover:bg-studio-800"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="min-w-0"><div className="text-sm font-bold text-white truncate">{data.webtoon_title}</div><div className="text-xs text-brand-400 truncate">{t('reader.chapter', { number: data.chapter_number })}{data.title ? ' · ' + data.title : ''}</div></div>
        </div>
        {reward > 0 && <span className="hidden sm:flex text-xs text-brand-400 gap-1 shrink-0"><Zap className="w-4 h-4" />{t(data.is_reward_claimed ? 'reader.coinsClaimedPill' : 'reader.bonusPill', { coins: reward })}</span>}
        <button aria-label={t('reader.chaptersList')} onClick={() => setDrawerOpen(true)} className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-studio-900 text-studio-200"><Menu className="w-5 h-5" /></button>
        <button aria-label={t('readerFix.hideControls')} onClick={onToggle} className="min-h-11 px-2 text-studio-300 text-sm">×</button>
      </div>
    </header>
    {!visible && <button aria-label={t('readerFix.showControls')} onClick={onToggle} className="fixed top-3 right-3 z-40 rounded-xl min-h-11 px-3 bg-studio-900 border border-studio-700 text-white"><Menu className="w-5 h-5" /></button>}
    <footer ref={footerRef} aria-hidden={!visible} className={'fixed bottom-0 inset-x-0 z-40 bg-studio-950/95 border-t border-studio-800 transition-transform ' + (visible ? '' : 'translate-y-full')}>
      <nav className="max-w-lg mx-auto px-3 h-16 flex items-center gap-2">
        <button disabled={!data.prev_chapter_id} onClick={() => navigate('/chapters/' + data.prev_chapter_id)} className="flex-1 flex justify-center items-center gap-1 min-h-11 px-2 bg-studio-900 text-white text-xs rounded-xl disabled:opacity-30"><ChevronLeft className="w-4 h-4" />{t('reader.prevChapter')}</button>
        <span className="text-xs text-studio-300 tabular-nums">{Math.round(progress)}%</span>
        <button disabled={!data.next_chapter_id} onClick={() => navigate('/chapters/' + data.next_chapter_id)} className="flex-1 flex justify-center items-center gap-1 min-h-11 px-2 bg-brand-500 text-studio-950 text-xs rounded-xl disabled:opacity-30">{t('reader.nextChapter')}<ChevronRight className="w-4 h-4" /></button>
      </nav>
    </footer>
    <Modal isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={t('reader.chaptersList')}>
      <div className="space-y-1">
        {allChapters.length === 0 && <p role="status" className="py-4 text-studio-300">{t('common.loading')}</p>}
        {allChapters.map(chapter => <button key={chapter.id} aria-current={chapter.id === data.id ? 'page' : undefined} onClick={() => { setDrawerOpen(false); if (onSelectChapter) onSelectChapter(chapter.id); else navigate('/chapters/' + chapter.id); }} className={'w-full text-left flex justify-between items-center gap-2 min-h-11 p-3 rounded-xl text-sm ' + (chapter.id === data.id ? 'bg-brand-500 text-studio-950 font-bold' : 'text-studio-200 hover:bg-studio-800')}>
          <span>{t('reader.chapter', { number: chapter.chapter_number })}{chapter.title ? ' · ' + chapter.title : ''}</span>{chapter.id === data.id && <Check className="w-4 h-4 shrink-0" />}
        </button>)}
      </div>
    </Modal>
  </>;
};
