"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase";
import { apiPost, skinApi } from "@/lib/api";
import { SelfieCaptureScreen } from "@/components/onboarding/SelfieCaptureScreen";

type CaptureStep = "capture" | "analyzing" | "error";

function dataUrlToFile(dataUrl: string): File {
  const [header, base64Data] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  const binary = globalThis.atob(base64Data);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], "selfie.jpg", { type: mime });
}

async function imageStringToFile(image: string): Promise<File> {
  if (image.startsWith("data:")) {
    return dataUrlToFile(image);
  }

  const response = await fetch(image);
  const blob = await response.blob();
  return new File([blob], "selfie.jpg", { type: blob.type || "image/jpeg" });
}

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
            Running your first scan and preparing your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ error, onRetry }: Readonly<{ error: string; onRetry: () => void }>) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-6">
        <div
          className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
          style={{ background: "var(--error)", color: "white" }}
        >
          <span className="text-3xl">⚠️</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--on-surface)" }}>
            Scan Failed
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

export default function CapturePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<CaptureStep>("capture");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, router, user]);

  const handleCapture = useCallback(async (selfie: string) => {
    if (!user) return;

    setStep("analyzing");
    setError(null);

    try {
      dispatch({ type: "SET_SELFIE", payload: selfie });

      const selfieFile = await imageStringToFile(selfie);
      await skinApi.analyze(selfieFile, user.id);

      const supabase = getSupabase();
      const { data: profileData } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", user.id)
        .single();

      if (!(profileData as { onboarded?: boolean } | null)?.onboarded) {
        await apiPost("/api/onboarding/complete", {
            user_id: user.id,
            calendar_connected: false,
        });
      }

      router.replace("/dashboard");
    } catch (err) {
      console.error("Capture flow failed:", err);
      setError(err instanceof Error ? err.message : "Failed to complete your scan");
      setStep("error");
    }
  }, [dispatch, router, user]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="processing-ring h-16 w-16" />
      </div>
    );
  }

  if (step === "analyzing") {
    return <AnalysisProgress />;
  }

  if (step === "error" && error) {
    return <ErrorScreen error={error} onRetry={() => {
      setError(null);
      setStep("capture");
    }} />;
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-4"
        style={{ background: "rgba(var(--bg-rgb, 10,10,20),0.85)", backdropFilter: "blur(16px)" }}
      >
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--on-surface-variant)" }}
        >
          ← Back
        </button>
        <h1 className="text-base font-semibold tracking-tight" style={{ color: "var(--on-surface)" }}>
          Capture Selfie
        </h1>
        <div className="w-12" />
      </div>

      <SelfieCaptureScreen onCapture={handleCapture} onRecapture={() => setStep("capture")} />
    </div>
  );
}
