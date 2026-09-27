import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChapterReaderData } from '../../types';
import { ChevronLeft, ChevronRight, Menu, Zap, ArrowLeft, Check } from 'lucide-react';

interface ReaderNavProps {
  data: ChapterReaderData;
  visible: boolean;
  progress: number; // 0 to 100
  allChapters?: { id: number; chapter_number: number; title?: string | null }[];
  onSelectChapter?: (id: number) => void;
}

export const ReaderNav: React.FC<ReaderNavProps> = ({
  data,
  visible,
  progress,
  allChapters = [],
  onSelectChapter
}) => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <>
      {/* Scroll Progress Bar at very top */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-studio-900 z-50 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-amber-300 shadow-glow-brand transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top Floating Header */}
      <header
        className={`fixed top-0 inset-x-0 z-40 bg-studio-950/95 backdrop-blur-md border-b border-studio-800/80 transition-transform duration-300 ${
          visible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <Link
              to={`/webtoons/${data.webtoon_id}`}
              className="p-1.5 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors shrink-0"
              title="Manhvaga qaytish"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex flex-col truncate">
              <span className="text-xs font-bold text-white truncate">
                {data.webtoon_title}
              </span>
              <span className="text-[11px] text-brand-400 font-semibold truncate">
                {data.chapter_number}-bob {data.title && `— ${data.title}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Reward status pill */}
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${
                data.is_reward_claimed
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-brand-500/10 text-brand-400 border-brand-500/30 shadow-glow-brand animate-pulse-subtle'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{data.is_reward_claimed ? "+5 ⚡ Olingan" : "+5 ⚡ Bonus"}</span>
            </span>

            {/* Chapter drawer toggle */}
            {allChapters.length > 0 && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="p-2 rounded-xl bg-studio-900 border border-studio-800 text-studio-300 hover:text-white transition-colors"
                title="Boblar ro'yxati"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Floating Navigation Bar */}
      <footer
        className={`fixed bottom-0 inset-x-0 z-40 bg-studio-950/95 backdrop-blur-md border-t border-studio-800/80 transition-transform duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Previous Chapter */}
          <button
            disabled={!data.prev_chapter_id}
            onClick={() => data.prev_chapter_id && navigate(`/chapters/${data.prev_chapter_id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-studio-900 border border-studio-800 text-studio-200 text-xs font-bold hover:bg-studio-800 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Oldingi bob</span>
          </button>

          {/* Progress Percent */}
          <div className="px-3 py-1 rounded-lg bg-studio-900 border border-studio-800 text-xs font-mono font-bold text-studio-300">
            {Math.round(progress)}%
          </div>

          {/* Next Chapter */}
          <button
            disabled={!data.next_chapter_id}
            onClick={() => data.next_chapter_id && navigate(`/chapters/${data.next_chapter_id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-500 text-studio-950 text-xs font-bold hover:bg-brand-400 transition-colors shadow-glow-brand disabled:opacity-30 disabled:pointer-events-none"
          >
            <span>Keyingi bob</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Chapter Selector Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-80 max-w-full bg-studio-900 border-l border-studio-800 h-full p-5 flex flex-col z-10 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-studio-800 mb-3">
              <h3 className="font-bold text-white text-base">Boblar ro'yxati</h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-studio-400 hover:text-white p-1 rounded-lg hover:bg-studio-800"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-1 pr-1 flex-1">
              {allChapters.map((ch) => {
                const isCurrent = ch.id === data.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setDrawerOpen(false);
                      if (onSelectChapter) {
                        onSelectChapter(ch.id);
                      } else {
                        navigate(`/chapters/${ch.id}`);
                      }
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'bg-brand-500 text-studio-950 font-bold shadow-glow-brand'
                        : 'text-studio-200 hover:bg-studio-800 hover:text-white'
                    }`}
                  >
                    <span>
                      {ch.chapter_number}-bob {ch.title && `— ${ch.title}`}
                    </span>
                    {isCurrent && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
