"use client";

import type { User } from "@/types";

interface StatusBarProps {
  isConnected: boolean;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

/** Top status bar — "Mirra" title + Live indicator + auth. */
export default function StatusBar({
  isConnected,
  user,
  onSignIn,
  onSignOut,
}: StatusBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-4">
      {/* Left: Menu placeholder */}
      <div className="w-10" />

      {/* Center: Title */}
      <h1
        className="text-xl tracking-tight"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          color: "var(--on-surface)",
          textShadow: "0 1px 4px rgba(255,255,255,0.5)",
        }}
      >
        Mirra
      </h1>

      {/* Right: Live badge or Sign in */}
      {user ? (
        <button
          onClick={onSignOut}
          className="context-pill text-xs"
          style={{ padding: "0.375rem 0.75rem" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: isConnected ? "var(--success)" : "var(--outline)" }}
          />
          {isConnected ? "Live" : "…"}
        </button>
      ) : (
        <button onClick={onSignIn} className="context-pill text-xs">
          Sign in
        </button>
      )}
    </div>
  );
}
