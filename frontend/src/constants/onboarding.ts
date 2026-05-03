/**
 * Onboarding flow constants
 */

// ── Timing Constants ────────────────────────────────
export const SCAN_POLL_INTERVAL = 500; // 500ms
export const SCAN_TIMEOUT = 30000; // 30 seconds
export const AUTO_CONTINUE_DELAY = 3000; // 3 seconds
export const COMPLETION_DISPLAY_DELAY = 500; // 500ms

// ── Storage Constants ───────────────────────────────
export const STORAGE_KEY = "onboarding_progress";
export const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours

// ── Step Order ──────────────────────────────────────
export const STEP_ORDER = [
  "auth",
  "camera_permission",
  "selfie_capture",
  "analysis",
  "greeting",
  "calendar_prompt",
  "completion",
] as const;
