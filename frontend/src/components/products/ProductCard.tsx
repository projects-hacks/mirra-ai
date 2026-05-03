"use client";

import { useState, memo } from "react";
import { useToast } from "@/components/ui/Toast";
import { retryWithBackoff } from "@/lib/retry";
import Image from "next/image";

interface ProductCardProps {
  product: {
    title: string;
    price: string;
    source: string;
    link: string;
    imageUrl: string;
    rating?: number;
  };
  onTryOn?: (imageUrl: string) => void;
  onViewDetails?: (link: string) => void;
}

/**
 * Product Card Component
 * Displays shopping product with try-on and view details actions
 * Optimized with Next.js Image for progressive loading
 */
const ProductCard = memo(function ProductCard({
  product,
  onTryOn,
  onViewDetails,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const { showToast } = useToast();

  const handleTryOn = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onTryOn) return;

    try {
      await retryWithBackoff(
        async () => {
          await onTryOn(product.imageUrl);
        },
        {
          maxRetries: 2,
          initialDelay: 500,
        }
      );
      showToast("Try-on applied!", "success");
    } catch (error) {
      console.error("Try-on failed:", error);
      showToast("Unable to apply try-on. Please try again.", "error");
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(product.link);
    } else {
      window.open(product.link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="item-card cursor-pointer hover:scale-105 transition-transform duration-300"
      onClick={handleViewDetails}
    >
      {product.imageUrl && !imageError ? (
        <div className="relative w-full h-[160px]">
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
          {onTryOn && (
            <button
              onClick={handleTryOn}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110"
              style={{
                background: "var(--primary)",
                color: "var(--on-primary)",
              }}
            >
              <span className="material-symbols-outlined text-[18px]">
                visibility
              </span>
            </button>
          )}
        </div>
      ) : (
        <div
          className="w-full h-[160px] flex items-center justify-center text-3xl"
          style={{ background: "var(--surface-container)" }}
        >
          👔
        </div>
      )}
      <div className="item-info">
        <div className="item-name truncate-2">{product.title}</div>
        <div className="item-meta flex items-center justify-between">
          <span className="font-medium">{product.price}</span>
          {product.rating && (
            <span className="text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">
                star
              </span>
              {product.rating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="text-xs opacity-60 mt-1">{product.source}</div>
      </div>
    </div>
  );
});

export default ProductCard;
