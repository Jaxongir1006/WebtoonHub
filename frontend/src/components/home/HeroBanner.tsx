import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WebtoonSummary } from '../../types';
import { SafeImage } from '../common/SafeImage';
import { Zap, BookOpen, Eye, ChevronRight, ChevronLeft } from 'lucide-react';
import { formatNumber, getStatusLabel } from '../../utils/format';

interface HeroBannerProps {
  webtoons: WebtoonSummary[];
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ webtoons }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto rotate banner every 7 seconds
  useEffect(() => {
    if (webtoons.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % webtoons.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [webtoons.length]);

  if (!webtoons || webtoons.length === 0) return null;

  const current = webtoons[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + webtoons.length) % webtoons.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % webtoons.length);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-studio-900 border border-studio-800 shadow-2xl mb-12 select-none group">
      {/* Blurred atmospheric backdrop image */}
      <div className="absolute inset-0 overflow-hidden">
        <SafeImage
          src={current.cover_image_url}
          alt={current.title}
          className="w-full h-full object-cover blur-3xl scale-125 opacity-30 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-studio-950 via-studio-950/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-studio-950 via-transparent to-studio-950/40" />
      </div>

      {/* Main Banner Content */}
      <div className="relative z-10 p-6 sm:p-10 lg:p-14 flex flex-col-reverse md:flex-row items-center gap-8 justify-between min-h-[380px] lg:min-h-[440px]">
        {/* Left Column: Details */}
        <div className="flex-1 max-w-2xl space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-500 text-studio-950 shadow-glow-brand">
              <Zap className="w-3.5 h-3.5 fill-studio-950" />
              <span>Hafta Trendi #1</span>
            </span>

            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
                current.status === 'ongoing'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
              }`}
            >
              {getStatusLabel(current.status)}
            </span>

            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-studio-800/80 backdrop-blur-md text-studio-300 border border-studio-700">
              <Eye className="w-3.5 h-3.5 text-studio-400" />
              <span>{formatNumber(current.view_count)} ko'rildi</span>
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            {current.title}
          </h1>

          {/* Author & Genres */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-studio-400">
            {current.author_name && (
              <span className="text-studio-300 font-medium">
                Muallif: <b className="text-white">{current.author_name}</b>
              </span>
            )}
            {current.genres && current.genres.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span>•</span>
                {current.genres.map((g, idx) => (
                  <span key={idx} className="text-brand-400 font-medium">
                    #{g}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Short description */}
          <p className="text-sm sm:text-base text-studio-300 line-clamp-3 leading-relaxed max-w-xl">
            Tizim orqali eng kuchsiz ovchidan yer yuzining eng qudratli monarxiga aylangan yigitning hayratlanarli sarguzashtlari. O'zbek tilidagi rasmiy vertikal sifatli tarjima.
          </p>

          {/* Actions */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              to={`/webtoons/${current.slug || current.id}`}
              className="px-6 py-3.5 rounded-xl font-bold bg-gradient-to-r from-brand-500 to-amber-400 text-studio-950 hover:from-brand-400 hover:to-amber-300 active:scale-98 shadow-glow-brand transition-all flex items-center gap-2 text-sm sm:text-base"
            >
              <BookOpen className="w-5 h-5 fill-studio-950" />
              <span>Mutolaani boshlash</span>
            </Link>

            <Link
              to={`/webtoons/${current.slug || current.id}`}
              className="px-5 py-3.5 rounded-xl font-semibold bg-studio-800/90 text-white hover:bg-studio-700 active:scale-98 border border-studio-700 transition-all text-sm"
            >
              Batafsil ma'lumot
            </Link>
          </div>
        </div>

        {/* Right Column: High-Res 3D Cover */}
        <div className="relative shrink-0 w-44 sm:w-56 lg:w-64 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-studio-700/60 group-hover:border-brand-500/50 transition-all transform md:rotate-2 hover:rotate-0 duration-300">
          <SafeImage
            src={current.cover_image_url}
            alt={current.title}
            fallbackTitle={current.title}
            className="w-full h-full object-cover"
          />
          {current.latest_chapter && (
            <div className="absolute bottom-3 left-3 right-3 bg-studio-950/80 backdrop-blur-md rounded-xl p-2 text-center border border-studio-800">
              <span className="text-xs font-bold text-brand-400">
                So'nggi: {current.latest_chapter.chapter_number}-bob
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Slide Navigation Buttons */}
      {webtoons.length > 1 && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-xl bg-studio-950/80 hover:bg-studio-800 text-studio-300 hover:text-white border border-studio-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-xs font-mono font-bold text-studio-400 px-2">
            {currentIndex + 1} / {webtoons.length}
          </div>
          <button
            onClick={handleNext}
            className="p-2 rounded-xl bg-studio-950/80 hover:bg-studio-800 text-studio-300 hover:text-white border border-studio-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
