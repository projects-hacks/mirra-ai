"use client";

interface VoiceOrbProps {
  isListening: boolean;
  isProcessing: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  onClick: () => void;
}

/** Voice Orb — central pulsating mic button. */
export default function VoiceOrb({
  isListening,
  isProcessing,
  isConnected,
  isConnecting,
  error,
  onClick,
}: VoiceOrbProps) {
  const disabled = isConnecting || isProcessing;

  // Status label
  const label = error
    ? error
    : isConnecting
      ? "Connecting…"
      : isProcessing
        ? "Thinking…"
        : isListening
          ? "Listening"
          : "Tap to speak";

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`voice-orb ${isListening ? "listening" : ""} ${isConnecting ? "connecting" : ""}`}
        style={{
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        aria-label={isListening ? "Stop listening" : "Start listening"}
      >
        {isConnecting ? (
          /* Spinner */
          <div className="processing-ring" style={{ width: 20, height: 20 }} />
        ) : isListening ? (
          /* Stop icon */
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          /* Mic icon */
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      <span
        className="text-xs font-medium"
        style={{
          color: error ? "var(--error)" : "rgba(255,255,255,0.7)",
          textShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
