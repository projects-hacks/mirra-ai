"use client";

import { useState } from "react";
import Image from "next/image";

interface ProofCard {
  id: string;
  result_image_url: string;
  look_name: string;
  occasion: string;
  created_at: string;
  /** DB columns: tone_match / style_fit are stored as 0-100 floats. */
  tone_match?: number;
  style_fit?: number;
  skin_safe?: boolean;
  owned_items?: Array<{ id: string; name: string; category: string }>;
  new_items?: Array<{ name: string; price: number; url: string }>;
  total_cost?: number;
  approved?: boolean;
  weather?: {
    temperature: number;
    condition: string;
  };
  calendar_event?: {
    title: string;
    start_time: string;
  };
  is_favorite?: boolean;
}

interface LookDiaryCardProps {
  proofCard: ProofCard;
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void;
}

export default function LookDiaryCard({
  proofCard,
  onFavoriteToggle,
}: LookDiaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(proofCard.is_favorite || false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const handleFavoriteToggle = async () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    onFavoriteToggle?.(proofCard.id, newFavoriteState);
  };

  const totalCost =
    typeof proofCard.total_cost === "number"
      ? proofCard.total_cost
      : (proofCard.new_items?.reduce((sum, item) => sum + (item.price || 0), 0) || 0);

  return (
    <>
      {/* Card */}
      <div className="glass-panel overflow-hidden hover:ring-2 hover:ring-mirra-accent/50 transition-all">
        {/* Image */}
        <div
          className="relative aspect-[3/4] cursor-pointer group"
          onClick={() => setIsImageViewerOpen(true)}
        >
          <Image
            src={proofCard.result_image_url}
            alt={proofCard.look_name}
            fill
            className="object-cover"
          />
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity">
              zoom_in
            </span>
          </div>

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFavoriteToggle();
            }}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          >
            <span
              className={`material-symbols-outlined text-xl ${
                isFavorite ? "text-mirra-accent" : "text-white"
              }`}
              style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>

          {/* Match Scores (0-100 floats from proof_cards table) */}
          {(typeof proofCard.tone_match === "number" || typeof proofCard.style_fit === "number") && (
            <div className="absolute bottom-3 left-3 right-3 flex gap-2">
              {typeof proofCard.tone_match === "number" && (
                <div className="flex-1 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                  <div className="text-xs text-white/60">Tone Match</div>
                  <div className="text-sm font-medium text-mirra-accent">
                    {Math.round(proofCard.tone_match)}%
                  </div>
                </div>
              )}
              {typeof proofCard.style_fit === "number" && (
                <div className="flex-1 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                  <div className="text-xs text-white/60">Style Fit</div>
                  <div className="text-sm font-medium text-mirra-accent">
                    {Math.round(proofCard.style_fit)}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{proofCard.look_name}</h3>
              <p className="text-sm text-white/60 capitalize">{proofCard.occasion}</p>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-sm">
                {isExpanded ? "expand_less" : "expand_more"}
              </span>
            </button>
          </div>

          <div className="text-xs text-white/50">
            {new Date(proofCard.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
              {/* Owned Items */}
              {proofCard.owned_items && proofCard.owned_items.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-mirra-accent">
                      checkroom
                    </span>
                    From Your Closet ({proofCard.owned_items.length})
                  </div>
                  <div className="space-y-1">
                    {proofCard.owned_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-white/70 flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-mirra-accent" />
                        <span className="capitalize">{item.category}</span>
                        <span className="text-white/40">•</span>
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Items */}
              {proofCard.new_items && proofCard.new_items.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-mirra-accent">
                      shopping_bag
                    </span>
                    New Items ({proofCard.new_items.length})
                  </div>
                  <div className="space-y-2">
                    {proofCard.new_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm flex items-center justify-between"
                      >
                        <span className="text-white/70">{item.name}</span>
                        <span className="text-mirra-accent font-medium">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between font-medium">
                      <span>Total Cost</span>
                      <span className="text-mirra-accent">${totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Weather */}
              {proofCard.weather && (
                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-mirra-accent">
                      wb_sunny
                    </span>
                    Weather
                  </div>
                  <div className="text-sm text-white/70">
                    {proofCard.weather.temperature}°F • {proofCard.weather.condition}
                  </div>
                </div>
              )}

              {/* Calendar Event */}
              {proofCard.calendar_event && (
                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-mirra-accent">
                      event
                    </span>
                    Event
                  </div>
                  <div className="text-sm text-white/70">
                    {proofCard.calendar_event.title}
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    {new Date(proofCard.calendar_event.start_time).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Image Viewer */}
      {isImageViewerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsImageViewerOpen(false)}
        >
          <button
            onClick={() => setIsImageViewerOpen(false)}
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>

          <div className="relative w-full max-w-2xl aspect-[3/4]">
            <Image
              src={proofCard.result_image_url}
              alt={proofCard.look_name}
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Image Info Overlay */}
          <div className="absolute bottom-4 left-4 right-4 glass-panel p-4">
            <h3 className="font-semibold mb-1">{proofCard.look_name}</h3>
            <p className="text-sm text-white/60 capitalize">{proofCard.occasion}</p>
          </div>
        </div>
      )}
    </>
  );
}
