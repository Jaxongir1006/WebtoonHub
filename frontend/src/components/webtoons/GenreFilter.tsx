import React from 'react';
import { Genre } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { localizeGenre } from '../../utils/genres';

interface GenreFilterProps {
  genres: Genre[];
  selectedSlug?: string;
  onSelect: (slug?: string) => void;
  className?: string;
}

export const GenreFilter: React.FC<GenreFilterProps> = ({
  genres,
  selectedSlug,
  onSelect,
  className = ''
}) => {
  const { t, language } = useLanguage();

  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none ${className}`}>
      <button
        type="button"
        aria-pressed={!selectedSlug}
        onClick={() => onSelect(undefined)}
        className={`min-h-[44px] px-3.5 py-2 rounded-full text-sm font-bold transition-all shrink-0 ${
          !selectedSlug
            ? 'bg-brand-500 text-studio-950 shadow-glow-brand'
            : 'bg-studio-900 border border-studio-800 text-studio-300 hover:text-white hover:border-studio-700'
        }`}
      >
        {t('common.all')}
      </button>

      {genres.map((genre) => {
        const isSelected = selectedSlug === genre.slug;
        return (
          <button
            key={genre.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(genre.slug)}
            className={`min-h-[44px] px-3.5 py-2 rounded-full text-sm font-semibold transition-all shrink-0 ${
              isSelected
                ? 'bg-brand-500 text-studio-950 shadow-glow-brand font-bold'
                : 'bg-studio-900 border border-studio-800 text-studio-300 hover:text-white hover:border-studio-700'
            }`}
          >
            {localizeGenre(genre.name, language)}
          </button>
        );
      })}
    </div>
  );
};
