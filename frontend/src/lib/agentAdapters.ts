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
