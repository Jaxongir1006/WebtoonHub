import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { webtoonsApi } from '../api/webtoons';
import { Genre, WebtoonSummary } from '../types';
import { HeroBanner } from '../components/home/HeroBanner';
import { WebtoonCard } from '../components/webtoons/WebtoonCard';
import { GenreFilter } from '../components/webtoons/GenreFilter';
import { useDailyBonus } from '../context/DailyBonusContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Zap,
  TrendingUp,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Gift,
  Loader2
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { openModal: openDailyBonusModal, isClaimedToday } = useDailyBonus();
  const { t } = useLanguage();
  const [webtoons, setWebtoons] = useState<WebtoonSummary[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [webtoonResult, genreResult] = await Promise.allSettled([
          webtoonsApi.listCatalog({ limit: 12, genre: selectedGenre }),
          genres.length === 0 ? webtoonsApi.listGenres() : Promise.resolve(genres)
        ]);
        if (webtoonResult.status === 'rejected') throw webtoonResult.reason;
        const wRes = webtoonResult.value;
        if (cancelled) return;
        setWebtoons(wRes.items || []);
        if (genres.length === 0 && genreResult.status === 'fulfilled') {
          setGenres(genreResult.value);
        }
      } catch (err) {
        console.error("Failed to load home page data", err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [selectedGenre, retryCount]);

  const filteredWebtoons = webtoons;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {/* Hero Banner for trending items */}
        {loading ? (
          <div className="w-full h-96 rounded-3xl bg-studio-900 animate-pulse flex items-center justify-center text-studio-500 mb-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : loadError ? null : (
          <HeroBanner webtoons={webtoons.slice(0, 3)} />
        )}

        {loadError && (
          <div role="alert" className="mb-12 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-8 text-center">
            <p className="text-sm text-rose-200 mb-4">{t('common.error')}</p>
            <button onClick={() => setRetryCount((count) => count + 1)} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-studio-950">{t('common.retry')}</button>
          </div>
        )}

        {/* Daily Bonus Callout Strip (Faqat bugun olinmagan bo'lsa ko'rinadi) */}
        {!isClaimedToday && (
          <div className="mb-12 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-brand-600/20 via-amber-500/10 to-studio-900 border border-brand-500/30 shadow-glow-brand flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center shrink-0 shadow-glow-brand">
                <Zap className="w-6 h-6 text-studio-950 fill-studio-950" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-1.5 justify-center sm:justify-start">
                  <span>{t('dailyBonus.modalTitle')} — {t('dailyBonus.amount')}</span>
                  <Sparkles className="w-4 h-4 text-brand-400" />
                </h3>
                <p className="text-xs text-studio-300 mt-0.5">
                  {t('dailyBonus.modalSubtitle')}
                </p>
              </div>
            </div>

            <button
              onClick={openDailyBonusModal}
              className="px-5 py-2.5 rounded-xl font-bold bg-brand-500 text-studio-950 hover:bg-brand-400 active:scale-95 shadow-glow-brand transition-all text-xs shrink-0 flex items-center gap-1.5"
            >
              <Gift className="w-4 h-4" />
              <span>{t('dailyBonus.claimBtn')}</span>
            </button>
          </div>
        )}

        {/* Trending Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-500" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t('home.popularToday')}
              </h2>
            </div>
            <Link
              to="/catalog"
              className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
            >
              <span>{t('home.viewAll')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Genre Filter Tabs */}
          {genres.length > 0 && (
            <GenreFilter
              genres={genres}
              selectedSlug={selectedGenre}
              onSelect={setSelectedGenre}
              className="mb-6"
            />
          )}

          {/* Webtoons Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-studio-900 animate-pulse" />
              ))}
            </div>
          ) : loadError ? null : filteredWebtoons.length === 0 ? (
            <div className="py-16 text-center text-studio-400">
              <BookOpen className="w-10 h-10 mx-auto text-studio-600 mb-2" />
              <p className="text-sm font-semibold">{t('home.emptyGenre')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredWebtoons.map((webtoon) => (
                <WebtoonCard key={webtoon.id} webtoon={webtoon} />
              ))}
            </div>
          )}
        </div>

        {/* Features Showcase Section */}
        <div className="mt-20 pt-12 border-t border-studio-800">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-black text-white tracking-tight">
              {t('home.whyWebtoonHub')}
            </h2>
            <p className="text-xs text-studio-400 mt-1.5">
              {t('home.whySubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-studio-900/60 border border-studio-800 hover:border-brand-500/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 shadow-glow-brand">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <h3 className="font-bold text-white text-base mb-2">
                {t('home.featureCoinsTitle')}
              </h3>
              <p className="text-xs text-studio-400 leading-relaxed">
                {t('home.featureCoinsDesc')}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-studio-900/60 border border-studio-800 hover:border-brand-500/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 shadow-glow-brand">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base mb-2">
                {t('home.featureReaderTitle')}
              </h3>
              <p className="text-xs text-studio-400 leading-relaxed">
                {t('home.featureReaderDesc')}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-studio-900/60 border border-studio-800 hover:border-brand-500/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 shadow-glow-brand">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base mb-2">
                {t('home.featureUzTitle')}
              </h3>
              <p className="text-xs text-studio-400 leading-relaxed">
                {t('home.featureUzDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
