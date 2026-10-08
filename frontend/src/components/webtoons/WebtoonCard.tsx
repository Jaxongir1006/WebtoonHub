import React from 'react';
import { Link } from 'react-router-dom';
import { WebtoonSummary } from '../../types';
import { SafeImage } from '../common/SafeImage';
import { useLanguage } from '../../context/LanguageContext';
import { formatNumber, getStatusLabel } from '../../utils/format';
import { localizeGenre } from '../../utils/genres';
import { Eye, BookOpen } from 'lucide-react';

interface WebtoonCardProps {
  webtoon: WebtoonSummary;
  className?: string;
}

export const WebtoonCard: React.FC<WebtoonCardProps> = ({ webtoon, className = '' }) => {
  const { t, language } = useLanguage();
  const isOngoing = webtoon.status === 'ongoing';

  return (
    <Link
      to={`/webtoons/${webtoon.slug || webtoon.id}`}
      className={`group flex flex-col bg-studio-900 border border-studio-800/80 hover:border-brand-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-brand ${className}`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-studio-950">
        <SafeImage
          src={webtoon.cover_image_url}
          alt={webtoon.title}
          fallbackTitle={webtoon.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-studio-950 via-studio-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                isOngoing
                  ? 'bg-emerald-500/90 text-studio-950 shadow-sm'
                  : 'bg-indigo-500/90 text-white shadow-sm'
              }`}
            >
              {getStatusLabel(webtoon.status, t)}
            </span>

            {webtoon.type && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shadow-sm ${
                  webtoon.type === 'novel'
                    ? 'bg-purple-600/90 text-white'
                    : webtoon.type === 'manga'
                    ? 'bg-sky-600/90 text-white'
                    : 'bg-amber-500/90 text-studio-950'
                }`}
              >
                {t(`types.${webtoon.type}` as any) || webtoon.type}
              </span>
            )}
          </div>

          <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-studio-950/80 backdrop-blur-md text-studio-300 border border-studio-800/80">
            <Eye className="w-3 h-3 text-studio-400" />
            <span>{formatNumber(webtoon.view_count)}</span>
          </span>
        </div>

        {/* Bottom Cover Info */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs pointer-events-none">
          {webtoon.latest_chapter ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-500/90 backdrop-blur-sm text-studio-950 font-bold text-[11px] shadow-sm">
              <BookOpen className="w-3 h-3" />
              <span>{t('details.chapterNum', { number: webtoon.latest_chapter.chapter_number })}</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg bg-studio-800/80 backdrop-blur-sm text-studio-400 text-[10px]">
              {t('ux.comingSoon')}
            </span>
          )}
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          {/* Genre tags */}
          {webtoon.genres && webtoon.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {webtoon.genres.slice(0, 2).map((genre, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium text-brand-400/90 bg-brand-500/10 px-1.5 py-0.5 rounded"
                >
                  {localizeGenre(genre, language)}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h3 title={webtoon.title} className="font-bold text-sm text-white line-clamp-2 min-h-[2.5rem] group-hover:text-brand-400 transition-colors">
            {webtoon.title}
          </h3>

          {/* Author */}
          {webtoon.author_name && (
            <p className="text-xs text-studio-400 line-clamp-1 mt-0.5">
              {webtoon.author_name}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};
