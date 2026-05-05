"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { productsApi, skinApi, weatherApi, type SkinHistoryRow } from "@/lib/api";
import {
  CONCERN_PRODUCT_QUERIES,
  deriveSimulationIntensities,
  normalizeSkinConcerns,
} from "@/lib/skinScoring";
import type { AgentInsight, Product, SkinConcern, SkinSummary, SkinToneData, WeatherInfo } from "@/types";

interface BodyModelRow {
  skin_tone?: SkinToneData | string | null;
  face_shape?: Record<string, unknown> | string | null;
}

interface BodyModelQueryResult {
  data: BodyModelRow | null;
}

export interface ProductRecommendationGroup {
  concern: SkinConcern;
  query: string;
  products: Product[];
}

function parseMaybeJson<T>(value: T | string | null | undefined): T | null {
  if (!value) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function summarize(history: SkinHistoryRow[], concerns: SkinConcern[]): SkinSummary {
  const latest = history[0];
  const overallScore = concerns.length
    ? Math.round(concerns.reduce((sum, concern) => sum + concern.score, 0) / concerns.length)
    : 0;

  const previousConcerns = normalizeSkinConcerns(history[1]?.scores);
  let trend: SkinSummary["trend"] = history.length ? "stable" : "no_data";
  if (previousConcerns.length) {
    const previousOverall = Math.round(previousConcerns.reduce((sum, concern) => sum + concern.score, 0) / previousConcerns.length);
    const delta = overallScore - previousOverall;
    if (delta > 3) trend = "improving";
    else if (delta < -3) trend = "declining";
  }

  return {
    overallScore,
    skinAge: latest?.skin_age ?? null,
    lastScanDate: latest?.created_at ?? null,
    trend,
    topConcerns: concerns.slice(0, 3).map((concern) => ({ name: concern.label, score: concern.score })),
  };
}

function normalizeInsight(result: unknown): AgentInsight | null {
  if (!result || typeof result !== "object") return null;
  const record = result as AgentInsight & { tool_calls_made?: string[] };
  if (!Array.isArray(record.steps) || typeof record.insight !== "string") return null;
  return {
    steps: record.steps,
    insight: record.insight,
    recommendations: Array.isArray(record.recommendations) ? record.recommendations : [],
    toolsUsed: record.toolsUsed ?? record.tool_calls_made ?? [],
  };
}

export function useSkinAnalysis() {
  const [history, setHistory] = useState<SkinHistoryRow[]>([]);
  const [skinTone, setSkinTone] = useState<SkinToneData | null>(null);
  const [faceShape, setFaceShape] = useState<Record<string, unknown> | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [insight, setInsight] = useState<AgentInsight | null>(null);
  const [productGroups, setProductGroups] = useState<ProductRecommendationGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("Sign in to view skin analysis.");
        setIsLoading(false);
        return;
      }

      const bodyRequest = supabase
        .from("body_model")
        .select("skin_tone, face_shape")
        .eq("user_id", session.user.id)
        .single() as unknown as Promise<BodyModelQueryResult>;

      const [historyResult, weatherResult, bodyResult, insightResult] = await Promise.allSettled([
        skinApi.history(),
        weatherApi.current(),
        bodyRequest,
        skinApi.insights(),
      ]);

      if (cancelled) return;

      const skinHistory = historyResult.status === "fulfilled" ? historyResult.value : [];
      const concerns = normalizeSkinConcerns(skinHistory[0]?.scores);
      const topConcerns = concerns.slice(0, 3);

      setHistory(skinHistory);
      setWeather(weatherResult.status === "fulfilled" ? weatherResult.value : null);
      setInsight(insightResult.status === "fulfilled" ? normalizeInsight(insightResult.value) : null);

      if (bodyResult.status === "fulfilled" && bodyResult.value.data) {
        const body = bodyResult.value.data as BodyModelRow;
        setSkinTone(parseMaybeJson<SkinToneData>(body.skin_tone));
        setFaceShape(parseMaybeJson<Record<string, unknown>>(body.face_shape));
      }

      const productResults = await Promise.allSettled(
        topConcerns.map(async (concern) => {
          const query = CONCERN_PRODUCT_QUERIES[concern.key] ?? `${concern.label} skincare product`;
          const result = await productsApi.search(query);
          return { concern, query, products: result.products };
        })
      );

      if (!cancelled) {
        setProductGroups(productResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []));
        if (historyResult.status === "rejected") {
          setError("Skin history is unavailable right now.");
        }
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const concerns = useMemo(() => normalizeSkinConcerns(history[0]?.scores), [history]);
  const summary = useMemo(() => summarize(history, concerns), [history, concerns]);
  const intensities = useMemo(() => deriveSimulationIntensities(history[0]?.scores), [history]);

  return {
    history,
    latestScan: history[0] ?? null,
    scores: history[0]?.scores ?? null,
    concerns,
    summary,
    skinTone,
    faceShape,
    weather,
    insight,
    productGroups,
    intensities,
    isLoading,
    error,
  };
}
