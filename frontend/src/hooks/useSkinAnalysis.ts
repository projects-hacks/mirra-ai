"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatApiError, productsApi, skinApi, weatherApi, type SkinHistoryRow } from "@/lib/api";
import {
  CONCERN_PRODUCT_QUERIES,
  deriveSimulationIntensities,
} from "@/lib/skinScoring";
import { buildSkinSummaryFromHistory } from "@/lib/skinSummary";
import { resolveUserLocation } from "@/lib/userContext";
import type { AgentInsight, Product, SkinConcern, SkinToneData, WeatherInfo } from "@/types";

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
  status: "loaded" | "empty" | "error";
  error?: string;
}

export interface SkinDailySuggestion {
  title: string;
  detail: string;
  source: "provider" | "weather" | "agent";
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

      const userLocation = await resolveUserLocation(session.user.id);

      const bodyRequest = supabase
        .from("body_model")
        .select("skin_tone, face_shape")
        .eq("user_id", session.user.id)
        .single() as unknown as Promise<BodyModelQueryResult>;

      const [historyResult, weatherResult, bodyResult, insightResult] = await Promise.allSettled([
        skinApi.history(),
        weatherApi.current(userLocation),
        bodyRequest,
        skinApi.insights(),
      ]);

      if (cancelled) return;

      const skinHistory = historyResult.status === "fulfilled" ? historyResult.value : [];
      const { concerns } = buildSkinSummaryFromHistory(skinHistory);
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
          try {
            const result = await productsApi.search(query);
            const products = result.products ?? [];
            return {
              concern,
              query,
              products,
              status: products.length ? "loaded" : "empty",
            } satisfies ProductRecommendationGroup;
          } catch (productError) {
            return {
              concern,
              query,
              products: [],
              status: "error",
              error: formatApiError(productError, "Product search failed."),
            } satisfies ProductRecommendationGroup;
          }
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

  const { concerns, summary } = useMemo(() => buildSkinSummaryFromHistory(history), [history]);
  const intensities = useMemo(() => deriveSimulationIntensities(history[0]?.scores), [history]);
  const dailySuggestions = useMemo<SkinDailySuggestion[]>(() => {
    const items: SkinDailySuggestion[] = [];

    concerns.slice(0, 2).forEach((concern) => {
      items.push({
        title: `Focus ${concern.label}`,
        detail: concern.score < 60
          ? `${concern.label} is below 60/100. Prioritize targeted products and track changes in your next scan.`
          : `${concern.label} is stable. Maintain your routine and avoid over-correcting.`,
        source: "provider",
      });
    });

    if (weather?.aiTip) {
      items.push({
        title: "Daily weather adjustment",
        detail: weather.aiTip,
        source: "weather",
      });
    }

    if (insight?.recommendations?.length) {
      const top = insight.recommendations[0];
      items.push({
        title: top.title,
        detail: top.description,
        source: "agent",
      });
    }

    return items.slice(0, 4);
  }, [concerns, weather, insight]);

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
    dailySuggestions,
    intensities,
    isLoading,
    error,
  };
}
