/**
 * Custom hook for smooth image transitions with preloading
 * Implements crossfade animation between images
 */

import { useState, useEffect, useCallback } from 'react';

interface UseImageTransitionReturn {
  displayImage: string | null;
  isTransitioning: boolean;
  isLoading: boolean;
  error: string | null;
}

const TRANSITION_DURATION = 300; // ms

/**
 * Hook to manage smooth transitions between images
 * Preloads next image before transitioning to avoid flash
 * 
 * @param currentImage - Currently displayed image URL
 * @param nextImage - Next image to transition to
 * @returns Display state and transition status
 */
export function useImageTransition(
  currentImage: string | null,
  nextImage: string | null
): UseImageTransitionReturn {
  const [displayImage, setDisplayImage] = useState<string | null>(currentImage);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      
      img.src = src;
    });
  }, []);

  useEffect(() => {
    // No change needed
    if (!nextImage || nextImage === displayImage) {
      return;
    }

    let isMounted = true;

    const transitionImage = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Preload next image
        await preloadImage(nextImage);

        if (!isMounted) return;

        // Start transition
        setIsTransitioning(true);

        // Wait for CSS transition duration
        setTimeout(() => {
          if (!isMounted) return;
          
          setDisplayImage(nextImage);
          setIsTransitioning(false);
          setIsLoading(false);
        }, TRANSITION_DURATION);

      } catch (err) {
        if (!isMounted) return;
        
        setError(err instanceof Error ? err.message : 'Failed to load image');
        setIsLoading(false);
        setIsTransitioning(false);
      }
    };

    transitionImage();

    return () => {
      isMounted = false;
    };
  }, [nextImage, displayImage, preloadImage]);

  return {
    displayImage,
    isTransitioning,
    isLoading,
    error,
  };
}
