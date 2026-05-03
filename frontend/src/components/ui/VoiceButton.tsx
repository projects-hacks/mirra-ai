"use client";

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  isConnected: boolean;
  onClick: () => void;
}

export default function VoiceButton({
  isListening,
  isProcessing,
  isConnected,
  onClick,
}: VoiceButtonProps) {
  const disabled = !isConnected || isProcessing;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`voice-btn ${isListening ? "listening" : ""}`}
        style={{
          opacity: disabled ? 0.4 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        aria-label={isListening ? "Stop listening" : "Start listening"}
      >
        {isListening ? (
          /* Stop icon */
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          /* Mic icon */
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      <span className="text-caption">
        {!isConnected
          ? "Connecting…"
          : isProcessing
            ? "Thinking…"
            : isListening
              ? "Listening — tap to stop"
              : "Tap to speak"}
      </span>
    </div>
  );
}
