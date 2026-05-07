"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, CloudSun, Sparkles } from "lucide-react";
import AgentInsightCard from "@/components/dashboard/AgentInsightCard";
import RecentLooksRow from "@/components/dashboard/RecentLooksRow";
import SkinSummaryCard from "@/components/dashboard/SkinSummaryCard";
import WeatherCard from "@/components/dashboard/WeatherCard";
import { useDashboard } from "@/hooks/useDashboard";

function formatTemperature(tempF: number) {
  const fahrenheit = Math.round(tempF);
  const celsius = Math.round(((tempF - 32) * 5) / 9);
  return `${fahrenheit}°F / ${celsius}°C`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { skinSummary, weather, insight, recentLooks, isLoading, error } = useDashboard();
  const focusCount = skinSummary?.topConcerns.length ?? 0;
  const nextRecommendedAction = insight?.recommendations.find(
    (recommendation) => typeof recommendation.action === "string" && recommendation.action.length > 0
  );
  const nextRecommendedHref = nextRecommendedAction?.action ?? "/skin";
  const nextRecommendedTitle = nextRecommendedAction?.title ?? "Review skin insights";

  return (
    <div className="page-shell space-y-4 sm:space-y-6">
      {error && (
        <div className="banner-error" role="alert">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-[1.5rem] border border-black/8 bg-[linear-gradient(135deg,#111827_0%,#1f2937_54%,#3a2e27_100%)] p-5 text-white shadow-[0_18px_50px_rgba(17,24,39,0.2)] sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.5fr)] lg:items-end">
          <div>
            <p className="eyebrow text-[0.72rem] text-white/55">Dashboard</p>
            <h2 className="section-display mt-3 max-w-2xl text-3xl text-white sm:text-4xl">
              Your next best appearance move
            </h2>
            <p className="body-copy mt-3 max-w-2xl text-sm text-white/68 sm:text-base">
              Use one primary step to keep momentum: refresh your scan, then follow the recommended action based on skin signal and local context.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/capture"
                className="inline-flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#111827] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]"
              >
                <span className="inline-flex items-center gap-2">
                  <Camera size={16} aria-hidden="true" />
                  Capture scan
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => router.push(nextRecommendedHref)}
                className="inline-flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white backdrop-blur transition-[transform,box-shadow] hover:-translate-y-0.5 hover:bg-white/14 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]"
              >
                <span className="inline-flex flex-col">
                  <span className="text-[0.68rem] uppercase tracking-[0.14em] text-white/60">Recommended</span>
                  <span className="mt-0.5">{nextRecommendedTitle}</span>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/12">
              <Sparkles size={16} className="text-white/65" aria-hidden="true" />
              <p className="metric-display mt-3 text-2xl">{isLoading ? "--" : skinSummary?.overallScore ?? "--"}</p>
              <p className="eyebrow mt-1 text-[0.65rem] text-white/48">Skin Score</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/12">
              <ScanFace size={16} className="text-white/65" aria-hidden="true" />
              <p className="metric-display mt-3 text-2xl">{isLoading ? "--" : focusCount}</p>
              <p className="eyebrow mt-1 text-[0.65rem] text-white/48">Focus</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/12">
              <CloudSun size={16} className="text-white/65" aria-hidden="true" />
              <p className="metric-display mt-3 text-xl">{isLoading ? "--" : weather ? formatTemperature(weather.temp) : "--"}</p>
              <p className="eyebrow mt-1 text-[0.65rem] text-white/48">Local</p>
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
        <RecentLooksRow looks={recentLooks} />
        <WeatherCard weather={weather} isLoading={isLoading} />
      </section>
    </div>
  );
}
