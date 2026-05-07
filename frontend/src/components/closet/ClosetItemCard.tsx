"use client";

import { memo, useCallback, useMemo } from "react";
import Image from "next/image";
import CostPerWearBadge from "./CostPerWearBadge";

interface ClosetItemCardProps {
  item: {
    id: string;
    name: string;
    category: string;
    color: string;
    imageUrl: string;
    brand?: string;
    purchasePrice?: number;
    timesWorn?: number;
    owned?: boolean;
  };
  onSelect?: (item: ClosetItemCardProps["item"]) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (itemId: string) => void;
}

/**
 * Closet Item Card Component
 * Displays a single closet item in bento grid layout
 * Optimized with React.memo to prevent unnecessary re-renders
 */
const ClosetItemCard = memo(function ClosetItemCard({
  item,
  onSelect,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}: Readonly<ClosetItemCardProps>) {
  const handleClick = useCallback(() => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(item.id);
    } else if (onSelect) {
      onSelect(item);
    }
  }, [item, onSelect, selectionMode, onToggleSelect]);

  const formattedPrice = useMemo(() => {
    if (!item.purchasePrice) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(item.purchasePrice);
  }, [item.purchasePrice]);

  return (
    <button
      type="button"
      className={`glass-panel rounded-xl overflow-hidden relative group cursor-pointer hover:scale-105 transition-transform duration-300 ${
        isSelected ? 'ring-2 ring-purple-500' : ''
      }`}
      onClick={handleClick}
      aria-label={`Select ${item.name}`}
    >
      {/* Selection Checkbox */}
      {selectionMode && (
        <div className="absolute top-3 right-3 z-20">
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-purple-500 border-purple-500'
                : 'bg-white/10 border-white/50'
            }`}
          >
            {isSelected && (
              <span className="material-symbols-outlined text-white text-sm">check</span>
            )}
          </div>
        </div>
      )}

      {/* Badge */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <span
          className="px-2 py-1 rounded-full font-label-caps text-[10px] shadow-sm border flex items-center gap-1"
          style={{
            background: "var(--surface-bright)",
            color: "var(--on-surface)",
            borderColor: "var(--outline-variant)",
          }}
        >
          <span className="material-symbols-outlined text-[14px]">
            check_circle
          </span>
          Owned
        </span>
      </div>

      {/* Image */}
      <div
        className="aspect-[3/4] p-4 flex items-center justify-center relative"
        style={{ background: "var(--surface-container-low)" }}
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-contain mix-blend-multiply drop-shadow-lg group-hover:scale-105 transition-transform duration-500 p-4"
            loading="lazy"
          />
        ) : (
          <span className="material-symbols-outlined text-[64px] opacity-30">
            checkroom
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 border-t border-white/50">
        <h3
          className="font-body-md text-body-md font-semibold truncate"
          style={{ color: "var(--primary)" }}
        >
          {item.name}
        </h3>
        <p
          className="font-body-md text-[14px] truncate"
          style={{ color: "var(--on-surface-variant)" }}
        >
          {item.category} • {item.color}
        </p>
        {item.brand && (
          <p
            className="font-body-md text-[12px] truncate mt-1 opacity-60"
            style={{ color: "var(--on-surface-variant)" }}
          >
            {item.brand}
          </p>
        )}
        
        {/* Cost Per Wear Badge */}
        <div className="mt-2">
          <CostPerWearBadge
            price={item.purchasePrice}
            timesWorn={item.timesWorn}
          />
        </div>
        
        {item.purchasePrice && (
          <p
            className="font-body-md text-[12px] mt-2 opacity-60"
            style={{ color: "var(--on-surface-variant)" }}
          >
            {formattedPrice}
          </p>
        )}
      </div>
    </button>
  );
});

export default ClosetItemCard;
