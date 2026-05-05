"use client";

import { Activity, CircleDot, Droplets, Eye, Flame, Gauge, ScanLine, Sparkles, Sun, Waves } from "lucide-react";
import ScoreBar from "@/components/ui/ScoreBar";
import type { SkinConcern } from "@/types";

interface SkinConcernGridProps {
  concerns: SkinConcern[];
  onConcernTap?: (concern: SkinConcern) => void;
}

const ICONS = [Droplets, CircleDot, Waves, Flame, Sparkles, Eye, Gauge, Sun, Activity, ScanLine];

export default function SkinConcernGrid({ concerns, onConcernTap }: Readonly<SkinConcernGridProps>) {
  return (
    <section className="rounded-[1.25rem] border border-black/8 bg-white/78 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps">Concerns</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Priority map</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
            Scores are sorted from most actionable to strongest. Higher scores mean healthier skin.
          </p>
        </div>
      </div>

      {concerns.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {concerns.map((concern, index) => {
            const Icon = ICONS[index % ICONS.length];
            return (
              <button
                key={concern.key}
                type="button"
                onClick={() => onConcernTap?.(concern)}
                className="rounded-2xl border border-black/6 bg-[#f8fafc] p-4 text-left transition-transform hover:-translate-y-0.5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#111827] shadow-sm">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="font-medium">{concern.label}</span>
                </div>
                <ScoreBar label="Health score" value={concern.score} />
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-black/6 bg-[#f8fafc] p-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
          Capture a scan to populate your concern map.
        </p>
      )}
    </section>
  );
}
