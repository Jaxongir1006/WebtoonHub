import React, { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { ActiveAsset } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface ProfileWallpaperProps {
  background?: ActiveAsset | null;
  children: React.ReactNode;
}

const prefersReducedMotion = () => typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A viewport-sized wallpaper that remains behind every section of the profile. */
export const ProfileWallpaper: React.FC<ProfileWallpaperProps> = ({ background, children }) => {
  const { t } = useLanguage();
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [posterFailed, setPosterFailed] = useState(false);
  const [animationFailed, setAnimationFailed] = useState(false);
  const animated = Boolean(background?.asset_animated);
  const actuallyPlaying = animated && playing && !animationFailed;
  const source = actuallyPlaying ? background?.asset_url : posterFailed ? null : animated ? background?.asset_preview_url : background?.asset_url;

  useEffect(() => {
    setPlaying(!prefersReducedMotion());
    setPosterFailed(false);
    setAnimationFailed(false);
    if (typeof window.matchMedia !== 'function') return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPlaying(!preference.matches);
    preference.addEventListener?.('change', update);
    return () => preference.removeEventListener?.('change', update);
  }, [background?.asset_url, background?.asset_preview_url]);

  return (
    <div className="profile-page relative isolate min-h-screen bg-studio-950 pb-20" data-has-background={Boolean(background?.asset_url)}>
      {background?.asset_url && (
        <div aria-hidden="true" data-profile-wallpaper className="pointer-events-none absolute inset-0 select-none">
          {/* Sticky cover avoids stretching artwork across a long page and works on mobile. */}
          <div data-profile-background className="sticky top-0 h-screen supports-[height:100svh]:h-[100svh] w-full">
            {source && (
              <img
                key={source}
                src={source}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
                onError={() => { if (actuallyPlaying) setAnimationFailed(true); else setPosterFailed(true); }}
                decoding="async"
              />
            )}
            <div className="absolute inset-0 bg-studio-950/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-studio-950/40 via-transparent to-studio-950/20" />
          </div>
        </div>
      )}
      <div className="relative z-10">
        {animated && (
          <div className="mx-auto flex max-w-5xl justify-end px-4 pt-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setPlaying(value => !value)}
              disabled={animationFailed}
              aria-label={t(animationFailed ? 'socialFix.backgroundAnimationUnavailable' : actuallyPlaying ? 'socialFix.pauseBackground' : 'socialFix.playBackground')}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-studio-700 bg-studio-950/90 px-3 text-xs font-semibold text-studio-200 hover:bg-studio-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 disabled:opacity-60"
            >
              {actuallyPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              {t(animationFailed ? 'socialFix.backgroundAnimationUnavailable' : actuallyPlaying ? 'socialFix.pauseBackground' : 'socialFix.playBackground')}
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
