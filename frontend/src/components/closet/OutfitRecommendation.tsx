"use client";

import { useState } from "react";
import Image from "next/image";
import { closetApi, formatApiError } from "@/lib/api";

interface OutfitItem {
  id: string;
  name: string;
  category: string;
  color: string;
  image_url?: string;
  recommendation_score: number;
}

interface OutfitRecommendationProps {
  userId: string;
  occasion: string;
  formality?: number;
  temperature?: number;
  onItemClick?: (itemId: string) => void;
}

export default function OutfitRecommendation({
  userId,
  occasion,
  formality = 0.5,
  temperature,
  onItemClick,
}: OutfitRecommendationProps) {
  const [outfit, setOutfit] = useState<{
    items: OutfitItem[];
    total_score: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateOutfit() {
    try {
      setIsLoading(true);
      setError(null);

      const requestBody = {
        user_id: userId,
        context: {
          occasion,
          formality,
          weather: temperature !== undefined ? { temperature } : undefined,
        },
      };

      const data = await closetApi.outfitRecommendation<{
        items: OutfitItem[];
        total_score: number;
      }>(requestBody);
      setOutfit(data);
    } catch (err) {
      console.error("Error generating outfit:", err);
      setError(formatApiError(err, "Failed to generate outfit"));
    } finally {
      setIsLoading(false);
    }
  }

  if (!outfit && !isLoading && !error) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-2xl text-mirra-accent">
            style
          </span>
          <h2 className="text-xl font-semibold">Complete Outfit</h2>
        </div>
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-5xl text-white/40 mb-3">
            checkroom
          </span>
          <p className="text-white/60 mb-4">
            Get a complete coordinated outfit recommendation
          </p>
          <button
            onClick={generateOutfit}
            className="px-6 py-3 bg-mirra-accent text-white rounded-lg hover:bg-mirra-accent/90 transition-colors"
          >
            Generate Outfit
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-2xl text-mirra-accent">
            style
          </span>
          <h2 className="text-xl font-semibold">Complete Outfit</h2>
        </div>
        <div className="text-center py-12">
          <div className="processing-ring h-12 w-12 mx-auto mb-4" />
          <p className="text-white/60">Creating your perfect outfit...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-2xl text-mirra-accent">
            style
          </span>
          <h2 className="text-xl font-semibold">Complete Outfit</h2>
        </div>
        <div className="text-center py-8 text-white/60">
          <span className="material-symbols-outlined text-4xl mb-2">error</span>
          <p className="mb-4">{error}</p>
          <button
            onClick={generateOutfit}
            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!outfit || outfit.items.length === 0) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-2xl text-mirra-accent">
            style
          </span>
          <h2 className="text-xl font-semibold">Complete Outfit</h2>
        </div>
        <div className="text-center py-8 text-white/60">
          <span className="material-symbols-outlined text-4xl mb-2">
            inventory_2
          </span>
          <p className="mb-4">Not enough items to create a complete outfit</p>
          <button
            onClick={generateOutfit}
            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl text-mirra-accent">
            style
          </span>
          <h2 className="text-xl font-semibold">Complete Outfit</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-mirra-accent">
            star
          </span>
          <span className="text-sm font-medium text-mirra-accent">
            {Math.round(outfit.total_score)} match
          </span>
        </div>
      </div>

      {/* Outfit Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {outfit.items.map((item) => (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            className="relative aspect-square rounded-lg overflow-hidden bg-white/10 cursor-pointer hover:ring-2 hover:ring-mirra-accent transition-all group"
          >
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-white/40">
                  checkroom
                </span>
              </div>
            )}
            
            {/* Overlay with item info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-white/60 capitalize">{item.category}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={generateOutfit}
          className="flex-1 py-2 px-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-sm mr-1 align-middle">
            refresh
          </span>
          New Outfit
        </button>
        <button className="flex-1 py-2 px-4 bg-mirra-accent text-white rounded-lg hover:bg-mirra-accent/90 transition-colors text-sm">
          <span className="material-symbols-outlined text-sm mr-1 align-middle">
            photo_camera
          </span>
          Try On
        </button>
      </div>
    </div>
  );
}
