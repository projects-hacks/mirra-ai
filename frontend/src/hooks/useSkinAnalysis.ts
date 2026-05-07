"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { getSupabase } from "@/lib/supabase";
import { useAppState } from "@/components/providers/AppProvider";
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

interface SkinAnalysisBundle {
  history: SkinHistoryRow[];
  skinTone: SkinToneData | null;
  faceShape: Record<string, unknown> | null;
  weather: WeatherInfo | null;
  insight: AgentInsight | null;
  productGroups: ProductRecommendationGroup[];
  historyError: boolean;
}

async function loadSkinAnalysisData(userId: string): Promise<SkinAnalysisBundle> {
  const userLocation = await resolveUserLocation(userId);

  const supabase = getSupabase();
  const bodyRequest = supabase
    .from("body_model")
    .select("skin_tone, face_shape")
    .eq("user_id", userId)
    .single() as unknown as Promise<BodyModelQueryResult>;

  const [historyResult, weatherResult, bodyResult, insightResult] = await Promise.allSettled([
    skinApi.history(),
    weatherApi.current(userLocation),
    bodyRequest,
    skinApi.insights(),
  ]);

  const skinHistory = historyResult.status === "fulfilled" ? historyResult.value : [];
  const { concerns } = buildSkinSummaryFromHistory(skinHistory);
  const topConcerns = concerns.slice(0, 3);

  let skinTone: SkinToneData | null = null;
  let faceShape: Record<string, unknown> | null = null;
  if (bodyResult.status === "fulfilled" && bodyResult.value.data) {
    const body = bodyResult.value.data as BodyModelRow;
    skinTone = parseMaybeJson<SkinToneData>(body.skin_tone);
    faceShape = parseMaybeJson<Record<string, unknown>>(body.face_shape);
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

  return {
    history: skinHistory,
    skinTone,
    faceShape,
    weather: weatherResult.status === "fulfilled" ? weatherResult.value : null,
    insight: insightResult.status === "fulfilled" ? normalizeInsight(insightResult.value) : null,
    productGroups: productResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []),
    historyError: historyResult.status === "rejected",
  };
}

export function useSkinAnalysis() {
  const { user } = useAppState();
  const userId = user?.id;

  const { data, error, isLoading, mutate } = useSWR(
    userId ? (["skin-analysis", userId] as const) : null,
    ([, uid]) => loadSkinAnalysisData(uid),
    { revalidateIfStale: false }
  );

  const history = data?.history ?? [];
  const historyError = data?.historyError ?? false;

  const { concerns, summary } = useMemo(() => buildSkinSummaryFromHistory(history), [history]);
  const intensities = useMemo(() => deriveSimulationIntensities(history[0]?.scores), [history]);
  const insight = data?.insight ?? null;
  const weather = data?.weather ?? null;
  const skinTone = data?.skinTone ?? null;
  const faceShape = data?.faceShape ?? null;
  const productGroups = data?.productGroups ?? [];

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

  const errorMessage = error
    ? formatApiError(error, "Skin analysis failed to load.")
    : historyError
      ? "Skin history is unavailable right now."
      : null;

  const loading = Boolean(userId) && (isLoading || (!data && !error));

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
    isLoading: loading,
    error: errorMessage,
    mutate,
  };
}
