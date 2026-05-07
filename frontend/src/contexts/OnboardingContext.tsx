"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
  type Dispatch,
} from "react";
import type {
  OnboardingState,
  OnboardingAction,
  User,
  AnalysisResults,
  OnboardingError,
  OnboardingProgress,
} from "@/types/onboarding";
import { STORAGE_KEY, EXPIRATION_TIME, STEP_ORDER } from "@/constants/onboarding";

// ── Initial State ───────────────────────────────────
const initialState: OnboardingState = {
  currentStep: "auth",
  user: null,
  selfie: null,
  analysisResults: null,
  error: null,
  isLoading: false,
};

// ── Reducer ─────────────────────────────────────────
function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction
): OnboardingState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.payload, error: null };

    case "SET_USER":
      return { ...state, user: action.payload };

    case "SET_SELFIE":
      return { ...state, selfie: action.payload };

    case "SET_ANALYSIS_RESULTS":
      return { ...state, analysisResults: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// ── Context Value Interface ─────────────────────────
interface OnboardingContextValue {
  state: OnboardingState;
  dispatch: Dispatch<OnboardingAction>;

  // Actions
  startOnboarding: () => void;
  completeAuth: (user: User) => void;
  captureSelfie: (selfie: string) => void;
  startAnalysis: () => Promise<void>;
  setAnalysisResults: (results: AnalysisResults) => void;
  completeOnboarding: () => Promise<void>;

  // Utilities
  saveProgress: () => void;
  resumeProgress: () => void;
  retryCurrentStep: () => void;
  setError: (error: OnboardingError | null) => void;
  advanceStep: () => void;
}

// ── Context ─────────────────────────────────────────
const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined
);

// ── Provider ────────────────────────────────────────
export function OnboardingProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  // ── Persistence Functions ───────────────────────────
  const saveProgress = useCallback(() => {
    if (typeof globalThis.window === "undefined") return;

    const progress: OnboardingProgress = {
      step: state.currentStep,
      userId: state.user?.id,
      selfie: state.selfie || undefined,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error("Failed to save onboarding progress:", error);
    }
  }, [state.currentStep, state.user?.id, state.selfie]);

  const resumeProgress = useCallback(() => {
    if (typeof globalThis.window === "undefined") return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const progress: OnboardingProgress = JSON.parse(saved);

      // Check expiration (24 hours)
      if (Date.now() - progress.timestamp > EXPIRATION_TIME) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Restore state
      dispatch({ type: "SET_STEP", payload: progress.step });
      if (progress.selfie) {
        dispatch({ type: "SET_SELFIE", payload: progress.selfie });
      }
    } catch (error) {
      console.error("Failed to resume onboarding progress:", error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // ── Action Handlers ─────────────────────────────────
  const startOnboarding = useCallback(() => {
    dispatch({ type: "RESET" });
    dispatch({ type: "SET_STEP", payload: "auth" });
  }, []);

  const completeAuth = useCallback((user: User) => {
    dispatch({ type: "SET_USER", payload: user });
    dispatch({ type: "SET_STEP", payload: "camera_permission" });
  }, []);

  const captureSelfie = useCallback((selfie: string) => {
    dispatch({ type: "SET_SELFIE", payload: selfie });
    dispatch({ type: "SET_STEP", payload: "analysis" });
  }, []);

  const startAnalysis = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    // Analysis logic will be implemented in the component
    // This is just a placeholder for the context
  }, []);

  const setAnalysisResults = useCallback((results: AnalysisResults) => {
    dispatch({ type: "SET_ANALYSIS_RESULTS", payload: results });
    dispatch({ type: "SET_LOADING", payload: false });
    dispatch({ type: "SET_STEP", payload: "greeting" });
  }, []);

  const completeOnboarding = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    // Completion logic will be implemented in the component
    // This is just a placeholder for the context
  }, []);

  const setError = useCallback((error: OnboardingError | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
  }, []);

  const advanceStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      dispatch({ type: "SET_STEP", payload: STEP_ORDER[currentIndex + 1] });
    }
  }, [state.currentStep]);

  const retryCurrentStep = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SET_LOADING", payload: false });
    // Component will handle retry logic based on current step
  }, []);

  // ── Auto-save progress on state changes ─────────────
  useEffect(() => {
    if (state.currentStep !== "auth" && state.currentStep !== "completion") {
      saveProgress();
    }
  }, [state.currentStep, saveProgress]);

  // ── Resume progress on mount ────────────────────────
  useEffect(() => {
    resumeProgress();
  }, [resumeProgress]);

  // ── Clear progress on completion ────────────────────
  useEffect(() => {
    if (state.currentStep === "completion" && typeof globalThis.window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state.currentStep]);

  const value: OnboardingContextValue = useMemo(
    () => ({
      state,
      dispatch,
      startOnboarding,
      completeAuth,
      captureSelfie,
      startAnalysis,
      setAnalysisResults,
      completeOnboarding,
      saveProgress,
      resumeProgress,
      retryCurrentStep,
      setError,
      advanceStep,
    }),
    [
      state,
      startOnboarding,
      completeAuth,
      captureSelfie,
      startAnalysis,
      setAnalysisResults,
      completeOnboarding,
      saveProgress,
      resumeProgress,
      retryCurrentStep,
      setError,
      advanceStep,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────
export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
