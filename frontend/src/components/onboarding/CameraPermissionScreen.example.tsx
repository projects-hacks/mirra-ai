"use client";

import { useState } from "react";
import { CameraPermissionScreen } from "./CameraPermissionScreen";

/**
 * Example usage of CameraPermissionScreen component
 * 
 * This example demonstrates:
 * 1. Basic usage with callbacks
 * 2. State management for permission status
 * 3. Integration with a multi-step flow
 */

export function CameraPermissionExample() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [currentStep, setCurrentStep] = useState<"permission" | "next">("permission");

  const handlePermissionGranted = () => {
    console.log("✅ Camera permission granted");
    setPermissionGranted(true);
    setPermissionDenied(false);
    
    // Proceed to next step after a brief delay
    setTimeout(() => {
      setCurrentStep("next");
    }, 1000);
  };

  const handlePermissionDenied = () => {
    console.log("❌ Camera permission denied");
    setPermissionDenied(true);
    setPermissionGranted(false);
  };

  if (currentStep === "next") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card text-center" style={{ maxWidth: "400px" }}>
          <h2 className="text-2xl font-bold mb-4">Next Step</h2>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            Camera permission granted! Proceeding to selfie capture...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Status Display (for demo purposes) */}
      <div
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          padding: "0.75rem 1rem",
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          border: "0.5px solid var(--glass-border)",
          borderRadius: "var(--radius-lg)",
          fontSize: "0.875rem",
          zIndex: 1000,
        }}
      >
        <div style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
          Demo Status:
        </div>
        <div style={{ color: "var(--on-surface-variant)" }}>
          Permission Granted: {permissionGranted ? "✅" : "❌"}
        </div>
        <div style={{ color: "var(--on-surface-variant)" }}>
          Permission Denied: {permissionDenied ? "✅" : "❌"}
        </div>
      </div>

      {/* Camera Permission Screen */}
      <CameraPermissionScreen
        onPermissionGranted={handlePermissionGranted}
        onPermissionDenied={handlePermissionDenied}
      />
    </div>
  );
}

/**
 * Example: Integration with OnboardingContext
 */
export function CameraPermissionWithContext() {
  // In a real implementation, you would use:
  // const { state, advanceStep, setError } = useOnboarding();
  
  const [step, setStep] = useState<"auth" | "camera_permission" | "selfie_capture">("camera_permission");

  const handlePermissionGranted = () => {
    console.log("Camera permission granted, advancing to selfie capture");
    setStep("selfie_capture");
  };

  const handlePermissionDenied = () => {
    console.error("Camera permission denied");
    // In real implementation:
    // setError({
    //   step: "camera_permission",
    //   message: "Camera access is required to continue",
    //   code: "CAMERA_DENIED",
    //   retryable: true,
    // });
  };

  if (step === "camera_permission") {
    return (
      <CameraPermissionScreen
        onPermissionGranted={handlePermissionGranted}
        onPermissionDenied={handlePermissionDenied}
      />
    );
  }

  if (step === "selfie_capture") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card text-center" style={{ maxWidth: "400px" }}>
          <h2 className="text-2xl font-bold mb-4">Selfie Capture</h2>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            Next step: Capture selfie for analysis
          </p>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Example: Custom Error Handling
 */
export function CameraPermissionWithCustomErrors() {
  const [errorLog, setErrorLog] = useState<string[]>([]);

  const handlePermissionGranted = () => {
    setErrorLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Permission granted`]);
  };

  const handlePermissionDenied = () => {
    setErrorLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Permission denied`]);
    
    // Send analytics event
    console.log("Analytics: Camera permission denied", {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
  };

  return (
    <div>
      {/* Error Log Display */}
      {errorLog.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "1rem",
            left: "1rem",
            right: "1rem",
            maxWidth: "400px",
            padding: "1rem",
            background: "var(--surface)",
            border: "1px solid var(--outline-variant)",
            borderRadius: "var(--radius-lg)",
            fontSize: "0.75rem",
            fontFamily: "monospace",
            maxHeight: "200px",
            overflowY: "auto",
            zIndex: 1000,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
            Event Log:
          </div>
          {errorLog.map((log, index) => (
            <div key={index} style={{ color: "var(--on-surface-variant)" }}>
              {log}
            </div>
          ))}
        </div>
      )}

      <CameraPermissionScreen
        onPermissionGranted={handlePermissionGranted}
        onPermissionDenied={handlePermissionDenied}
      />
    </div>
  );
}
