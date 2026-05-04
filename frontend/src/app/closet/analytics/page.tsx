"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import ClosetNav from "@/components/navigation/ClosetNav";
import { SkeletonAnalyticsCard } from "@/components/common/SkeletonLoader";
import { EmptyAnalytics } from "@/components/common/EmptyState";

// ── Types ────────────────────────────────────────────
interface AnalyticsData {
  total_items: number;
  total_value: number;
  avg_item_price: number;
  avg_cpw: number;
  items_by_category: Record<string, number>;
  worn_last_30_days: number;
  worn_last_30_days_percentage: number;
  never_worn: number;
  never_worn_percentage: number;
  high_cpw_items: Array<{
    id: string;
    name: string;
    category: string;
    purchase_price: number;
    times_worn: number;
    cpw: number;
    image_url?: string;
  }>;
  best_value_items: Array<{
    id: string;
    name: string;
    category: string;
    purchase_price: number;
    times_worn: number;
    cpw: number;
    image_url?: string;
  }>;
  most_worn_items: Array<{
    id: string;
    name: string;
    category: string;
    times_worn: number;
    image_url?: string;
  }>;
  total_savings: number;
  savings_details: {
    total_wears: number;
    potential_cost: number;
    actual_cost: number;
    savings: number;
  };
}

// ── Helper Functions ─────────────────────────────────
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function getCPWColor(cpw: number): string {
  if (cpw < 20) return "var(--success)";
  if (cpw < 50) return "#f59e0b";
  return "var(--error)";
}

// ── Main Component ───────────────────────────────────
export default function ClosetAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const supabase = getSupabase();
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/");
          return;
        }

        const response = await fetch("/api/closet/analytics", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [router]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen pb-24"
        style={{ background: "var(--bg)", color: "var(--on-surface)" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-5 py-4"
          style={{
            background: "rgba(var(--bg-rgb, 10,10,20),0.85)",
            backdropFilter: "blur(16px)",
          }}
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--on-surface-variant)" }}
          >
            ← Back
          </button>
          <h1 className="text-base font-semibold tracking-tight">
            Closet Analytics
          </h1>
          <div className="w-12" />
        </div>

        <div className="max-w-4xl mx-auto px-5 space-y-6 pt-4">
          {/* Overview Cards Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-4">
                <div className="h-3 w-20 bg-white/10 rounded animate-pulse mb-2"></div>
                <div className="h-8 w-16 bg-white/10 rounded animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Analytics Cards Skeleton */}
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonAnalyticsCard key={i} />
          ))}
        </div>

        <ClosetNav />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div
        className="min-h-screen pb-24"
        style={{ background: "var(--bg)", color: "var(--on-surface)" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-5 py-4"
          style={{
            background: "rgba(var(--bg-rgb, 10,10,20),0.85)",
            backdropFilter: "blur(16px)",
          }}
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--on-surface-variant)" }}
          >
            ← Back
          </button>
          <h1 className="text-base font-semibold tracking-tight">
            Closet Analytics
          </h1>
          <div className="w-12" />
        </div>

        <div className="max-w-4xl mx-auto px-5 pt-4">
          {analytics && analytics.total_items === 0 ? (
            <EmptyAnalytics />
          ) : (
            <div className="glass-card p-8 text-center">
              <span className="material-symbols-outlined text-[64px] mb-4" style={{ color: "var(--error)" }}>
                error
              </span>
              <p className="text-lg mb-4" style={{ color: "var(--error)" }}>
                {error || "Failed to load analytics"}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg"
                style={{ background: "var(--primary)", color: "white" }}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        <ClosetNav />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "var(--bg)", color: "var(--on-surface)" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-5 py-4"
        style={{
          background: "rgba(var(--bg-rgb, 10,10,20),0.85)",
          backdropFilter: "blur(16px)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--on-surface-variant)" }}
        >
          ← Back
        </button>
        <h1 className="text-base font-semibold tracking-tight">
          Closet Analytics
        </h1>
        <div className="w-12" />
      </div>

      <div className="max-w-4xl mx-auto px-5 space-y-6 pt-4">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-xs mb-1" style={{ color: "var(--on-surface-variant)" }}>
              Total Items
            </p>
            <p className="text-2xl font-bold">{analytics.total_items}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs mb-1" style={{ color: "var(--on-surface-variant)" }}>
              Total Value
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(analytics.total_value)}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs mb-1" style={{ color: "var(--on-surface-variant)" }}>
              Avg Item Price
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(analytics.avg_item_price)}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs mb-1" style={{ color: "var(--on-surface-variant)" }}>
              Avg CPW
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: getCPWColor(analytics.avg_cpw) }}
            >
              {formatCurrency(analytics.avg_cpw)}
            </p>
          </div>
        </div>

        {/* Savings Highlight */}
        {analytics.total_savings > 0 && (
          <div
            className="glass-card p-6"
            style={{ background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-[32px]" style={{ color: "var(--success)" }}>
                savings
              </span>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--success)" }}>
                  {formatCurrency(analytics.total_savings)} Saved
                </h2>
                <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                  By wearing your closet instead of buying new
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p style={{ color: "var(--on-surface-variant)" }}>Total Wears</p>
                <p className="font-semibold">{analytics.savings_details.total_wears}</p>
              </div>
              <div>
                <p style={{ color: "var(--on-surface-variant)" }}>If Bought New</p>
                <p className="font-semibold">{formatCurrency(analytics.savings_details.potential_cost)}</p>
              </div>
              <div>
                <p style={{ color: "var(--on-surface-variant)" }}>Actual Cost</p>
                <p className="font-semibold">{formatCurrency(analytics.savings_details.actual_cost)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Wear Statistics */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Wear Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm mb-2" style={{ color: "var(--on-surface-variant)" }}>
                Worn in Last 30 Days
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{analytics.worn_last_30_days}</p>
                <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                  ({analytics.worn_last_30_days_percentage}%)
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm mb-2" style={{ color: "var(--on-surface-variant)" }}>
                Never Worn
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold" style={{ color: analytics.never_worn > 0 ? "var(--error)" : "inherit" }}>
                  {analytics.never_worn}
                </p>
                <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                  ({analytics.never_worn_percentage}%)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Items by Category */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Items by Category</h2>
          <div className="space-y-3">
            {Object.entries(analytics.items_by_category)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{category}</span>
                  <div className="flex items-center gap-3 flex-1 ml-4">
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--surface-variant)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / analytics.total_items) * 100}%`,
                          background: "var(--primary)",
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* High CPW Items */}
        {analytics.high_cpw_items.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[24px]" style={{ color: "var(--error)" }}>
                warning
              </span>
              <h2 className="text-lg font-semibold">High Cost-Per-Wear Items</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--on-surface-variant)" }}>
              Items worn 3+ times with CPW over $50
            </p>
            <div className="space-y-3">
              {analytics.high_cpw_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--surface-variant)" }}>
                  <div className="flex items-center gap-3">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                        {item.category} • Worn {item.times_worn}x
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: getCPWColor(item.cpw) }}>
                      {formatCurrency(item.cpw)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                      CPW
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best Value Items */}
        {analytics.best_value_items.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[24px]" style={{ color: "var(--success)" }}>
                star
              </span>
              <h2 className="text-lg font-semibold">Best Value Items</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--on-surface-variant)" }}>
              Your most cost-effective pieces
            </p>
            <div className="space-y-3">
              {analytics.best_value_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--surface-variant)" }}>
                  <div className="flex items-center gap-3">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                        {item.category} • Worn {item.times_worn}x
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: getCPWColor(item.cpw) }}>
                      {formatCurrency(item.cpw)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                      CPW
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most Worn Items */}
        {analytics.most_worn_items.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Most Worn Items</h2>
            <div className="space-y-3">
              {analytics.most_worn_items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--surface-variant)" }}>
                  <span className="text-2xl font-bold w-8" style={{ color: "var(--primary)" }}>
                    {index + 1}
                  </span>
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                      {item.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{item.times_worn}</p>
                    <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                      wears
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ClosetNav />
    </div>
  );
}
