"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/constants";
import { SelfieCaptureScreen } from "@/components/onboarding/SelfieCaptureScreen";

// ── Analysis Progress Component ──────────────────────
function AnalysisProgress() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-6">
        <div className="relative w-20 h-20 mx-auto">
          <div className="processing-ring" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--on-surface)" }}>
            Analyzing Your Skin
          </h2>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            This will take just a moment...
          </p>
        </div>
        <div className="space-y-2 text-left">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--primary)" }} />
            <span style={{ color: "var(--on-surface-variant)" }}>Analyzing skin texture</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--primary)", animationDelay: "0.2s" }} />
            <span style={{ color: "var(--on-surface-variant)" }}>Detecting skin tone</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--primary)", animationDelay: "0.4s" }} />
            <span style={{ color: "var(--on-surface-variant)" }}>Analyzing face shape</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Error Component ──────────────────────────────────
function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-6">
        <div
          className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
          style={{ background: "var(--error)", color: "white" }}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--on-surface)" }}>
            Analysis Failed
          </h2>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            {error}
          </p>
        </div>
        <button onClick={onRetry} className="btn-primary w-full">
          Try Again
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────
export default function NewScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<"capture" | "analyzing" | "error">("capture");
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async (selfie: string) => {
    setStep("analyzing");
    setError(null);

    try {
      // Get user session
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("Not authenticated");
      }

      // Get client IP for location detection
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();
      const clientIp = ipData.ip;

      // Call backend analyze endpoint
      const analyzeResponse = await fetch(`${API_URL}/api/onboarding/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: session.user.id,
          selfie: selfie,
          ip_address: clientIp,
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.detail || "Analysis failed");
      }

      // Success! Redirect to profile
      router.push("/profile");
      
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze skin");
      setStep("error");
    }
  };

  const handleRecapture = () => {
    setStep("capture");
    setError(null);
  };

  const handleRetry = () => {
    setStep("capture");
    setError(null);
  };

  if (step === "analyzing") {
    return <AnalysisProgress />;
  }

  if (step === "error" && error) {
    return <ErrorScreen error={error} onRetry={handleRetry} />;
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-4"
        style={{ background: "rgba(var(--bg-rgb, 10,10,20),0.85)", backdropFilter: "blur(16px)" }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--on-surface-variant)" }}
        >
          ← Back
        </button>
        <h1 className="text-base font-semibold tracking-tight" style={{ color: "var(--on-surface)" }}>
          New Skin Scan
        </h1>
        <div className="w-12" /> {/* Spacer */}
      </div>

      <SelfieCaptureScreen onCapture={handleCapture} onRecapture={handleRecapture} />
    </div>
  );
}
