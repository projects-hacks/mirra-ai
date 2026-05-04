"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppState, useAppDispatch } from "@/components/providers/AppProvider";
import { useCamera } from "@/hooks/useCamera";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import CameraLayer from "@/components/layers/CameraLayer";
import AgentOverlay from "@/components/layers/AgentOverlay";
import VoiceOrb from "@/components/ui/VoiceOrb";
import StatusBar from "@/components/ui/StatusBar";
import FeatureMenu from "@/components/features/FeatureMenu";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default function HomePage() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { containerRef, videoRef, capture, isReady: cameraReady, error: cameraError, isUsingCameraKit } = useCamera();
  const voice = useVoiceAgent();
  const { user, signInWithGoogle, signOut } = useAuth();
  const voiceSocket = (globalThis as typeof globalThis & { __mirraWS?: WebSocket }).__mirraWS;

  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Check if user has completed onboarding
  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user) {
        setIsOnboarded(false);
        setIsCheckingOnboarding(false);
        return;
      }

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarded")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error checking onboarding status:", error);
          setIsOnboarded(false);
        } else {
          setIsOnboarded((data as { onboarded: boolean } | null)?.onboarded ?? false);
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setIsOnboarded(false);
      } finally {
        setIsCheckingOnboarding(false);
      }
    }

    checkOnboardingStatus();
  }, [user]);

  // Only show onboarding check once the store is hydrated (avoids flash)
  const shouldShowOnboarding = state.isHydrated && (!user || isOnboarded === false);

  // We no longer auto-capture the selfie. The selfie is captured exactly when the user taps to speak.

  // Show a local welcome message immediately after camera is ready
  // Gate on isHydrated so we don't show it before restored messages appear (Task 19.1)
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

  // Just-In-Time Capture: Take a fresh selfie when a tool starts running
  useEffect(() => {
    if (state.currentTool && cameraReady) {
      const freshSelfie = capture();
      if (freshSelfie) {
        dispatch({ type: "SET_SELFIE", payload: freshSelfie });
        if (voiceSocket?.readyState === WebSocket.OPEN) {
          voiceSocket.send(JSON.stringify({ type: "selfie", data: freshSelfie }));
        }
      }
    }
  }, [state.currentTool, cameraReady, capture, dispatch, voiceSocket]);

  // Voice connection is user-initiated (first mic tap), not auto-connect.
  // This avoids a reconnect storm when no backend is available.
  const handleVoiceToggle = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }

    // Capture a fresh selfie exactly when the user taps the mic
    let currentSelfie = state.selfie;  // May be restored from localStorage (Task 19.2)
    if (cameraReady) {
      const freshSelfie = capture();
      if (freshSelfie) {
        dispatch({ type: "SET_SELFIE", payload: freshSelfie });
        currentSelfie = freshSelfie;
      }
    }

    // Connect on first tap if not yet connected
    if (!voice.isConnected && currentSelfie) {
      voice.connect(currentSelfie);
      return;
    }

    // If already connected, push the fresh selfie to the backend
    if (voice.isConnected && currentSelfie) {
      if (voiceSocket?.readyState === WebSocket.OPEN) {
        voiceSocket.send(JSON.stringify({ type: "selfie", data: currentSelfie }));
      }
    }

    voice.startListening();
  }, [voice, state.selfie, cameraReady, capture, dispatch, voiceSocket]);

  const handleRecapture = useCallback(() => {
    const selfie = capture();
    if (selfie) {
      dispatch({ type: "SET_SELFIE", payload: selfie });
    }
  }, [capture, dispatch]);

  // Show spinner until BOTH hydration and onboarding check are done
  if (!state.isHydrated || isCheckingOnboarding) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="processing-ring h-16 w-16" />
      </div>
    );
  }

  // Show onboarding flow if not authenticated or not onboarded
  if (shouldShowOnboarding) {
    return (
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    );
  }

  // Show main interface if authenticated and onboarded
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Layer 0: Camera / Selfie / VTO */}
      <CameraLayer
        containerRef={containerRef}
        videoRef={videoRef}
        selfie={state.selfie}
        vtoResult={state.vtoResult}
        isProcessing={state.isProcessing}
        currentTool={state.currentTool}
        cameraError={cameraError}
        isUsingCameraKit={isUsingCameraKit}
      />

      {/* Layer 2 Top: Status Bar */}
      <StatusBar
        isConnected={voice.isConnected}
        user={user}
        onSignIn={signInWithGoogle}
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
      />

      {/* Layer 2 Bottom: Voice Orb */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <VoiceOrb
          isListening={voice.isListening}
          isConnecting={voice.isConnecting}
          error={voice.error}
          onClick={handleVoiceToggle}
        />
      </div>
    </div>
  );
}
