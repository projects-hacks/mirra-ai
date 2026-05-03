"use client";

import { useState, type RefObject } from "react";
import type { VTOResult } from "@/types";
import { ToolName, LOADING_TEXT } from "@/lib/constants";

interface CameraPanelProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  selfie: string | null;
  vtoResult: VTOResult | null;
  isProcessing: boolean;
  currentTool: ToolName | null;
  cameraError: string | null;
  onRecapture: () => void;
}

export default function CameraPanel({
  videoRef,
  selfie,
  vtoResult,
  isProcessing,
  currentTool,
  cameraError,
  onRecapture,
}: CameraPanelProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  // Active display: VTO result, selfie, or camera feed
  const displayImage = showOriginal ? selfie : vtoResult?.imageUrl ?? selfie;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Live Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)", display: selfie ? "none" : "block" }}
      />

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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 fade-in z-10">
          <div className="processing-ring" />
          <p className="mt-4 text-sm text-white/80">
            {currentTool ? LOADING_TEXT[currentTool] : "Processing…"}
          </p>
        </div>
      )}

      {/* Camera Error */}
      {cameraError && !selfie && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-surface)]">
          <div className="text-center px-6">
            <div className="text-4xl mb-3">📷</div>
            <p className="text-sm text-[var(--text-secondary)]">{cameraError}</p>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20">
        {/* Before/After toggle */}
        {vtoResult && (
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="btn-ghost text-xs"
          >
            {showOriginal ? "Show Result" : "Show Original"}
          </button>
        )}

        {/* Recapture */}
        {selfie && (
          <button
            onClick={onRecapture}
            className="btn-ghost text-xs ml-auto"
          >
            📸 Recapture
          </button>
        )}
      </div>

      {/* Status Badge */}
      <div className="absolute top-4 left-4 z-20">
        <div className="glass-subtle px-3 py-1.5 text-xs font-medium flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: selfie ? "var(--success)" : "var(--warning)",
            }}
          />
          {selfie ? "Ready" : "Initializing camera…"}
        </div>
      </div>
    </div>
  );
}
