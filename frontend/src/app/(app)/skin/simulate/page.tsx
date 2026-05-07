"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Loader2, WandSparkles } from "lucide-react";
import SkinSimulationCard from "@/components/cards/SkinSimulationCard";
import ProductRecommendations from "@/components/skin/ProductRecommendations";
import IntensitySliders from "@/components/skin/IntensitySliders";
import { formatApiError, skinApi } from "@/lib/api";
import { useSkinAnalysis } from "@/hooks/useSkinAnalysis";

async function imageUrlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load the latest selfie.");
  return response.blob();
}

export default function SkinSimulatePage() {
  const { latestScan, intensities: derivedIntensities, productGroups, isLoading } = useSkinAnalysis();
  const [manualIntensities, setManualIntensities] = useState<Record<string, number> | null>(null);
  const [simulationUrl, setSimulationUrl] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intensities = manualIntensities ?? derivedIntensities;

  async function runSimulation() {
    if (!latestScan?.selfie_url) {
      setError("No stored selfie was found. Capture a fresh scan first.");
      return;
    }

    setIsSimulating(true);
    setError(null);
    try {
      const selfie = await imageUrlToBlob(latestScan.selfie_url);
      const result = await skinApi.simulate(selfie, intensities);
      setSimulationUrl(result.simulation_url);
    } catch (err) {
      setError(formatApiError(err, "Skin simulation failed."));
    } finally {
      setIsSimulating(false);
    }
  }

  const canRun = Boolean(latestScan?.selfie_url) && Object.keys(intensities).length > 0 && !isLoading;

  return (
    <div className="page-shell space-y-4 pb-8 sm:space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/skin"
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/12"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Skin Health
        </Link>
      </div>

      <section className="rounded-[1.5rem] border border-black/8 bg-[linear-gradient(135deg,#111827_0%,#1f2937_58%,#3f342d_100%)] p-5 text-white shadow-[0_18px_50px_rgba(17,24,39,0.18)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Skin Simulation</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Preview visible improvement before shopping
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
          Intensities follow your lowest skin scores. Tune sliders, then run Perfect Corp simulation to see a
          before / after preview.
        </p>
      </section>

      {error && (
        <div className="banner-error" role="alert">
          {error}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="rounded-[1.25rem] border border-black/8 bg-white/78 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
          {isLoading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-black/12 bg-[#f8fafc] p-8 text-center">
              <Loader2 size={32} className="animate-spin text-[#64748b]" aria-hidden="true" />
              <p className="text-sm font-medium text-[#334155]">Loading your latest scan…</p>
            </div>
          ) : simulationUrl && latestScan?.selfie_url ? (
            <div className="space-y-4">
              <SkinSimulationCard
                originalUrl={latestScan.selfie_url}
                simulatedUrl={simulationUrl}
                intensities={intensities}
                onClose={() => setSimulationUrl(null)}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => void runSimulation()}
                  disabled={isSimulating || !canRun}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:flex-none"
                >
                  {isSimulating ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <WandSparkles size={16} aria-hidden="true" />
                  )}
                  Run again with current sliders
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-black/12 bg-[#f8fafc] p-6 text-center">
              <WandSparkles size={34} className="text-[#64748b]" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-semibold text-[#0f172a]">Simulation not generated yet</h3>
              <p className="mt-2 max-w-sm text-sm leading-6" style={{ color: "var(--on-card-variant)" }}>
                Run simulation using the latest stored selfie and the intensity controls.
              </p>
              <button
                type="button"
                onClick={() => void runSimulation()}
                disabled={isSimulating || !canRun}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSimulating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <WandSparkles size={16} aria-hidden="true" />}
                Run simulation
              </button>
              {!latestScan?.selfie_url && !isLoading && (
                <Link
                  href="/capture"
                  prefetch={false}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-[#0f172a]"
                >
                  <Camera size={16} aria-hidden="true" />
                  Capture scan
                </Link>
              )}
            </div>
          )}
        </div>

        <IntensitySliders intensities={intensities} onChange={setManualIntensities} isLoading={isLoading} />
      </section>

      <details className="group rounded-[1.25rem] border border-black/8 bg-white/55 backdrop-blur open:bg-white/78">
        <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-[#0f172a] marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            Suggested products (from your concerns)
            <span className="text-sm font-normal text-[#64748b] group-open:hidden">Tap to expand</span>
            <span className="hidden text-sm font-normal text-[#64748b] group-open:inline">Tap to collapse</span>
          </span>
        </summary>
        <div className="border-t border-black/8 px-3 pb-4 pt-2">
          <ProductRecommendations groups={productGroups} isLoading={isLoading} />
        </div>
      </details>
    </div>
  );
}
