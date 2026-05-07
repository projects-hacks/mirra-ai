import { ApiRoutes, getApiUrl } from "@/lib/constants";
import { refreshSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { buildSkinSummaryFromHistory } from "@/lib/skinSummary";
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

export interface ApiContractErrorDetail {
  category?: string;
  message?: string;
  provider_message?: string;
  provider_code?: string;
  source?: string;
  task_type?: string;
}

export interface SkinAnalyzeResponse {
  scores: Record<string, unknown>;
  skin_age: number | null;
  suggestions?: unknown[];
  insight?: AgentInsight;
}

export interface SkinSimulateResponse {
  simulation_url: string;
  image_url?: string;
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
  image_url: string;
  result_image_url?: string;
  url?: string;
  provider_payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ResolvedProductImage {
  input_url: string;
  resolved_image_url: string;
  content_type: string;
  width?: number | null;
  height?: number | null;
  source: string;
  warnings: string[];
}

export interface OutfitMatchResponse {
  matches?: Record<string, unknown[]>;
  gaps?: unknown[];
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProofCardCard {
  id?: string;
  look_name: string;
  vto_image_url?: string | null;
  tone_match: number;
  style_fit: number;
  skin_safe: boolean;
  owned_items: Array<{ name: string; price?: number; imageUrl?: string; owned?: boolean }>;
  new_items: Array<{ name: string; price?: number; imageUrl?: string; owned?: boolean }>;
  total_new_spend: number;
  occasion: string;
  weather: string;
  season?: string;
}

export interface ProofCardResponse {
  card?: ProofCardCard;
  [key: string]: unknown;
}

export interface ProofCardRecord {
  id: string;
  look_name?: string;
  result_image_url?: string | null;
  created_at?: string;
  tone_match?: number;
  style_fit?: number;
  skin_safe?: boolean;
  owned_items?: Array<{ id?: string; name?: string; category?: string; brand?: string; price?: number; url?: string }>;
  new_items?: Array<{ name?: string; price?: number; url?: string }>;
  total_cost?: number;
  approved?: boolean;
  occasion?: string;
  weather?: { temperature?: number; condition?: string } | null;
}

export interface ApproveProofCardResponse {
  success: boolean;
  proof_card_id: string;
  outfit_log_id: string;
  message: string;
}

export interface StyleProfileResponse {
  user_id: string;
  period_start: string;
  period_end: string;
  top_colors: string[];
  top_categories: Record<string, number>;
  top_brands: string[];
  formality_avg: number;
  outfit_success_rate: number;
  avg_cost_per_wear: number;
  total_outfits: number;
  drift_insights?: {
    drift_detected: boolean;
    insights: Array<{
      type: string;
      message: string;
      change?: number;
      new_colors?: string[];
      category?: string;
      change_percent?: number;
    }>;
  };
}

export interface OutfitHistoryResponse<T = unknown> {
  outfit_logs: T[];
}

export interface OutfitHistorySummaryResponse {
  wore: number;
  skipped: number;
  returned: number;
  loved: number;
  pending: number;
  total: number;
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
  const headers: Record<string, string> = {};

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  let { data: { session } } = await supabase.auth.getSession();

  // If supabase has not yet rehydrated the session (race right after OAuth or a
  // soft reload), try a single shared refresh before firing the request. This
  // avoids the wasted round-trip "no auth → 401 → refresh → retry".
  if (!session?.access_token) {
    if (await tryRefreshSessionForApi()) {
      ({ data: { session } } = await supabase.auth.getSession());
    }
  }

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}

/** Best-effort extraction of the human-readable detail from a backend error body. */
function describeBackendBody(body: unknown): string {
  if (!body) return "(no body)";
  if (typeof body === "string") return body || "(empty)";
  if (typeof body === "object") {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object") {
      const message =
        (detail as { message?: unknown }).message ??
        (detail as { provider_message?: unknown }).provider_message;
      if (typeof message === "string") return message;
      try {
        return JSON.stringify(detail);
      } catch {
        return String(detail);
      }
    }
    try {
      return JSON.stringify(body);
    } catch {
      return String(body);
    }
  }
  return String(body);
}

function logAuthEvent(message: string, detail?: Record<string, unknown>) {
  if (typeof console === "undefined") return;
  // Always include the URL, status, and rejection reason so it's diagnosable from a single
  // log line without expanding objects in the console.
  if (detail) {
    const url = typeof detail.url === "string" ? detail.url : "(unknown url)";
    const status = typeof detail.status === "number" ? detail.status : "(unknown status)";
    const reason = "body" in detail ? describeBackendBody(detail.body) : "";
    console.warn(`[auth] ${message} — ${status} ${url}${reason ? ` — ${reason}` : ""}`, detail);
  } else {
    console.warn(`[auth] ${message}`);
  }
}

/**
 * Decide what to do with a 401 that survived our refresh + retry.
 *
 * Two situations end up here:
 *
 * 1. Local Supabase session is gone (no access_token, no refresh_token).
 *    The user is genuinely logged out — sign out cleanly and redirect home.
 *
 * 2. Local Supabase session is healthy, but the backend rejected the token.
 *    This is a server-side problem (env mismatch, JWT secret rotated, Supabase
 *    auth outage, …). Kicking the user out makes the bug feel like the app is
 *    broken. We log loudly and throw an ApiError so the caller can show a
 *    soft error, but the user keeps their session.
 */
async function handle401(context?: {
  url?: string;
  status?: number;
  body?: unknown;
}): Promise<never> {
  let hasLocalSession = false;
  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    hasLocalSession = !!session?.access_token;
  } catch {
    hasLocalSession = false;
  }

  if (hasLocalSession) {
    logAuthEvent(
      "backend rejected request despite a healthy local session — keeping the user signed in",
      {
        url: context?.url,
        status: context?.status,
        body: context?.body,
      }
    );
    throw new ApiError(
      401,
      "This service is temporarily unavailable. Refresh the page in a moment.",
      context?.body
    );
  }

  logAuthEvent("local session is gone — signing out and redirecting to /", {
    url: context?.url,
    status: context?.status,
    body: context?.body,
  });
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

/**
 * Single-flight refresh: if a 401 fires on N parallel requests we want one
 * refresh, not N. The cached promise is cleared as soon as it settles so the
 * next 401 (e.g. seconds later) starts a fresh refresh.
 */
let inflightApiRefresh: Promise<boolean> | null = null;

async function tryRefreshSessionForApi(): Promise<boolean> {
  if (inflightApiRefresh) return inflightApiRefresh;

  inflightApiRefresh = (async () => {
    try {
      const { data, error } = await refreshSession();
      if (error) {
        logAuthEvent("refresh returned error", { message: error.message });
        return false;
      }
      return !!data.session?.access_token;
    } catch (err) {
      // refreshSession() can throw on network blips — treat that the same as a soft failure.
      logAuthEvent("refresh threw", {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    } finally {
      inflightApiRefresh = null;
    }
  })();

  return inflightApiRefresh;
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
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      const message = (detail as { message: unknown }).message;
      return typeof message === "string" ? message : JSON.stringify(message);
    }
    if (detail && typeof detail === "object" && "provider_message" in detail) {
      const message = (detail as { provider_message: unknown }).provider_message;
      return typeof message === "string" ? message : JSON.stringify(message);
    }
    return JSON.stringify(detail);
  }
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;
    return typeof message === "string" ? message : JSON.stringify(message);
  }
  return "Request failed";
}

export function getApiErrorDetail(error: unknown): ApiContractErrorDetail | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.body;
  if (!body || typeof body !== "object" || !("detail" in body)) return null;
  const detail = (body as { detail: unknown }).detail;
  return detail && typeof detail === "object" ? (detail as ApiContractErrorDetail) : null;
}

export function formatApiError(error: unknown, fallback: string): string {
  const detail = getApiErrorDetail(error);
  if (detail) {
    const category = detail.category;
    if (category === "product_page_url") return "Use a direct product image instead of a shopping page URL.";
    if (category === "expired_image_url") return "That product image URL expired or is blocked. Pick another image.";
    if (category === "face_rejected") return "Retake with your face centered, uncovered, and in bright even light.";
    if (category === "body_pose_rejected") return "Use a straight-on photo with your face and upper body clearly visible.";
    if (category === "reference_rejected") return "The reference image is not clean enough for try-on. Pick a clearer product image.";
    if (category === "api_timeout") return "The render timed out. Retry the same action once.";
    if (category === "unsupported_category") return "That category is not supported in this mode yet.";
    if (category === "provider_auth") return "The visual engine credentials are invalid or missing.";
    if (category === "provider_units") return "Perfect Corp units are unavailable. Check the account balance.";
    if (category === "provider_response_invalid") return "The visual engine returned an incomplete result. Retry with another image.";
    if (category === "safety_blocked") return "This image could not be processed because it triggered a safety filter.";
    if (category === "missing_scan") return "Capture a fresh scan before opening this view.";
    if (category === "rate_limited") return detail.message ?? "Too many requests. Please wait a moment and retry.";
    if (category === "service_unavailable") return detail.message ?? fallback;
    if (category === "invalid_input") return detail.message ?? fallback;
    if (detail.message) return detail.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function extractImageUrl(result: Pick<VtoImageResponse, "image_url" | "result_image_url" | "url">): string | null {
  return result.image_url ?? result.result_image_url ?? result.url ?? null;
}

function normalizeVtoImageResponse(response: VtoImageResponse): VtoImageResponse {
  const imageUrl = extractImageUrl(response);
  if (!imageUrl) {
    throw new ApiError(502, "The provider response did not include an image URL.", response);
  }

  return {
    ...response,
    image_url: imageUrl,
  };
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
  const url = getApiUrl(normalizePath(path));

  const requestOnce = async (alreadyRefreshed = false) => {
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      ...fetchOptions,
      headers: { ...headers, ...optionHeaders },
    });

    if (response.status === 401) {
      if (!alreadyRefreshed && (await tryRefreshSessionForApi())) {
        return requestOnce(true);
      }
      const body = await parseErrorBody(response);
      return handle401({ url, status: response.status, body });
    }
    if (!response.ok) {
      const body = await parseErrorBody(response);
      throw new ApiError(response.status, errorMessageFromBody(body), body);
    }

    return response.json() as Promise<T>;
  };

  if (!retryOptions) return requestOnce();
  return retryWithBackoff(() => requestOnce(), retryOptions);
}

export async function fetchWithFormData<T>(
  path: string,
  formData: FormData,
  retry?: RetryOptions | boolean
): Promise<T> {
  const retryOptions = retry === true ? {} : retry;
  const url = getApiUrl(normalizePath(path));

  const requestOnce = async (alreadyRefreshed = false) => {
    const headers = await getAuthHeaders("");
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (response.status === 401) {
      if (!alreadyRefreshed && (await tryRefreshSessionForApi())) {
        return requestOnce(true);
      }
      const body = await parseErrorBody(response);
      return handle401({ url, status: response.status, body });
    }
    if (!response.ok) {
      const body = await parseErrorBody(response);
      throw new ApiError(response.status, errorMessageFromBody(body), body);
    }

    return response.json() as Promise<T>;
  };

  if (!retryOptions) return requestOnce();
  return retryWithBackoff(() => requestOnce(), retryOptions);
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

  /** JSON POST (empty object) — avoids empty multipart bodies that some proxies mishandle. */
  insights: () => apiPost<SkinInsightsResponse>(ApiRoutes.SKIN_INSIGHTS, {}),

  summary: async (): Promise<SkinSummary[]> => {
    const history = await skinApi.history();
    return history.map((row, index) => buildSkinSummaryFromHistory(history.slice(index)).summary);
  },
};

export const vtoApi = {
  clothes: (selfie: Blob, garmentUrl: string, category = "upper") => {
    const form = formWithSelfie(selfie);
    form.append("garment_url", garmentUrl);
    form.append("garment_category", category);
    return fetchWithFormData<VtoImageResponse>(ApiRoutes.VTO_CLOTHES, form).then(normalizeVtoImageResponse);
  },

  makeup: (selfie: Blob, effects: unknown[]) => {
    const form = formWithSelfie(selfie);
    form.append("effects", JSON.stringify(effects));
    return fetchWithFormData<VtoImageResponse>(ApiRoutes.VTO_MAKEUP, form).then(normalizeVtoImageResponse);
  },

  earrings: (selfie: Blob, earringUrl: string) => {
    const form = formWithSelfie(selfie);
    form.append("earring_url", earringUrl);
    return fetchWithFormData<VtoImageResponse>(ApiRoutes.VTO_EARRINGS, form).then(normalizeVtoImageResponse);
  },

  necklace: (selfie: Blob, necklaceUrl: string) => {
    const form = formWithSelfie(selfie);
    form.append("necklace_url", necklaceUrl);
    return fetchWithFormData<VtoImageResponse>(ApiRoutes.VTO_NECKLACE, form).then(normalizeVtoImageResponse);
  },

  hair: (selfie: Blob, refHairUrl: string) => {
    const form = formWithSelfie(selfie);
    form.append("ref_hair_url", refHairUrl);
    return fetchWithFormData<VtoImageResponse>(ApiRoutes.VTO_HAIR, form).then(normalizeVtoImageResponse);
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

  resolveImage: (url: string) => apiPost<ResolvedProductImage>(ApiRoutes.PRODUCTS_RESOLVE_IMAGE, { url }),
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

  approve: (proofCardId: string, userId: string) =>
    apiPost<ApproveProofCardResponse>(`${ApiRoutes.PROOF_CARDS}approve`, {
      proof_card_id: proofCardId,
      user_id: userId,
    }),

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

export const styleProfileApi = {
  get: (userId: string) => {
    const params = new URLSearchParams({ user_id: userId });
    return fetchApi<StyleProfileResponse>(`${ApiRoutes.STYLE_PROFILE}?${params.toString()}`);
  },
};

export const outfitHistoryApi = {
  list: <T = unknown>(userId: string) => {
    const params = new URLSearchParams({ user_id: userId });
    return fetchApi<OutfitHistoryResponse<T>>(`${ApiRoutes.OUTFIT_HISTORY}?${params.toString()}`);
  },

  summary: (userId: string) => {
    const params = new URLSearchParams({ user_id: userId });
    return fetchApi<OutfitHistorySummaryResponse>(`${ApiRoutes.OUTFIT_HISTORY_SUMMARY}?${params.toString()}`);
  },

  updateOutcome: (
    logId: string,
    body: { outcome: string; rating: number | null; feedback: string | null; compliments: boolean }
  ) =>
    fetchApi<{ success?: boolean }>(`/api/outfit-history/${logId}/outcome`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export const closetApi = {
  quickRecommendations: <T = unknown>(params: {
    userId: string;
    occasion: string;
    temperature?: number;
  }) => {
    const query = new URLSearchParams({
      user_id: params.userId,
      occasion: params.occasion,
    });
    if (typeof params.temperature === "number") query.set("temperature", String(params.temperature));
    return fetchApi<{ recommendations: T[] }>(`/api/closet/recommendations/quick?${query.toString()}`);
  },

  outfitRecommendation: <T = unknown>(body: {
    user_id: string;
    context: Record<string, unknown>;
  }) => apiPost<T>("/api/closet/recommendations/outfit", body),

  analytics: <T = unknown>() => fetchApi<T>("/api/closet/analytics"),

  extractMetadata: <T = unknown>(imageUrl: string) =>
    apiPost<{ metadata?: T; success?: boolean }>("/api/closet/extract-metadata", {
      image_url: imageUrl,
    }),

  updateItem: <T = unknown>(itemId: string, patch: Record<string, unknown>) =>
    fetchApi<T>(`/api/closet/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteItem: (itemId: string) =>
    fetchApi<{ ok?: boolean }>(`/api/closet/${itemId}`, {
      method: "DELETE",
    }),
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
