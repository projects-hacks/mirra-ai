"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain,
  Check,
  CheckCircle2,
  CloudSun,
  Cpu,
  History,
  Loader2,
  Palette,
  Puzzle,
  Route,
  ScanFace,
  Search,
  Shirt,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { AgentInsight, AgentStep } from "@/types";

interface AgentInsightCardProps {
  insight: AgentInsight | null;
  isLoading: boolean;
  onRecommendationTap?: (action: string) => void;
}

const STEP_ICONS: Record<AgentStep["icon"], LucideIcon> = {
  scan: Search,
  weather: CloudSun,
  history: History,
  palette: Palette,
  face: ScanFace,
  sparkle: Sparkles,
  closet: Shirt,
  gap: Puzzle,
  check: CheckCircle2,
};

function StepIcon({ step, visible }: Readonly<{ step: AgentStep; visible: boolean }>) {
  if (!visible || step.status === "running" || step.status === "pending") {
    return <Loader2 size={16} className="animate-spin" />;
  }
  if (step.status === "error") {
    return <TriangleAlert size={16} className="text-amber-300" />;
  }
  const Icon = STEP_ICONS[step.icon] ?? Check;
  return <Icon size={16} className="text-emerald-300" />;
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
      <section className="rounded-[1.25rem] bg-[#111827] p-5 text-white shadow-[0_18px_46px_rgba(17,24,39,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/78">
            <Cpu size={14} aria-hidden="true" />
            AI processing
          </div>
          <Loader2 size={16} className="animate-spin text-white/70" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-10 rounded-xl bg-white/10" />
          <div className="h-10 rounded-xl bg-white/10" />
          <div className="h-10 rounded-xl bg-white/10" />
        </div>
      </section>
    );
  }

  if (!insight) {
    return (
      <section className="rounded-[1.25rem] bg-[#111827] p-5 text-white shadow-[0_18px_46px_rgba(17,24,39,0.18)]">
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
  const recommendationClassName = "min-h-10 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#111827] transition-transform hover:-translate-y-0.5";

  return (
    <section className="rounded-[1.25rem] bg-[#111827] p-5 text-white shadow-[0_18px_46px_rgba(17,24,39,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/78">
            <Brain size={14} aria-hidden="true" />
            AI reasoning active
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">Reasoning trace</h2>
          <p className="mt-2 text-xs text-white/60">
            Mirra combines live skin signal, weather, and history to suggest your next best action.
          </p>
        </div>
        <Route size={22} className="text-white/50" />
      </div>

      <div className="mt-5 space-y-3">
        {insight.steps.map((step, index) => {
          const visible = index < visibleSteps;
          return (
            <div
              key={`${step.text}-${index}`}
              className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-sm ring-1 ring-white/8 transition-all duration-300"
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
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/52">How AI helps now</p>
        <p className="text-base leading-7 text-white/86">{insight.insight}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {insight.recommendations.map((recommendation) => {
            if (!recommendation.action) {
              return (
                <span key={recommendation.title} className={recommendationClassName}>
                  {recommendation.title}
                </span>
              );
            }

            if (onRecommendationTap) {
              return (
                <button
                  key={recommendation.title}
                  type="button"
                  onClick={() => onRecommendationTap(recommendation.action as string)}
                  className={recommendationClassName}
                >
                  {recommendation.title}
                </button>
              );
            }

            return (
              <Link key={recommendation.title} href={recommendation.action} className={recommendationClassName}>
                {recommendation.title}
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[0.68rem] uppercase tracking-[0.14em] text-white/45">Signals:</span>
          {(insight.toolsUsed.length ? insight.toolsUsed : ["dashboard context"]).map((tool) => (
            <span
              key={tool}
              className="rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[0.68rem] text-white/72"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
