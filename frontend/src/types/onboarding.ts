/* ── Onboarding TypeScript Interfaces ── */

// ── Onboarding Steps ────────────────────────────────
export type OnboardingStep =
  | 'auth'
  | 'camera_permission'
  | 'selfie_capture'
  | 'analysis'
  | 'greeting'
  | 'completion';

// ── User Interface ──────────────────────────────────
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

// ── Analysis Results ────────────────────────────────
export interface SkinScores {
  overall: number;
  moisture: number;
  acne: number;
  wrinkles: number;
  pores: number;
  dark_circles: number;
  // Additional comprehensive metrics from backend
  texture: number;
  redness: number;
  oiliness: number;
  age_spot: number;
  radiance: number;
  eye_bag: number;
  droopy_upper_eyelid: number;
  droopy_lower_eyelid: number;
  firmness: number;
}

export interface SkinTone {
  skin_color: string; // Hex color code
  eye_color?: string | null;
  eye_color_name?: string | null;
  lip_color?: string | null;
  eyebrow_color?: string | null;
  hair_color?: string | null;
  hair_color_name?: string | null;
}

export interface FaceShape {
  shape: string;
  age?: number | null;
  gender?: string | null;
  facial_ratios?: Record<string, unknown>;
  eye_shape?: string | null;
  eye_size?: string | null;
  eyelid_type?: string | null;
  lip_shape?: string | null;
  nose_width?: string | null;
  nose_length?: string | null;
}

export interface AnalysisResults {
  skinScores: SkinScores;
  skinTone: SkinTone;
  faceShape: FaceShape;
  greeting?: string;
}

// ── Onboarding State ────────────────────────────────
export interface OnboardingState {
  currentStep: OnboardingStep;
  user: User | null;
  selfie: string | null;
  analysisResults: AnalysisResults | null;
  error: OnboardingError | null;
  isLoading: boolean;
}

// ── Error Handling ──────────────────────────────────
export interface OnboardingError {
  step: OnboardingStep;
  message: string;
  code: string;
  retryable: boolean;
}

// ── State Actions ───────────────────────────────────
export type OnboardingAction =
  | { type: 'SET_STEP'; payload: OnboardingStep }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_SELFIE'; payload: string }
  | { type: 'SET_ANALYSIS_RESULTS'; payload: AnalysisResults }
  | { type: 'SET_ERROR'; payload: OnboardingError | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET' };

// ── Analysis Status (for progress UI) ──────────────
export type TaskStatus = 'pending' | 'running' | 'complete' | 'error';

export interface AnalysisStatus {
  skinAnalysis: TaskStatus;
  skinTone: TaskStatus;
  faceShape: TaskStatus;
  overallProgress: number; // 0-100
}

// ── Persistence ─────────────────────────────────────
export interface OnboardingProgress {
  step: OnboardingStep;
  userId?: string;
  selfie?: string;
  timestamp: number;
}
