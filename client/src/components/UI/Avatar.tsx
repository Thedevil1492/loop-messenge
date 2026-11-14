import React from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline,
  className = '',
}) => {
  const sizeMap = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const badgeSizeMap = {
    xs: 'w-2 h-2 border-[1.5px]',
    sm: 'w-2.5 h-2.5 border-2',
    md: 'w-3 h-3 border-2',
    lg: 'w-3.5 h-3.5 border-2',
    xl: 'w-4 h-4 border-2',
  };

  const initial = (name || '?').charAt(0).toUpperCase();
  const fallbackUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    name || 'User'
  )}&backgroundColor=2b5bf4,06b6d4&textColor=ffffff`;

  return (
    <div className={`relative flex-shrink-0 select-none ${sizeMap[size]} ${className}`}>
      <img
        src={src || fallbackUrl}
        alt={name}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = fallbackUrl;
        }}
        className="w-full h-full rounded-full object-cover shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
      />
      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-white dark:border-slate-900 transition-colors ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'
          } ${badgeSizeMap[size]}`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
