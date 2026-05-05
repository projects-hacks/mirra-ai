"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays } from "lucide-react";
import RadialProgress from "@/components/ui/RadialProgress";
import type { SkinSummary } from "@/types";

interface SkinSummaryCardProps {
  summary: SkinSummary | null;
  isLoading?: boolean;
}

const TREND_META = {
  improving: { label: "Improving", icon: ArrowUpRight, color: "#15803d" },
  declining: { label: "Needs attention", icon: ArrowDownRight, color: "#b91c1c" },
  stable: { label: "Stable", icon: ArrowRight, color: "#475569" },
  no_data: { label: "No scan yet", icon: ArrowRight, color: "#64748b" },
} as const;

function formatScanDate(value: string | null) {
  if (!value) return "No scan recorded";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export default function SkinSummaryCard({ summary, isLoading = false }: Readonly<SkinSummaryCardProps>) {
  const trend = summary?.trend ?? "no_data";
  const meta = TREND_META[trend];
  const TrendIcon = meta.icon;
  const score = summary?.overallScore ?? 0;

  return (
    <section className="glass-card overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps">Skin Summary</p>
          <h2 className="mt-2 text-2xl">Today&apos;s baseline</h2>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-sm">
            <TrendIcon size={16} style={{ color: meta.color }} />
            <span style={{ color: meta.color }}>{meta.label}</span>
          </div>
        </div>
        <RadialProgress
          value={isLoading ? 0 : score}
          size={92}
          strokeWidth={8}
          color={trend === "declining" ? "#dc2626" : "#111827"}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/55 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--on-surface-muted)" }}>
            Skin Age
          </p>
          <p className="mt-2 text-2xl font-semibold">{summary?.skinAge ?? "--"}</p>
        </div>
        <div className="rounded-2xl bg-white/55 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--on-surface-muted)" }}>
            Last Scan
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium">
            <CalendarDays size={16} />
            {formatScanDate(summary?.lastScanDate ?? null)}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-sm font-medium">Top focus areas</p>
        {summary?.topConcerns.length ? (
          summary.topConcerns.map((concern) => (
            <div key={concern.name} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
              <span>{concern.name}</span>
              <span className="font-semibold">{concern.score}</span>
              <div className="col-span-2 h-2 overflow-hidden rounded-full bg-black/8">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                  style={{ width: `${Math.max(4, Math.min(100, concern.score))}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-white/50 p-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
            Capture a skin scan to populate score history and trend guidance.
          </p>
        )}
      </div>
    </section>
  );
}
