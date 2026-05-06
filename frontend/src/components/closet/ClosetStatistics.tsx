"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getApiUrl } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";

// ── Types ────────────────────────────────────────────
interface StatisticsData {
  total_items: number;
  total_value: number;
  items_by_category: Record<string, number>;
  worn_last_30_days: number;
  worn_last_30_days_percentage: number;
  never_worn: number;
  most_worn_items: Array<{
    id: string;
    name: string;
    category: string;
    times_worn: number;
  }>;
}

// ── Helper Functions ─────────────────────────────────
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Main Component ───────────────────────────────────
export default function ClosetStatistics() {
  const router = useRouter();
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function loadStatistics() {
      try {
        const supabase = getSupabase();
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          return;
        }

        const response = await fetch(getApiUrl("/api/closet/analytics"), {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch statistics");
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Failed to load statistics:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStatistics();
  }, []);

  if (isLoading || !stats) {
    return null;
  }

  // Get top 3 categories
  const topCategories = Object.entries(stats.items_by_category)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="mb-6">
      {/* Compact Summary */}
      <div
        className="glass-card p-4 cursor-pointer transition-all duration-300 hover:bg-white/10"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Total Items */}
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--on-surface-variant)" }}>
                Total Items
              </p>
              <p className="text-xl font-bold">{stats.total_items}</p>
            </div>

            {/* Total Value */}
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--on-surface-variant)" }}>
                Total Value
              </p>
              <p className="text-xl font-bold">{formatCurrency(stats.total_value)}</p>
            </div>

            {/* Worn Recently */}
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--on-surface-variant)" }}>
                Worn (30d)
              </p>
              <p className="text-xl font-bold">
                {stats.worn_last_30_days_percentage}%
              </p>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 hover:bg-white/10"
            style={{ color: "var(--primary)" }}
          >
            <span className="text-sm">
              {isExpanded ? "Less" : "More"}
            </span>
            <span className="material-symbols-outlined text-[20px]">
              {isExpanded ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Items by Category */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Top Categories</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/closet/analytics");
                }}
                className="inline-flex items-center gap-1 text-xs"
                style={{ color: "var(--primary)" }}
              >
                View All
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-2">
              {topCategories.map(([category, count]) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{category}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-24 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--surface-variant)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / stats.total_items) * 100}%`,
                          background: "var(--primary)",
                        }}
                      />
                    </div>
                    <span className="font-semibold w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wear Statistics */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-3">Wear Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p style={{ color: "var(--on-surface-variant)" }}>
                  Worn Recently
                </p>
                <p className="text-lg font-bold">
                  {stats.worn_last_30_days}
                  <span className="text-sm font-normal ml-1" style={{ color: "var(--on-surface-variant)" }}>
                    ({stats.worn_last_30_days_percentage}%)
                  </span>
                </p>
              </div>
              <div>
                <p style={{ color: "var(--on-surface-variant)" }}>
                  Never Worn
                </p>
                <p
                  className="text-lg font-bold"
                  style={{ color: stats.never_worn > 0 ? "var(--error)" : "inherit" }}
                >
                  {stats.never_worn}
                </p>
              </div>
            </div>
          </div>

          {/* Most Worn Items */}
          {stats.most_worn_items.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold mb-3">Most Worn Items</h3>
              <div className="space-y-2">
                {stats.most_worn_items.slice(0, 5).map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm p-2 rounded-lg"
                    style={{ background: "var(--surface-variant)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="font-bold w-5"
                        style={{ color: "var(--primary)" }}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                          {item.category}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold">{item.times_worn}x</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Full Analytics Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push("/closet/analytics");
            }}
            className="w-full py-3 rounded-xl transition-all duration-300 hover:bg-white/10 font-medium"
            style={{
              background: "var(--primary)",
              color: "var(--on-primary)",
            }}
          >
            View Full Analytics
          </button>
        </div>
      )}
    </div>
  );
}
