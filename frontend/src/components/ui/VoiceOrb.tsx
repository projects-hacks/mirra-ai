// @deprecated: voice-mode only. Retained temporarily during the tap-driven migration.
"use client";

interface VoiceOrbProps {
  isListening: boolean;
  isConnecting: boolean;
  error: string | null;
  onClick: () => void;
}

/** Voice Orb — central pulsating mic button. */
export default function VoiceOrb({
  isListening,
  isConnecting,
  error,
  onClick,
}: Readonly<VoiceOrbProps>) {
  // Don't disable during processing - allow interruption
  const disabled = isConnecting;

  // Status label — extracted to avoid nested ternary (S3358)
  function getLabel(): string {
    if (error) return error;
    if (isConnecting) return "Connecting…";
    if (isListening) return "Listening";
    return "Tap to speak";
  }

  const label = getLabel();

  // Icon — extracted to avoid nested ternary (S3358)
  function renderIcon() {
    if (isConnecting) {
      return <div className="processing-ring" style={{ width: 20, height: 20 }} />;
    }
    if (isListening) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      );
    }
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
    );
  }

  return (
    <div
      className="fixed left-1/2 z-[var(--z-orb)] flex -translate-x-1/2 flex-col items-center gap-2"
      style={{ bottom: "var(--orb-bottom)" }}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        className={`voice-orb ${isListening ? "listening" : ""} ${isConnecting ? "connecting" : ""}`}
        style={{
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: "0 16px 42px rgba(26, 28, 30, 0.2)",
        }}
        aria-label={isListening ? "Stop listening" : "Start listening"}
      >
        <span
          className="absolute inset-[-10px] rounded-full"
          aria-hidden="true"
        />
        <span className="relative z-10">{renderIcon()}</span>
      </button>

      <span
        className="rounded-full px-3 py-1 text-xs font-medium"
        style={{
          color: error ? "var(--error)" : "var(--on-surface)",
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.56)",
          boxShadow: "0 8px 24px rgba(26, 28, 30, 0.08)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
