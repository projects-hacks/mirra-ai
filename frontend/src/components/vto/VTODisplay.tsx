/* eslint-disable @next/next/no-img-element */
// @deprecated: voice-mode only. VTO result display will be rebuilt per page.
/**
 * VTO Display Component
 * Handles display of selfie, VTO results, and loading states
 * with smooth crossfade transitions
 */

"use client";

import { useImageTransition } from '@/hooks/useImageTransition';
import { VTOResult } from '@/types';
import { ToolName, LOADING_TEXT } from '@/lib/constants';

interface VTODisplayProps {
  selfie: string | null;
  vtoResult: VTOResult | null;
  isProcessing: boolean;
  currentTool: ToolName | null;
  onReset?: () => void;
  showBaseImage?: boolean;
}

type DisplayState = 'selfie' | 'loading' | 'vto';

export default function VTODisplay({
  selfie,
  vtoResult,
  isProcessing,
  currentTool,
  onReset,
  showBaseImage = true,
}: Readonly<VTODisplayProps>) {
  // Determine which image to display
  const currentImage = vtoResult?.imageUrl ?? selfie;
  
  const { displayImage, isTransitioning } = useImageTransition(
    selfie,
    currentImage
  );

  // Determine display state
  const getDisplayState = (): DisplayState => {
    if (isProcessing) return 'loading';
    if (vtoResult) return 'vto';
    return 'selfie';
  };

  const displayState = getDisplayState();
  const loadingText = currentTool ? LOADING_TEXT[currentTool] : 'Processing…';

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Base Image Layer */}
      {showBaseImage && (
        <div className="absolute inset-0">
          {displayImage && (
            <img
              src={displayImage}
              alt="Your appearance"
              className={`
                w-full h-full object-cover
                transition-opacity duration-300 ease-in-out
                ${isTransitioning ? 'opacity-0' : 'opacity-100'}
              `}
            />
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {displayState === 'loading' && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/70 backdrop-blur-2xl border border-white/50 rounded-DEFAULT px-6 py-4 shadow-lg">
            {/* Shimmer Animation */}
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 overflow-hidden rounded-full bg-surface-container">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
              </div>
              <p className="font-body-md text-on-surface">{loadingText}</p>
            </div>
          </div>
        </div>
      )}

      {/* VTO Result Actions */}
      {displayState === 'vto' && onReset && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={onReset}
            className="
              bg-white/70 backdrop-blur-2xl border border-white/50 
              rounded-full px-6 py-3 
              font-body-md text-on-surface
              hover:bg-white/90 transition-colors
              shadow-lg
            "
          >
            Reset to Selfie
          </button>
        </div>
      )}
    </div>
  );
}
