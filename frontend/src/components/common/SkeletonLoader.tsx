/**
 * Skeleton Loader Component
 * Provides loading placeholders for various content types
 */

interface SkeletonLoaderProps {
  variant?: 'text' | 'card' | 'image' | 'circle';
  width?: string;
  height?: string;
  className?: string;
}

export default function SkeletonLoader({
  variant = 'text',
  width,
  height,
  className = '',
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]';
  
  const variantClasses = {
    text: 'h-4 rounded',
    card: 'h-48 rounded-lg',
    image: 'aspect-[3/4] rounded-lg',
    circle: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

/**
 * Skeleton Grid for Closet Items
 */
export function SkeletonClosetGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel rounded-lg overflow-hidden">
          <SkeletonLoader variant="image" />
          <div className="p-4 space-y-2">
            <SkeletonLoader width="80%" />
            <SkeletonLoader width="60%" />
            <SkeletonLoader width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Analytics Cards
 */
export function SkeletonAnalyticsCard() {
  return (
    <div className="glass-panel p-6 space-y-4">
      <SkeletonLoader width="40%" height="24px" />
      <SkeletonLoader width="60%" height="32px" />
      <div className="space-y-2">
        <SkeletonLoader width="100%" />
        <SkeletonLoader width="90%" />
        <SkeletonLoader width="80%" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Outfit History
 */
export function SkeletonOutfitHistory({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel p-6 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <SkeletonLoader width="40%" height="24px" />
              <SkeletonLoader width="30%" />
            </div>
            <SkeletonLoader variant="circle" width="40px" height="40px" />
          </div>
          <div className="flex gap-2">
            <SkeletonLoader width="80px" height="32px" />
            <SkeletonLoader width="80px" height="32px" />
            <SkeletonLoader width="80px" height="32px" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Look Diary
 */
export function SkeletonLookDiary({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel overflow-hidden">
          <SkeletonLoader variant="image" />
          <div className="p-4 space-y-2">
            <SkeletonLoader width="70%" height="20px" />
            <SkeletonLoader width="50%" />
            <div className="flex gap-2 mt-2">
              <SkeletonLoader width="60px" height="24px" />
              <SkeletonLoader width="60px" height="24px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
