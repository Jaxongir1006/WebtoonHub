import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
  fallbackIcon?: React.ReactNode;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  fallbackIcon,
  ...props
}) => {
  const [error, setError] = useState(false);

  React.useEffect(() => {
    setError(false);
  }, [src]);

  // If no source or error occurred, render attractive placeholder
  if (!src || error) {
    return (
      <div
        className={`bg-gradient-to-br from-studio-800 to-studio-900 border border-studio-700/50 flex flex-col items-center justify-center p-3 text-center text-studio-400 select-none ${className}`}
      >
        {fallbackIcon || <BookOpen className="w-8 h-8 text-brand-500/60 mb-2" />}
        {fallbackTitle && (
          <span className="text-xs font-medium text-studio-300 line-clamp-2 px-1 leading-tight">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
      {...props}
    />
  );
};
