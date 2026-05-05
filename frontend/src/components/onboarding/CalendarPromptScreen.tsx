"use client";

import { useState } from "react";

interface CalendarPromptScreenProps {
  onConnect: () => void | Promise<void>;
  onSkip: () => void;
}

export function CalendarPromptScreen({ onConnect, onSkip }: Readonly<CalendarPromptScreenProps>) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await Promise.resolve(onConnect());
    } catch (error) {
      console.error("Calendar connection error:", error);
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div
        className="glassmorphic-card flex flex-col items-center gap-6 text-center"
        style={{
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "24px",
          padding: "32px",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        <div className="flex flex-col gap-2">
          <div className="text-4xl mb-2">📅</div>
          <h2 className="text-2xl font-bold text-white">Connect Your Calendar</h2>
          <p className="text-sm text-white/80">
            Want to connect your calendar so I know what&apos;s coming up?
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-3 font-medium text-gray-900 shadow-lg transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Connect Calendar"
          >
            {isConnecting ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin text-gray-900"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Connecting...</span>
              </>
            ) : (
              <span>Connect Calendar</span>
            )}
          </button>

          <button
            onClick={onSkip}
            disabled={isConnecting}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white/10 px-6 py-3 font-medium text-white border border-white/20 transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Skip for Now"
          >
            Skip for Now
          </button>
        </div>

        <p className="text-xs text-white/60">
          You can always connect your calendar later in settings
        </p>
      </div>
    </div>
  );
}
