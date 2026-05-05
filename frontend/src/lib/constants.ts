/* ── Constants — mirrors backend app/core/constants.py ── */

// ── API Configuration ──────────────────────────────
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const ENABLE_CAMERA_KIT = process.env.NEXT_PUBLIC_ENABLE_CAMERA_KIT !== "false";

// ── API Endpoints ──────────────────────────────────
export const Endpoint = {
  HEALTH: "/health",
  VTO_UPLOAD: "/api/vto/upload",
  VTO_TASK: "/api/vto/task",
  VTO_RESULT: "/api/vto/result",
  CONTEXT: "/api/context",
  CLOSET: "/api/closet",
  WS_VOICE: "/ws/voice",
} as const;

// ── WebSocket Message Types (Client → Server) ──────
export enum WSClientMsg {
  SELFIE = "selfie",
  READY = "ready",
  STOP = "stop",
}

// ── WebSocket Message Types (Server → Client) ──────
export enum WSServerMsg {
  GREETING = "greeting",
  AGENT_TEXT = "agent_text",
  USER_TEXT = "user_text",
  VTO_RESULT = "vto_result",
  SKIN_RESULT = "skin_result",
  PRODUCT_RESULT = "product_result",
  PROOF_CARD = "proof_card",
  TOOL_START = "tool_start",
  ERROR = "error",
  SESSION_READY = "session_ready",
}

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
  CHECK_CALENDAR = "check_calendar",
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
  [ToolName.CHECK_CALENDAR]: "Checking your schedule…",
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

// ── WebSocket Config ────────────────────────────────
export const WS_CONFIG = {
  RECONNECT_DELAYS: [1000, 2000, 4000, 8000, 16000, 30000],
  MAX_RETRIES: 5,
  HEARTBEAT_INTERVAL: 30000,
} as const;
