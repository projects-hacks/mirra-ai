"use client";

import { useEffect, useMemo, useState } from "react";
import { skinApi, weatherApi, type SkinHistoryRow } from "@/lib/api";
import type { AgentInsight, SkinSummary, VTOResult, WeatherInfo } from "@/types";

const CONCERN_LABELS: Record<string, string> = {
  acne: "Acne",
  wrinkle: "Wrinkles",
  pore: "Pores",
  texture: "Texture",
  moisture: "Moisture",
  oiliness: "Oiliness",
  redness: "Redness",
  radiance: "Radiance",
  firmness: "Firmness",
  dark_circle: "Dark Circles",
  dark_circle_v2: "Dark Circles",
  eye_bag: "Eye Bags",
  age_spot: "Spots",
};

function extractScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const candidate = record.ui_score ?? record.raw_score ?? record.score;
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
}

function summarizeScan(scan: SkinHistoryRow | null, previous?: SkinHistoryRow | null): SkinSummary {
  if (!scan?.scores) {
    return {
      overallScore: 0,
      skinAge: null,
      lastScanDate: null,
      trend: "no_data",
      topConcerns: [],
    };
  }

  const concerns = Object.entries(scan.scores)
    .map(([key, value]) => ({ key, score: extractScore(value) }))
    .filter((item): item is { key: string; score: number } => item.score !== null);

  const overallScore = concerns.length
    ? Math.round(concerns.reduce((sum, item) => sum + item.score, 0) / concerns.length)
    : 0;

  let trend: SkinSummary["trend"] = "stable";
  if (previous?.scores) {
    const previousSummary = summarizeScan(previous, null);
    const delta = overallScore - previousSummary.overallScore;
    if (delta > 3) trend = "improving";
    else if (delta < -3) trend = "declining";
  }

  return {
    overallScore,
    skinAge: scan.skin_age ?? null,
    lastScanDate: scan.created_at ?? null,
    trend,
    topConcerns: concerns
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(({ key, score }) => ({
        name: CONCERN_LABELS[key] ?? key.replaceAll("_", " "),
        score: Math.round(score),
      })),
  };
}

function buildInsight(summary: SkinSummary, weather: WeatherInfo | null): AgentInsight | null {
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
      { emoji: "✓", text: "Loaded your latest skin scan.", status: "done" },
      { emoji: "✓", text: weatherStep, status: weather ? "done" : "error" },
      { emoji: "✓", text: concernText, status: "done" },
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

export function useDashboard() {
  const [skinSummary, setSkinSummary] = useState<SkinSummary | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [insight, setInsight] = useState<AgentInsight | null>(null);
  const [recentLooks] = useState<VTOResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      const [historyResult, weatherResult] = await Promise.allSettled([
        skinApi.history(),
        weatherApi.current(),
      ]);

      if (cancelled) return;

      const history = historyResult.status === "fulfilled" ? historyResult.value : [];
      const weatherInfo = weatherResult.status === "fulfilled" ? weatherResult.value : null;
      const summary = summarizeScan(history[0] ?? null, history[1] ?? null);

      setSkinSummary(summary);
      setWeather(weatherInfo);
      setInsight(buildInsight(summary, weatherInfo));

      if (historyResult.status === "rejected" && weatherResult.status === "rejected") {
        setError("Dashboard data is unavailable right now.");
      }

      setIsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({ skinSummary, weather, insight, recentLooks, isLoading, error }),
    [skinSummary, weather, insight, recentLooks, isLoading, error]
  );
}
