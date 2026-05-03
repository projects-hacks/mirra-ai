/* ── Onboarding TypeScript Interfaces ── */

// ── Onboarding Steps ────────────────────────────────
export type OnboardingStep =
  | 'auth'
  | 'camera_permission'
  | 'selfie_capture'
  | 'analysis'
  | 'greeting'
  | 'calendar_prompt'
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
}

export interface SkinTone {
  undertone: 'warm' | 'cool' | 'neutral';
  depth: 'light' | 'medium' | 'deep';
  hex: string;
  colorSeason: string;
}

export interface FaceShape {
  shape: string;
  symmetryScore: number;
  proportions: Record<string, number>;
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
  calendarConnected: boolean;
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
  | { type: 'SET_CALENDAR_CONNECTED'; payload: boolean }
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
