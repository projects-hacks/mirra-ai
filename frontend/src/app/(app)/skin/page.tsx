"use client";

import Link from "next/link";
import { Camera, History, Sparkles } from "lucide-react";
import AgentInsightCard from "@/components/dashboard/AgentInsightCard";
import SkinSummaryCard from "@/components/dashboard/SkinSummaryCard";
import ProductRecommendations from "@/components/skin/ProductRecommendations";
import SkinConcernGrid from "@/components/skin/SkinConcernGrid";
import SkinToneProfile from "@/components/skin/SkinToneProfile";
import WeatherCard from "@/components/dashboard/WeatherCard";
import { useSkinAnalysis } from "@/hooks/useSkinAnalysis";

export default function SkinPage() {
  const {
    concerns,
    summary,
    skinTone,
    weather,
    insight,
    productGroups,
    isLoading,
    error,
  } = useSkinAnalysis();

  return (
    <div className="page-shell space-y-4 sm:space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-[1.5rem] border border-black/8 bg-[linear-gradient(135deg,#0f172a_0%,#1f2937_58%,#3f342d_100%)] p-5 text-white shadow-[0_18px_50px_rgba(17,24,39,0.18)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Skin Health</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Analysis, treatment preview, and product direction
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
              Review your latest Perfect Corp scan, inspect the lowest scores, and move into simulation or shopping with context.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/capture" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#111827]">
              <Camera size={16} aria-hidden="true" />
              New scan
            </Link>
            <Link href="/skin-history" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
              <History size={16} aria-hidden="true" />
              History
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SkinSummaryCard summary={summary} isLoading={isLoading} />
        <AgentInsightCard insight={insight} isLoading={isLoading} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.45fr)]">
        <SkinConcernGrid concerns={concerns} />
        <div className="space-y-4">
          <SkinToneProfile skinTone={skinTone} />
          <WeatherCard weather={weather} isLoading={isLoading} />
          <Link href="/skin/simulate" className="flex min-h-14 items-center justify-center gap-2 rounded-[1.25rem] bg-[#111827] px-5 py-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(17,24,39,0.14)]">
            <Sparkles size={18} aria-hidden="true" />
            Simulate improvement
          </Link>
        </div>
      </section>

      <ProductRecommendations groups={productGroups} isLoading={isLoading} />
    </div>
  );
}
