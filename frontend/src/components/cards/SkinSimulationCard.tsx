"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

interface SkinSimulationCardProps {
  originalUrl: string;
  simulatedUrl: string;
  intensities: Record<string, number>;
  onClose?: () => void;
}

const SkinSimulationCard = ({
  originalUrl,
  simulatedUrl,
  intensities,
  onClose,
}: Readonly<SkinSimulationCardProps>) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    handleMove(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Get top 3 concerns that were improved
  const topConcerns = Object.entries(intensities)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key.replace("_", " "));

  return (
    <div className="glass-card w-full max-w-md mx-auto px-4 sm:px-0 float-in overflow-hidden relative pointer-events-auto shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 pb-2 border-b border-white/20">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/20 transition-colors min-w-[44px] min-h-[44px]"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
        <h2 className="text-base sm:text-lg font-bold tracking-tight">SKIN PROGRESSION</h2>
        <div className="w-10" />
      </div>

      {/* Comparison Area */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-[3/4] overflow-hidden select-none touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Before Image */}
        <Image
          src={originalUrl}
          alt="Before"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        
        {/* After Image */}
        <div 
          className="absolute inset-0"
          style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
        >
          <Image
            src={simulatedUrl}
            alt="After"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>

        {/* Slider Handle */}
        <div 
          className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)]"
          style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-[16px] text-black">
              swap_horiz
            </span>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full text-white text-xs font-medium backdrop-blur-sm">
          Now
        </div>
        <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded-full text-white text-xs font-medium backdrop-blur-sm">
          With Treatment
        </div>
      </div>

      {/* Improvements Section */}
      <div className="p-4 bg-[var(--surface-container)]/50 border-t border-white/10">
        <h3 className="text-sm font-medium mb-2 opacity-80 uppercase tracking-wider">Projected Improvements</h3>
        <div className="flex flex-wrap gap-2">
          {topConcerns.length > 0 ? topConcerns.map((concern) => (
            <div key={concern} className="px-3 py-1.5 bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30 rounded-full text-sm font-medium capitalize flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              {concern}
            </div>
          )) : (
            <div className="text-sm opacity-70">Overall texture and radiance improved</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkinSimulationCard;
