/**
 * React hook for Perfect Corp Camera Kit SDK integration
 * Provides face detection and validation before image capture
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { debugFlow } from "@/lib/debug";

// ── Types ───────────────────────────────────────────

export type CameraKitMode = 'face' | 'body';
export type ImageFormat = 'base64' | 'blob';
export type FaceDetectionMode =
  | 'makeup'
  | 'skincare'
  | 'shadefinder'
  | 'facereshape'
  | 'earring'
  | 'necklace';

export interface CameraKitConfig {
  faceDetectionMode: FaceDetectionMode;
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

// ── Global YMK Interface (Camera Kit SDK v2.2) ────────────────────────────
// Note: The SDK creates window.YMK, not window.YMKCameraKit
// This is the v2.2 Camera Kit API (different from the old photo mode API)

interface YMKCameraKitSDK {
  init: (config: CameraKitConfig) => void;
  openCameraKit: () => void;
  closeCameraKit?: () => void;
  close?: () => void;
  addEventListener: (event: string, callback: (data?: unknown) => void) => void;
  removeEventListener: (event: string, callback: (data?: unknown) => void) => void;
}

declare global {
  interface Window {
    YMK?: YMKCameraKitSDK;
    ymkAsyncInit?: () => void;
  }
}

function isCapturedImage(value: unknown): value is CapturedImage {
  return (
    typeof value === "object" &&
    value !== null &&
    "image" in value &&
    (
      typeof (value as { image: unknown }).image === "string" ||
      (value as { image: unknown }).image instanceof Blob
    )
  );
}

function extractCapturedImages(value: unknown): CapturedImage[] {
  if (Array.isArray(value)) {
    return value.filter(isCapturedImage);
  }

  if (isCapturedImage(value)) {
    return [value];
  }

  if (typeof value !== "object" || value === null) {
    return [];
  }

  const record = value as Record<string, unknown>;
  const candidates = [
    record.images,
    record.image,
    record.data,
    record.detail,
    record.result,
    record.payload,
  ];

  for (const candidate of candidates) {
    const images = extractCapturedImages(candidate);
    if (images.length > 0) return images;
  }

  return [];
}

const CAMERA_KIT_ROOT_SELECTORS = [
  "#YMK-wrapper",
  "#ymk-wrapper",
  "#YMK-container",
  "#ymk-container",
  "#YMK-cameraKit",
  "#ymk-cameraKit",
  ".YMK-wrapper",
  ".ymk-wrapper",
  ".YMK-container",
  ".ymk-container",
  ".YMK-cameraKit",
  ".ymk-cameraKit",
  "[id*='YMK']",
  "[id*='ymk']",
  "[class*='YMK']",
  "[class*='ymk']",
];

function isIgnoredBodyChild(element: Element) {
  const tagName = element.tagName.toLowerCase();
  if (["script", "style", "link", "meta"].includes(tagName)) return true;
  if (element.id === "__next") return true;
  if (element.id === "YMK-module") return true;
  if (element.getAttribute("data-nextjs-toast") !== null) return true;
  if (element.tagName.toLowerCase() === "next-route-announcer") return true;
  return false;
}

function applyImportantStyle(element: HTMLElement, property: string, value: string) {
  element.style.setProperty(property, value, "important");
}

function styleCameraKitRoot(element: HTMLElement) {
  element.dataset.mirraCameraKitRoot = "true";
  applyImportantStyle(element, "position", "fixed");
  applyImportantStyle(element, "top", "env(safe-area-inset-top, 0px)");
  applyImportantStyle(element, "bottom", "env(safe-area-inset-bottom, 0px)");
  applyImportantStyle(element, "left", "50%");
  applyImportantStyle(element, "transform", "translateX(-50%)");
  applyImportantStyle(element, "width", "min(100vw, var(--camera-kit-stage-width, 520px))");
  applyImportantStyle(
    element,
    "height",
    "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))"
  );
  applyImportantStyle(element, "max-width", "none");
  applyImportantStyle(element, "max-height", "none");
  applyImportantStyle(element, "margin", "0");
  applyImportantStyle(element, "padding", "0");
  applyImportantStyle(element, "z-index", "80");
  applyImportantStyle(element, "background", "#050712");
  applyImportantStyle(element, "overflow", "visible");
  applyImportantStyle(element, "box-shadow", "0 0 0 9999px rgba(5, 7, 18, 0.92)");

  element.querySelectorAll<HTMLElement>("iframe, video, canvas").forEach((child) => {
    applyImportantStyle(child, "width", "100%");
    applyImportantStyle(child, "height", "100%");
    applyImportantStyle(child, "max-width", "none");
    applyImportantStyle(child, "max-height", "none");
    applyImportantStyle(child, "object-fit", "contain");
  });
}

function styleKnownCameraKitRoots() {
  CAMERA_KIT_ROOT_SELECTORS.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach(styleCameraKitRoot);
  });
}

// ── Hook ────────────────────────────────────────────

export function useCameraKit(events: CameraKitEvents = {}) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isSDKLoading, setIsSDKLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  
  const eventHandlersRef = useRef<Map<string, (data?: unknown) => void>>(new Map());
  const sdkScriptRef = useRef<HTMLScriptElement | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCameraOpenRef = useRef(false);
  const isOpeningRef = useRef(false);
  const bodyChildrenBeforeOpenRef = useRef<Set<Element>>(new Set());
  const cameraDomObserverRef = useRef<MutationObserver | null>(null);

  // Load SDK script
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const pinVendorCameraOverlay = useCallback(() => {
    styleKnownCameraKitRoots();

    Array.from(document.body.children).forEach((child) => {
      if (bodyChildrenBeforeOpenRef.current.has(child)) return;
      if (isIgnoredBodyChild(child)) return;
      if (child instanceof HTMLElement) {
        styleCameraKitRoot(child);
      }
    });
  }, []);

  const stopCameraKitDomGuard = useCallback(() => {
    cameraDomObserverRef.current?.disconnect();
    cameraDomObserverRef.current = null;
    document.body.dataset.mirraCameraKitOpen = "false";
    document.body.style.removeProperty("overflow");
  }, []);

  const startCameraKitDomGuard = useCallback(() => {
    bodyChildrenBeforeOpenRef.current = new Set(Array.from(document.body.children));
    document.body.dataset.mirraCameraKitOpen = "true";
    document.body.style.setProperty("overflow", "hidden", "important");
    cameraDomObserverRef.current?.disconnect();
    cameraDomObserverRef.current = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (bodyChildrenBeforeOpenRef.current.has(node)) return;
          if (isIgnoredBodyChild(node)) return;
          styleCameraKitRoot(node);
        });
      });
      pinVendorCameraOverlay();
    });
    cameraDomObserverRef.current.observe(document.body, { childList: true });
    window.setTimeout(pinVendorCameraOverlay, 0);
    window.setTimeout(pinVendorCameraOverlay, 250);
    window.setTimeout(pinVendorCameraOverlay, 750);
  }, [pinVendorCameraOverlay]);

  const registerEventHandlers = useCallback(() => {
    if (!window.YMK || eventHandlersRef.current.size > 0) return;

    const handlers = {
      opened: () => {
        debugFlow("camera-kit", "event:opened");
        isOpeningRef.current = false;
        isCameraOpenRef.current = true;
        pinVendorCameraOverlay();
        setIsCameraOpen(true);
        eventsRef.current.onOpened?.();
      },
      loading: (data: unknown) => {
        const progress = typeof data === "object" && data && "progress" in data
          ? Number((data as { progress: unknown }).progress)
          : 0;
        debugFlow("camera-kit", "event:loading", { progress });
        setLoadingProgress(progress);
        eventsRef.current.onLoading?.(progress);
      },
      loaded: () => {
        debugFlow("camera-kit", "event:loaded");
        setLoadingProgress(100);
        eventsRef.current.onLoaded?.();
      },
      faceDetectionStarted: () => {
        debugFlow("camera-kit", "event:faceDetectionStarted");
        eventsRef.current.onFaceDetectionStarted?.();
      },
      faceDetectionCaptured: (capturedResult: unknown) => {
        const images = extractCapturedImages(capturedResult);
        debugFlow("camera-kit", "event:faceDetectionCaptured", {
          imageCount: images.length,
          firstImageType: images[0]?.image instanceof Blob ? "blob" : typeof images[0]?.image,
          firstImageSize: images[0]?.image instanceof Blob ? images[0].image.size : images[0]?.image.length,
          width: images[0]?.width,
          height: images[0]?.height,
        });
        eventsRef.current.onFaceDetectionCaptured?.(images);
      },
      closed: () => {
        debugFlow("camera-kit", "event:closed");
        isOpeningRef.current = false;
        isCameraOpenRef.current = false;
        stopCameraKitDomGuard();
        setIsCameraOpen(false);
        setLoadingProgress(0);
        eventsRef.current.onClosed?.();
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      eventHandlersRef.current.set(event, handler);
      window.YMK!.addEventListener(event, handler);
    });
    debugFlow("camera-kit", "registered event handlers", { events: Object.keys(handlers) });
  }, [pinVendorCameraOverlay, stopCameraKitDomGuard]);

  const loadSDK = useCallback(() => {
    debugFlow("camera-kit", "loadSDK called", {
      isSDKLoading,
      isSDKLoaded,
      hasYMK: Boolean(window.YMK),
      hasYMKModule: Boolean(document.getElementById("YMK-module")),
    });
    if (isSDKLoading || isSDKLoaded) return;
    
    setIsSDKLoading(true);
    setError(null);

    // Check if SDK is already loaded
    if (window.YMK) {
      debugFlow("camera-kit", "SDK already present on window");
      registerEventHandlers();
      setIsSDKLoaded(true);
      setIsSDKLoading(false);
      return;
    }

    // Define ymkAsyncInit before loading script
    window.ymkAsyncInit = function() {
      debugFlow("camera-kit", "ymkAsyncInit fired", { hasYMK: Boolean(window.YMK) });
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      if (!window.YMK) {
        setError(new Error('YMK SDK failed to initialize'));
        setIsSDKLoading(false);
        return;
      }

      registerEventHandlers();
      setIsSDKLoaded(true);
      setIsSDKLoading(false);
    };

    // Load SDK script
    const script = document.createElement('script');
    script.id = 'YMK-module';
    script.src = 'https://plugins-media.makeupar.com/v2.2-camera-kit/sdk.js';
    script.async = true;
    script.onload = () => {
      debugFlow("camera-kit", "SDK script onload");
      // YMKAsyncInit will be called automatically by the SDK
    };
    script.onerror = () => {
      const err = new Error('Failed to load Camera Kit SDK');
      debugFlow("camera-kit", "SDK script onerror", err);
      setError(err);
      setIsSDKLoading(false);
      eventsRef.current.onError?.(err);
    };

    document.body.appendChild(script);
    sdkScriptRef.current = script;

    loadTimeoutRef.current = setTimeout(() => {
      if (!window.YMK) {
        const err = new Error("Camera Kit did not finish loading. Please retry the Perfect Corp camera scan.");
        debugFlow("camera-kit", "SDK load timeout", err);
        setError(err);
        setIsSDKLoading(false);
        eventsRef.current.onError?.(err);
      }
    }, 8000);
  }, [isSDKLoading, isSDKLoaded, registerEventHandlers]);

  const resetOpenState = useCallback(() => {
    isOpeningRef.current = false;
    isCameraOpenRef.current = false;
    setIsCameraOpen(false);
  }, []);

  const closeVendorCamera = useCallback(() => {
    if (!window.YMK) return;

    if (typeof window.YMK.closeCameraKit === "function") {
      window.YMK.closeCameraKit();
      debugFlow("camera-kit", "YMK.closeCameraKit called");
      return;
    }

    if (typeof window.YMK.close === "function") {
      window.YMK.close();
      debugFlow("camera-kit", "YMK.close called");
      return;
    }

    debugFlow("camera-kit", "close skipped: no close method available");
  }, []);

  // Open camera with config
  const openCamera = useCallback((config: Partial<CameraKitConfig> = {}) => {
    debugFlow("camera-kit", "openCamera requested", {
      config,
      hasYMK: Boolean(window.YMK),
      hasYMKModule: Boolean(document.getElementById("YMK-module")),
      isOpening: isOpeningRef.current,
      isCameraOpen: isCameraOpenRef.current,
    });
    if (!window.YMK) {
      const err = new Error('Camera Kit SDK not loaded');
      debugFlow("camera-kit", "openCamera blocked: SDK missing");
      setError(err);
      eventsRef.current.onError?.(err);
      return false;
    }

    if (isOpeningRef.current) {
      debugFlow("camera-kit", "openCamera skipped: already opening/open");
      return true;
    }

    if (isCameraOpenRef.current) {
      debugFlow("camera-kit", "openCamera detected stale open state, forcing reopen");
      try {
        closeVendorCamera();
      } catch (err) {
        debugFlow("camera-kit", "force close before reopen failed", err);
      }
      resetOpenState();
    }

    try {
      isOpeningRef.current = true;
      startCameraKitDomGuard();
      const defaultConfig: CameraKitConfig = {
        faceDetectionMode: 'skincare',
        imageFormat: 'base64',
        language: 'enu',
        ...config,
      };

      window.YMK.init(defaultConfig);
      debugFlow("camera-kit", "YMK.init called", defaultConfig);
      window.YMK.openCameraKit();
      debugFlow("camera-kit", "YMK.openCameraKit called");

      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }

      openTimeoutRef.current = setTimeout(() => {
        if (isOpeningRef.current && !isCameraOpenRef.current) {
          debugFlow("camera-kit", "open timeout reached, resetting opening state");
          isOpeningRef.current = false;
        }
      }, 5000);

      return true;
    } catch (err) {
      isOpeningRef.current = false;
      stopCameraKitDomGuard();
      const error = err instanceof Error ? err : new Error('Failed to open camera');
      debugFlow("camera-kit", "openCamera threw", error);
      setError(error);
      eventsRef.current.onError?.(error);
      return false;
    }
  }, [closeVendorCamera, resetOpenState, startCameraKitDomGuard, stopCameraKitDomGuard]);

  // Close camera
  const closeCamera = useCallback(() => {
    debugFlow("camera-kit", "closeCamera requested", {
      hasYMK: Boolean(window.YMK),
      isOpening: isOpeningRef.current,
      isCameraOpen: isCameraOpenRef.current,
    });
    if (!window.YMK) {
      console.warn('Camera Kit SDK not available for closing');
      return;
    }

    try {
      closeVendorCamera();
      resetOpenState();
      stopCameraKitDomGuard();
    } catch (err) {
      console.error('Error closing camera:', err);
      const error = err instanceof Error ? err : new Error('Failed to close camera');
      debugFlow("camera-kit", "closeCamera threw", error);
      setError(error);
      eventsRef.current.onError?.(error);
    }
  }, [closeVendorCamera, resetOpenState, stopCameraKitDomGuard]);

  // Cleanup on unmount
  useEffect(() => {
    const eventHandlers = eventHandlersRef.current;
    return () => {
      debugFlow("camera-kit", "cleanup start", {
        handlerCount: eventHandlers.size,
        hasYMK: Boolean(window.YMK),
        isOpening: isOpeningRef.current,
        isCameraOpen: isCameraOpenRef.current,
      });
      // Remove event listeners
      if (window.YMK) {
        eventHandlers.forEach((handler, event) => {
          try {
            window.YMK!.removeEventListener(event, handler);
          } catch (err) {
            console.error(`Error removing event listener ${event}:`, err);
          }
        });
      }

      // Close only if this hook actually opened/opening Camera Kit. Calling
      // closeCameraKit while no SDK view exists can throw inside the vendor SDK.
      if (window.YMK && (isCameraOpenRef.current || isOpeningRef.current)) {
        try {
          closeVendorCamera();
          resetOpenState();
          stopCameraKitDomGuard();
        } catch (err) {
          console.error('Error closing camera on unmount:', err);
        }
      }

      stopCameraKitDomGuard();

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }

      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
        openTimeoutRef.current = null;
      }
    };
  }, [closeVendorCamera, resetOpenState, stopCameraKitDomGuard]);

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
