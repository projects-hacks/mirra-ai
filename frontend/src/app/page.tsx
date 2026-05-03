"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppState, useAppDispatch } from "@/components/providers/AppProvider";
import { useCamera } from "@/hooks/useCamera";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useAuth } from "@/hooks/useAuth";
import CameraLayer from "@/components/layers/CameraLayer";
import AgentOverlay from "@/components/layers/AgentOverlay";
import VoiceOrb from "@/components/ui/VoiceOrb";
import StatusBar from "@/components/ui/StatusBar";
import FeatureMenu from "@/components/features/FeatureMenu";

export default function HomePage() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { containerRef, videoRef, capture, isReady: cameraReady, error: cameraError, isUsingCameraKit } = useCamera();
  const voice = useVoiceAgent();
  const { user, signInWithGoogle, signOut } = useAuth();

  const [hasCaptured, setHasCaptured] = useState(false);

  // We no longer auto-capture the selfie. The selfie is captured exactly when the user taps to speak.

  // Show a local welcome message immediately after camera is ready
  useEffect(() => {
    if (cameraReady && state.messages.length === 0) {
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
  }, [cameraReady, state.messages.length, dispatch]);

  // Just-In-Time Capture: Take a fresh selfie when a tool starts running
  useEffect(() => {
    if (state.currentTool && cameraReady) {
      const freshSelfie = capture();
      if (freshSelfie) {
        dispatch({ type: "SET_SELFIE", payload: freshSelfie });
        const ws = (window as any).__mirraWS;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'selfie', data: freshSelfie }));
        }
      }
    }
  }, [state.currentTool, cameraReady, capture, dispatch]);

  // Voice connection is user-initiated (first mic tap), not auto-connect.
  // This avoids a reconnect storm when no backend is available.
  const handleVoiceToggle = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }

    // Capture a fresh selfie exactly when the user taps the mic
    let currentSelfie = state.selfie;
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
      const ws = (window as any).__mirraWS;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'selfie', data: currentSelfie }));
      }
    }

    voice.startListening();
  }, [voice, state.selfie, cameraReady, capture, dispatch]);

  const handleRecapture = useCallback(() => {
    const selfie = capture();
    if (selfie) {
      dispatch({ type: "SET_SELFIE", payload: selfie });
    }
  }, [capture, dispatch]);

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
