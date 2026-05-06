"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { getApiUrl } from "@/lib/constants";

interface RecommendedItem {
  id: string;
  name: string;
  category: string;
  color: string;
  image_url?: string;
  recommendation_score: number;
  reason: string;
  brand?: string;
  price?: number;
  times_worn?: number;
}

interface RecommendationsCardProps {
  userId: string;
  occasion?: string;
  temperature?: number;
}

export default function RecommendationsCard({
  userId,
  occasion = "casual",
  temperature,
}: RecommendationsCardProps) {
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          user_id: userId,
          occasion,
        });

        if (temperature !== undefined) {
          params.append("temperature", temperature.toString());
        }

        const { data: { session } } = await getSession();
        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(
          getApiUrl(`/api/closet/recommendations/quick?${params}`),
          { headers }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch recommendations");
        }

        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
        setError(err instanceof Error ? err.message : "Failed to load recommendations");
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      fetchRecommendations();
    }
  }, [userId, occasion, temperature]);

  if (isLoading) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-2xl text-mirra-accent">
            auto_awesome
          </span>
          <h2 className="text-xl font-semibold">Recommended for You</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-16 h-16 bg-white/10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-2xl text-mirra-accent">
            auto_awesome
          </span>
          <h2 className="text-xl font-semibold">Recommended for You</h2>
        </div>
        <div className="text-center py-8 text-white/60">
          <span className="material-symbols-outlined text-4xl mb-2">error</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-2xl text-mirra-accent">
            auto_awesome
          </span>
          <h2 className="text-xl font-semibold">Recommended for You</h2>
        </div>
        <div className="text-center py-8 text-white/60">
          <span className="material-symbols-outlined text-4xl mb-2">
            checkroom
          </span>
          <p>Add more items to your closet to get personalized recommendations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-2xl text-mirra-accent">
          auto_awesome
        </span>
        <h2 className="text-xl font-semibold">Recommended for You</h2>
        <span className="ml-auto text-sm text-white/60 capitalize">{occasion}</span>
      </div>

      <div className="space-y-3">
        {recommendations.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            {/* Item Image */}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-white/40">
                    checkroom
                  </span>
                </div>
              )}
            </div>

            {/* Item Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{item.name}</h3>
                  <p className="text-sm text-white/60 capitalize">
                    {item.category}
                    {item.brand && ` • ${item.brand}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-mirra-accent flex-shrink-0">
                  <span className="material-symbols-outlined text-sm">star</span>
                  <span className="text-sm font-medium">
                    {Math.round(item.recommendation_score)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-white/50 mt-1 line-clamp-1">{item.reason}</p>
            </div>
          </div>
        ))}
      </div>

      {recommendations.length > 5 && (
        <button className="w-full mt-4 py-2 text-sm text-mirra-accent hover:text-mirra-accent/80 transition-colors">
          View all {recommendations.length} recommendations
        </button>
      )}
    </div>
  );
}
