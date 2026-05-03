"use client";

import type { RefObject } from "react";
import type { VTOResult } from "@/types";
import { ToolName, LOADING_TEXT } from "@/lib/constants";

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
  const displayImage = vtoResult?.imageUrl ?? selfie;

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

      {/* Captured Selfie / VTO Result */}
      {displayImage && (
        <img
          src={displayImage}
          alt="Preview"
          className="absolute inset-0 w-full h-full object-cover fade-in"
        />
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 fade-in z-10">
          <div className="processing-ring" />
          <p className="mt-4 text-sm text-white font-medium">
            {currentTool ? LOADING_TEXT[currentTool] : "Processing…"}
          </p>
        </div>
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
