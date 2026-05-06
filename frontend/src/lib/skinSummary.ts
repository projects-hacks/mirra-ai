import type { AgentInsight, SkinConcern, SkinSummary, WeatherInfo } from "@/types";
import type { SkinHistoryRow } from "@/lib/api";
import { extractOverallSkinScore, normalizeSkinConcerns } from "@/lib/skinScoring";

function summarizeTrend(
  currentOverallScore: number,
  previousConcerns: SkinConcern[]
): SkinSummary["trend"] {
  if (!previousConcerns.length) return "stable";

  const previousOverallScore = Math.round(
    previousConcerns.reduce((sum, concern) => sum + concern.score, 0) / previousConcerns.length
  );
  const delta = currentOverallScore - previousOverallScore;

  if (delta > 3) return "improving";
  if (delta < -3) return "declining";
  return "stable";
}

export function summarizeSkinHistory(
  history: SkinHistoryRow[],
  concerns: SkinConcern[]
): SkinSummary {
  const latest = history[0];

  if (!latest) {
    return {
      overallScore: 0,
      skinAge: null,
      lastScanDate: null,
      trend: "no_data",
      topConcerns: [],
    };
  }

  const overallScore = extractOverallSkinScore(latest.scores, concerns);

  return {
    overallScore,
    skinAge: latest.skin_age ?? null,
    lastScanDate: latest.created_at ?? null,
    trend: summarizeTrend(overallScore, history.length > 1 ? normalizeSkinConcerns(history[1]?.scores) : []),
    topConcerns: concerns.slice(0, 3).map((concern) => ({ name: concern.label, score: concern.score })),
  };
}

export function buildSkinSummaryFromHistory(history: SkinHistoryRow[]) {
  const concerns = normalizeSkinConcerns(history[0]?.scores);
  return {
    concerns,
    summary: summarizeSkinHistory(history, concerns),
  };
}

export function buildDashboardInsight(
  summary: SkinSummary,
  weather: WeatherInfo | null
): AgentInsight | null {
  if (summary.trend === "no_data") return null;

  const lowestConcern = summary.topConcerns[0];
  const weatherStep = weather
    ? `Checked ${weather.location}: ${Math.round(weather.temp)}°F and ${weather.humidity}% humidity.`
    : "Weather context is unavailable.";
  const concernText = lowestConcern
    ? `${lowestConcern.name} is your lowest score at ${lowestConcern.score}/100.`
    : "Your scan has enough signal for a baseline.";

  return {
    steps: [
      { icon: "scan", text: "Loaded your latest skin scan.", status: "done" },
      { icon: "weather", text: weatherStep, status: weather ? "done" : "error" },
      { icon: "history", text: concernText, status: "done" },
    ],
    insight: lowestConcern
      ? `Your next best move is to focus on ${lowestConcern.name.toLowerCase()} while keeping the rest of your routine stable.`
      : "Your dashboard is ready for the next scan. Add more history to unlock trend-based guidance.",
    recommendations: [
      {
        title: "Open Skin Health",
        description: "Review the latest scores and decide whether to simulate improvement.",
        action: "/skin",
      },
      {
        title: "Plan a GlowUp",
        description: "Use face and tone analysis to build a more complete look.",
        action: "/glowup",
      },
    ],
    toolsUsed: ["skin-history", ...(weather ? ["weather"] : [])],
  };
}
