import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface AvatarFrameProps {
  username?: string;
  avatarUrl?: string | null;
  frameUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AvatarFrame: React.FC<AvatarFrameProps> = ({
  username = 'User',
  avatarUrl,
  frameUrl,
  size = 'md',
  className = ''
}) => {
  const [frameError, setFrameError] = useState(false);

  useEffect(() => {
    setFrameError(false);
  }, [frameUrl]);

  const sizeDimensions = {
    xs: {
      container: 'w-8 h-8',
      fontSize: 'text-[10px]',
    },
    sm: {
      container: 'w-10 h-10',
      fontSize: 'text-xs',
    },
    md: {
      container: 'w-14 h-14',
      fontSize: 'text-sm',
    },
    lg: {
      container: 'w-20 h-20',
      fontSize: 'text-base',
    },
    xl: {
      container: 'w-32 h-32',
      fontSize: 'text-2xl',
    },
  }[size];

  const firstLetter = username.charAt(0).toUpperCase();

  // Consistent pleasant gradient based on username
  const bgColors = [
    'from-brand-600 to-amber-700',
    'from-indigo-600 to-purple-700',
    'from-emerald-600 to-teal-700',
    'from-rose-600 to-pink-700',
    'from-cyan-600 to-blue-700'
  ];
  const charCode = username.charCodeAt(0) || 0;
  const gradient = bgColors[charCode % bgColors.length];

  const hasActiveFrame = Boolean(frameUrl && !frameError);

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${sizeDimensions.container} ${className}`}
    >
      {/* Keep the avatar size stable when a frame is equipped. */}
      <div
        className={`w-full h-full rounded-full flex items-center justify-center font-bold text-white shadow-inner overflow-hidden bg-gradient-to-br ${gradient} ${
          hasActiveFrame
            ? 'shadow-md ring-1 ring-white/10'
            : 'ring-2 ring-studio-700/60'
        } ${sizeDimensions.fontSize}`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username}
            className="w-full h-full object-cover select-none"
            loading="lazy"
          />
        ) : (
          <span>{firstLetter || <User className="w-1/2 h-1/2" />}</span>
        )}
      </div>

      {/* Equipped Frame Overlay */}
      {hasActiveFrame ? (
        <img
          src={frameUrl!}
          alt="Avatar Frame"
          className="absolute inset-0 pointer-events-none select-none w-full h-full object-contain scale-[1.375] drop-shadow-lg z-10"
          onError={() => setFrameError(true)}
        />
      ) : frameUrl && frameError ? (
        // Fallback decorative glowing border if frame asset fails
        <div className="absolute inset-0 rounded-full border-2 border-brand-500/80 animate-pulse-subtle pointer-events-none" />
      ) : null}
    </div>
  );
};
