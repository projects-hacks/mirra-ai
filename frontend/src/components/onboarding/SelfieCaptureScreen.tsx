"use client";

import { useEffect, useMemo, useState } from "react";
import { useCameraKit } from "@/hooks/useCameraKit";
import { useCamera } from "@/hooks/useCamera";

interface SelfieCaptureScreenProps {
  onCapture: (selfie: string) => void;
  onRecapture: () => void;
}

export function SelfieCaptureScreen({
  onCapture,
}: Readonly<SelfieCaptureScreenProps>) {
  const [preferNativeFallback, setPreferNativeFallback] = useState(false);
  const { videoRef, capture, isReady, error: nativeCameraError } = useCamera();

  const { loadSDK, openCamera, closeCamera, isSDKLoading, error } = useCameraKit({
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

  const useNativeCamera = useMemo(
    () => preferNativeFallback || Boolean(error),
    [error, preferNativeFallback]
  );

  // Load SDK on mount
  useEffect(() => {
    loadSDK();
  }, [loadSDK]);

  const handleStartScan = () => {
    if (useNativeCamera) {
      const selfie = capture();
      if (selfie) {
        onCapture(selfie);
      }
      return;
    }
    openCamera({ faceDetectionMode: 'skincare' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card w-full max-w-md space-y-6 p-8 text-center">
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
            <span className="text-5xl">📷</span>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Let&apos;s setup your profile</h2>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            {useNativeCamera
              ? "Camera Kit is unavailable, so we switched to your device camera. Center your face and capture when you're ready."
              : "We&apos;ll use the Perfect Corp Face SDK to perform a detailed scan of your skin health. Please ensure you are in a well-lit room."}
          </p>
        </div>

        <button
          onClick={handleStartScan}
          disabled={!useNativeCamera && isSDKLoading}
          className="btn-primary w-full py-4 text-lg mt-8 shadow-lg shadow-[var(--primary)]/20"
        >
          {useNativeCamera
            ? (isReady ? "Capture Selfie" : "Preparing Camera...")
            : (isSDKLoading ? "Loading Camera Kit..." : "Start Face Scan")}
        </button>

        {!useNativeCamera && (
          <button
            type="button"
            onClick={() => setPreferNativeFallback(true)}
            className="text-sm font-medium underline"
            style={{ color: "var(--on-surface-variant)" }}
          >
            Use device camera instead
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
              <span className="text-3xl">⚠️</span>
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
