"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { CAMERA } from "@/lib/constants";

/* ── Native camera capture types ──────────────────── */

interface YMKInstance {
  capture: () => void;
  destroy: () => void;
  startCamera: () => void;
  stopCamera: () => void;
}

// Note: Keep this hook focused on native getUserMedia capture.

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

  // Attach stream if videoRef mounts after stream is initialized
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play()
        .then(() => setIsReady(true))
        .catch(console.error);
    }
  });

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
