"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { proofCardsApi, skinApi, weatherApi } from "@/lib/api";
import { buildDashboardInsight, buildSkinSummaryFromHistory } from "@/lib/skinSummary";
import { resolveUserLocation } from "@/lib/userContext";
import type { AgentInsight, SkinSummary, VTOResult, WeatherInfo } from "@/types";

export function useDashboard() {
  const [skinSummary, setSkinSummary] = useState<SkinSummary | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [insight, setInsight] = useState<AgentInsight | null>(null);
  const [recentLooks, setRecentLooks] = useState<VTOResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

      async function load() {
      setIsLoading(true);
      setError(null);

      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      const location = await resolveUserLocation(userId);

      const [historyResult, weatherResult, recentLooksResult] = await Promise.allSettled([
        skinApi.history(),
        weatherApi.current(location),
        userId ? proofCardsApi.recentLooks(userId) : Promise.resolve([]),
      ]);

      if (cancelled) return;

      const history = historyResult.status === "fulfilled" ? historyResult.value : [];
      const weatherInfo = weatherResult.status === "fulfilled" ? weatherResult.value : null;
      const { summary } = buildSkinSummaryFromHistory(history);

      setSkinSummary(summary);
      setWeather(weatherInfo);
      setInsight(buildDashboardInsight(summary, weatherInfo));
      setRecentLooks(recentLooksResult.status === "fulfilled" ? recentLooksResult.value : []);

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
