"use client";

import type { RefObject } from "react";
import type { VTOResult } from "@/types";
import { ToolName } from "@/lib/constants";
import VTODisplay from "@/components/vto/VTODisplay";

interface CameraLayerProps {
  containerRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  selfie: string | null;
  vtoResult: VTOResult | null;
  isProcessing: boolean;
  currentTool: ToolName | null;
  cameraError: string | null;
  isUsingCameraKit: boolean;
}

/** Layer 0 — Full-screen camera feed, selfie, or VTO result. */
export default function CameraLayer({
  containerRef,
  videoRef,
  selfie,
  vtoResult,
  isProcessing,
  currentTool,
  cameraError,
  isUsingCameraKit,
}: Readonly<CameraLayerProps>) {
  // Only freeze the mirror for VTO tasks that generate images. 
  // Data analysis tasks like 'analyze_skin' should keep the live camera visible.
  const isVtoTask = currentTool?.startsWith("try_on") || currentTool === "generate_proof_card";
  const shouldFreeze = !!vtoResult || (isProcessing && isVtoTask);

  return (
    <div className="absolute inset-0 z-[var(--z-camera)] h-[100dvh] w-[100dvw] overflow-hidden">
      {/* Perfect Corp SDK requires this permanent mount point by id. */}
      <div
        id="YMK-module"
        ref={containerRef}
        className={`absolute inset-0 z-10 h-full w-full ${isUsingCameraKit ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{
          opacity: shouldFreeze ? 0 : 1,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Native Camera Feed (fallback) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 z-0 h-full w-full object-cover"
        style={{
          transform: "scaleX(-1)",
          opacity: shouldFreeze || isUsingCameraKit ? 0 : 1,
          visibility: shouldFreeze || isUsingCameraKit ? "hidden" : "visible",
          transition: "opacity 0.3s ease, visibility 0.3s ease"
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(246,241,236,0.22)_0%,transparent_18%,transparent_62%,rgba(246,241,236,0.34)_100%)]" />

      {/* VTO Display with smooth transitions */}
      {(vtoResult || isProcessing) && selfie && (
        <VTODisplay
          selfie={selfie}
          vtoResult={vtoResult}
          isProcessing={isProcessing}
          currentTool={currentTool}
          showBaseImage={shouldFreeze}
        />
      )}

      {/* Camera Error */}
      {cameraError && !selfie && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg)]">
          <div className="text-center px-8">
            <div className="text-5xl mb-4">📷</div>
            <h3 className="mb-2">Camera Access Needed</h3>
            <p className="text-sm text-[var(--on-surface-variant)]">{cameraError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
