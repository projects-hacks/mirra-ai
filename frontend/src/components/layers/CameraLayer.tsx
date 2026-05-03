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
}: CameraLayerProps) {
  return (
    <div className="absolute inset-0 z-0">
      {/* JS Camera Kit Container (renders its own UI with face detection) */}
      {isUsingCameraKit && (
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: selfie ? "none" : "block" }}
        />
      )}

      {/* Native Camera Feed (fallback) */}
      {!isUsingCameraKit && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: "scaleX(-1)",
            display: selfie ? "none" : "block",
          }}
        />
      )}

      {/* VTO Display with smooth transitions */}
      {selfie && (
        <VTODisplay
          selfie={selfie}
          vtoResult={vtoResult}
          isProcessing={isProcessing}
          currentTool={currentTool}
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
