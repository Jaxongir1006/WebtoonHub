import React from 'react';
import { Genre } from '../../types';

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
  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none ${className}`}>
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
          !selectedSlug
            ? 'bg-brand-500 text-studio-950 shadow-glow-brand'
            : 'bg-studio-900 border border-studio-800 text-studio-300 hover:text-white hover:border-studio-700'
        }`}
      >
        Barchasi
      </button>

      {genres.map((genre) => {
        const isSelected = selectedSlug === genre.slug;
        return (
          <button
            key={genre.id}
            type="button"
            onClick={() => onSelect(genre.slug)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
              isSelected
                ? 'bg-brand-500 text-studio-950 shadow-glow-brand font-bold'
                : 'bg-studio-900 border border-studio-800 text-studio-300 hover:text-white hover:border-studio-700'
            }`}
          >
            {genre.name}
          </button>
        );
      })}
    </div>
  );
};
