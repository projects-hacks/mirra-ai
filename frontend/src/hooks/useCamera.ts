"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { CAMERA } from "@/lib/constants";

/* ── Perfect Corp JS Camera Kit types (OLD API - DEPRECATED) ── */
// DEPRECATED: This hook uses the old photo mode API
// The new Camera Kit SDK (useCameraKit.ts) should be used instead
// This is kept only for backward compatibility with the main app interface

interface YMKInstance {
  capture: () => void;
  destroy: () => void;
  startCamera: () => void;
  stopCamera: () => void;
}

// Note: We don't declare window.YMK here to avoid conflicts with useCameraKit.ts
// The main app should be migrated to use the new Camera Kit SDK

interface UseCameraReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  capture: () => string | null;
  isReady: boolean;
  error: string | null;
  stop: () => void;
  isUsingCameraKit: boolean;
}

/**
 * Hook: manages camera stream.
 * Attempts to use Perfect Corp JS Camera Kit if loaded (provides face detection,
 * quality checks, guided capture). Falls back to native getUserMedia.
 */
export function useCamera(): UseCameraReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ymkRef = useRef<YMKInstance | null>(null);
  const lastCaptureRef = useRef<string | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingCameraKit, setIsUsingCameraKit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      // DEPRECATED: Old photo mode API - should migrate to new Camera Kit SDK
      // For now, skip Camera Kit and use native camera directly
      // The YMK global is reserved for the new Camera Kit SDK (v2.4)

      // Fallback: native getUserMedia
      await startNativeCamera();
    }

    async function startNativeCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: CAMERA.FACING_MODE,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof DOMException && err.name === "NotAllowedError"
              ? "Camera permission denied. Please allow camera access."
              : "Failed to start camera.";
          setError(msg);
        }
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      ymkRef.current?.destroy();
      ymkRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setIsReady(false);
    };
  }, []);

  const capture = useCallback((): string | null => {
    // If using Camera Kit, trigger its capture (result arrives via onCapture)
    if (isUsingCameraKit && ymkRef.current) {
      ymkRef.current.capture();
      // Return last captured result (may be from a previous capture)
      return lastCaptureRef.current;
    }

    // Native capture via canvas
    const video = videoRef.current;
    if (!video || !isReady) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    let targetWidth = vw;
    let targetHeight = vh;
    let sourceX = 0;
    let sourceY = 0;

    // Force portrait: crop sides if landscape (3:4 aspect ratio)
    if (vw > vh) {
      targetWidth = Math.floor(vh * (3 / 4));
      sourceX = Math.floor((vw - targetWidth) / 2);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Mirror the capture (front camera is mirrored)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    // Crop center part of the video
    ctx.drawImage(
      video,
      sourceX, sourceY, targetWidth, targetHeight,
      0, 0, targetWidth, targetHeight
    );

    const dataUrl = canvas.toDataURL("image/jpeg", CAMERA.JPEG_QUALITY);

    // Validate minimum dimensions
    if (video.videoWidth < CAMERA.MIN_WIDTH) {
      console.warn(`Camera resolution too low: ${video.videoWidth}px`);
    }

    return dataUrl;
  }, [isReady, isUsingCameraKit]);

  const stop = useCallback(() => {
    ymkRef.current?.stopCamera();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsReady(false);
  }, []);

  return { containerRef, videoRef, capture, isReady, error, stop, isUsingCameraKit };
}
