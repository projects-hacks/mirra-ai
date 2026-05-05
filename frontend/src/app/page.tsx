"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useAppState, useAppDispatch } from "@/components/providers/AppProvider";
import { useCamera } from "@/hooks/useCamera";
import { useCameraKit } from "@/hooks/useCameraKit";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import { ENABLE_CAMERA_KIT, ToolName } from "@/lib/constants";
import { debugFlow } from "@/lib/debug";
import type { FaceDetectionMode } from "@/hooks/useCameraKit";
import CameraLayer from "@/components/layers/CameraLayer";
import AgentOverlay from "@/components/layers/AgentOverlay";
import VoiceOrb from "@/components/ui/VoiceOrb";
import StatusBar from "@/components/ui/StatusBar";
import FeatureMenu from "@/components/features/FeatureMenu";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

import ErrorBoundary from "@/components/common/ErrorBoundary";

type OnboardingCheckState = {
  userId: string | null;
  isOnboarded: boolean | null;
  isChecking: boolean;
};

type OnboardingCheckAction =
  | { type: "RESET" }
  | { type: "START"; userId: string }
  | { type: "COMPLETE"; userId: string; isOnboarded: boolean };

const initialOnboardingCheck: OnboardingCheckState = {
  userId: null,
  isOnboarded: null,
  isChecking: true,
};

const CAMERA_KIT_TOOL_MODES: Partial<Record<ToolName, FaceDetectionMode>> = {
  [ToolName.ANALYZE_SKIN]: "skincare",
  [ToolName.SIMULATE_SKIN]: "skincare",
  [ToolName.ANALYZE_SKIN_TONE]: "shadefinder",
  [ToolName.ANALYZE_FACE]: "facereshape",
  [ToolName.TRY_ON_MAKEUP]: "makeup",
  [ToolName.TRY_ON_EARRINGS]: "earring",
  [ToolName.TRY_ON_NECKLACE]: "necklace",
};

function onboardingCheckReducer(
  state: OnboardingCheckState,
  action: OnboardingCheckAction
): OnboardingCheckState {
  switch (action.type) {
    case "RESET":
      return { userId: null, isOnboarded: null, isChecking: false };
    case "START":
      if (state.userId === action.userId && !state.isChecking) return state;
      return { userId: action.userId, isOnboarded: null, isChecking: true };
    case "COMPLETE":
      if (state.userId !== action.userId) return state;
      return {
        userId: action.userId,
        isOnboarded: action.isOnboarded,
        isChecking: false,
      };
  }
}

export default function HomePage() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { containerRef, videoRef, capture, isReady: cameraReady, error: cameraError } = useCamera();
  const voice = useVoiceAgent();
  const { user, signIn, signOut, loading: authLoading } = useAuth();
  const voiceSocket = (globalThis as typeof globalThis & { __mirraWS?: WebSocket }).__mirraWS;

  const [onboardingCheck, dispatchOnboardingCheck] = useReducer(
    onboardingCheckReducer,
    initialOnboardingCheck
  );
  const checkedOnboardingUserIdRef = useRef<string | null>(null);
  const handledToolRef = useRef<string | null>(null);

  // Check if user has completed onboarding
  useEffect(() => {
    debugFlow("home", "onboarding effect", {
      authLoading,
      userId: user?.id,
      checkedUserId: checkedOnboardingUserIdRef.current,
    });
    if (authLoading) return;

    if (!user?.id) {
      checkedOnboardingUserIdRef.current = null;
      dispatchOnboardingCheck({ type: "RESET" });
      return;
    }

    const userId = user.id;

    if (checkedOnboardingUserIdRef.current === userId) {
      return;
    }

    let cancelled = false;
    checkedOnboardingUserIdRef.current = userId;
    dispatchOnboardingCheck({ type: "START", userId });

    async function checkOnboardingStatus() {
      try {
        debugFlow("home", "onboarding status query start", { userId });
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarded")
          .eq("id", userId)
          .single();

        if (error) {
          debugFlow("home", "onboarding status query error", error);
          console.error("Error checking onboarding status:", error);
          // If profile doesn't exist yet, assume not onboarded
          if (!cancelled) {
            dispatchOnboardingCheck({ type: "COMPLETE", userId, isOnboarded: false });
          }
        } else {
          const onboardedStatus = (data as { onboarded: boolean } | null)?.onboarded ?? false;
          debugFlow("home", "onboarding status query complete", { userId, onboardedStatus });
          if (!cancelled) {
            dispatchOnboardingCheck({ type: "COMPLETE", userId, isOnboarded: onboardedStatus });
          }
        }
      } catch (error) {
        debugFlow("home", "onboarding status query threw", error);
        console.error("Error checking onboarding status:", error);
        // On error, assume not onboarded to show onboarding flow
        if (!cancelled) {
          checkedOnboardingUserIdRef.current = null;
          dispatchOnboardingCheck({ type: "COMPLETE", userId, isOnboarded: false });
        }
      }
    }

    checkOnboardingStatus();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  // Only show onboarding check once the store is hydrated (avoids flash)
  const shouldShowOnboarding = state.isHydrated && !authLoading && (
    !user || onboardingCheck.isOnboarded === false
  );

  // We no longer auto-capture the selfie. The selfie is captured exactly when the user taps to speak.

  // Show a local welcome message immediately after camera is ready
  // Gate on isHydrated so we don't show it before restored messages appear (Task 19.1)
  useEffect(() => {
    if (cameraReady && state.isHydrated && state.messages.length === 0) {
      debugFlow("home", "welcome message added");
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          type: "agent",
          text: "Hi! I'm Mirra ✨ Tap the mic to start — I can analyze your skin, try on outfits, and help you look your best.",
          id: "welcome",
          timestamp: Date.now(),
        },
      });
    }
  }, [cameraReady, state.isHydrated, state.messages.length, dispatch]);

  const sendSelfie = useCallback((selfie: string) => {
    const activeVoiceSocket = (globalThis as typeof globalThis & { __mirraWS?: WebSocket }).__mirraWS;
    debugFlow("home", "sendSelfie", {
      selfieLength: selfie.length,
      wsReadyState: activeVoiceSocket?.readyState,
      currentTool: state.currentTool,
    });
    dispatch({ type: "SET_SELFIE", payload: selfie });
    if (activeVoiceSocket?.readyState === WebSocket.OPEN) {
      activeVoiceSocket.send(JSON.stringify({ type: "selfie", data: selfie }));
      debugFlow("home", "sendSelfie sent over active WS");
    } else {
      debugFlow("home", "sendSelfie skipped WS send: socket not open");
    }
  }, [dispatch, state.currentTool]);

  const sendNativeSelfie = useCallback(() => {
    debugFlow("home", "sendNativeSelfie requested", {
      cameraReady,
      currentTool: state.currentTool,
    });
    const freshSelfie = capture();
    if (freshSelfie) {
      debugFlow("home", "sendNativeSelfie captured");
      sendSelfie(freshSelfie);
      return true;
    }
    debugFlow("home", "sendNativeSelfie failed: capture returned null");
    return false;
  }, [cameraReady, capture, sendSelfie, state.currentTool]);

  const { loadSDK, openCamera, closeCamera, isSDKLoaded, error: cameraKitError, isCameraOpen } = useCameraKit({
    onFaceDetectionCaptured: (images) => {
      debugFlow("home", "Camera Kit callback: captured", {
        imageCount: images?.length ?? 0,
        currentTool: state.currentTool,
      });
      if (images && images.length > 0) {
        const dataUrl = typeof images[0].image === 'string' 
          ? images[0].image 
          : URL.createObjectURL(images[0].image as Blob);
        sendSelfie(dataUrl);
      }
      closeCamera();
    },
    onError: () => {
      debugFlow("home", "Camera Kit callback: error; using native fallback", {
        currentTool: state.currentTool,
      });
      sendNativeSelfie();
    },
  });

  useEffect(() => {
    debugFlow("home", "Camera Kit load effect", { ENABLE_CAMERA_KIT });
    if (!ENABLE_CAMERA_KIT) return;
    loadSDK();
  }, [loadSDK]);

  // Just-In-Time Capture: Trigger JS Camera Kit or native capture when a tool runs
  useEffect(() => {
    debugFlow("home", "tool capture effect", {
      currentTool: state.currentTool,
      cameraReady,
      handledTool: handledToolRef.current,
      ENABLE_CAMERA_KIT,
      isSDKLoaded,
      cameraKitError: cameraKitError?.message,
    });
    if (!state.currentTool) {
      handledToolRef.current = null;
      return;
    }

    if (state.currentTool && cameraReady && handledToolRef.current !== state.currentTool) {
      handledToolRef.current = state.currentTool;
      const toolName = state.currentTool as ToolName;
      const cameraKitMode = CAMERA_KIT_TOOL_MODES[toolName];
      const cameraKitTool = Boolean(cameraKitMode);

      if (!ENABLE_CAMERA_KIT || !cameraKitTool) {
        debugFlow("home", "tool capture route: native", { currentTool: state.currentTool, cameraKitTool });
        sendNativeSelfie();
      } else if (!isSDKLoaded && !cameraKitError) {
        debugFlow("home", "tool capture route: wait for Camera Kit SDK", { currentTool: state.currentTool });
        handledToolRef.current = null;
        return;
      } else if (cameraKitError) {
        debugFlow("home", "tool capture route: Camera Kit error fallback", {
          currentTool: state.currentTool,
          error: cameraKitError.message,
        });
        sendNativeSelfie();
      } else if (cameraKitMode) {
        debugFlow("home", "tool capture route: Camera Kit", {
          currentTool: state.currentTool,
          faceDetectionMode: cameraKitMode,
        });
        const opened = openCamera({ faceDetectionMode: cameraKitMode });
        if (!opened) sendNativeSelfie();
      } else {
        // Fallback to native capture for clothes, hair, weather, etc.
        debugFlow("home", "tool capture route: native fallback branch", { currentTool: state.currentTool });
        sendNativeSelfie();
      }
    }
  }, [state.currentTool, cameraReady, isSDKLoaded, cameraKitError, openCamera, sendNativeSelfie]);

  // Voice connection is user-initiated (first mic tap), not auto-connect.
  // This avoids a reconnect storm when no backend is available.
  const handleVoiceToggle = useCallback(() => {
    debugFlow("home", "voice toggle", {
      isListening: voice.isListening,
      isConnected: voice.isConnected,
      cameraReady,
      hasSelfie: Boolean(state.selfie),
      wsReadyState: voiceSocket?.readyState,
    });
    if (voice.isListening) {
      voice.stopListening();
      return;
    }

    // Capture a fresh selfie exactly when the user taps the mic
    let currentSelfie = state.selfie;  // May be restored from localStorage (Task 19.2)
    if (cameraReady) {
      const freshSelfie = capture();
      if (freshSelfie) {
        debugFlow("home", "voice toggle captured initial/fresh selfie");
        dispatch({ type: "SET_SELFIE", payload: freshSelfie });
        currentSelfie = freshSelfie;
      }
    }

    // Connect on first tap if not yet connected
    if (!voice.isConnected && currentSelfie) {
      debugFlow("home", "voice toggle route: connect", { selfieLength: currentSelfie.length });
      voice.connect(currentSelfie);
      return;
    }

    // If already connected, push the fresh selfie to the backend
    if (voice.isConnected && currentSelfie) {
      if (voiceSocket?.readyState === WebSocket.OPEN) {
        debugFlow("home", "voice toggle route: send selfie to existing WS");
        voiceSocket.send(JSON.stringify({ type: "selfie", data: currentSelfie }));
      }
    }

    debugFlow("home", "voice toggle route: startListening");
    voice.startListening();
  }, [voice, state.selfie, cameraReady, capture, dispatch, voiceSocket]);

  const handleRecapture = useCallback(() => {
    debugFlow("home", "manual recapture requested");
    const selfie = capture();
    if (selfie) {
      dispatch({ type: "SET_SELFIE", payload: selfie });
    }
  }, [capture, dispatch]);

  // Show spinner until BOTH hydration and onboarding check are done
  if (!state.isHydrated || authLoading || (user && onboardingCheck.isChecking)) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="processing-ring h-16 w-16" />
      </div>
    );
  }

  // Show onboarding flow if not authenticated or not onboarded
  if (shouldShowOnboarding) {
    return (
      <ErrorBoundary>
        <OnboardingProvider>
          <OnboardingFlow />
        </OnboardingProvider>
      </ErrorBoundary>
    );
  }

  // Show main interface if authenticated and onboarded
  return (
    <ErrorBoundary>
      <div className="relative h-[100dvh] w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_35%)]">
      {/* Layer 0: Camera / Selfie / VTO */}
      <CameraLayer
        containerRef={containerRef}
        videoRef={videoRef}
        selfie={state.selfie}
        vtoResult={state.vtoResult}
        isProcessing={state.isProcessing}
        currentTool={state.currentTool}
        cameraError={cameraError}
        isUsingCameraKit={isCameraOpen}
      />

      {/* Layer 2 Top: Status Bar */}
      <StatusBar
        isConnected={voice.isConnected}
        user={user}
        onSignIn={signIn}
        onSignOut={signOut}
      />

      {/* Layer 4: Feature Menu */}
      <FeatureMenu />




      {/* Layer 3: Agent Messages + Cards */}
      <AgentOverlay
        messages={state.messages}
        user={user}
        vtoResult={state.vtoResult}
        onRecapture={handleRecapture}
        originalSelfieUrl={voice.lastSelfieUrl ?? undefined}
      />

      <VoiceOrb
        isListening={voice.isListening}
        isConnecting={voice.isConnecting}
        error={voice.error}
        onClick={handleVoiceToggle}
      />
      </div>
    </ErrorBoundary>
  );
}
