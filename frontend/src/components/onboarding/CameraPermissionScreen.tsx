"use client";

import { useCallback, useEffect, useState } from "react";

// ── Props Interface ─────────────────────────────────
interface CameraPermissionScreenProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

// ── Browser Detection ───────────────────────────────
function getBrowserName(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes("chrome") && !userAgent.includes("edg")) {
    return "Chrome";
  } else if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
    return "Safari";
  } else if (userAgent.includes("firefox")) {
    return "Firefox";
  } else if (userAgent.includes("edg")) {
    return "Edge";
  }
  
  return "your browser";
}

// ── Browser-Specific Instructions ───────────────────
function getBrowserInstructions(browser: string): string[] {
  switch (browser) {
    case "Chrome":
    case "Edge":
      return [
        "Click the camera icon in the address bar",
        "Select 'Allow' for camera access",
        "Refresh the page if needed",
      ];
    case "Safari":
      return [
        "Go to Safari > Settings for This Website",
        "Set Camera to 'Allow'",
        "Refresh the page",
      ];
    case "Firefox":
      return [
        "Click the camera icon in the address bar",
        "Select 'Allow' from the dropdown",
        "Refresh the page if needed",
      ];
    default:
      return [
        "Look for the camera icon in your browser",
        "Allow camera access when prompted",
        "Refresh the page if needed",
      ];
  }
}

// ── Component ───────────────────────────────────────
export function CameraPermissionScreen({
  onPermissionGranted,
  onPermissionDenied,
}: Readonly<CameraPermissionScreenProps>) {
  const [permissionState, setPermissionState] = useState<
    "prompt" | "granted" | "denied" | "checking"
  >("checking");
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [browser] = useState(getBrowserName());

  const requestCameraPermission = useCallback(async () => {
    setIsRequesting(true);
    setError(null);

    try {
      // Request camera access with minimum resolution
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
          facingMode: "user",
        },
      });

      // Permission granted - stop the stream and notify parent
      stream.getTracks().forEach((track) => track.stop());

      setPermissionState("granted");
      onPermissionGranted();
    } catch (err) {
      setIsRequesting(false);

      // Handle different error types
      if (err instanceof Error) {
        const errorName = err.name;

        if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
          setPermissionState("denied");
          setError("Camera access was denied. Please enable camera access to continue.");
          onPermissionDenied();
        } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
          setPermissionState("denied");
          setError("No camera detected. Please connect a camera and try again.");
          onPermissionDenied();
        } else if (errorName === "NotReadableError" || errorName === "TrackStartError") {
          setPermissionState("denied");
          setError("Your camera is being used by another application. Please close other apps and try again.");
          onPermissionDenied();
        } else if (errorName === "OverconstrainedError") {
          setPermissionState("denied");
          setError("Your camera doesn't meet the minimum requirements (640x480). Please try a different device.");
          onPermissionDenied();
        } else if (errorName === "SecurityError") {
          setPermissionState("denied");
          setError("Camera access is blocked due to security settings. Please check your browser settings.");
          onPermissionDenied();
        } else {
          setPermissionState("denied");
          setError("Failed to access camera. Please check your browser settings and try again.");
          onPermissionDenied();
        }
      } else {
        setPermissionState("denied");
        setError("An unexpected error occurred. Please try again.");
        onPermissionDenied();
      }
    }
  }, [onPermissionDenied, onPermissionGranted]);

  const checkPermissionState = useCallback(async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not supported in this browser.");
        setPermissionState("denied");
        return;
      }

      // Try to query permission state (not supported in all browsers)
      if (navigator.permissions?.query) {
        try {
          const result = await navigator.permissions.query({
            name: "camera" as PermissionName,
          });

          setPermissionState(result.state as "prompt" | "granted" | "denied");

          if (result.state === "granted") {
            // Verify camera is actually accessible
            await requestCameraPermission();
          }

          // Listen for permission changes
          result.addEventListener("change", () => {
            setPermissionState(result.state as "prompt" | "granted" | "denied");
          });
        } catch {
          // Permission query not supported, default to prompt
          setPermissionState("prompt");
        }
      } else {
        // Permissions API not supported, default to prompt
        setPermissionState("prompt");
      }
    } catch (err) {
      console.error("Error checking permission state:", err);
      setPermissionState("prompt");
    }
  }, [requestCameraPermission]);

  // Check initial permission state
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void checkPermissionState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [checkPermissionState]);

  const handleRetry = () => {
    setError(null);
    setPermissionState("prompt");
    requestCameraPermission();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Glassmorphic Card */}
      <div
        className="glass-card flex flex-col items-center gap-6 text-center"
        style={{
          maxWidth: "400px",
          width: "100%",
        }}
      >
        {/* Camera Icon */}
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: "var(--surface-container)",
          }}
        >
          <svg
            className="h-10 w-10"
            style={{ color: "var(--on-surface)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        {/* Title and Description */}
        <div className="flex flex-col gap-2">
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--on-surface)" }}
          >
            Camera Access Required
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--on-surface-variant)" }}
          >
            Mirra needs camera access to analyze your appearance and provide
            personalized recommendations.
          </p>
        </div>

        {/* Permission State UI */}
        {permissionState === "checking" && (
          <div className="flex flex-col items-center gap-3">
            <div className="processing-ring h-12 w-12" />
            <p
              className="text-sm"
              style={{ color: "var(--on-surface-variant)" }}
            >
              Checking camera permissions...
            </p>
          </div>
        )}

        {permissionState === "prompt" && (
          <button
            onClick={requestCameraPermission}
            disabled={isRequesting}
            className="btn-primary w-full"
            aria-label="Enable camera access"
          >
            {isRequesting ? (
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
                <span>Requesting access...</span>
              </>
            ) : (
              <span>Enable Camera</span>
            )}
          </button>
        )}

        {permissionState === "granted" && (
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "var(--success)", color: "white" }}
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--success)" }}
            >
              Camera access granted
            </p>
          </div>
        )}

        {permissionState === "denied" && (
          <>
            {/* Error Message */}
            {error && (
              <div
                className="w-full rounded-lg p-3 text-sm"
                style={{
                  background: "rgba(186, 26, 26, 0.1)",
                  color: "var(--error)",
                }}
                role="alert"
              >
                <p className="font-medium">Camera Access Denied</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            {/* Browser-Specific Instructions */}
            <div
              className="w-full rounded-lg p-4 text-left"
              style={{
                background: "var(--surface-container)",
              }}
            >
              <p
                className="mb-3 text-sm font-semibold"
                style={{ color: "var(--on-surface)" }}
              >
                How to enable camera in {browser}:
              </p>
              <ol className="space-y-2">
                {getBrowserInstructions(browser).map((instruction, index) => (
                  <li
                    key={instruction}
                    className="flex gap-2 text-sm"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    <span
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      style={{
                        background: "var(--primary)",
                        color: "var(--on-primary)",
                      }}
                    >
                      {index + 1}
                    </span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Retry Button */}
            <button
              onClick={handleRetry}
              className="btn-primary w-full"
              aria-label="Retry camera access"
            >
              Try Again
            </button>
          </>
        )}

        {/* Privacy Notice */}
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: "var(--on-surface-muted)" }}
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
          <span>Your images are processed securely and never shared</span>
        </div>
      </div>
    </div>
  );
}
