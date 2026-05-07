/* ── Constants — mirrors backend app/core/constants.py ── */

// ── API Configuration ──────────────────────────────
const DEFAULT_LOCAL_API_URL = "http://localhost:8000";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function normalizeApiUrl(rawUrl: string | undefined): string {
  const configured = rawUrl?.trim();
  if (!configured) return DEFAULT_LOCAL_API_URL;

  try {
    const parsed = new URL(configured);
    if (parsed.protocol === "http:" && !isLocalHostname(parsed.hostname)) {
      parsed.protocol = "https:";
    }

    return parsed.origin;
  } catch {
    return configured.replace(/\/+$/, "");
  }
}

export function getApiBaseUrl(): string {
  return normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
}

/**
 * Always return an absolute URL pointing at the backend origin.
 *
 * Vercel rewrites (`/api/:path*` → DO) turn into 307 redirects under the hood.
 * Per the HTTP spec, browsers **strip the Authorization header** on cross-origin
 * redirects — so every API call routed through the rewrite silently loses its
 * Bearer token and gets a 401 "Missing or invalid Authorization header".
 *
 * Calling DigitalOcean directly avoids the redirect entirely.  The explicit
 * Authorization header in `fetch()` survives a same-request cross-origin call
 * (CORS preflight handles it).  CORS is already configured on the backend.
 */
export function getApiUrl(path = ""): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export const API_URL = getApiBaseUrl();
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const ENABLE_CAMERA_KIT = process.env.NEXT_PUBLIC_ENABLE_CAMERA_KIT !== "false";

// ── API Endpoints ──────────────────────────────────
export const ApiRoutes = {
  SKIN_ANALYZE: "/api/skin/analyze",
  SKIN_INSIGHTS: "/api/skin/insights",
  SKIN_SIMULATE: "/api/skin/simulate",
  SKIN_HISTORY: "/api/skin/history",
  VTO_CLOTHES: "/api/vto/clothes",
  VTO_MAKEUP: "/api/vto/makeup",
  VTO_EARRINGS: "/api/vto/earrings",
  VTO_NECKLACE: "/api/vto/necklace",
  VTO_HAIR: "/api/vto/hair",
  GLOWUP_ANALYZE: "/api/glowup/analyze",
  GLOWUP_RECOMMEND: "/api/glowup/recommend",
  OUTFIT_MATCH: "/api/outfit/match",
  OUTFIT_PROOF_CARD: "/api/outfit/proof-card",
  PROOF_CARDS: "/api/proof-cards/",
  PRODUCTS_SEARCH: "/api/products/search",
  PRODUCTS_RESOLVE_IMAGE: "/api/products/resolve-image",
  WEATHER: "/api/context/weather",
  STYLE_PROFILE: "/api/style-profile/",
  OUTFIT_HISTORY: "/api/outfit-history/",
  OUTFIT_HISTORY_SUMMARY: "/api/outfit-history/summary",
} as const;

// ── Tool Names (mirrors backend ToolName enum) ──────
export enum ToolName {
  ANALYZE_SKIN = "analyze_skin",
  ANALYZE_SKIN_TONE = "analyze_skin_tone",
  ANALYZE_FACE = "analyze_face",
  SIMULATE_SKIN = "simulate_skin",
  TRY_ON_CLOTHES = "try_on_clothes",
  TRY_ON_MAKEUP = "try_on_makeup",
  TRY_ON_EARRINGS = "try_on_earrings",
  TRY_ON_NECKLACE = "try_on_necklace",
  CHANGE_HAIRSTYLE = "change_hairstyle",
  SEARCH_PRODUCTS = "search_products",
  CHECK_WEATHER = "check_weather",
  MATCH_CLOSET = "match_closet",
  GENERATE_PROOF_CARD = "generate_proof_card",
}

// ── Loading Text per Tool ───────────────────────────
export const LOADING_TEXT: Record<string, string> = {
  [ToolName.ANALYZE_SKIN]: "Scanning your skin…",
  [ToolName.ANALYZE_SKIN_TONE]: "Detecting skin tone…",
  [ToolName.ANALYZE_FACE]: "Analyzing face features…",
  [ToolName.SIMULATE_SKIN]: "Simulating skin improvement…",
  [ToolName.TRY_ON_CLOTHES]: "Trying that on…",
  [ToolName.TRY_ON_MAKEUP]: "Applying makeup…",
  [ToolName.TRY_ON_EARRINGS]: "Adding earrings…",
  [ToolName.TRY_ON_NECKLACE]: "Fitting necklace…",
  [ToolName.CHANGE_HAIRSTYLE]: "Styling your hair…",
  [ToolName.SEARCH_PRODUCTS]: "Finding the best deals…",
  [ToolName.CHECK_WEATHER]: "Checking the weather…",
  [ToolName.MATCH_CLOSET]: "Matching your closet to the occasion…",
  [ToolName.GENERATE_PROOF_CARD]: "Generating your proof card…",
};

// ── Camera Config ───────────────────────────────────
export const CAMERA = {
  FACING_MODE: "user" as const,
  MIN_WIDTH: 480,
  JPEG_QUALITY: 0.85,
  ASPECT_RATIO: 16 / 9,
} as const;
