import type { AgentInsight, GlowupPlan } from "@/types";

function categoryAction(category: "makeup" | "hair" | "accessories"): string {
  switch (category) {
    case "makeup":
      return "tab:makeup";
    case "hair":
      return "tab:hair";
    case "accessories":
      return "tab:accessories";
    default:
      return "tab:makeup";
  }
}

export function glowupPlanToAgentInsight(plan: GlowupPlan | null): AgentInsight | null {
  if (!plan) return null;

  return {
    steps: plan.steps ?? [],
    insight: plan.insight,
    recommendations: (plan.recommendations ?? []).map((item) => ({
      title: item.title,
      description: item.why,
      action: categoryAction(item.category),
    })),
    toolsUsed: plan.tool_calls_made ?? [],
  };
}

export function tryOnPlanToAgentInsight(plan: GlowupPlan | null): AgentInsight | null {
  if (!plan) return null;

  const baseRecommendations = (plan.recommendations ?? []).map((item) => ({
    title: item.title,
    description: item.why,
    action: categoryAction(item.category),
  }));

  return {
    steps: plan.steps ?? [],
    insight: plan.insight,
    recommendations: [
      {
        title: "Clothes pass",
        description: "Use a full-body image to test the strongest garment direction before fine-tuning face-based try-on.",
        action: "tab:clothes",
      },
      ...baseRecommendations,
    ],
    toolsUsed: plan.tool_calls_made ?? [],
  };
}

/** Outfit `/match` returns `agent_insight` from Gemini (or fallback) — normalize for AgentInsightCard. */
export function outfitAgentInsightFromApi(payload: unknown): AgentInsight | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  const stepsRaw = raw.steps;
  const recRaw = raw.recommendations;
  const steps = Array.isArray(stepsRaw)
    ? stepsRaw.map((s) => {
        const step = s as Record<string, unknown>;
        const icon = typeof step.icon === "string" ? step.icon : "check";
        const allowed = ["scan", "weather", "history", "palette", "face", "sparkle", "closet", "gap", "check"];
        return {
          icon: (allowed.includes(icon) ? icon : "check") as AgentInsight["steps"][0]["icon"],
          text: String(step.text ?? ""),
          status: (typeof step.status === "string" ? step.status : "complete") as AgentInsight["steps"][0]["status"],
        };
      })
    : [];
  const recommendations = Array.isArray(recRaw)
    ? recRaw.map((r) => {
        const item = r as Record<string, unknown>;
        return {
          title: String(item.title ?? ""),
          description: String(item.description ?? item.why ?? ""),
          action: typeof item.action === "string" ? item.action : undefined,
        };
      })
    : [];
  return {
    steps,
    insight: String(raw.insight ?? ""),
    recommendations,
    toolsUsed: Array.isArray(raw.tool_calls_made) ? raw.tool_calls_made.map(String) : [],
  };
}
