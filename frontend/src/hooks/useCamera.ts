"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { CAMERA } from "@/lib/constants";
import { debugFlow } from "@/lib/debug";

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

interface UseCameraOptions {
  enabled?: boolean;
  cropToPortrait?: boolean;
  mirrorCapture?: boolean;
  facingMode?: "user" | "environment";
  /** Ideal capture size hints for getUserMedia (device may ignore or approximate). */
  idealWidth?: number;
  idealHeight?: number;
}

/**
 * Hook: manages camera stream.
 * Attempts to use Perfect Corp JS Camera Kit if loaded (provides face detection,
 * quality checks, guided capture). Falls back to native getUserMedia.
 */
export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const {
    enabled = true,
    cropToPortrait = true,
    mirrorCapture = true,
    facingMode = CAMERA.FACING_MODE,
    idealWidth = 1280,
    idealHeight = 720,
  } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ymkRef = useRef<YMKInstance | null>(null);
  const lastCaptureRef = useRef<string | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isUsingCameraKit = false;

  useEffect(() => {
    if (!enabled) {
      debugFlow("native-camera", "init skipped", { enabled });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }

    const ac = new AbortController();
    let cancelled = false;

    async function initCamera() {
      debugFlow("native-camera", "initCamera");
      await startNativeCamera();
    }

    async function startNativeCamera(retries = 3) {
      debugFlow("native-camera", "startNativeCamera", { retries });
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: idealWidth },
            height: { ideal: idealHeight },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];
        debugFlow("native-camera", "getUserMedia success", {
          trackLabel: videoTrack?.label,
          settings: videoTrack?.getSettings(),
        });

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;

          const tryMarkReady = () => {
            if (cancelled || ac.signal.aborted) return;
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              setIsReady(true);
              debugFlow("native-camera", "video has frame dimensions", {
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
              });
            }
          };

          video.addEventListener("loadeddata", tryMarkReady, { signal: ac.signal });
          video.addEventListener("loadedmetadata", tryMarkReady, { signal: ac.signal });

          await video.play();
          debugFlow("native-camera", "video play success", {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
          });
          tryMarkReady();
        }
      } catch (err) {
        debugFlow("native-camera", "startNativeCamera error", err);
        if (!cancelled) {
          if (retries > 0) {
            console.warn(`Camera start failed, retrying... (${retries} attempts left)`, err);
            setTimeout(() => startNativeCamera(retries - 1), 500);
            return;
          }
          const msg =
            err instanceof DOMException && err.name === "NotAllowedError"
              ? "Camera permission denied. Please allow camera access."
              : "Failed to start camera.";
          setError(msg);
          debugFlow("native-camera", "camera error state set", { message: msg });
        }
      }
    }

    void initCamera();

    return () => {
      cancelled = true;
      ac.abort();
      debugFlow("native-camera", "cleanup");
      ymkRef.current?.destroy();
      ymkRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setIsReady(false);
    };
  }, [enabled, facingMode, idealWidth, idealHeight]);

  const streamAttachedRef = useRef(false);

  // Attach stream if videoRef mounts after stream is initialized
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;

    // Check if we need to attach the stream (either it's different, or we haven't tracked it yet)
    if (video && stream && (!streamAttachedRef.current || video.srcObject !== stream)) {
      video.srcObject = stream;
      streamAttachedRef.current = true;
      debugFlow("native-camera", "attach stream to mounted video");

      const tryMarkReady = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setIsReady(true);
        }
      };
      video.addEventListener("loadeddata", tryMarkReady, { once: true });
      video.addEventListener("loadedmetadata", tryMarkReady, { once: true });

      video
        .play()
        .then(() => {
          debugFlow("native-camera", "delayed video play success", {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
          });
          tryMarkReady();
        })
        .catch((error) => {
          debugFlow("native-camera", "delayed video play error", error);
          console.error(error);
        });
    }
  });

  const capture = useCallback((): string | null => {
    debugFlow("native-camera", "capture requested", {
      isReady,
      isUsingCameraKit,
      hasVideo: Boolean(videoRef.current),
    });
    // If using Camera Kit, trigger its capture (result arrives via onCapture)
    if (isUsingCameraKit && ymkRef.current) {
      ymkRef.current.capture();
      // Return last captured result (may be from a previous capture)
      return lastCaptureRef.current;
    }

    // Native capture via canvas
    const video = videoRef.current;
    if (!video || !isReady) {
      debugFlow("native-camera", "capture skipped", { hasVideo: Boolean(video), isReady });
      return null;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      debugFlow("native-camera", "capture skipped — video dimensions not ready yet", {
        videoWidth: vw,
        videoHeight: vh,
      });
      return null;
    }

    let targetWidth = vw;
    const targetHeight = vh;
    let sourceX = 0;
    const sourceY = 0;

    // Force portrait when requested: crop sides if landscape (3:4 aspect ratio)
    if (cropToPortrait && vw > vh) {
      targetWidth = Math.floor(vh * (3 / 4));
      sourceX = Math.floor((vw - targetWidth) / 2);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    if (mirrorCapture) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    // Crop center part of the video
    ctx.drawImage(
      video,
      sourceX, sourceY, targetWidth, targetHeight,
      0, 0, targetWidth, targetHeight
    );

    const dataUrl = canvas.toDataURL("image/jpeg", CAMERA.JPEG_QUALITY);

    // Validate minimum dimensions
    if (vw < CAMERA.MIN_WIDTH) {
      console.warn(`Camera resolution too low: ${vw}px`);
    }

    debugFlow("native-camera", "capture complete", {
      sourceWidth: vw,
      sourceHeight: vh,
      targetWidth,
      targetHeight,
      sourceX,
      sourceY,
      dataUrlLength: dataUrl.length,
    });

    return dataUrl;
  }, [cropToPortrait, isReady, isUsingCameraKit, mirrorCapture]);

  const stop = useCallback(() => {
    debugFlow("native-camera", "stop requested");
    ymkRef.current?.stopCamera();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsReady(false);
  }, []);

  return { containerRef, videoRef, capture, isReady, error, stop, isUsingCameraKit };
}
