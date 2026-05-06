"use client";

import { useEffect } from "react";
import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { getApiUrl } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import { AuthScreen } from "./AuthScreen";
import { CameraPermissionScreen } from "./CameraPermissionScreen";
import { SelfieCaptureScreen } from "./SelfieCaptureScreen";
import { ScanProgressScreen } from "./ScanProgressScreen";
import { GreetingScreen } from "./GreetingScreen";
import type { User, OnboardingError, AnalysisResults } from "@/types/onboarding";

function CalendarPromptScreen() {
  const { skipCalendar } = useOnboarding();
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card text-center max-w-md">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--on-surface)" }}>
          Connect Your Calendar
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--on-surface-variant)" }}>
          Want to connect your calendar so I know what&apos;s coming up?
        </p>
        <div className="flex gap-3">
          <button onClick={skipCalendar} className="btn-secondary flex-1">
            Skip for Now
          </button>
          <button onClick={skipCalendar} className="btn-primary flex-1">
            Connect Calendar
          </button>
        </div>
      </div>
    </div>
  );
}

function CompletionScreen({ userId }: Readonly<{ userId: string }>) {
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const completeOnboarding = async () => {
      if (isCompleting) return;
      
      setIsCompleting(true);
      
      try {
        // Step 1: Seed closet with demo items
        console.log("Seeding closet with demo items...");
        const seedResponse = await fetch(getApiUrl("/api/onboarding/seed-closet"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });

        if (!seedResponse.ok) {
          throw new Error("Failed to seed closet");
        }

        // Step 2: Mark onboarding as complete
        console.log("Marking onboarding as complete...");
        const completeResponse = await fetch(getApiUrl("/api/onboarding/complete"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, calendar_connected: false }),
        });

        if (!completeResponse.ok) {
          throw new Error("Failed to complete onboarding");
        }

        console.log("Onboarding completed successfully!");

        // Step 3: Wait for animation and profile propagation, then reload
        setTimeout(() => {
          // Use router.refresh() or window.location.reload() for a cleaner reload
          window.location.reload();
        }, 2500);

      } catch (err) {
        console.error("Completion error:", err);
        setError(err instanceof Error ? err.message : "Failed to complete onboarding");
        setIsCompleting(false);
      }
    };

    completeOnboarding();
  }, [userId, isCompleting]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card text-center max-w-md">
          <TriangleAlert size={40} className="mx-auto mb-4 text-[var(--error)]" aria-hidden="true" />
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--error)" }}>
            Completion Failed
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--on-surface-variant)" }}>
            {error}
          </p>
          <button
            onClick={() => globalThis.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full mx-auto mb-4"
          style={{ background: "var(--success)", color: "white" }}
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-2" style={{ color: "var(--on-surface)" }}>
          All Set!
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--on-surface-variant)" }}>
          Got it. Let&apos;s build your first look.
        </p>
        {isCompleting && (
          <div className="flex items-center justify-center gap-2 text-xs" style={{ color: "var(--on-surface-muted)" }}>
            <div className="processing-ring h-4 w-4" />
            <span>Setting up your closet...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main OnboardingFlow Component ──────────────────
export function OnboardingFlow() {
  const {
    state,
    completeAuth,
    advanceStep,
    captureSelfie,
    setAnalysisResults,
    setError,
    retryCurrentStep,
  } = useOnboarding();

  // ── Check for existing session on mount ────────────
  useEffect(() => {
    const checkExistingSession = async () => {
      // Only check if we're on the auth step
      if (state.currentStep !== "auth") return;

      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // User is already authenticated, skip auth step
          const user: User = {
            id: session.user.id,
            email: session.user.email || "",
            displayName: session.user.user_metadata?.full_name || session.user.email || "User",
            avatarUrl: session.user.user_metadata?.avatar_url,
          };
          completeAuth(user);
        }
      } catch (error) {
        console.error("Error checking existing session:", error);
        // Don't show error, just stay on auth screen
      }
    };

    checkExistingSession();
  }, [state.currentStep, completeAuth]);

  // ── Error Handling ────────────────────────────────
  const handleError = (error: Error, step: typeof state.currentStep) => {
    const onboardingError: OnboardingError = {
      step,
      message: error.message,
      code: error.name || "UNKNOWN_ERROR",
      retryable: true,
    };
    setError(onboardingError);
  };

  // ── Step Handlers ─────────────────────────────────
  const handleAuthComplete = (user: User) => {
    try {
      completeAuth(user);
    } catch (error) {
      handleError(error as Error, "auth");
    }
  };

  const handlePermissionGranted = () => {
    try {
      advanceStep();
    } catch (error) {
      handleError(error as Error, "camera_permission");
    }
  };

  const handlePermissionDenied = () => {
    const error: OnboardingError = {
      step: "camera_permission",
      message: "Camera permission is required to continue. Please enable camera access.",
      code: "PERMISSION_DENIED",
      retryable: true,
    };
    setError(error);
  };

  const handleSelfieCapture = (selfie: string) => {
    try {
      captureSelfie(selfie);
    } catch (error) {
      handleError(error as Error, "selfie_capture");
    }
  };

  const handleRecapture = () => {
    // Stay on selfie_capture step, just reset the capture state
    // The SelfieCaptureScreen component handles its own state reset
  };

  const handleAnalysisComplete = (results: AnalysisResults) => {
    try {
      setAnalysisResults(results);
    } catch (error) {
      handleError(error as Error, "analysis");
    }
  };

  // ── Error Display ─────────────────────────────────
  const renderError = () => {
    if (!state.error) return null;

    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
        <div
          className="rounded-lg p-4 shadow-lg"
          style={{
            background: "rgba(186, 26, 26, 0.9)",
            color: "white",
            backdropFilter: "blur(10px)",
          }}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{state.error.message}</p>
              {state.error.retryable && (
                <button
                  onClick={retryCurrentStep}
                  className="mt-2 text-sm font-medium underline hover:no-underline"
                >
                  Try Again
                </button>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0"
              aria-label="Dismiss error"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Step Rendering ───────────────────────────────
  const renderStep = () => {
    switch (state.currentStep) {
      case "auth":
        return (
          <AuthScreen
            onAuthComplete={handleAuthComplete}
            onError={(error) => handleError(error, "auth")}
          />
        );

      case "camera_permission":
        return (
          <CameraPermissionScreen
            onPermissionGranted={handlePermissionGranted}
            onPermissionDenied={handlePermissionDenied}
          />
        );

      case "selfie_capture":
        return (
          <SelfieCaptureScreen
            onCapture={handleSelfieCapture}
            onRecapture={handleRecapture}
          />
        );

      case "analysis":
        return (
          <ScanProgressScreen
            userId={state.user?.id || ""}
            selfie={state.selfie || ""}
            onComplete={handleAnalysisComplete}
            onError={(error) => handleError(error, "analysis")}
          />
        );

      case "greeting":
        return (
          <GreetingScreen
            greeting={state.analysisResults?.greeting || "Analysis complete!"}
            onContinue={() => advanceStep()}
          />
        );

      case "calendar_prompt":
        return <CalendarPromptScreen />;

      case "completion":
        return <CompletionScreen userId={state.user?.id || ""} />;

      default:
        return (
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="glass-card text-center">
              <p style={{ color: "var(--error)" }}>
                Unknown step: {state.currentStep}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {renderError()}
      {renderStep()}
    </>
  );
}
