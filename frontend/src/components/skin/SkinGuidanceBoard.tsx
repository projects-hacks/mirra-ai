"use client";

import { Activity, Brain, CloudSun, ShoppingBag } from "lucide-react";
import type { ProductRecommendationGroup, SkinDailySuggestion } from "@/hooks/useSkinAnalysis";
import type { AgentInsight, SkinConcern } from "@/types";

interface SkinGuidanceBoardProps {
  concerns: SkinConcern[];
  insight: AgentInsight | null;
  productGroups: ProductRecommendationGroup[];
  suggestions: SkinDailySuggestion[];
  isLoading?: boolean;
}

export default function SkinGuidanceBoard({
  concerns,
  insight,
  productGroups,
  suggestions,
  isLoading = false,
}: Readonly<SkinGuidanceBoardProps>) {
  const concernCount = concerns.length;
  const aiReady = Boolean(insight);
  const productCount = productGroups.reduce((sum, group) => sum + group.products.length, 0);

  return (
    <section className="surface-card rounded-[1.25rem] border border-black/8 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps">Action Plan</p>
          <h2 className="section-display mt-2 text-xl sm:text-2xl">How Mirra builds guidance</h2>
          <p className="body-copy mt-2 text-sm" style={{ color: "var(--on-card-variant)" }}>
            Perfect Corp scores establish baseline health, AI explains patterns, and shopping results map to top concerns.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="surface-subcard rounded-2xl border border-black/6 p-4">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#334155]">
            <Activity size={14} aria-hidden="true" />
            Scan signal
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#111827]">{isLoading ? "--" : concernCount}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--on-card-muted)" }}>Concerns mapped from latest scan</p>
        </div>
        <div className="surface-subcard rounded-2xl border border-black/6 p-4">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#334155]">
            <Brain size={14} aria-hidden="true" />
            AI reasoning
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#111827]">{isLoading ? "--" : aiReady ? "Ready" : "Pending"}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--on-card-muted)" }}>Insight + next actions from trend context</p>
        </div>
        <div className="surface-subcard rounded-2xl border border-black/6 p-4">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#334155]">
            <ShoppingBag size={14} aria-hidden="true" />
            Products
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#111827]">{isLoading ? "--" : productCount}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--on-card-muted)" }}>Serper results matched to concern queries</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-black/6 p-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold">
          <CloudSun size={16} aria-hidden="true" />
          Daily suggestions
        </p>
        {isLoading ? (
          <p className="mt-3 text-sm" style={{ color: "var(--on-card-variant)" }}>Compiling scan and context suggestions…</p>
        ) : suggestions.length ? (
          <ul className="mt-3 space-y-2">
            {suggestions.map((item) => (
              <li key={`${item.source}-${item.title}`} className="rounded-xl bg-white px-3 py-2 text-sm">
                <span className="font-semibold text-[#0f172a]">{item.title}</span>
                <p className="mt-0.5 text-xs" style={{ color: "var(--on-card-muted)" }}>{item.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm" style={{ color: "var(--on-card-variant)" }}>
            Capture a scan to generate daily guidance.
          </p>
        )}
      </div>
    </section>
  );
}
