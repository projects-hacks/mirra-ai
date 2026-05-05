"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Route, Sparkles, TriangleAlert } from "lucide-react";
import type { AgentInsight, AgentStep } from "@/types";

interface AgentInsightCardProps {
  insight: AgentInsight | null;
  isLoading: boolean;
  onRecommendationTap?: (action: string) => void;
}

function StepIcon({ step, visible }: Readonly<{ step: AgentStep; visible: boolean }>) {
  if (!visible || step.status === "running" || step.status === "pending") {
    return <Loader2 size={16} className="animate-spin" />;
  }
  if (step.status === "error") {
    return <TriangleAlert size={16} className="text-amber-300" />;
  }
  return <Check size={16} className="text-emerald-300" />;
}

export default function AgentInsightCard({
  insight,
  isLoading,
  onRecommendationTap,
}: Readonly<AgentInsightCardProps>) {
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    if (!insight?.steps.length) return;

    const timeouts = insight.steps.map((_, index) =>
      window.setTimeout(() => {
        setVisibleSteps((current) => Math.max(current, index + 1));
      }, 260 * (index + 1))
    );

    return () => {
      timeouts.forEach(window.clearTimeout);
    };
  }, [insight]);

  if (isLoading) {
    return (
      <section className="rounded-[1.5rem] bg-[#151719] p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-3">
          <Loader2 size={18} className="animate-spin" />
          <p className="text-sm text-white/70">Loading dashboard context...</p>
        </div>
      </section>
    );
  }

  if (!insight) {
    return (
      <section className="rounded-[1.5rem] bg-[#151719] p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-start gap-3">
          <Sparkles size={20} className="mt-1 text-white/70" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Mirra Agent</p>
            <h2 className="mt-2 text-2xl text-white">Scan context pending</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Run a skin scan to unlock trend-aware guidance across skin, glowup, and try-on flows.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const stepsComplete = visibleSteps >= insight.steps.length;

  return (
    <section className="rounded-[1.5rem] bg-[#151719] p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Mirra Agent</p>
          <h2 className="mt-2 text-2xl text-white">Reasoning trace</h2>
        </div>
        <Route size={22} className="text-white/50" />
      </div>

      <div className="mt-5 space-y-3">
        {insight.steps.map((step, index) => {
          const visible = index < visibleSteps;
          return (
            <div
              key={`${step.text}-${index}`}
              className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-sm transition-all duration-300"
              style={{ opacity: visible ? 1 : 0.35, transform: visible ? "translateY(0)" : "translateY(4px)" }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
                <StepIcon step={step} visible={visible} />
              </span>
              <span className="leading-5 text-white/82">{step.text}</span>
            </div>
          );
        })}
      </div>

      <div
        className="mt-5 border-t border-white/12 pt-5 transition-all duration-500"
        style={{ opacity: stepsComplete ? 1 : 0.2 }}
      >
        <p className="text-base leading-7 text-white/86">{insight.insight}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {insight.recommendations.map((recommendation) => (
            <button
              key={recommendation.title}
              type="button"
              onClick={() => recommendation.action && onRecommendationTap?.(recommendation.action)}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#151719] transition-transform hover:-translate-y-0.5"
            >
              {recommendation.title}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-white/45">
          Tools used: {insight.toolsUsed.length ? insight.toolsUsed.join(", ") : "dashboard context"}
        </p>
      </div>
    </section>
  );
}
