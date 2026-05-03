/**
 * OnboardingFlow Example Usage
 * 
 * This file demonstrates how to use the OnboardingFlow component
 * in different scenarios.
 */

import { OnboardingFlow } from "./OnboardingFlow";
import { OnboardingProvider } from "@/contexts/OnboardingContext";

// ── Example 1: Basic Usage ─────────────────────────
/**
 * The simplest way to use OnboardingFlow is to wrap it in the
 * OnboardingProvider. The component handles all state management
 * and step transitions internally.
 */
export function BasicOnboardingExample() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}

// ── Example 2: With Custom Background ──────────────
/**
 * You can wrap OnboardingFlow in a custom container to add
 * background styling or other visual elements.
 */
export function OnboardingWithBackgroundExample() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    </div>
  );
}

// ── Example 3: In a Next.js Page ───────────────────
/**
 * Using OnboardingFlow in a Next.js page component.
 * Make sure to mark the page as a client component.
 */
export function OnboardingPage() {
  return (
    <main>
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    </main>
  );
}

// ── Example 4: With Progress Indicator ─────────────
/**
 * You can add a progress indicator above the OnboardingFlow
 * by accessing the context state.
 */
import { useOnboarding } from "@/contexts/OnboardingContext";

function ProgressIndicator() {
  const { state } = useOnboarding();
  
  const steps = [
    "auth",
    "camera_permission",
    "selfie_capture",
    "analysis",
    "calendar_prompt",
    "completion",
  ];
  
  const currentIndex = steps.indexOf(state.currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;
  
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "4px",
        background: "rgba(255, 255, 255, 0.2)",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "var(--primary)",
          transition: "width 300ms ease",
        }}
      />
    </div>
  );
}

export function OnboardingWithProgressExample() {
  return (
    <OnboardingProvider>
      <ProgressIndicator />
      <OnboardingFlow />
    </OnboardingProvider>
  );
}

// ── Example 5: With Skip Button ────────────────────
/**
 * You can add a skip button that allows users to skip onboarding
 * (though this is not recommended for the initial experience).
 */
function SkipButton() {
  const { state, completeOnboarding } = useOnboarding();
  
  // Only show skip button on certain steps
  const showSkip = ["calendar_prompt"].includes(state.currentStep);
  
  if (!showSkip) return null;
  
  return (
    <button
      onClick={() => completeOnboarding()}
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        padding: "8px 16px",
        background: "rgba(255, 255, 255, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "8px",
        color: "white",
        cursor: "pointer",
        zIndex: 1000,
      }}
    >
      Skip
    </button>
  );
}

export function OnboardingWithSkipExample() {
  return (
    <OnboardingProvider>
      <SkipButton />
      <OnboardingFlow />
    </OnboardingProvider>
  );
}

// ── Example 6: With Analytics Tracking ─────────────
/**
 * Track onboarding progress with analytics by listening to
 * step changes.
 */
import { useEffect } from "react";

function AnalyticsTracker() {
  const { state } = useOnboarding();
  
  useEffect(() => {
    // Track step changes
    if (typeof window !== "undefined" && (window as any).analytics) {
      (window as any).analytics.track("Onboarding Step Viewed", {
        step: state.currentStep,
        timestamp: new Date().toISOString(),
      });
    }
  }, [state.currentStep]);
  
  useEffect(() => {
    // Track errors
    if (state.error) {
      if (typeof window !== "undefined" && (window as any).analytics) {
        (window as any).analytics.track("Onboarding Error", {
          step: state.error.step,
          message: state.error.message,
          code: state.error.code,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, [state.error]);
  
  return null;
}

export function OnboardingWithAnalyticsExample() {
  return (
    <OnboardingProvider>
      <AnalyticsTracker />
      <OnboardingFlow />
    </OnboardingProvider>
  );
}

// ── Example 7: With Custom Error Handler ───────────
/**
 * You can add a custom error handler that sends errors to
 * a logging service.
 */
function ErrorLogger() {
  const { state } = useOnboarding();
  
  useEffect(() => {
    if (state.error) {
      // Send to logging service (e.g., Sentry)
      console.error("Onboarding Error:", {
        step: state.error.step,
        message: state.error.message,
        code: state.error.code,
        retryable: state.error.retryable,
        user: state.user?.id,
        timestamp: new Date().toISOString(),
      });
    }
  }, [state.error, state.user]);
  
  return null;
}

export function OnboardingWithErrorLoggingExample() {
  return (
    <OnboardingProvider>
      <ErrorLogger />
      <OnboardingFlow />
    </OnboardingProvider>
  );
}

// ── Example 8: Conditional Rendering ───────────────
/**
 * Only show onboarding if the user hasn't completed it yet.
 */
function ConditionalOnboarding({ hasCompletedOnboarding }: { hasCompletedOnboarding: boolean }) {
  if (hasCompletedOnboarding) {
    return <div>Welcome back! Redirecting to main app...</div>;
  }
  
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}

export function ConditionalOnboardingExample() {
  // In a real app, this would come from your auth state
  const hasCompletedOnboarding = false;
  
  return <ConditionalOnboarding hasCompletedOnboarding={hasCompletedOnboarding} />;
}
