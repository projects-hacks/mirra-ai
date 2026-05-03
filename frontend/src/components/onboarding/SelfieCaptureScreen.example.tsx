"use client";

import { useState } from "react";
import { SelfieCaptureScreen } from "./SelfieCaptureScreen";

/**
 * Example: Basic Usage
 * 
 * This example shows the simplest way to use the SelfieCaptureScreen component.
 */
export function BasicExample() {
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);

  const handleCapture = (selfie: string) => {
    console.log("Selfie captured:", selfie.substring(0, 50) + "...");
    setCapturedSelfie(selfie);
  };

  const handleRecapture = () => {
    console.log("User wants to retake the selfie");
  };

  if (capturedSelfie) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card max-w-md text-center">
          <h2 className="mb-4 text-2xl font-bold">Selfie Captured!</h2>
          <p className="text-sm text-gray-600">
            Image size: {Math.ceil((capturedSelfie.length * 3) / 4 / 1024)} KB
          </p>
          <button
            onClick={() => setCapturedSelfie(null)}
            className="btn-secondary mt-4"
          >
            Capture Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <SelfieCaptureScreen
      onCapture={handleCapture}
      onRecapture={handleRecapture}
    />
  );
}

/**
 * Example: Onboarding Flow Integration
 * 
 * This example shows how to integrate SelfieCaptureScreen into a complete
 * onboarding flow with state management.
 */
export function OnboardingFlowExample() {
  const [step, setStep] = useState<"permission" | "capture" | "analysis">("capture");
  const [selfie, setSelfie] = useState<string | null>(null);

  const handleCapture = async (capturedSelfie: string) => {
    setSelfie(capturedSelfie);
    setStep("analysis");

    // Simulate API call to backend
    try {
      const response = await fetch("/api/onboarding/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user-123",
          selfie: capturedSelfie,
        }),
      });

      const data = await response.json();
      console.log("Analysis results:", data);
    } catch (error) {
      console.error("Analysis failed:", error);
    }
  };

  const handleRecapture = () => {
    console.log("Recapture requested");
  };

  if (step === "analysis") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card max-w-md text-center">
          <div className="processing-ring mx-auto mb-4 h-16 w-16" />
          <h2 className="mb-2 text-2xl font-bold">Analyzing Your Appearance</h2>
          <p className="text-sm text-gray-600">
            This will take just a moment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <SelfieCaptureScreen
      onCapture={handleCapture}
      onRecapture={handleRecapture}
    />
  );
}

/**
 * Example: With Error Handling
 * 
 * This example shows how to handle errors and provide user feedback.
 */
export function ErrorHandlingExample() {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCapture = async (selfie: string) => {
    setIsUploading(true);
    setError(null);

    try {
      // Validate file size
      const sizeInBytes = Math.ceil((selfie.length * 3) / 4);
      const sizeInMB = sizeInBytes / 1024 / 1024;

      if (sizeInMB > 5) {
        throw new Error(`Image too large: ${sizeInMB.toFixed(1)}MB (max 5MB)`);
      }

      // Upload to backend
      const response = await fetch("/api/onboarding/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user-123",
          selfie,
        }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Upload successful:", data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRecapture = () => {
    setError(null);
  };

  return (
    <div>
      <SelfieCaptureScreen
        onCapture={handleCapture}
        onRecapture={handleRecapture}
      />

      {/* Error Toast */}
      {error && (
        <div
          className="fixed bottom-4 left-4 right-4 mx-auto max-w-md rounded-lg p-4"
          style={{
            background: "rgba(186, 26, 26, 0.9)",
            color: "white",
          }}
        >
          <p className="font-medium">Upload Failed</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {/* Loading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="glass-card text-center">
            <div className="processing-ring mx-auto mb-4 h-12 w-12" />
            <p className="font-medium">Uploading...</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example: With Context Integration
 * 
 * This example shows how to use SelfieCaptureScreen with OnboardingContext.
 */
export function ContextIntegrationExample() {
  // In a real app, you would use useOnboarding() hook
  const mockContext = {
    captureSelfie: (selfie: string) => {
      console.log("Selfie captured via context:", selfie.substring(0, 50) + "...");
      // Context would handle state updates and navigation
    },
    retryCurrentStep: () => {
      console.log("Retry current step via context");
    },
  };

  return (
    <SelfieCaptureScreen
      onCapture={mockContext.captureSelfie}
      onRecapture={mockContext.retryCurrentStep}
    />
  );
}

/**
 * Example: With Analytics Tracking
 * 
 * This example shows how to track user interactions for analytics.
 */
export function AnalyticsExample() {
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    console.log("Analytics Event:", eventName, properties);
    // In a real app, you would send to analytics service
  };

  const handleCapture = (selfie: string) => {
    const sizeInBytes = Math.ceil((selfie.length * 3) / 4);
    const sizeInKB = Math.round(sizeInBytes / 1024);

    trackEvent("selfie_captured", {
      fileSize: sizeInKB,
      timestamp: new Date().toISOString(),
    });

    console.log("Selfie captured:", selfie.substring(0, 50) + "...");
  };

  const handleRecapture = () => {
    trackEvent("selfie_retake_clicked");
  };

  return (
    <SelfieCaptureScreen
      onCapture={handleCapture}
      onRecapture={handleRecapture}
    />
  );
}

/**
 * Example: With Custom Validation
 * 
 * This example shows how to add custom validation before accepting the selfie.
 */
export function CustomValidationExample() {
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateSelfie = (selfie: string): boolean => {
    // Check file size
    const sizeInBytes = Math.ceil((selfie.length * 3) / 4);
    const sizeInMB = sizeInBytes / 1024 / 1024;

    if (sizeInMB > 5) {
      setValidationError(`Image too large: ${sizeInMB.toFixed(1)}MB (max 5MB)`);
      return false;
    }

    // Check if it's a valid base64 JPEG
    if (!selfie.startsWith("data:image/jpeg;base64,")) {
      setValidationError("Invalid image format. Expected JPEG.");
      return false;
    }

    return true;
  };

  const handleCapture = (selfie: string) => {
    setValidationError(null);

    if (!validateSelfie(selfie)) {
      return;
    }

    console.log("Selfie validated and accepted");
    // Proceed with upload
  };

  const handleRecapture = () => {
    setValidationError(null);
  };

  return (
    <div>
      <SelfieCaptureScreen
        onCapture={handleCapture}
        onRecapture={handleRecapture}
      />

      {validationError && (
        <div
          className="fixed bottom-4 left-4 right-4 mx-auto max-w-md rounded-lg p-4"
          style={{
            background: "rgba(186, 26, 26, 0.9)",
            color: "white",
          }}
        >
          <p className="font-medium">Validation Error</p>
          <p className="mt-1 text-sm">{validationError}</p>
        </div>
      )}
    </div>
  );
}
