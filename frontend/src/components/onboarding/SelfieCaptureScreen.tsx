"use client";

import { useEffect } from "react";
import { useCameraKit } from "@/hooks/useCameraKit";

interface SelfieCaptureScreenProps {
  onCapture: (selfie: string) => void;
  onRecapture: () => void;
}

export function SelfieCaptureScreen({
  onCapture,
}: Readonly<SelfieCaptureScreenProps>) {
  const { loadSDK, openCamera, closeCamera, isSDKLoading, error } = useCameraKit({
    onFaceDetectionCaptured: (images) => {
      if (images && images.length > 0) {
        const dataUrl = typeof images[0].image === 'string'
          ? images[0].image
          : URL.createObjectURL(images[0].image as Blob);
        closeCamera();
        onCapture(dataUrl);
      }
    }
  });

  // Load SDK on mount
  useEffect(() => {
    loadSDK();
  }, [loadSDK]);

  const handleStartScan = () => {
    openCamera({ faceDetectionMode: 'skincare' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card w-full max-w-md space-y-6 p-8 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--primary)]/20">
          <span className="text-5xl">📷</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Let&apos;s setup your profile</h2>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            We&apos;ll use the Perfect Corp Face SDK to perform a detailed scan of your skin health. Please ensure you are in a well-lit room.
          </p>
        </div>

        <button
          onClick={handleStartScan}
          disabled={isSDKLoading}
          className="btn-primary w-full py-4 text-lg mt-8 shadow-lg shadow-[var(--primary)]/20"
        >
          {isSDKLoading ? "Loading Camera Kit..." : "Start Face Scan"}
        </button>
      </div>

      {error && (
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
                {error.message || "Failed to load Perfect Corp SDK"}
              </p>
            </div>
            <button onClick={handleStartScan} className="btn-primary w-full">
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
