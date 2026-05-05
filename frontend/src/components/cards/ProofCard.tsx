"use client";

import { useMemo, memo } from "react";
import Image from "next/image";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import MatchScore from "@/components/ui/MatchScore";
import { useToast } from "@/components/ui/Toast";
import { retryWithBackoff } from "@/lib/api";

interface ProofCardItem {
  name: string;
  price?: number;
  imageUrl?: string;
  owned?: boolean;
}

interface ProofCardProps {
  card: {
    look_name: string;
    vto_image_url?: string;
    tone_match: number;
    style_fit: number;
    skin_safe: boolean;
    owned_items: ProofCardItem[];
    new_items: ProofCardItem[];
    total_new_spend: number;
    occasion: string;
    weather: string;
  };
  onApprove?: () => void;
  onAdjust?: () => void;
  onSave?: () => void;
  onClose?: () => void;
}

/**
 * Proof Card Component
 * Shows VTO result with match scores and item breakdown
 * Factory pattern: Generated from backend ProofCardGenerator
 * Optimized with React.memo to prevent unnecessary re-renders
 */
const ProofCard = memo(function ProofCard({
  card,
  onApprove,
  onAdjust,
  onSave,
  onClose,
}: Readonly<ProofCardProps>) {
  const { showToast } = useToast();

  const formatPrice = useMemo(
    () => (price: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
      }).format(price);
    },
    []
  );

  // Handlers with retry logic and user feedback
  const handleApprove = async () => {
    if (!onApprove) return;

    try {
      await retryWithBackoff(
        async () => {
          await Promise.resolve(onApprove());
        },
        {
          maxRetries: 2,
          initialDelay: 500,
          onRetry: (attempt) => {
            showToast(`Retrying... (${attempt}/2)`, "info");
          },
        }
      );
      showToast("Look approved successfully!", "success");
    } catch (error) {
      console.error("Approve failed:", error);
      showToast("Unable to approve. Please try again.", "error");
    }
  };

  const handleAdjust = async () => {
    if (!onAdjust) return;

    try {
      await retryWithBackoff(async () => Promise.resolve(onAdjust()), {
        maxRetries: 2,
        initialDelay: 500,
      });
    } catch (error) {
      console.error("Adjust failed:", error);
      showToast("Unable to adjust. Please try again.", "error");
    }
  };

  const handleSave = async () => {
    if (!onSave) return;

    try {
      await retryWithBackoff(async () => Promise.resolve(onSave()), {
        maxRetries: 2,
        initialDelay: 500,
      });
      showToast("Look saved to your collection!", "success");
    } catch (error) {
      console.error("Save failed:", error);
      showToast("Unable to save. Please try again.", "error");
    }
  };

  return (
    <div className="glass-card w-full max-w-md mx-auto px-4 sm:px-0 float-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 pb-2 border-b border-white/20">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/20 transition-colors min-w-[44px] min-h-[44px]"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
        <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight">
          <CheckCircle2 size={18} aria-hidden="true" />
          PROOF CARD
        </h2>
        <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/20 transition-colors min-w-[44px] min-h-[44px]">
          <span className="material-symbols-outlined text-[24px]">
            more_horiz
          </span>
        </button>
      </div>

      {/* VTO Image */}
      {card.vto_image_url && (
        <div className="relative w-full aspect-[3/4] overflow-hidden">
          <Image
            src={card.vto_image_url}
            alt={card.look_name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <p className="text-white text-2xl font-bold tracking-tight">
              {card.look_name}
            </p>
            <p className="text-white/80 text-sm">
              {card.occasion} • {card.weather}
            </p>
          </div>
        </div>
      )}

      {/* Match Scores */}
      <div className="py-2">
        <MatchScore
          label="Tone Match"
          score={card.tone_match}
          icon="check_circle"
        />
        <MatchScore
          label="Style Fit"
          score={card.style_fit}
          icon="check_circle"
        />
        <div className="flex items-center gap-4 px-4 min-h-14 justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-lg shrink-0 size-10"
              style={{ background: "var(--surface-container)" }}
            >
              <span className="material-symbols-outlined text-[24px]">
                shield
              </span>
            </div>
            <p className="text-base font-normal leading-normal flex-1 truncate">
              Skin Safe
            </p>
          </div>
          <div className="shrink-0">
            <p className="flex items-center gap-2 text-base font-normal leading-normal">
              {card.skin_safe ? (
                <CheckCircle2 size={18} className="text-[var(--success)]" aria-hidden="true" />
              ) : (
                <TriangleAlert size={18} className="text-[var(--error)]" aria-hidden="true" />
              )}
              {card.skin_safe ? "No conflicts" : "Check ingredients"}
            </p>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="px-4 py-4 space-y-6">
        {/* New Items */}
        {card.new_items.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xl font-medium">New Items</h3>
            <div className="space-y-2">
              {card.new_items.map((item) => (
                <div
                  key={`${item.name}-${item.imageUrl ?? item.price ?? "new"}`}
                  className="flex justify-between items-center group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.imageUrl && (
                      <div
                        className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${item.imageUrl})`,
                          background: "var(--surface-container)",
                        }}
                      />
                    )}
                    <p className="text-base truncate">{item.name}</p>
                  </div>
                  {item.price !== undefined && (
                    <p className="text-base font-medium">
                      {formatPrice(item.price)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* From Closet */}
        {card.owned_items.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/20">
            <h3 className="text-xl font-medium">From Your Closet</h3>
            <div className="space-y-2">
              {card.owned_items.map((item) => (
                <div
                  key={`${item.name}-${item.imageUrl ?? item.price ?? "owned"}`}
                  className="flex justify-between items-center opacity-70"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "var(--surface-variant)" }}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ color: "var(--on-surface-variant)" }}
                      >
                        checkroom
                      </span>
                    </div>
                    <p
                      className="text-base truncate"
                      style={{ color: "var(--on-surface-variant)" }}
                    >
                      {item.name}
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    check
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-6 border-t border-white/20 space-y-4">
        {/* Total Spend */}
        {card.new_items.length > 0 && (
          <div className="flex justify-between items-end mb-2">
            <p
              className="font-medium"
              style={{ color: "var(--on-surface-variant)" }}
            >
              Total New Spend
            </p>
            <p className="text-3xl font-medium tracking-tight">
              {formatPrice(card.total_new_spend)}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <button
          onClick={handleApprove}
          className="w-full h-14 rounded-full text-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg"
          style={{
            background: "var(--primary)",
            color: "var(--on-primary)",
          }}
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            thumb_up
          </span>
          Approve
        </button>

        <div className="flex gap-4">
          <button
            onClick={handleAdjust}
            className="flex-1 h-12 bg-transparent border-2 rounded-full text-base font-medium flex items-center justify-center gap-2 transition-colors"
            style={{
              borderColor: "var(--outline-variant)",
              color: "var(--on-surface)",
            }}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Adjust
          </button>
          <button
            onClick={handleSave}
            className="flex-1 h-12 bg-transparent border-2 rounded-full text-base font-medium flex items-center justify-center gap-2 transition-colors"
            style={{
              borderColor: "var(--outline-variant)",
              color: "var(--on-surface)",
            }}
          >
            <span className="material-symbols-outlined text-[18px]">
              bookmark
            </span>
            Save
          </button>
        </div>
      </div>
    </div>
  );
});

export default ProofCard;
