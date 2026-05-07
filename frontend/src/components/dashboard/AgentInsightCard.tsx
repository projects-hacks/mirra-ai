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
  /** Match Mirra glass / Nebula surfaces (e.g. GlowUp). Default keeps the slate dashboard card. */
  variant?: "slate" | "nebula";
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

type ActionKind = "internal" | "external" | "none";

function classifyAction(action: string | undefined | null): { kind: ActionKind; href: string | null } {
  if (typeof action !== "string") return { kind: "none", href: null };
  const trimmed = action.trim();
  if (!trimmed) return { kind: "none", href: null };
  if (trimmed.startsWith("/")) return { kind: "internal", href: trimmed };
  if (/^https?:\/\//i.test(trimmed)) return { kind: "external", href: trimmed };
  return { kind: "none", href: null };
}

function StepIcon({ step, visible, nebula }: Readonly<{ step: AgentStep; visible: boolean; nebula: boolean }>) {
  if (!visible || step.status === "running" || step.status === "pending") {
    return (
      <Loader2
        size={16}
        className={nebula ? "animate-spin text-[var(--primary)]" : "animate-spin text-white/70"}
      />
    );
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
  variant = "slate",
}: Readonly<AgentInsightCardProps>) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const nebula = variant === "nebula";

  const sectionShell = nebula
    ? "glass-card rounded-[1.75rem] border border-white/[0.1] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)] ring-1 ring-inset ring-white/[0.04] sm:p-6 md:p-8"
    : "rounded-[1.25rem] bg-[#111827] p-5 text-white shadow-[0_18px_46px_rgba(17,24,39,0.18)]";

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
    const badgeClass = nebula
      ? "inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--on-surface-muted)]"
      : "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/78";
    const skeletonClass = nebula ? "h-10 rounded-xl bg-white/[0.08]" : "h-10 rounded-xl bg-white/10";

    return (
      <section className={sectionShell}>
        <div className="flex items-center justify-between gap-3">
          <div className={badgeClass}>
            <Cpu size={14} aria-hidden="true" />
            AI processing
          </div>
          <Loader2 size={16} className={nebula ? "animate-spin text-[var(--primary)]" : "animate-spin text-white/70"} />
        </div>
        <div className="mt-4 space-y-3">
          <div className={skeletonClass} />
          <div className={skeletonClass} />
          <div className={skeletonClass} />
        </div>
      </section>
    );
  }

  if (!insight) {
    return (
      <section className={sectionShell}>
        <div className="flex items-start gap-3">
          <Sparkles size={20} className={nebula ? "mt-1 text-[var(--primary)]" : "mt-1 text-white/70"} />
          <div>
            <p
              className={`text-sm font-semibold uppercase tracking-[0.18em] ${nebula ? "text-[var(--on-surface-muted)]" : "text-white/50"}`}
            >
              Mirra Agent
            </p>
            <h2
              className={`mt-2 text-2xl ${nebula ? "text-[var(--on-surface)]" : "text-white"}`}
              style={nebula ? { fontFamily: "var(--font-serif)" } : undefined}
            >
              Scan context pending
            </h2>
            <p className={`mt-3 text-sm leading-6 ${nebula ? "text-[var(--on-surface-variant)]" : "text-white/70"}`}>
              Run a skin scan to unlock trend-aware guidance across skin, glowup, and try-on flows.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const stepsComplete = visibleSteps >= insight.steps.length;
  const recommendationSlate = "min-h-10 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#111827] transition-transform hover:-translate-y-0.5";
  const recommendationNebula =
    "min-h-10 rounded-full border border-[var(--primary)]/40 bg-[var(--primary)]/14 px-4 py-2 text-sm font-semibold text-[var(--on-surface)] shadow-[0_4px_20px_rgba(139,92,246,0.12)] transition hover:border-[var(--primary)]/55 hover:bg-[var(--primary)]/22";
  const recommendationClassName = nebula ? recommendationNebula : recommendationSlate;

  const badgeClass = nebula
    ? "inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--on-surface-muted)]"
    : "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/78";

  const stepRowClass = nebula
    ? "flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm ring-1 ring-inset ring-white/[0.04] transition-all duration-300"
    : "flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-sm ring-1 ring-white/8 transition-all duration-300";

  const routeClass = nebula ? "text-[var(--on-surface-muted)]" : "text-white/50";

  return (
    <section className={sectionShell}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={badgeClass}>
            <Brain size={14} aria-hidden="true" />
            AI reasoning active
          </div>
          <h2
            className={`mt-2 text-xl font-semibold tracking-tight sm:text-2xl ${nebula ? "text-[var(--on-surface)]" : "text-white"}`}
            style={nebula ? { fontFamily: "var(--font-serif)" } : undefined}
          >
            Reasoning trace
          </h2>
          <p className={`mt-2 text-xs ${nebula ? "text-[var(--on-surface-variant)]" : "text-white/60"}`}>
            Mirra combines live skin signal, weather, and history to suggest your next best action.
          </p>
        </div>
        <Route size={22} className={routeClass} />
      </div>

      <div className="mt-5 space-y-3">
        {insight.steps.map((step, index) => {
          const visible = index < visibleSteps;
          return (
            <div
              key={`${step.text}-${index}`}
              className={stepRowClass}
              style={{ opacity: visible ? 1 : 0.35, transform: visible ? "translateY(0)" : "translateY(4px)" }}
            >
              <span
                className={
                  nebula
                    ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08]"
                    : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10"
                }
              >
                <StepIcon step={step} visible={visible} nebula={nebula} />
              </span>
              <span className={`leading-5 ${nebula ? "text-[var(--on-surface)]" : "text-white/82"}`}>
                {step.text}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className={`mt-5 border-t pt-5 transition-all duration-500 ${nebula ? "border-white/10" : "border-white/12"}`}
        style={{ opacity: stepsComplete ? 1 : 0.2 }}
      >
        <p
          className={`text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${nebula ? "text-[var(--on-surface-muted)]" : "text-white/52"}`}
        >
          How AI helps now
        </p>
        <p className={`text-base leading-7 ${nebula ? "text-[var(--on-surface)]" : "text-white/86"}`}>{insight.insight}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {insight.recommendations.map((recommendation) => {
            const { kind, href } = classifyAction(recommendation.action);

            // Tap handler always wins, regardless of the action shape.
            if (recommendation.action && onRecommendationTap) {
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

            if (kind === "internal" && href) {
              return (
                <Link key={recommendation.title} href={href} className={recommendationClassName}>
                  {recommendation.title}
                </Link>
              );
            }

            if (kind === "external" && href) {
              return (
                <a
                  key={recommendation.title}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={recommendationClassName}
                >
                  {recommendation.title}
                </a>
              );
            }

            // Unknown / free-text action (e.g. "view_matched_outfits") → render as a label
            // so Next.js never tries to RSC-prefetch a non-route.
            return (
              <span key={recommendation.title} className={recommendationClassName}>
                {recommendation.title}
              </span>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`text-[0.68rem] uppercase tracking-[0.14em] ${nebula ? "text-[var(--on-surface-muted)]" : "text-white/45"}`}
          >
            Signals:
          </span>
          {(insight.toolsUsed.length ? insight.toolsUsed : ["dashboard context"]).map((tool) => (
            <span
              key={tool}
              className={
                nebula
                  ? "rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[0.68rem] text-[var(--on-surface-variant)]"
                  : "rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[0.68rem] text-white/72"
              }
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
