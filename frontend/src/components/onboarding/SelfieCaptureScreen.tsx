/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SelfieCaptureScreenProps {
  onCapture: (selfie: string) => void;
  onRecapture: () => void;
}

type CaptureState = "loading" | "ready" | "captured" | "error";

const MIN_WIDTH = 640;
const MIN_HEIGHT = 480;

export function SelfieCaptureScreen({
  onCapture,
  onRecapture,
}: Readonly<SelfieCaptureScreenProps>) {
  const [captureState, setCaptureState] = useState<CaptureState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedImageData, setCapturedImageData] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const mapCameraError = useCallback((err: unknown): string => {
    if (err instanceof Error) {
      if (err.name === "NotAllowedError") {
        return "Camera access was denied. Please allow camera access.";
      }
      if (err.name === "NotFoundError") {
        return "No camera detected. Please connect a camera.";
      }
      if (err.name === "NotReadableError") {
        return "Your camera is being used by another application.";
      }
    }
    return "Failed to access camera. Please try again.";
  }, []);

  const initCamera = useCallback(async () => {
    setCaptureState("loading");
    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: MIN_WIDTH, ideal: 1280 },
          height: { min: MIN_HEIGHT, ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          const playResult = videoRef.current.play();
          if (playResult instanceof Promise) {
            await playResult;
          }
        } catch {
          // Ignore play errors in non-browser environments
        }
      }

      setCaptureState("ready");
    } catch (err) {
      stopCamera();
      setErrorMessage(mapCameraError(err));
      setCaptureState("error");
    }
  }, [mapCameraError, stopCamera]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void initCamera();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      stopCamera();
    };
  }, [initCamera, stopCamera]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.videoWidth < MIN_WIDTH || video.videoHeight < MIN_HEIGHT) {
      stopCamera();
      setErrorMessage("Camera resolution too low. Please switch to a higher resolution camera.");
      setCaptureState("error");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    setCapturedImageData(dataUrl);
    setCaptureState("captured");
  }, [stopCamera]);

  const handleUse = useCallback(() => {
    if (!capturedImageData) return;
    stopCamera();
    onCapture(capturedImageData);
  }, [capturedImageData, onCapture, stopCamera]);

  const handleRetake = useCallback(() => {
    setCapturedImageData(null);
    setCaptureState("ready");
    onRecapture();
  }, [onRecapture]);

  const handleRetry = useCallback(() => {
    initCamera();
  }, [initCamera]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card w-full max-w-md space-y-4">
        <div className="relative w-full aspect-[3/4] overflow-hidden rounded-2xl bg-black/20">
          {capturedImageData ? (
            <img
              src={capturedImageData}
              alt="Captured selfie"
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              muted
            />
          )}

          {captureState === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="processing-ring h-16 w-16" />
            </div>
          )}
        </div>

        {captureState === "ready" && (
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Position Your Face</h2>
            <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
              Center your face in the frame and ensure good lighting.
            </p>
            <button onClick={handleCapture} className="btn-primary w-full">
              Start Initial Scan
            </button>
          </div>
        )}

        {captureState === "captured" && capturedImageData && (
          <div className="text-center space-y-3">
            <h2 className="text-xl font-semibold">How does this look?</h2>
            <div className="flex gap-3">
              <button onClick={handleRetake} className="btn-secondary flex-1">
                Retake
              </button>
              <button onClick={handleUse} className="btn-primary flex-1">
                Use This
              </button>
            </div>
          </div>
        )}
      </div>

      {captureState === "error" && errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card flex w-full max-w-md flex-col items-center gap-4 p-6 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "var(--error)", color: "white" }}
            >
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Camera Error</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--on-surface-variant)" }}>
                {errorMessage}
              </p>
            </div>
            <button onClick={handleRetry} className="btn-primary w-full">
              Try Again
            </button>
          </div>
        </div>
      )}

      <div className="fixed left-0 right-0 top-6 z-40 flex justify-center px-6">
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2 text-xs"
          style={{
            background: "rgba(0, 0, 0, 0.5)",
            color: "white",
            backdropFilter: "blur(10px)",
          }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
