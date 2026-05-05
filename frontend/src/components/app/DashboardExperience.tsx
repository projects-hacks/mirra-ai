// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// @deprecated: voice-mode only. Dashboard now lives in app/(app)/dashboard/page.tsx.
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

export default function DashboardExperience() {
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

  useEffect(() => {
    debugFlow("dashboard", "onboarding effect", {
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
    if (checkedOnboardingUserIdRef.current === userId) return;

    let cancelled = false;
    checkedOnboardingUserIdRef.current = userId;
    dispatchOnboardingCheck({ type: "START", userId });

    async function checkOnboardingStatus() {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarded")
          .eq("id", userId)
          .single();

        if (error) {
          if (!cancelled) {
            dispatchOnboardingCheck({ type: "COMPLETE", userId, isOnboarded: false });
          }
          return;
        }

        const onboardedStatus = (data as { onboarded: boolean } | null)?.onboarded ?? false;
        if (!cancelled) {
          dispatchOnboardingCheck({ type: "COMPLETE", userId, isOnboarded: onboardedStatus });
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        if (!cancelled) {
          checkedOnboardingUserIdRef.current = null;
          dispatchOnboardingCheck({ type: "COMPLETE", userId, isOnboarded: false });
        }
      }
    }

    void checkOnboardingStatus();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  const shouldShowOnboarding = state.isHydrated && !authLoading && (
    !user || onboardingCheck.isOnboarded === false
  );

  useEffect(() => {
    if (cameraReady && state.isHydrated && state.messages.length === 0) {
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
    dispatch({ type: "SET_SELFIE", payload: selfie });
    if (activeVoiceSocket?.readyState === WebSocket.OPEN) {
      activeVoiceSocket.send(JSON.stringify({ type: "selfie", data: selfie }));
    }
  }, [dispatch]);

  const sendNativeSelfie = useCallback(() => {
    const freshSelfie = capture();
    if (freshSelfie) {
      sendSelfie(freshSelfie);
      return true;
    }
    return false;
  }, [capture, sendSelfie]);

  const { loadSDK, openCamera, closeCamera, isSDKLoaded, error: cameraKitError, isCameraOpen } = useCameraKit({
    onFaceDetectionCaptured: (images) => {
      if (images && images.length > 0) {
        const dataUrl = typeof images[0].image === "string"
          ? images[0].image
          : URL.createObjectURL(images[0].image as Blob);
        sendSelfie(dataUrl);
      }
      closeCamera();
    },
    onError: () => {
      sendNativeSelfie();
    },
  });

  useEffect(() => {
    if (!ENABLE_CAMERA_KIT) return;
    loadSDK();
  }, [loadSDK]);

  useEffect(() => {
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
        sendNativeSelfie();
      } else if (!isSDKLoaded && !cameraKitError) {
        handledToolRef.current = null;
        return;
      } else if (cameraKitError) {
        sendNativeSelfie();
      } else if (cameraKitMode) {
        const opened = openCamera({ faceDetectionMode: cameraKitMode });
        if (!opened) sendNativeSelfie();
      } else {
        sendNativeSelfie();
      }
    }
  }, [state.currentTool, cameraReady, isSDKLoaded, cameraKitError, openCamera, sendNativeSelfie]);

  const handleVoiceToggle = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }

    let currentSelfie = state.selfie;
    if (cameraReady) {
      const freshSelfie = capture();
      if (freshSelfie) {
        dispatch({ type: "SET_SELFIE", payload: freshSelfie });
        currentSelfie = freshSelfie;
      }
    }

    if (!voice.isConnected && currentSelfie) {
      voice.connect(currentSelfie);
      return;
    }

    if (voice.isConnected && currentSelfie && voiceSocket?.readyState === WebSocket.OPEN) {
      voiceSocket.send(JSON.stringify({ type: "selfie", data: currentSelfie }));
    }

    voice.startListening();
  }, [voice, state.selfie, cameraReady, capture, dispatch, voiceSocket]);

  const handleRecapture = useCallback(() => {
    const selfie = capture();
    if (selfie) {
      dispatch({ type: "SET_SELFIE", payload: selfie });
    }
  }, [capture, dispatch]);

  if (!state.isHydrated || authLoading || (user && onboardingCheck.isChecking)) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="processing-ring h-16 w-16" />
      </div>
    );
  }

  if (shouldShowOnboarding) {
    return (
      <ErrorBoundary>
        <OnboardingProvider>
          <OnboardingFlow />
        </OnboardingProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="relative h-[100dvh] w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_35%)]">
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

        <StatusBar
          isConnected={voice.isConnected}
          user={user}
          onSignIn={signIn}
          onSignOut={signOut}
        />

        <FeatureMenu />

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
