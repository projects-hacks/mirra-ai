"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { getSupabase } from "@/lib/supabase";
import { proofCardsApi, skinApi, weatherApi } from "@/lib/api";
import { buildDashboardInsight, buildSkinSummaryFromHistory } from "@/lib/skinSummary";
import { resolveUserLocation } from "@/lib/userContext";
import type { AgentInsight, SkinSummary, VTOResult, WeatherInfo } from "@/types";

export function useDashboard() {
  const { data, error, isLoading } = useSWR("dashboard", async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      const location = await resolveUserLocation(userId);

      const [historyResult, weatherResult, recentLooksResult] = await Promise.allSettled([
        skinApi.history(),
        weatherApi.current(location),
        userId ? proofCardsApi.recentLooks(userId) : Promise.resolve([]),
      ]);

      const history = historyResult.status === "fulfilled" ? historyResult.value : [];
      const weatherInfo = weatherResult.status === "fulfilled" ? weatherResult.value : null;
      const { summary } = buildSkinSummaryFromHistory(history);
      const recentLooks = recentLooksResult.status === "fulfilled" ? recentLooksResult.value : [];
      const fetchError =
        historyResult.status === "rejected" && weatherResult.status === "rejected"
          ? "Dashboard data is unavailable right now."
          : null;

      return {
        skinSummary: summary,
        weather: weatherInfo,
        insight: buildDashboardInsight(summary, weatherInfo),
        recentLooks,
        error: fetchError,
      };
    });

  return useMemo(
    () => ({
      skinSummary: (data?.skinSummary ?? null) as SkinSummary | null,
      weather: (data?.weather ?? null) as WeatherInfo | null,
      insight: (data?.insight ?? null) as AgentInsight | null,
      recentLooks: (data?.recentLooks ?? []) as VTOResult[],
      isLoading,
      error: data?.error ?? (error instanceof Error ? error.message : null),
    }),
    [data, error, isLoading]
  );
}
