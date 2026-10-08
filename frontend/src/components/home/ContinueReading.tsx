import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { progressApi } from '../../api/progress';
import { ReadingProgress } from '../../types';
import { readPositions } from '../../utils/readingStorage';
import { readerUrl } from '../../utils/reading';
import { SafeImage } from '../common/SafeImage';
export const ContinueReading: React.FC = () => {
  const { user, isLoading } = useAuth(); const { t } = useLanguage();
  const [items, setItems] = useState<ReadingProgress[]>([]); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    const local = readPositions(user?.id);
    setItems(local); setError(false);
    if (isLoading || !user) return;
    progressApi.list().then(remote => {
      if (!alive) return;
      const latest = new Map<number, ReadingProgress>();
      for (const item of [...remote, ...local].sort((a,b) => Date.parse(b.updated_at || '') - Date.parse(a.updated_at || ''))) if (!latest.has(item.webtoon_id)) latest.set(item.webtoon_id, item);
      setItems([...latest.values()].slice(0,8));
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [user?.id, isLoading, retry]);
  if (isLoading || (!items.length && !error)) return null;
  return <section className="mb-8" aria-label={t('ux.recentHistory')}>
    <h2 className="text-xl font-bold text-white mb-4">{t('ux.recentHistory')}</h2>
    {error && <div role="alert" className="mb-4 text-sm text-rose-200">{t('readerFix.loadError')} <button className="min-h-[44px] px-3 underline" onClick={() => setRetry(retry + 1)}>{t('common.retry')}</button></div>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.slice(0,8).map(item => <Link key={item.webtoon_id} to={readerUrl(item.chapter_id)} className="flex gap-3 p-3 min-w-0 rounded-2xl bg-studio-900 border border-studio-800 hover:border-brand-500">
        {item.cover_image_url && <SafeImage src={item.cover_image_url} alt="" className="w-12 h-16 object-cover rounded-lg shrink-0" />}
        <div className="min-w-0"><p className="text-sm font-bold text-white line-clamp-2">{item.webtoon_title || item.webtoon?.title || t('readerFix.continue')}</p><p className="text-xs text-studio-300 mt-1">{t('ux.chapterProgress', { number: item.chapter_number || 1, percent: Math.round(item.progress_percent) })}</p><div aria-hidden="true" className="bg-studio-700 h-1.5 rounded-full mt-2"><div style={{ width: `${Math.max(0, Math.min(100, item.progress_percent))}%` }} className="h-full bg-brand-500 rounded-full" /></div></div>
      </Link>)}
    </div>
  </section>;
};
