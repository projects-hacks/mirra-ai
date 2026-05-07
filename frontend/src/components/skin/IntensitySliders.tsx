"use client";

import { useMemo, useState } from "react";

interface IntensitySlidersProps {
  intensities: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  isLoading?: boolean;
}

function labelFor(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function IntensitySliders({
  intensities,
  onChange,
  isLoading = false,
}: Readonly<IntensitySlidersProps>) {
  const [showAll, setShowAll] = useState(false);
  const sortedEntries = useMemo(
    () => Object.entries(intensities).sort((a, b) => b[1] - a[1]),
    [intensities]
  );
  const visibleEntries = showAll ? sortedEntries : sortedEntries.slice(0, 5);
  const hiddenCount = sortedEntries.length - visibleEntries.length;

  if (isLoading) {
    return (
      <section className="rounded-[1.25rem] border border-black/8 bg-white/78 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
        <p className="label-caps">Simulation</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Intensity controls</h2>
        <div className="mt-6 space-y-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-3/5 max-w-[200px] animate-pulse rounded bg-black/10" />
              <div className="h-2 w-full animate-pulse rounded-full bg-black/10" />
            </div>
          ))}
          <p className="text-sm" style={{ color: "var(--on-card-variant)" }}>
            Loading settings from your latest scan…
          </p>
        </div>
      </section>
    );
  }

  if (sortedEntries.length === 0) {
    return (
      <section className="rounded-[1.25rem] border border-black/8 bg-white/78 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
        <p className="label-caps">Simulation</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Intensity controls</h2>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--on-card-variant)" }}>
          Complete a skin scan first so we can suggest simulation intensities for your concerns.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.25rem] border border-black/8 bg-white/78 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
      <p className="label-caps">Simulation</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Intensity controls</h2>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--on-card-variant)" }}>
        Higher values apply stronger correction. Sliders are ordered by impact (highest first).
      </p>
      <div className="mt-5 space-y-4">
        {visibleEntries.map(([key, value]) => (
          <label key={key} className="block">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{labelFor(key)}</span>
              <span style={{ color: "var(--on-card-variant)" }}>{value.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={value}
              onChange={(event) => onChange({ ...intensities, [key]: Number(event.target.value) })}
              className="w-full accent-[#111827]"
            />
          </label>
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 text-sm font-semibold text-[#111827] underline decoration-black/30 underline-offset-4 hover:decoration-black/60"
        >
          {showAll ? "Show fewer" : `Show all ${sortedEntries.length} channels (${hiddenCount} more)`}
        </button>
      )}
    </section>
  );
}
