"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, TriangleAlert } from "lucide-react";
import { useCameraKit } from "@/hooks/useCameraKit";
import { useCamera } from "@/hooks/useCamera";
import { ENABLE_CAMERA_KIT } from "@/lib/constants";

interface SelfieCaptureScreenProps {
  onCapture: (selfie: string) => void;
  onRecapture: () => void;
}

export function SelfieCaptureScreen({
  onCapture,
}: Readonly<SelfieCaptureScreenProps>) {
  const [preferNativeFallback, setPreferNativeFallback] = useState(false);
  const useNativeCamera = useMemo(
    () => !ENABLE_CAMERA_KIT || preferNativeFallback,
    [preferNativeFallback]
  );
  const { videoRef, capture, isReady, error: nativeCameraError } = useCamera({
    enabled: useNativeCamera,
  });

  const { loadSDK, openCamera, closeCamera, isSDKLoaded, isSDKLoading, error } = useCameraKit({
    onFaceDetectionCaptured: async (images) => {
      if (images && images.length > 0) {
        const dataUrl = typeof images[0].image === "string"
          ? images[0].image
          : await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(String(reader.result));
              reader.onerror = () => reject(new Error("Failed to read captured image"));
              reader.readAsDataURL(images[0].image as Blob);
            });
        closeCamera();
        onCapture(dataUrl);
      }
    }
  });

  // Load SDK on mount
  useEffect(() => {
    if (!ENABLE_CAMERA_KIT || preferNativeFallback) {
      return;
    }
    loadSDK();
  }, [loadSDK, preferNativeFallback]);

  const handleStartScan = () => {
    if (!ENABLE_CAMERA_KIT) {
      const selfie = capture();
      if (selfie) {
        onCapture(selfie);
      }
      return;
    }

    if (useNativeCamera) {
      const selfie = capture();
      if (selfie) {
        onCapture(selfie);
      }
      return;
    }

    if (isSDKLoading) {
      return;
    }

    if (!isSDKLoaded) {
      loadSDK();
      return;
    }

    openCamera({ faceDetectionMode: 'skincare' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card w-full max-w-3xl space-y-6 p-6 sm:p-8">
        {useNativeCamera ? (
          <div className="overflow-hidden rounded-[1.75rem] border border-white/30 bg-black/20">
            <video
              ref={videoRef}
              className="h-[420px] w-full object-cover"
              autoPlay
              playsInline
              muted
            />
          </div>
        ) : (
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--primary)]/20">
            <Camera size={42} aria-hidden="true" />
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-center text-2xl font-bold text-white">Let&apos;s setup your profile</h2>
          <p className="mx-auto max-w-xl text-center text-sm" style={{ color: "var(--on-surface-variant)" }}>
            {useNativeCamera
              ? "Center your face and capture when you're ready. Perfect Corp Camera Kit is paused while using the device camera fallback."
              : "We'll use the Perfect Corp Face SDK to perform a detailed scan of your skin health. Please ensure you are in a well-lit room."}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "Bright, even lighting",
            "Face centered and forward",
            "Forehead and cheeks visible",
            "No glasses, hair, or hands covering features",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" aria-hidden="true" />
              <span style={{ color: "var(--on-surface-variant)" }}>{item}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleStartScan}
          disabled={!useNativeCamera && isSDKLoading}
          className="btn-primary w-full py-4 text-lg mt-8 shadow-lg shadow-[var(--primary)]/20"
        >
          {useNativeCamera
            ? (isReady ? "Capture Selfie" : "Preparing Camera...")
            : (isSDKLoading ? "Loading Camera Kit..." : isSDKLoaded ? "Start Face Scan" : "Retry Camera Kit")}
        </button>

        {ENABLE_CAMERA_KIT && !useNativeCamera && (
          <button
            type="button"
            onClick={() => setPreferNativeFallback(true)}
            className="text-sm font-medium underline"
            style={{ color: "var(--on-surface-variant)" }}
          >
            Use device camera instead
          </button>
        )}

        {ENABLE_CAMERA_KIT && useNativeCamera && (
          <button
            type="button"
            onClick={() => setPreferNativeFallback(false)}
            className="text-sm font-medium underline"
            style={{ color: "var(--on-surface-variant)" }}
          >
            Try Perfect Corp Camera Kit again
          </button>
        )}
      </div>

      {(error || nativeCameraError) && !useNativeCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card flex w-full max-w-md flex-col items-center gap-4 p-6 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "var(--error)", color: "white" }}
            >
              <TriangleAlert size={28} aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Camera Kit Error</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--on-surface-variant)" }}>
                {error?.message || nativeCameraError || "Failed to load Perfect Corp SDK"}
              </p>
            </div>
            <button onClick={() => setPreferNativeFallback(true)} className="btn-primary w-full">
              Continue With Device Camera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
