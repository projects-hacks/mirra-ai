"use client";

import { useRouter } from "next/navigation";
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
}: Readonly<StatusBarProps>) {
  const router = useRouter();

  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
      {/* Left: Menu placeholder */}
      <div className="w-8 sm:w-10" />

      {/* Center: Title */}
      <h1
        className="text-lg sm:text-xl tracking-tight"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          color: "var(--on-surface)",
          textShadow: "0 1px 4px rgba(255,255,255,0.5)",
        }}
      >
        Mirra
      </h1>

      {/* Right: Avatar → profile, or Sign in */}
      {user ? (
        <button
          onClick={() => router.push("/profile")}
          className="flex items-center gap-2 min-h-[44px] min-w-[44px]"
          aria-label="Go to profile"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="w-8 h-8 rounded-full object-cover"
              style={{ outline: `2px solid ${isConnected ? "var(--success)" : "var(--outline)"}`, outlineOffset: "1px" }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ background: "var(--primary)", color: "white" }}
            >
              {user.displayName?.[0]?.toUpperCase()}
            </div>
          )}
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: isConnected ? "var(--success)" : "var(--outline)" }}
          />
        </button>
      ) : (
        <button onClick={onSignIn} className="context-pill text-xs min-h-[44px]">
          Sign in
        </button>
      )}
    </div>
  );
}
