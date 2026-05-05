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
    <section className="surface-card overflow-hidden rounded-[1.25rem] border border-black/8 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps">Skin Summary</p>
          <h2 className="section-display mt-2 text-xl sm:text-2xl">Today&apos;s baseline</h2>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-3 py-1.5 text-sm">
            <TrendIcon size={16} style={{ color: meta.color }} />
            <span className="ui-title" style={{ color: meta.color }}>{meta.label}</span>
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
        <div className="surface-subcard rounded-2xl border border-black/6 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--on-surface-muted)" }}>
            Skin Age
          </p>
          <p className="metric-display mt-2 text-2xl">{summary?.skinAge ?? "--"}</p>
        </div>
        <div className="surface-subcard rounded-2xl border border-black/6 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--on-surface-muted)" }}>
            Last Scan
          </p>
          <p className="ui-title mt-2 flex items-center gap-2 text-sm">
            <CalendarDays size={16} />
            {formatScanDate(summary?.lastScanDate ?? null)}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <p className="ui-title text-sm">Top focus areas</p>
        {summary?.topConcerns.length ? (
          summary.topConcerns.map((concern) => (
            <div key={concern.name} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
              <span className="ui-title">{concern.name}</span>
              <span className="ui-title">{concern.score}</span>
              <div className="col-span-2 h-2 overflow-hidden rounded-full bg-black/8">
                <div
                  className="h-full rounded-full bg-[#111827] transition-all duration-500"
                  style={{ width: `${Math.max(4, Math.min(100, concern.score))}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="surface-subcard rounded-2xl border border-black/6 p-4 text-sm" style={{ color: "var(--on-card-variant)" }}>
            Capture a skin scan to populate score history and trend guidance.
          </p>
        )}
      </div>
    </section>
  );
}
