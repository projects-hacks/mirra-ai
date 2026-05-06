import { API_URL, ApiRoutes } from "@/lib/constants";
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
