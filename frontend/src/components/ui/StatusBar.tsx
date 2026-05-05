/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import type { User } from "@/types";

interface StatusBarProps {
  user: User | null;
  statusLabel?: string;
  statusColor?: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

/** Top status bar — "Mirra" title + app status + auth. */
export default function StatusBar({
  user,
  statusLabel = "Style operator",
  statusColor = "var(--success)",
  onSignIn,
}: Readonly<StatusBarProps>) {
  const router = useRouter();

  return (
    <div className="absolute inset-x-0 top-0 z-[var(--z-nav)] px-3 pt-[calc(var(--safe-top)+0.75rem)] sm:px-5">
      <div className="mx-auto flex w-full max-w-[var(--content-max)] items-center justify-between gap-3 rounded-full border border-white/55 bg-[rgba(255,255,255,0.72)] px-4 py-3 shadow-[0_10px_30px_rgba(26,28,30,0.08)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: statusColor }}
          />
          <div className="min-w-0">
            <h1
              className="text-base tracking-tight sm:text-lg"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                color: "var(--on-surface)",
              }}
            >
              Mirra
            </h1>
            <p className="text-[11px] sm:text-xs" style={{ color: "var(--on-surface-variant)" }}>
              {statusLabel}
            </p>
          </div>
        </div>

        {user ? (
          <button
            onClick={() => router.push("/profile")}
            className="flex min-h-[44px] min-w-[44px] items-center gap-2"
            aria-label="Go to profile"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-9 w-9 rounded-full object-cover"
                style={{ outline: `2px solid ${statusColor}`, outlineOffset: "1px" }}
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: "var(--primary)", color: "white" }}
              >
                {user.displayName?.[0]?.toUpperCase()}
              </div>
            )}
          </button>
        ) : (
          <button onClick={onSignIn} className="context-pill text-xs min-h-[44px]">
            Sign in
          </button>
        )}
      </div>
    </div>
  );
}
