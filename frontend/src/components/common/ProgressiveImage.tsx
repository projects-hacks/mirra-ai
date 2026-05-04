'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover';
}

/**
 * Progressive Image Component
 * Loads images progressively with blur placeholder
 * Optimized for mobile with lazy loading
 */
export default function ProgressiveImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fill = false,
  sizes,
  objectFit = 'cover',
}: ProgressiveImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Reset loading state when src changes
  useEffect(() => {
    setIsLoading(true);
    setError(false);
  }, [src]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800 ${className}`}
        style={{ width, height }}
      >
        <span className="material-symbols-outlined text-gray-600 text-4xl">
          broken_image
        </span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={!fill ? { width, height } : undefined}>
      {/* Blur placeholder */}
      {isLoading && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%]"
          style={{ zIndex: 1 }}
        />
      )}

      {/* Actual image */}
      <Image
        src={src}
        alt={alt}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        fill={fill}
        sizes={sizes}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(true);
        }}
        style={{ zIndex: 2 }}
      />
    </div>
  );
}

/**
 * Progressive Image with Thumbnail
 * Loads thumbnail first, then full image
 */
interface ProgressiveImageWithThumbnailProps extends ProgressiveImageProps {
  thumbnailSrc?: string;
}

export function ProgressiveImageWithThumbnail({
  src,
  thumbnailSrc,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fill = false,
  sizes,
  objectFit = 'cover',
}: ProgressiveImageWithThumbnailProps) {
  const [currentSrc, setCurrentSrc] = useState(thumbnailSrc || src);
  const [isFullImageLoaded, setIsFullImageLoaded] = useState(false);

  useEffect(() => {
    if (!thumbnailSrc) {
      setIsFullImageLoaded(true);
      return;
    }

    // Preload full image
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      setCurrentSrc(src);
      setIsFullImageLoaded(true);
    };
  }, [src, thumbnailSrc]);

  return (
    <ProgressiveImage
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={`${className} ${!isFullImageLoaded ? 'blur-sm' : ''}`}
      priority={priority}
      fill={fill}
      sizes={sizes}
      objectFit={objectFit}
    />
  );
}
