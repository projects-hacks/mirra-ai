/**
 * React hook for Perfect Corp Camera Kit SDK integration
 * Provides face detection and validation before image capture
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ───────────────────────────────────────────

export type CameraKitMode = 'face' | 'body';
export type ImageFormat = 'base64' | 'blob';

export interface CameraKitConfig {
  faceDetectionMode: 'makeup' | 'skin';
  imageFormat: ImageFormat;
  language?: string;
}

export interface CapturedImage {
  image: string | Blob;
  width?: number;
  height?: number;
}

export interface CameraKitEvents {
  onOpened?: () => void;
  onLoading?: (progress: number) => void;
  onLoaded?: () => void;
  onFaceDetectionStarted?: () => void;
  onFaceDetectionCaptured?: (images: CapturedImage[]) => void;
  onClosed?: () => void;
  onError?: (error: Error) => void;
}

// ── Global YMK Interface ────────────────────────────

declare global {
  interface Window {
    YMK?: {
      init: (config: CameraKitConfig) => void;
      openCameraKit: () => void;
      closeCameraKit: () => void;
      addEventListener: (event: string, callback: (data?: any) => void) => void;
      removeEventListener: (event: string, callback: (data?: any) => void) => void;
    };
    YMKAsyncInit?: () => void;
  }
}

// ── Hook ────────────────────────────────────────────

export function useCameraKit(events: CameraKitEvents = {}) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isSDKLoading, setIsSDKLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  
  const eventHandlersRef = useRef<Map<string, (data?: any) => void>>(new Map());
  const sdkScriptRef = useRef<HTMLScriptElement | null>(null);

  // Load SDK script
  const loadSDK = useCallback(() => {
    if (isSDKLoading || isSDKLoaded) return;
    
    setIsSDKLoading(true);
    setError(null);

    // Check if SDK is already loaded
    if (window.YMK) {
      setIsSDKLoaded(true);
      setIsSDKLoading(false);
      return;
    }

    // Define YMKAsyncInit before loading script
    window.YMKAsyncInit = function() {
      if (!window.YMK) {
        setError(new Error('YMK SDK failed to initialize'));
        setIsSDKLoading(false);
        return;
      }

      // Register event listeners
      const handlers = {
        opened: () => {
          setIsCameraOpen(true);
          events.onOpened?.();
        },
        loading: (data: { progress: number }) => {
          setLoadingProgress(data.progress);
          events.onLoading?.(data.progress);
        },
        loaded: () => {
          setLoadingProgress(100);
          events.onLoaded?.();
        },
        faceDetectionStarted: () => {
          events.onFaceDetectionStarted?.();
        },
        faceDetectionCaptured: (capturedResult: { images: CapturedImage[] }) => {
          events.onFaceDetectionCaptured?.(capturedResult.images);
        },
        closed: () => {
          setIsCameraOpen(false);
          setLoadingProgress(0);
          events.onClosed?.();
        },
      };

      // Store handlers for cleanup
      Object.entries(handlers).forEach(([event, handler]) => {
        eventHandlersRef.current.set(event, handler);
        window.YMK!.addEventListener(event, handler);
      });

      setIsSDKLoaded(true);
      setIsSDKLoading(false);
    };

    // Load SDK script
    const script = document.createElement('script');
    script.src = 'https://plugins-media.makeupar.com/v2.4-camera-kit/sdk.js';
    script.async = true;
    script.onload = () => {
      // YMKAsyncInit will be called automatically by the SDK
    };
    script.onerror = () => {
      const err = new Error('Failed to load Camera Kit SDK');
      setError(err);
      setIsSDKLoading(false);
      events.onError?.(err);
    };

    document.body.appendChild(script);
    sdkScriptRef.current = script;
  }, [isSDKLoading, isSDKLoaded, events]);

  // Open camera with config
  const openCamera = useCallback((config: Partial<CameraKitConfig> = {}) => {
    if (!window.YMK) {
      const err = new Error('Camera Kit SDK not loaded');
      setError(err);
      events.onError?.(err);
      return;
    }

    try {
      const defaultConfig: CameraKitConfig = {
        faceDetectionMode: 'skin', // Use 'skin' for onboarding analysis
        imageFormat: 'base64',
        language: 'enu',
        ...config,
      };

      window.YMK.init(defaultConfig);
      window.YMK.openCameraKit();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to open camera');
      setError(error);
      events.onError?.(error);
    }
  }, [events]);

  // Close camera
  const closeCamera = useCallback(() => {
    if (!window.YMK) return;

    try {
      window.YMK.closeCameraKit();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to close camera');
      setError(error);
      events.onError?.(error);
    }
  }, [events]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Remove event listeners
      if (window.YMK) {
        eventHandlersRef.current.forEach((handler, event) => {
          window.YMK!.removeEventListener(event, handler);
        });
      }

      // Close camera if open
      if (isCameraOpen && window.YMK) {
        window.YMK.closeCameraKit();
      }

      // Remove SDK script
      if (sdkScriptRef.current && sdkScriptRef.current.parentNode) {
        sdkScriptRef.current.parentNode.removeChild(sdkScriptRef.current);
      }

      // Cleanup global
      delete window.YMKAsyncInit;
    };
  }, [isCameraOpen]);

  return {
    isSDKLoaded,
    isSDKLoading,
    isCameraOpen,
    loadingProgress,
    error,
    loadSDK,
    openCamera,
    closeCamera,
  };
}
