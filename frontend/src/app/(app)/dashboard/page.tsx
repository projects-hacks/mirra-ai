"use client";

import { useRouter } from "next/navigation";
import AgentInsightCard from "@/components/dashboard/AgentInsightCard";
import QuickActionsGrid from "@/components/dashboard/QuickActionsGrid";
import RecentLooksRow from "@/components/dashboard/RecentLooksRow";
import SkinSummaryCard from "@/components/dashboard/SkinSummaryCard";
import WeatherCard from "@/components/dashboard/WeatherCard";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardPage() {
  const router = useRouter();
  const { skinSummary, weather, insight, recentLooks, isLoading, error } = useDashboard();

  return (
    <div className="page-shell space-y-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <SkinSummaryCard summary={skinSummary} isLoading={isLoading} />
        <AgentInsightCard
          insight={insight}
          isLoading={isLoading}
          onRecommendationTap={(action) => router.push(action)}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)] lg:items-start">
        <div className="space-y-5">
          <QuickActionsGrid />
          <RecentLooksRow looks={recentLooks} />
        </div>
        <WeatherCard weather={weather} isLoading={isLoading} />
      </section>
    </div>
  );
}
