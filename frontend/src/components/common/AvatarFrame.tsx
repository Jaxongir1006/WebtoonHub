import React, { useState } from 'react';
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

  React.useEffect(() => {
    setFrameError(false);
  }, [frameUrl]);

  const sizeDimensions = {
    xs: { container: 'w-7 h-7', avatar: 'w-5 h-5 text-[10px]', frameScale: 'scale-125' },
    sm: { container: 'w-9 h-9', avatar: 'w-7 h-7 text-xs', frameScale: 'scale-125' },
    md: { container: 'w-12 h-12', avatar: 'w-9 h-9 text-sm', frameScale: 'scale-130' },
    lg: { container: 'w-16 h-16', avatar: 'w-12 h-12 text-base', frameScale: 'scale-135' },
    xl: { container: 'w-24 h-24', avatar: 'w-18 h-18 text-xl', frameScale: 'scale-140' },
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

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeDimensions.container} ${className}`}>
      {/* Base Avatar */}
      <div
        className={`rounded-full flex items-center justify-center font-bold text-white shadow-inner overflow-hidden bg-gradient-to-br ${gradient} ${sizeDimensions.avatar}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
        ) : (
          <span>{firstLetter || <User className="w-3/5 h-3/5" />}</span>
        )}
      </div>

      {/* Equipped Frame Overlay */}
      {frameUrl && !frameError ? (
        <img
          src={frameUrl}
          alt="Avatar Frame"
          className={`absolute inset-0 pointer-events-none select-none w-full h-full object-contain ${sizeDimensions.frameScale} drop-shadow-md z-10`}
          onError={() => setFrameError(true)}
        />
      ) : frameUrl ? (
        // Fallback frame decorative glowing border
        <div className="absolute inset-0 rounded-full border-2 border-brand-500/80 animate-pulse-subtle pointer-events-none" />
      ) : null}
    </div>
  );
};
