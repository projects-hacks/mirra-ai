"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnalysisResults, TaskStatus } from "@/types/onboarding";
import { COMPLETION_DISPLAY_DELAY } from "@/constants/onboarding";

// ── Props Interface ─────────────────────────────────
interface ScanProgressScreenProps {
  userId: string;
  selfie: string;
  onComplete: (results: AnalysisResults) => void;
  onError: (error: Error) => void;
}

// ── Analysis Task Interface ─────────────────────────
interface AnalysisTask {
  id: string;
  label: string;
  status: TaskStatus;
}

// ── Component ───────────────────────────────────────
export function ScanProgressScreen({
  userId,
  selfie,
  onComplete,
  onError,
}: Readonly<ScanProgressScreenProps>) {
  // Helper to derive status label (avoids nested ternary — S3358)
  function getStatusLabel(err: string | null, progress: number): string {
    if (err) return "Failed";
    if (progress === 100) return "Complete";
    return "Analyzing";
  }

  const [tasks, setTasks] = useState<AnalysisTask[]>([
    { id: "skinAnalysis", label: "Analyzing skin texture", status: "pending" },
    { id: "skinTone", label: "Analyzing skin tone", status: "pending" },
    { id: "faceShape", label: "Analyzing face shape", status: "pending" },
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overallProgress = Math.round(
    (tasks.filter((task) => task.status === "complete").length / tasks.length) *
      100
  );

  const startAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);

    // Mark all tasks as running
    setTasks((prev) =>
      prev.map((task) => ({ ...task, status: "running" as TaskStatus }))
    );

    try {
      // Call the analyze endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            selfie: selfie,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Analysis failed: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Mark all tasks as complete
      setTasks((prev) =>
        prev.map((task) => ({ ...task, status: "complete" as TaskStatus }))
      );

      // Wait a moment to show completion state
      await new Promise((resolve) => setTimeout(resolve, COMPLETION_DISPLAY_DELAY));

      // Call onComplete with results
      onComplete({
        skinScores: data.body_model.skin_scores,
        skinTone: data.body_model.skin_tone,
        faceShape: data.body_model.face_shape,
        greeting: data.greeting,
      });
    } catch (err) {
      console.error("Analysis failed:", err);

      // Mark all tasks as error
      setTasks((prev) =>
        prev.map((task) => ({ ...task, status: "error" as TaskStatus }))
      );

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to analyze appearance. Please try again.";

      setError(errorMessage);
      onError(new Error(errorMessage));
    } finally {
      setIsAnalyzing(false);
    }
  }, [onComplete, onError, selfie, userId]);

  // Start analysis on mount
  useEffect(() => {
    if (!isAnalyzing) {
      const timeoutId = window.setTimeout(() => {
        void startAnalysis();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [isAnalyzing, startAnalysis]);

  const handleRetry = () => {
    setError(null);
    setTasks((prev) =>
      prev.map((task) => ({ ...task, status: "pending" as TaskStatus }))
    );
    void startAnalysis();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Progress Container */}
      <div
        className="glass-card flex flex-col items-center gap-6 text-center"
        style={{
          maxWidth: "400px",
          width: "100%",
        }}
      >
        {/* Radial Progress Indicator */}
        <div className="relative flex items-center justify-center">
          {/* Background Circle */}
          <svg className="h-40 w-40 -rotate-90 transform">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress Circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="var(--primary)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 70}`}
              strokeDashoffset={`${2 * Math.PI * 70 * (1 - overallProgress / 100)}`}
              style={{
                transition: "stroke-dashoffset 0.5s ease",
              }}
            />
          </svg>

          {/* Progress Percentage */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ color: "var(--on-surface)" }}
          >
            <span className="text-4xl font-bold">{overallProgress}%</span>
            <span className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
              {getStatusLabel(error, overallProgress)}
            </span>
          </div>
        </div>

        {/* Task List */}
        <div className="flex w-full flex-col gap-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg p-3"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
              }}
            >
              {/* Status Icon */}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                {task.status === "pending" && (
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: "rgba(255, 255, 255, 0.3)" }}
                  />
                )}
                {task.status === "running" && (
                  <svg
                    className="h-6 w-6 animate-spin"
                    style={{ color: "var(--primary)" }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {task.status === "complete" && (
                  <svg
                    className="h-6 w-6"
                    style={{ color: "var(--primary)" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {task.status === "error" && (
                  <svg
                    className="h-6 w-6"
                    style={{ color: "var(--error)" }}
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
                )}
              </div>

              {/* Task Label */}
              <span
                className="flex-1 text-left text-sm font-medium"
                style={{ color: "var(--on-surface)" }}
              >
                {task.label}
              </span>
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="w-full rounded-lg p-3 text-sm"
            style={{
              background: "rgba(186, 26, 26, 0.1)",
              color: "var(--error)",
            }}
            role="alert"
          >
            <p className="font-medium">Analysis Failed</p>
            <p className="mt-1">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-2 text-xs font-medium underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Security Footer */}
        {!error && (
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--on-surface-variant)" }}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Your data is processed securely</span>
          </div>
        )}
      </div>
    </div>
  );
}
