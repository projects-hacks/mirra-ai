"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CloudSun, ScanFace, Sparkles } from "lucide-react";
import AgentInsightCard from "@/components/dashboard/AgentInsightCard";
import QuickActionsGrid from "@/components/dashboard/QuickActionsGrid";
import RecentLooksRow from "@/components/dashboard/RecentLooksRow";
import SkinSummaryCard from "@/components/dashboard/SkinSummaryCard";
import WeatherCard from "@/components/dashboard/WeatherCard";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardPage() {
  const router = useRouter();
  const { skinSummary, weather, insight, recentLooks, isLoading, error } = useDashboard();
  const focusCount = skinSummary?.topConcerns.length ?? 0;

  return (
    <div className="page-shell space-y-4 sm:space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-[1.5rem] border border-black/8 bg-[linear-gradient(135deg,#111827_0%,#1f2937_48%,#3f342d_100%)] p-5 text-white shadow-[0_18px_50px_rgba(17,24,39,0.18)] sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.55fr)] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Dashboard</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Your appearance command center
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
              Skin signal, local context, and styling actions in one place. Start with a fresh scan, then move into the next best flow.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/capture"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition-transform hover:-translate-y-0.5"
              >
                <Camera size={16} aria-hidden="true" />
                Capture scan
              </Link>
              <Link
                href="/glowup"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-transform hover:-translate-y-0.5"
              >
                <ScanFace size={16} aria-hidden="true" />
                Plan GlowUp
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/12">
              <Sparkles size={16} className="text-white/65" aria-hidden="true" />
              <p className="mt-3 text-2xl font-semibold">{isLoading ? "--" : skinSummary?.overallScore ?? "--"}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/48">Skin</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/12">
              <ScanFace size={16} className="text-white/65" aria-hidden="true" />
              <p className="mt-3 text-2xl font-semibold">{isLoading ? "--" : focusCount}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/48">Focus</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/12">
              <CloudSun size={16} className="text-white/65" aria-hidden="true" />
              <p className="mt-3 text-2xl font-semibold">{isLoading ? "--" : weather ? `${Math.round(weather.temp)}F` : "--"}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/48">Local</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <SkinSummaryCard summary={skinSummary} isLoading={isLoading} />
        <AgentInsightCard
          insight={insight}
          isLoading={isLoading}
          onRecommendationTap={(action) => router.push(action)}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)] lg:items-start">
        <div className="space-y-4">
          <QuickActionsGrid />
          <RecentLooksRow looks={recentLooks} />
        </div>
        <WeatherCard weather={weather} isLoading={isLoading} />
      </section>
    </div>
  );
}
