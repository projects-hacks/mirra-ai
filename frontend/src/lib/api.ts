import { API_URL, ApiRoutes } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import { ToolName } from "@/lib/constants";
import type { AgentInsight, GlowupAnalysis, GlowupPlan, Product, SkinSummary, VTOResult, WeatherInfo } from "@/types";

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (attempt: number, error: Error) => boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface SkinAnalyzeResponse {
  scores: Record<string, unknown>;
  skin_age: number | null;
  suggestions?: unknown[];
  insight?: AgentInsight;
}

export interface SkinSimulateResponse {
  simulation_url: string;
  intensities_used: Record<string, number>;
}

export interface SkinHistoryRow {
  id?: string;
  user_id?: string;
  scores?: Record<string, unknown>;
  skin_age?: number | null;
  created_at?: string;
  selfie_url?: string | null;
  weather_at_scan?: unknown;
  location_at_scan?: string | null;
}

export interface SkinHistoryResponse {
  history: SkinHistoryRow[];
}

export interface SkinInsightsResponse extends AgentInsight {
  tool_calls_made?: string[];
}

export interface VtoImageResponse {
  image_url?: string;
  result_image_url?: string;
  url?: string;
  [key: string]: unknown;
}

export interface OutfitMatchResponse {
  matches?: Record<string, unknown[]>;
  gaps?: unknown[];
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProofCardResponse {
  card?: unknown;
  [key: string]: unknown;
}

export interface ProofCardRecord {
  id: string;
  look_name?: string;
  result_image_url?: string | null;
  created_at?: string;
}

interface BackendWeatherResponse {
  location?: string;
  temp_f?: number;
  temp?: number;
  humidity?: number;
  condition?: string;
  code?: number;
  uvIndex?: number;
  uv_index?: number;
  error?: string;
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

async function getAuthHeaders(contentType = "application/json"): Promise<Record<string, string>> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};

  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}

async function handle401(): Promise<never> {
  try {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    localStorage.clear();
  } catch {
    // Session unavailable or storage blocked; redirect still handles recovery.
  }
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
  throw new ApiError(401, "Session expired. Redirecting to sign-in.");
}

async function parseErrorBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return "";

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessageFromBody(body: unknown): string {
  if (typeof body === "string") return body;
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    return typeof detail === "string" ? detail : JSON.stringify(detail);
  }
  return "Request failed";
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry,
    shouldRetry,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxRetries) throw lastError;
      if (shouldRetry && !shouldRetry(attempt + 1, lastError)) throw lastError;
      onRetry?.(attempt + 1, lastError);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError ?? new Error("Retry failed with unknown error");
}

export async function fetchApi<T>(
  path: string,
  options: RequestInit & { retry?: RetryOptions | boolean } = {}
): Promise<T> {
  const { retry, headers: optionHeaders, ...fetchOptions } = options;
  const retryOptions = retry === true ? {} : retry;
  const url = `${API_URL}${normalizePath(path)}`;

  const requestOnce = async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      ...fetchOptions,
      headers: { ...headers, ...optionHeaders },
    });

    if (response.status === 401) return handle401();
    if (!response.ok) {
      const body = await parseErrorBody(response);
      throw new ApiError(response.status, errorMessageFromBody(body), body);
    }

    return response.json() as Promise<T>;
  };

  if (!retryOptions) return requestOnce();
  return retryWithBackoff(requestOnce, retryOptions);
}

export async function fetchWithFormData<T>(
  path: string,
  formData: FormData,
  retry?: RetryOptions | boolean
): Promise<T> {
  const retryOptions = retry === true ? {} : retry;
  const url = `${API_URL}${normalizePath(path)}`;

  const requestOnce = async () => {
    const headers = await getAuthHeaders("");
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (response.status === 401) return handle401();
    if (!response.ok) {
      const body = await parseErrorBody(response);
      throw new ApiError(response.status, errorMessageFromBody(body), body);
    }

    return response.json() as Promise<T>;
  };

  if (!retryOptions) return requestOnce();
  return retryWithBackoff(requestOnce, retryOptions);
}

export const api = fetchApi;

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return fetchApi<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const apiUpload = fetchWithFormData;

function formWithSelfie(selfie: Blob): FormData {
  const form = new FormData();
  form.append("selfie", selfie, "selfie.jpg");
  return form;
}

function normalizeWeather(data: BackendWeatherResponse): WeatherInfo {
  const humidity = Number(data.humidity ?? 0);
  const temp = Number(data.temp_f ?? data.temp ?? 0);
  const uvIndex = data.uvIndex ?? data.uv_index;
  const condition = data.condition ?? "Current conditions";
  const aiTip = uvIndex && uvIndex >= 6
    ? "High UV today. Prioritize SPF before styling."
    : humidity < 40
      ? "Low humidity can make skin feel drier. Hydration layers matter today."
      : "Weather is skin-neutral today. Keep your routine steady.";

  return {
    temp,
    humidity,
    condition,
    location: data.location ?? "San Francisco",
    uvIndex,
    aiTip,
  };
}

export const skinApi = {
  analyze: (selfie: Blob, userId?: string) => {
    const form = formWithSelfie(selfie);
    if (userId) form.append("user_id", userId);
    return fetchWithFormData<SkinAnalyzeResponse>(ApiRoutes.SKIN_ANALYZE, form);
  },

  simulate: (selfie: Blob, intensities?: Record<string, number>, userId?: string) => {
    const form = formWithSelfie(selfie);
    if (intensities) form.append("intensities", JSON.stringify(intensities));
    if (userId) form.append("user_id", userId);
    return fetchWithFormData<SkinSimulateResponse>(ApiRoutes.SKIN_SIMULATE, form);
  },

  history: async () => {
    const response = await fetchApi<SkinHistoryResponse>(ApiRoutes.SKIN_HISTORY);
    return response.history;
  },

  insights: () => fetchWithFormData<SkinInsightsResponse>(ApiRoutes.SKIN_INSIGHTS, new FormData()),

  summary: async (): Promise<SkinSummary[]> => {
    const history = await skinApi.history();
    return history.map((row) => {
      const scores = row.scores ?? {};
      const numericScores = Object.values(scores)
        .map((value) => {
          if (typeof value === "number") return value;
          if (value && typeof value === "object" && "ui_score" in value) {
            return Number((value as { ui_score: unknown }).ui_score);
          }
          return Number.NaN;
        })
        .filter(Number.isFinite);
      const overallScore = numericScores.length
        ? Math.round(numericScores.reduce((sum, value) => sum + value, 0) / numericScores.length)
        : 0;

      return {
        overallScore,
        skinAge: row.skin_age ?? null,
        lastScanDate: row.created_at ?? null,
        trend: "stable",
        topConcerns: [],
      };
    });
  },
};

export const vtoApi = {
  clothes: (selfie: Blob, garmentUrl: string, category = "upper") => {
    const form = formWithSelfie(selfie);
    form.append("garment_url", garmentUrl);
    form.append("garment_category", category);
    return fetchWithFormData<VtoImageResponse>(ApiRoutes.VTO_CLOTHES, form);
  },

  makeup: (selfie: Blob, effects: unknown[]) => {
    const form = formWithSelfie(selfie);
    form.append("effects", JSON.stringify(effects));
    return fetchWithFormData<VtoImageResponse>(ApiRoutes.VTO_MAKEUP, form);
  },

  earrings: (selfie: Blob, earringUrl: string) => {
    const form = formWithSelfie(selfie);
    form.append("earring_url", earringUrl);
    return fetchWithFormData<VtoImageResponse>(ApiRoutes.VTO_EARRINGS, form);
  },

  necklace: (selfie: Blob, necklaceUrl: string) => {
    const form = formWithSelfie(selfie);
    form.append("necklace_url", necklaceUrl);
    return fetchWithFormData<VtoImageResponse>(ApiRoutes.VTO_NECKLACE, form);
  },

  hair: (selfie: Blob, refHairUrl: string) => {
    const form = formWithSelfie(selfie);
    form.append("ref_hair_url", refHairUrl);
    return fetchWithFormData<VtoImageResponse>(ApiRoutes.VTO_HAIR, form);
  },
};

export const productsApi = {
  search: (query: string, maxPrice?: number) => {
    const params = new URLSearchParams({ q: query });
    if (maxPrice) params.set("max_price", String(maxPrice));
    return fetchApi<{ products: Product[]; count: number }>(
      `${ApiRoutes.PRODUCTS_SEARCH}?${params.toString()}`
    );
  },
};

export const weatherApi = {
  current: async (location = "San Francisco") => {
    const response = await fetchApi<BackendWeatherResponse>(
      `${ApiRoutes.WEATHER}?location=${encodeURIComponent(location)}`
    );
    return normalizeWeather(response);
  },
};

export const outfitApi = {
  match: (body: { user_id?: string; occasion?: string; location?: string }) =>
    apiPost<OutfitMatchResponse>(ApiRoutes.OUTFIT_MATCH, body),

  proofCard: (body: {
    user_id?: string;
    look_name: string;
    selected_items: unknown[];
    occasion?: string;
    vto_image_url?: string;
    weather?: string;
    season?: string;
  }) => apiPost<ProofCardResponse>(ApiRoutes.OUTFIT_PROOF_CARD, body),
};

export const proofCardsApi = {
  list: async (userId: string, approved?: boolean) => {
    const params = new URLSearchParams({ user_id: userId });
    if (typeof approved === "boolean") {
      params.set("approved", String(approved));
    }

    const response = await fetchApi<{ proof_cards: ProofCardRecord[] }>(
      `${ApiRoutes.PROOF_CARDS}?${params.toString()}`
    );
    return response.proof_cards ?? [];
  },

  recentLooks: async (userId: string): Promise<VTOResult[]> => {
    const cards = await proofCardsApi.list(userId);
    return cards
      .filter((card) => typeof card.result_image_url === "string" && card.result_image_url.length > 0)
      .slice(0, 8)
      .map((card) => ({
        imageUrl: card.result_image_url as string,
        toolName: ToolName.GENERATE_PROOF_CARD,
        timestamp: card.created_at ? new Date(card.created_at).getTime() : Date.now(),
      }));
  },
};

export const glowupApi = {
  analyze: (selfie: Blob) => {
    const form = formWithSelfie(selfie);
    return fetchWithFormData<GlowupAnalysis>(ApiRoutes.GLOWUP_ANALYZE, form);
  },

  recommend: (selfie: Blob) => {
    const form = formWithSelfie(selfie);
    return fetchWithFormData<GlowupPlan>(
      ApiRoutes.GLOWUP_RECOMMEND,
      form
    );
  },

  recommendFromAnalysis: (faceAttributes: Record<string, unknown>, skinTone: Record<string, unknown>) => {
    const form = new FormData();
    form.append("face_attributes_json", JSON.stringify(faceAttributes));
    form.append("skin_tone_json", JSON.stringify(skinTone));
    return fetchWithFormData<GlowupPlan>(ApiRoutes.GLOWUP_RECOMMEND, form);
  },
};
