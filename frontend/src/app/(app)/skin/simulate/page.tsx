"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, Loader2, WandSparkles } from "lucide-react";
import SkinSimulationCard from "@/components/cards/SkinSimulationCard";
import ProductRecommendations from "@/components/skin/ProductRecommendations";
import IntensitySliders from "@/components/skin/IntensitySliders";
import { skinApi } from "@/lib/api";
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
      setError(err instanceof Error ? err.message : "Skin simulation failed.");
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <div className="page-shell space-y-4 sm:space-y-6">
      <section className="rounded-[1.5rem] border border-black/8 bg-[linear-gradient(135deg,#111827_0%,#1f2937_58%,#3f342d_100%)] p-5 text-white shadow-[0_18px_50px_rgba(17,24,39,0.18)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Skin Simulation</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Preview visible improvement before shopping
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
          Intensities are derived from your lowest skin scores and can be adjusted before running Perfect Corp simulation.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="rounded-[1.25rem] border border-black/8 bg-white/78 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
          {simulationUrl && latestScan?.selfie_url ? (
            <SkinSimulationCard
              originalUrl={latestScan.selfie_url}
              simulatedUrl={simulationUrl}
              intensities={intensities}
            />
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-black/12 bg-[#f8fafc] p-6 text-center">
              <WandSparkles size={34} className="text-[#64748b]" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-semibold">Simulation not generated yet</h3>
              <p className="mt-2 max-w-sm text-sm leading-6" style={{ color: "var(--on-card-variant)" }}>
                Run simulation using the latest stored selfie and the intensity controls.
              </p>
              <button
                type="button"
                onClick={runSimulation}
                disabled={isLoading || isSimulating || !Object.keys(intensities).length}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSimulating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <WandSparkles size={16} aria-hidden="true" />}
                Run simulation
              </button>
              {!latestScan?.selfie_url && !isLoading && (
                <Link href="/capture" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold">
                  <Camera size={16} aria-hidden="true" />
                  Capture scan
                </Link>
              )}
            </div>
          )}
        </div>

        <IntensitySliders intensities={intensities} onChange={setManualIntensities} />
      </section>

      <ProductRecommendations groups={productGroups} isLoading={isLoading} />
    </div>
  );
}
