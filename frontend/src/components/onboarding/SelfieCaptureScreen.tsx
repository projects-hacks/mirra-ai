"use client";

import { useState, useEffect, useRef } from "react";

// ── Props Interface ─────────────────────────────────
interface SelfieCaptureScreenProps {
  onCapture: (selfie: string) => void;
  onRecapture: () => void;
}

// ── Constants ───────────────────────────────────────
const MIN_WIDTH = 640;
const MIN_HEIGHT = 480;
const JPEG_QUALITY = 0.85;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ── Component ───────────────────────────────────────
export function SelfieCaptureScreen({
  onCapture,
  onRecapture,
}: SelfieCaptureScreenProps) {
  const [captureState, setCaptureState] = useState<
    "ready" | "capturing" | "preview" | "error"
  >("ready");
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera feed on mount
  useEffect(() => {
    initializeCamera();

    return () => {
      // Cleanup: stop all tracks when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    try {
      // Request camera access with minimum resolution
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: MIN_WIDTH, ideal: 1280 },
          height: { min: MIN_HEIGHT, ideal: 720 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCaptureState("ready");
      setError(null);
    } catch (err) {
      console.error("Failed to initialize camera:", err);
      setCaptureState("error");

      if (err instanceof Error) {
        const errorName = (err as any).name;

        if (
          errorName === "NotAllowedError" ||
          errorName === "PermissionDeniedError"
        ) {
          setError(
            "Camera access was denied. Please enable camera access to continue."
          );
        } else if (
          errorName === "NotFoundError" ||
          errorName === "DevicesNotFoundError"
        ) {
          setError(
            "No camera detected. Please connect a camera and try again."
          );
        } else if (
          errorName === "NotReadableError" ||
          errorName === "TrackStartError"
        ) {
          setError(
            "Your camera is being used by another application. Please close other apps and try again."
          );
        } else {
          setError(
            "Failed to access camera. Please check your browser settings and try again."
          );
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Camera not initialized. Please refresh the page.");
      return;
    }

    setIsProcessing(true);
    setCaptureState("capturing");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Validate video dimensions
      if (video.videoWidth < MIN_WIDTH || video.videoHeight < MIN_HEIGHT) {
        throw new Error(
          `Camera resolution too low. Minimum required: ${MIN_WIDTH}x${MIN_HEIGHT}`
        );
      }

      // Set canvas dimensions to match video (3:4 aspect ratio)
      const aspectRatio = 3 / 4;
      let width = video.videoWidth;
      let height = video.videoHeight;

      // Adjust to 3:4 aspect ratio by cropping
      const videoAspectRatio = width / height;
      if (videoAspectRatio > aspectRatio) {
        // Video is wider, crop width
        width = height * aspectRatio;
      } else {
        // Video is taller, crop height
        height = width / aspectRatio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw video frame to canvas (centered crop)
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      const sx = (video.videoWidth - width) / 2;
      const sy = (video.videoHeight - height) / 2;

      ctx.drawImage(video, sx, sy, width, height, 0, 0, width, height);

      // Convert canvas to base64 JPEG
      const base64Image = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

      // Validate file size
      const sizeInBytes = Math.ceil((base64Image.length * 3) / 4);
      if (sizeInBytes > MAX_FILE_SIZE) {
        throw new Error(
          `Image size (${(sizeInBytes / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed (5MB)`
        );
      }

      // Set captured image for preview
      setCapturedImage(base64Image);
      setCaptureState("preview");
      setError(null);
    } catch (err) {
      console.error("Failed to capture selfie:", err);
      setCaptureState("error");

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to capture image. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseThis = () => {
    if (capturedImage) {
      // Stop camera stream before proceeding
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      onCapture(capturedImage);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCaptureState("ready");
    setError(null);
    onRecapture();
  };

  const handleRetry = () => {
    setError(null);
    setCaptureState("ready");
    initializeCamera();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Camera Feed Container */}
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{
          maxWidth: "400px",
          width: "100%",
          aspectRatio: "3 / 4",
          background: "var(--surface-container)",
        }}
      >
        {/* Video Element (hidden during preview) */}
        {captureState !== "preview" && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: "scaleX(-1)", // Mirror the video
            }}
          />
        )}

        {/* Canvas Element (hidden, used for capture) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Preview Image */}
        {captureState === "preview" && capturedImage && (
          <img
            src={capturedImage}
            alt="Captured selfie"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: "scaleX(-1)", // Mirror the preview
            }}
          />
        )}

        {/* Glassmorphic Card Overlay */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center p-6">
          <div
            className="glass-card flex w-full flex-col items-center gap-4 text-center"
            style={{
              maxWidth: "340px",
            }}
          >
            {/* Ready State */}
            {captureState === "ready" && (
              <>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: "var(--on-surface)" }}
                >
                  Position Your Face
                </h2>
                <p
                  className="text-sm"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  Center your face in the frame for the best results
                </p>
                <button
                  onClick={handleCapture}
                  disabled={isProcessing}
                  className="btn-primary w-full"
                  aria-label="Start initial scan"
                >
                  {isProcessing ? (
                    <>
                      <svg
                        className="h-5 w-5 animate-spin"
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
                      <span>Capturing...</span>
                    </>
                  ) : (
                    <span>Start Initial Scan</span>
                  )}
                </button>
              </>
            )}

            {/* Preview State */}
            {captureState === "preview" && (
              <>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: "var(--on-surface)" }}
                >
                  How does this look?
                </h2>
                <div className="flex w-full gap-3">
                  <button
                    onClick={handleRetake}
                    className="btn-secondary flex-1"
                    aria-label="Retake selfie"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleUseThis}
                    className="btn-primary flex-1"
                    aria-label="Use this selfie"
                  >
                    Use This
                  </button>
                </div>
              </>
            )}

            {/* Error State */}
            {captureState === "error" && error && (
              <>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: "var(--error)", color: "white" }}
                >
                  <svg
                    className="h-6 w-6"
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
                <div
                  className="w-full rounded-lg p-3 text-sm"
                  style={{
                    background: "rgba(186, 26, 26, 0.1)",
                    color: "var(--error)",
                  }}
                  role="alert"
                >
                  <p className="font-medium">Camera Error</p>
                  <p className="mt-1">{error}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="btn-primary w-full"
                  aria-label="Retry camera access"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>

        {/* Privacy Notice (only show in ready state) */}
        {captureState === "ready" && (
          <div className="absolute left-0 right-0 top-6 flex justify-center px-6">
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
        )}
      </div>
    </div>
  );
}
