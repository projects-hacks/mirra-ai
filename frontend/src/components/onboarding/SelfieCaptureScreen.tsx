/**
 * Selfie Capture Screen
 * Uses Perfect Corp Camera Kit SDK for face detection with real-time validation
 * Provides automatic face alignment, lighting detection, and quality validation
 */

"use client";

import { useEffect, useState } from "react";
import { useCameraKit, type CapturedImage } from "@/hooks/useCameraKit";

// ── Props Interface ─────────────────────────────────
interface SelfieCaptureScreenProps {
  onCapture: (selfie: string) => void;
  onRecapture: () => void;
}

// ── Component ───────────────────────────────────────
export function SelfieCaptureScreen({
  onCapture,
  onRecapture,
}: SelfieCaptureScreenProps) {
  const [captureState, setCaptureState] = useState<
    "loading" | "ready" | "capturing" | "captured" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedImageData, setCapturedImageData] = useState<string | null>(null);

  const {
    isSDKLoaded,
    isSDKLoading,
    isCameraOpen,
    error: sdkError,
    loadSDK,
    openCamera,
    closeCamera,
  } = useCameraKit({
    onOpened: () => {
      console.log("Camera Kit opened");
    },
    onLoading: (progress) => {
      console.log(`Loading: ${progress}%`);
    },
    onLoaded: () => {
      console.log("Camera Kit loaded");
      setCaptureState("ready");
    },
    onFaceDetectionStarted: () => {
      console.log("Face detection started");
      setCaptureState("capturing");
    },
    onFaceDetectionCaptured: (images: CapturedImage[]) => {
      console.log("Image captured", images);
      
      if (images.length === 0) {
        setErrorMessage("No image captured. Please try again.");
        setCaptureState("error");
        return;
      }

      const capturedImage = images[0];
      
      // Convert to base64 if blob
      if (typeof capturedImage.image === "string") {
        setCapturedImageData(capturedImage.image);
        setCaptureState("captured");
      } else {
        // Convert Blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setCapturedImageData(base64);
          setCaptureState("captured");
        };
        reader.onerror = () => {
          setErrorMessage("Failed to process captured image.");
          setCaptureState("error");
        };
        reader.readAsDataURL(capturedImage.image);
      }
    },
    onClosed: () => {
      console.log("Camera Kit closed");
    },
    onError: (error) => {
      console.error("Camera Kit error:", error);
      setErrorMessage(error.message);
      setCaptureState("error");
    },
  });

  // Load SDK on mount
  useEffect(() => {
    console.log("[SelfieCaptureScreen] Mounting, loading SDK...");
    loadSDK();
  }, [loadSDK]);

  // Open camera immediately when SDK is loaded (don't wait for state change)
  useEffect(() => {
    if (isSDKLoaded && !isCameraOpen) {
      console.log("[SelfieCaptureScreen] SDK loaded, opening camera immediately...");
      setCaptureState("ready"); // Set to ready immediately
      openCamera({
        faceDetectionMode: "skincare", // Use 'skincare' mode for onboarding
        imageFormat: "base64",
        language: "enu",
      });
    }
  }, [isSDKLoaded, isCameraOpen, openCamera]);

  // Fallback: Check if Camera Kit captured but didn't fire event
  // The SDK might show a preview without firing faceDetectionCaptured
  useEffect(() => {
    if (captureState === "capturing") {
      // After 5 seconds of "capturing" state, assume capture succeeded
      // and show the confirmation UI
      const timer = setTimeout(() => {
        console.log("[SelfieCaptureScreen] Capture timeout - assuming success, showing confirmation");
        setCaptureState("captured");
        // Try to extract image from Camera Kit DOM if available
        const ymkModule = document.getElementById("YMK-module");
        if (ymkModule) {
          const canvas = ymkModule.querySelector("canvas");
          if (canvas) {
            try {
              const base64 = canvas.toDataURL("image/jpeg");
              setCapturedImageData(base64);
              console.log("[SelfieCaptureScreen] Extracted image from canvas");
            } catch (err) {
              console.error("[SelfieCaptureScreen] Failed to extract canvas:", err);
            }
          }
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [captureState]);

  // Handle SDK errors
  useEffect(() => {
    if (sdkError) {
      setErrorMessage(sdkError.message);
      setCaptureState("error");
    }
  }, [sdkError]);

  const handleCancel = () => {
    closeCamera();
    onRecapture();
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setCaptureState("loading");
    setCapturedImageData(null);
    openCamera({
      faceDetectionMode: "skincare",
      imageFormat: "base64",
      language: "enu",
    });
  };

  const handleAnalyze = () => {
    if (capturedImageData) {
      closeCamera();
      onCapture(capturedImageData);
    }
  };

  const handleRecaptureImage = () => {
    setCapturedImageData(null);
    setCaptureState("loading");
    openCamera({
      faceDetectionMode: "skincare",
      imageFormat: "base64",
      language: "enu",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Camera Kit Mount Point */}
      <div id="YMK-module" className="w-full max-w-md" />

      {/* Loading Overlay - Only show during SDK loading */}
      {isSDKLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card flex flex-col items-center gap-4 p-6">
            <div className="relative h-16 w-16">
              <svg
                className="h-16 w-16 animate-spin"
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
            </div>
            <div className="text-center">
              <p
                className="text-lg font-semibold"
                style={{ color: "var(--on-surface)" }}
              >
                Initializing Camera...
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--on-surface-variant)" }}
              >
                This will only take a moment
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {captureState === "error" && errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card flex w-full max-w-md flex-col items-center gap-4 p-6">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "var(--error)", color: "white" }}
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div className="text-center">
              <h3
                className="text-xl font-semibold"
                style={{ color: "var(--on-surface)" }}
              >
                Camera Error
              </h3>
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--on-surface-variant)" }}
              >
                {errorMessage}
              </p>
            </div>
            <div className="flex w-full gap-3">
              <button
                onClick={handleCancel}
                className="btn-secondary flex-1"
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleRetry}
                className="btn-primary flex-1"
                aria-label="Try again"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Overlay (when ready) */}
      {captureState === "ready" && (
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-6">
          <div className="glass-card max-w-md text-center">
            <p
              className="text-sm font-medium"
              style={{ color: "var(--on-surface)" }}
            >
              Position your face in the frame. The camera will guide you to the perfect angle.
            </p>
            <button
              onClick={handleCancel}
              className="btn-secondary mt-3 w-full"
              aria-label="Cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Captured Image Confirmation */}
      {captureState === "captured" && (
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-6">
          <div className="glass-card max-w-md text-center">
            <p
              className="text-sm font-medium mb-4"
              style={{ color: "var(--on-surface)" }}
            >
              Great! Ready to analyze your skin?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRecaptureImage}
                className="btn-secondary flex-1"
                aria-label="Retake photo"
              >
                Retake
              </button>
              <button
                onClick={handleAnalyze}
                className="btn-primary flex-1"
                aria-label="Analyze skin"
              >
                Analyze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="fixed left-0 right-0 top-6 z-40 flex justify-center px-6">
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2 text-xs"
          style={{
            background: "rgba(0, 0, 0, 0.5)",
            color: "white",
            backdropFilter: "blur(10px)",
          }}
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
          <span>Your images are processed securely</span>
        </div>
      </div>
    </div>
  );
}
