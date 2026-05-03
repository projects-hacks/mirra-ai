"use client";

import { useEffect, useRef } from "react";
import type { Message, User } from "@/types";
import MessageBubble from "@/components/ui/MessageBubble";
import VoiceButton from "@/components/ui/VoiceButton";

interface ConversationPanelProps {
  messages: Message[];
  isListening: boolean;
  isConnected: boolean;
  isProcessing: boolean;
  user: User | null;
  error: string | null;
  onVoiceToggle: () => void;
  onSignIn: () => void;
  onSignInEmail: (email: string, password: string) => void;
  onSignOut: () => void;
}

export default function ConversationPanel({
  messages,
  isListening,
  isConnected,
  isProcessing,
  user,
  error,
  onVoiceToggle,
  onSignIn,
  onSignOut,
}: ConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold glow-text">Mirra</h1>
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: isConnected ? "var(--success)" : "var(--text-muted)",
            }}
          />
        </div>

        {/* Auth */}
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-caption">{user.displayName}</span>
            <button onClick={onSignOut} className="text-caption hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        ) : (
          <button onClick={onSignIn} className="btn-ghost text-xs">
            Sign in
          </button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="text-5xl">✨</div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Hey{user ? `, ${user.displayName}` : ""}!</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Tap the mic and ask me anything about your look.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-5 mb-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300 fade-in">
          {error}
        </div>
      )}

      {/* Voice Controls */}
      <div className="flex items-center justify-center py-5 border-t border-white/5">
        <VoiceButton
          isListening={isListening}
          isProcessing={isProcessing}
          isConnected={isConnected}
          onClick={onVoiceToggle}
        />
      </div>
    </div>
  );
}
