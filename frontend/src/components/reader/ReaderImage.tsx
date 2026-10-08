import React, { useState } from 'react';
import { ChapterImage } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

export const ReaderImage: React.FC<{ image: ChapterImage; index: number; onLoaded: (id: number) => void }> = ({ image, index, onLoaded }) => {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [dimensions, setDimensions] = useState({ width: image.width || 0, height: image.height || 0 });
  const source = image.image_url + (attempt ? (image.image_url.includes('?') ? '&' : '?') + 'retry=' + attempt : '');
  return <div className="w-full rounded-xl overflow-hidden" style={{ aspectRatio: dimensions.width && dimensions.height ? `${dimensions.width} / ${dimensions.height}` : '1 / 3' }}>
    {failed ? <div role="alert" className="p-6 text-center space-y-3"><p>{t('reader.pageLoadError', { order: index + 1 })}</p><button type="button" onClick={() => { setAttempt(value => value + 1); setFailed(false); }} className="min-h-11 px-5 rounded-xl bg-brand-500 text-studio-950 font-bold">{t('common.retry')}</button></div> : <img src={source} alt={t('reader.pageNum', { number: index + 1 })} width={dimensions.width || undefined} height={dimensions.height || undefined} loading="lazy" decoding="async" className="w-full h-auto block" onError={() => setFailed(true)} onLoad={event => { setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }); onLoaded(image.id); }} />}
  </div>;
};
