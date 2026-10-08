import React, { useEffect, useState } from 'react';
import { ImageOff, Pause, Play } from 'lucide-react';
import { CardMetadata } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { cardHoverRequested, cardMediaSources, shouldPlayCardAnimation } from '../../utils/cards';

interface CardMediaProps {
  item: CardMetadata & { name: string; asset_url: string };
  featured?: boolean;
  className?: string;
}

export const CardMedia: React.FC<CardMediaProps> = ({ item, featured = false, className = '' }) => {
  const { t } = useLanguage();
  const sources = cardMediaSources(item);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window === 'undefined' || !window.matchMedia ? true : window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [manual, setManual] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [animationFailed, setAnimationFailed] = useState(false);
  const animated = !!sources.animation && !animationFailed;
  const playing = shouldPlayCardAnimation(animated, manual, reducedMotion, hovered, focused, featured);
  const imageUrl = playing ? sources.animation : posterFailed ? null : sources.poster;
  const requestHover = (event: React.MouseEvent<HTMLDivElement>) => {
    if (cardHoverRequested(event.target, !!window.matchMedia?.('(hover: hover)').matches)) setHovered(true);
  };

  useEffect(() => {
    if (!window.matchMedia) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update(); preference.addEventListener?.('change', update);
    return () => preference.removeEventListener?.('change', update);
  }, []);
  useEffect(() => { setManual(null); setPosterFailed(false); setAnimationFailed(false); }, [sources.poster, sources.animation]);

  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-2xl bg-studio-950 border border-studio-800 ${className}`}
      tabIndex={animated ? 0 : undefined}
      role={animated ? 'group' : undefined}
      aria-label={animated ? t('cards.animationPreview', { name: item.name }) : undefined}
      onMouseEnter={requestHover}
      onMouseMove={requestHover}
      onMouseLeave={() => setHovered(false)}
      onFocus={event => { if (event.target === event.currentTarget) setFocused(true); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
      {imageUrl ? <img src={imageUrl} alt={item.character_name || item.name} loading="lazy" decoding="async" className="h-full w-full object-contain"
        onError={() => { if (playing) setAnimationFailed(true); else setPosterFailed(true); }} /> : <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-studio-400"><ImageOff className="h-7 w-7" aria-hidden="true" /><span>{t('cards.imageUnavailable')}</span></div>}
      {sources.animation && <button type="button" data-card-animation-control="true" onClick={() => setManual(!playing)} disabled={animationFailed}
        aria-pressed={playing} aria-label={t(animationFailed ? 'cards.animationUnavailable' : playing ? 'cards.pauseAnimation' : 'cards.playAnimation', { name: item.name })}
        className="absolute bottom-2 right-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/20 bg-studio-950/90 px-3 text-xs font-bold text-white shadow-lg hover:bg-studio-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 disabled:opacity-60">
        {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}<span>{t(animationFailed ? 'cards.animationUnavailable' : playing ? 'cards.pause' : 'cards.play')}</span>
      </button>}
    </div>
  );
};
