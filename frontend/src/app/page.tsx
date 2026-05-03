"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppState, useAppDispatch } from "@/components/providers/AppProvider";
import { useCamera } from "@/hooks/useCamera";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useAuth } from "@/hooks/useAuth";
import CameraPanel from "@/components/panels/CameraPanel";
import ConversationPanel from "@/components/panels/ConversationPanel";

export default function HomePage() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { videoRef, capture, isReady: cameraReady, error: cameraError } = useCamera();
  const voice = useVoiceAgent();
  const { user, signInWithGoogle, signInWithEmail, signOut } = useAuth();

  const [selfieCapturing, setSelfieCapturing] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);

  // Auto-capture selfie once camera is ready
  useEffect(() => {
    if (cameraReady && !hasCaptured && !selfieCapturing) {
      setSelfieCapturing(true);

      // Small delay for camera to stabilize
      const timer = setTimeout(() => {
        const selfie = capture();
        if (selfie) {
          dispatch({ type: "SET_SELFIE", payload: selfie });
          setHasCaptured(true);
        }
        setSelfieCapturing(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [cameraReady, hasCaptured, selfieCapturing, capture, dispatch]);

  // Connect to voice agent once selfie is captured
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
    <main className="flex h-screen w-screen overflow-hidden">
      {/* Camera Panel — Left/Top */}
      <section className="relative flex-1 min-w-0 bg-black">
        <CameraPanel
          videoRef={videoRef}
          selfie={state.selfie}
          vtoResult={state.vtoResult}
          isProcessing={state.isProcessing}
          currentTool={state.currentTool}
          cameraError={cameraError}
          onRecapture={handleRecapture}
        />
      </section>

      {/* Conversation Panel — Right/Bottom */}
      <section className="flex flex-col w-full max-w-md border-l border-white/5 bg-[var(--bg-primary)]">
        <ConversationPanel
          messages={state.messages}
          isListening={voice.isListening}
          isConnected={voice.isConnected}
          isProcessing={state.isProcessing}
          user={user}
          error={voice.error ?? cameraError}
          onVoiceToggle={handleVoiceToggle}
          onSignIn={signInWithGoogle}
          onSignInEmail={signInWithEmail}
          onSignOut={signOut}
        />
      </section>
    </main>
  );
}
