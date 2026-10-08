import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { webtoonsApi } from '../api/webtoons';
import { Genre, WebtoonSummary } from '../types';
import { WebtoonCard } from '../components/webtoons/WebtoonCard';
import { GenreFilter } from '../components/webtoons/GenreFilter';
import { useLanguage } from '../context/LanguageContext';
import { Search, Compass, BookOpen, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchParam = searchParams.get('search') || '';
  const typeParam = (searchParams.get('type') as 'manhwa' | 'manga' | 'novel') || '';
  const genreParam = searchParams.get('genre') || '';
  const requestedSort = searchParams.get('sort');
  const sortParam: 'popular' | 'updated' | 'newest' = requestedSort === 'updated' || requestedSort === 'newest' ? requestedSort : 'popular';
  const statusParam = (searchParams.get('status') as 'ongoing' | 'completed') || '';
  const requestedPage = parseInt(searchParams.get('page') || '1', 10);
  const pageParam = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [genres, setGenres] = useState<Genre[]>([]);
  const [webtoons, setWebtoons] = useState<WebtoonSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const requestId = useRef(0);

  // Local state for search input
  const [searchInput, setSearchInput] = useState(searchParam);

  useEffect(() => setSearchInput(searchParam), [searchParam]);

  useEffect(() => {
    webtoonsApi.listGenres().then(setGenres).catch(console.error);
  }, []);

  const fetchCatalog = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setLoadError(false);
    try {
      const data = await webtoonsApi.listCatalog({
        page: pageParam,
        limit: 18,
        type: typeParam || undefined,
        search: searchParam || undefined,
        genre: genreParam || undefined,
        status: statusParam || undefined,
        sort: sortParam,
      });
      if (currentRequest !== requestId.current) return;
      setWebtoons(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error("Failed to load catalog", err);
      if (currentRequest === requestId.current) setLoadError(true);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [pageParam, typeParam, searchParam, genreParam, statusParam, sortParam, retryCount]);

  useEffect(() => {
    fetchCatalog();
    return () => { requestId.current++; };
  }, [fetchCatalog]);

  const updateFilters = (newParams: Record<string, string | undefined>) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) {
        updated.set(k, v);
      } else {
        updated.delete(k);
      }
    });
    // Reset to page 1 when changing filters
    if (!('page' in newParams)) {
      updated.set('page', '1');
    }
    setSearchParams(updated);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() || undefined });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const hasActiveFilters = !!searchParam || !!genreParam || !!statusParam || !!typeParam;

  return (
    <div className="min-h-screen" aria-busy={loading}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2.5">
              <Compass className="w-8 h-8 text-brand-500" />
              <span>{t('catalog.title')}</span>
            </h1>
            <p className="text-xs text-studio-400 mt-1">
              {t('catalog.subtitle')}
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-studio-400" />
            <input
              type="text"
              aria-label={t('ux.search')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('catalog.searchPlaceholder')}
              className="w-full min-h-[44px] pl-10 pr-12 py-2.5 bg-studio-900 border border-studio-800 rounded-2xl text-sm text-white placeholder-studio-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
            {searchInput && (
              <button
                type="button"
                aria-label={t('readerFix.clearSearch')}
                onClick={() => {
                  setSearchInput('');
                  updateFilters({ search: undefined });
                }}
                className="absolute right-0 top-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-studio-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            </div>
            <button type="submit" className="min-h-[44px] px-4 rounded-xl bg-brand-500 text-studio-950 font-bold text-sm">{t('ux.search')}</button>
            <p className="w-full text-xs text-studio-400">{t('readerFix.searchHint')}</p>
          </form>
        </div>

        {/* Filters Bar */}
        <div className="bg-studio-900/60 border border-studio-800 rounded-3xl p-5 mb-8 space-y-4">
          {/* Content Type Filter */}
          <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-studio-800/80">
            <span className="text-sm font-semibold text-studio-300 mr-1">{t('ux.format')}:</span>
            {[
              { label: t('types.all'), value: '' },
              { label: t('types.manhwa'), value: 'manhwa' },
              { label: t('types.manga'), value: 'manga' },
              { label: t('types.novel'), value: 'novel' },
            ].map((tp) => {
              const isSelected = typeParam === tp.value;
              return (
                <button
                  key={tp.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => updateFilters({ type: tp.value || undefined })}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-bold transition-all ${
                    isSelected
                      ? 'bg-brand-500 text-studio-950 shadow-glow-brand'
                      : 'bg-studio-800/80 text-studio-300 hover:text-white hover:bg-studio-700'
                  }`}
                >
                  {tp.label}
                </button>
              );
            })}
          </div>

          {/* Genre list */}
          <div>
            <div className="text-xs font-semibold text-studio-400 mb-2">{t('common.genres')}:</div>
            <GenreFilter
              genres={genres}
              selectedSlug={genreParam || undefined}
              onSelect={(slug) => updateFilters({ genre: slug })}
            />
          </div>

          {/* Status filters & Clear */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-studio-800/80">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-studio-400 mr-1">{t('common.status')}:</span>
              {[
                { label: t('catalog.statusAll'), value: '' },
                { label: t('catalog.statusOngoing'), value: 'ongoing' },
                { label: t('catalog.statusCompleted'), value: 'completed' },
              ].map((st) => {
                const isSelected = statusParam === st.value;
                return (
                  <button
                    key={st.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => updateFilters({ status: st.value || undefined })}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                      isSelected
                        ? 'bg-studio-700 text-white shadow-sm'
                        : 'text-studio-400 hover:text-white hover:bg-studio-800'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>

            <label className="flex items-center gap-2 text-sm text-studio-300">{t('readerFix.sort')}
              <select value={sortParam} onChange={event => updateFilters({ sort: event.target.value })} className="min-h-[44px] bg-studio-800 text-white px-3 rounded-xl border border-studio-700">
                <option value="popular">{t('readerFix.popular')}</option><option value="updated">{t('ux.recent')}</option><option value="newest">{t('ux.newest')}</option>
              </select>
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t('catalog.clearFilters')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Counter */}
        {!loadError && <div className="flex items-center justify-between mb-6 text-xs text-studio-400 font-semibold">
          <span>{t('common.all')}: <b className="text-white">{total}</b></span>
          {totalPages > 1 && (
            <span>{pageParam} / {totalPages}</span>
          )}
        </div>}

        {/* Webtoons Grid */}
        {loading ? (
          <div role="status" className="py-24 flex flex-col items-center justify-center text-studio-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <span className="text-sm">{t('common.loading')}</span>
          </div>
        ) : loadError ? (
          <div role="alert" className="py-16 text-center bg-studio-900/40 border border-rose-500/30 rounded-3xl p-8 max-w-md mx-auto">
            <h3 className="font-bold text-white text-base mb-3">{t('common.error')}</h3>
            <button onClick={() => setRetryCount((count) => count + 1)} className="px-4 py-2 rounded-xl bg-brand-500 text-studio-950 font-bold text-sm">{t('common.retry')}</button>
          </div>
        ) : webtoons.length === 0 ? (
          <div className="py-20 text-center bg-studio-900/40 border border-studio-800 rounded-3xl p-8 max-w-md mx-auto">
            <BookOpen className="w-12 h-12 mx-auto text-studio-600 mb-3" />
            <h3 className="font-bold text-white text-base mb-1">{t('catalog.emptyTitle')}</h3>
            <p className="text-xs text-studio-400 mb-4">
              {pageParam > 1 && pageParam > totalPages ? t('ux.outOfRange') : t('catalog.emptyDesc')}
            </p>
            {pageParam > 1 && pageParam > totalPages && <button onClick={() => updateFilters({ page: '1' })} className="min-h-[44px] px-4 rounded-xl bg-brand-500 text-studio-950">1</button>}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand"
              >
                {t('catalog.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {webtoons.map((webtoon) => (
              <WebtoonCard key={webtoon.id} webtoon={webtoon} />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              aria-label={t('reader.prevPage')}
              disabled={pageParam <= 1 || loading}
              onClick={() => updateFilters({ page: (pageParam - 1).toString() })}
              className="p-2.5 rounded-xl bg-studio-900 border border-studio-800 text-studio-200 hover:text-white hover:bg-studio-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="px-4 py-2 rounded-xl bg-studio-900 border border-studio-800 text-xs font-bold text-white">
              {pageParam} / {totalPages}
            </span>

            <button
              aria-label={t('reader.nextPage')}
              disabled={pageParam >= totalPages || loading}
              onClick={() => updateFilters({ page: (pageParam + 1).toString() })}
              className="p-2.5 rounded-xl bg-studio-900 border border-studio-800 text-studio-200 hover:text-white hover:bg-studio-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
