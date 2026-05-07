"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ScanFace, TriangleAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSession, refreshSession } from "@/lib/auth";
import { useAppDispatch } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase";
import { apiPost, skinApi } from "@/lib/api";
import { SelfieCaptureScreen } from "@/components/onboarding/SelfieCaptureScreen";

type CaptureStep = "capture" | "analyzing" | "error";
type AnalysisStage = "uploading" | "analyzing" | "saving" | "routing";

const ANALYSIS_STEPS: Array<{ id: AnalysisStage; title: string; detail: string }> = [
  { id: "uploading", title: "Preparing selfie", detail: "Converting the capture into a scan-ready image." },
  { id: "analyzing", title: "Running Perfect Corp analysis", detail: "Scoring skin concerns, skin tone, and profile data." },
  { id: "saving", title: "Saving scan", detail: "Writing your baseline to history and profile." },
  { id: "routing", title: "Opening dashboard", detail: "Loading your skin summary and recommendations." },
];

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

function AnalysisProgress({ stage }: Readonly<{ stage: AnalysisStage }>) {
  const currentIndex = ANALYSIS_STEPS.findIndex((item) => item.id === stage);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full p-8 space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary)]/18">
          <ScanFace className="text-[var(--primary)]" size={34} aria-hidden="true" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--on-surface)" }}>
            Analyzing Your Skin
          </h2>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            Keep this screen open while Mirra turns your scan into scores, guidance, and product direction.
          </p>
        </div>
        <div className="space-y-3">
          {ANALYSIS_STEPS.map((item, index) => {
            const isComplete = index < currentIndex;
            const isActive = index === currentIndex;
            return (
              <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10">
                  {isComplete ? (
                    <CheckCircle2 size={16} className="text-emerald-400" aria-hidden="true" />
                  ) : isActive ? (
                    <Loader2 size={16} className="animate-spin text-[var(--primary)]" aria-hidden="true" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-white/30" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>{item.title}</p>
                  <p className="mt-1 text-xs leading-5" style={{ color: "var(--on-surface-variant)" }}>{item.detail}</p>
                </div>
              </div>
            );
          })}
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
          <TriangleAlert size={28} aria-hidden="true" />
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
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("uploading");
  const [error, setError] = useState<string | null>(null);

  // After OAuth, React auth state can lag behind Supabase cookies for a moment.
  // Retry session read before sending the user home (avoids a false "logged out" redirect).
  useEffect(() => {
    if (authLoading || user) return;

    let cancelled = false;

    void (async () => {
      const { data: first } = await getSession();
      if (cancelled) return;
      if (first.session?.user) return;

      await refreshSession();
      if (cancelled) return;
      const { data: second } = await getSession();
      if (second.session?.user) return;

      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;
      const { data: third } = await getSession();
      if (third.session?.user) return;

      router.replace("/");
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, router, user]);

  const handleCapture = useCallback(async (selfie: string) => {
    if (!user) return;

    setStep("analyzing");
    setAnalysisStage("uploading");
    setError(null);

    try {
      dispatch({ type: "SET_SELFIE", payload: selfie });

      const selfieFile = await imageStringToFile(selfie);
      setAnalysisStage("analyzing");
      await skinApi.analyze(selfieFile, user.id);

      setAnalysisStage("saving");
      const supabase = getSupabase();
      const { data: profileData } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", user.id)
        .single();

      if (!(profileData as { onboarded?: boolean } | null)?.onboarded) {
        await apiPost("/api/onboarding/complete", {
          user_id: user.id,
        });
      }

      setAnalysisStage("routing");
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
    return <AnalysisProgress stage={analysisStage} />;
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
          onClick={() => router.push(user ? "/dashboard" : "/")}
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
