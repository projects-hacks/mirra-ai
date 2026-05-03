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

export default function HomePage() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { videoRef, capture, isReady: cameraReady, error: cameraError } = useCamera();
  const voice = useVoiceAgent();
  const { user, signInWithGoogle, signOut } = useAuth();

  const [hasCaptured, setHasCaptured] = useState(false);

  // Auto-capture selfie once camera stabilizes
  useEffect(() => {
    if (cameraReady && !hasCaptured) {
      const timer = setTimeout(() => {
        const selfie = capture();
        if (selfie) {
          dispatch({ type: "SET_SELFIE", payload: selfie });
          setHasCaptured(true);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [cameraReady, hasCaptured, capture, dispatch]);

  // Connect voice agent after selfie
  useEffect(() => {
    if (state.selfie && !voice.isConnected) {
      voice.connect(state.selfie);
    }
  }, [state.selfie, voice]);

  const handleVoiceToggle = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening();
    }
  }, [voice]);

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
        videoRef={videoRef}
        selfie={state.selfie}
        vtoResult={state.vtoResult}
        isProcessing={state.isProcessing}
        currentTool={state.currentTool}
        cameraError={cameraError}
      />

      {/* Layer 2 Top: Status Bar */}
      <StatusBar
        isConnected={voice.isConnected}
        user={user}
        onSignIn={signInWithGoogle}
        onSignOut={signOut}
      />

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
          isProcessing={state.isProcessing}
          isConnected={voice.isConnected}
          onClick={handleVoiceToggle}
        />
      </div>
    </div>
  );
}
