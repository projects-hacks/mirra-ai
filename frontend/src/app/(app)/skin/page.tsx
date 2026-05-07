"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, History, Sparkles } from "lucide-react";
import AgentInsightCard from "@/components/dashboard/AgentInsightCard";
import SkinSummaryCard from "@/components/dashboard/SkinSummaryCard";
import ProductRecommendations from "@/components/skin/ProductRecommendations";
import SkinConcernGrid from "@/components/skin/SkinConcernGrid";
import SkinGuidanceBoard from "@/components/skin/SkinGuidanceBoard";
import SkinToneProfile from "@/components/skin/SkinToneProfile";
import WeatherCard from "@/components/dashboard/WeatherCard";
import { useSkinAnalysis } from "@/hooks/useSkinAnalysis";

export default function SkinPage() {
  const router = useRouter();
  const {
    concerns,
    summary,
    skinTone,
    weather,
    insight,
    productGroups,
    dailySuggestions,
    isLoading,
    error,
  } = useSkinAnalysis();
  const hasScan = concerns.length > 0 || Boolean(summary?.lastScanDate);

  return (
    <div className="page-shell space-y-4 sm:space-y-6">
      {error && (
        <div className="banner-error" role="alert">
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

      {!hasScan && !isLoading && (
        <section className="surface-card rounded-[1.25rem] border border-black/8 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="label-caps">First Scan</p>
              <h2 className="section-display mt-2 text-2xl">Capture a quality-gated selfie</h2>
              <p className="body-copy mt-2 max-w-2xl text-sm" style={{ color: "var(--on-card-variant)" }}>
                Perfect Corp needs a centered, front-facing photo with your face large enough in frame. The Camera Kit flow checks the capture before analysis.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  "Bright, even lighting",
                  "Face centered and forward",
                  "Forehead and cheeks visible",
                  "No glasses, hair, or hands covering features",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm" style={{ color: "var(--on-card)" }}>
                    <CheckCircle2 size={16} className="text-emerald-600" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <Link href="/capture" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#111827] px-5 py-3 text-sm font-semibold text-white">
              <Camera size={16} aria-hidden="true" />
              Start Scan
            </Link>
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SkinSummaryCard summary={summary} isLoading={isLoading} />
        <AgentInsightCard
          insight={insight}
          isLoading={isLoading}
          onRecommendationTap={(action) => {
            if (action === "/skin") {
              window.scrollTo({ top: 0, behavior: "smooth" });
              return;
            }
            router.push(action);
          }}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.45fr)]">
        <SkinConcernGrid concerns={concerns} />
        <div className="space-y-4">
          <SkinToneProfile skinTone={skinTone} />
          <WeatherCard weather={weather} isLoading={isLoading} />
          <Link
            href="/skin/simulate"
            prefetch={false}
            className="flex min-h-14 items-center justify-center gap-2 rounded-[1.25rem] bg-[#111827] px-5 py-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(17,24,39,0.14)]"
          >
            <Sparkles size={18} aria-hidden="true" />
            Simulate improvement
          </Link>
        </div>
      </section>

      <SkinGuidanceBoard
        concerns={concerns}
        insight={insight}
        productGroups={productGroups}
        suggestions={dailySuggestions}
        isLoading={isLoading}
      />

      <ProductRecommendations groups={productGroups} isLoading={isLoading} />
    </div>
  );
}
