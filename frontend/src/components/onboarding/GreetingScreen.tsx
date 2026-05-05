"use client";

import { useEffect } from "react";
import { AUTO_CONTINUE_DELAY } from "@/constants/onboarding";

// ── Props Interface ─────────────────────────────────
interface GreetingScreenProps {
  greeting: string;
  onContinue: () => void;
}

// ── Component ───────────────────────────────────────
export function GreetingScreen({ greeting, onContinue }: Readonly<GreetingScreenProps>) {
  // Auto-continue after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      onContinue();
    }, AUTO_CONTINUE_DELAY);

    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div
        className="glass-card flex flex-col items-center gap-6 text-center"
        style={{
          maxWidth: "500px",
          width: "100%",
          animation: "fadeIn 0.5s ease-in-out",
        }}
      >
        {/* Success Icon */}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: "var(--primary)",
            color: "white",
          }}
        >
          <svg
            className="h-8 w-8"
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
        </div>

        {/* Greeting Message */}
        <div className="flex flex-col gap-2">
          <h2
            className="text-2xl font-semibold"
            style={{ color: "var(--on-surface)" }}
          >
            Analysis Complete
          </h2>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--on-surface-variant)" }}
          >
            {greeting}
          </p>
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="btn-primary w-full"
          aria-label="Continue to next step"
        >
          Continue
        </button>

        {/* Auto-continue indicator */}
        <p
          className="text-xs"
          style={{ color: "var(--on-surface-variant)" }}
        >
          Continuing automatically in a moment...
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
