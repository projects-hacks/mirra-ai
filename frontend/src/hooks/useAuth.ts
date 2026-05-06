"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import {
  mapUser,
  getSession,
  refreshSession,
  onAuthStateChange,
  signInWithGoogle as authSignInWithGoogle,
  signOut as authSignOut,
} from "@/lib/auth";
import { useAppDispatch, useAppState } from "@/components/providers/AppProvider";
import type { User } from "@/types";

// ── BroadcastChannel name for cross-tab sync (Task 17.4) ──
const AUTH_CHANNEL = "mirra:auth";

type AuthBroadcast =
  | { event: "SIGNED_IN"; user: User }
  | { event: "SIGNED_OUT" }
  | { event: "TOKEN_REFRESHED"; user: User };

/** Hook: manages Supabase auth state, token refresh, and cross-tab sync. */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { user } = useAppState();
  const channelRef = useRef<BroadcastChannel | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTokenRef = useRef<() => Promise<void>>(async () => {});
  /** Set on SIGNED_IN so we do not call refreshSession() immediately (races OAuth cookie commit). */
  const lastOAuthSignInAtRef = useRef(0);
  const [loading, setLoading] = useState(true);

  // ── 17.4: BroadcastChannel helpers ────────────────────
  const broadcast = useCallback((msg: AuthBroadcast) => {
    try {
      channelRef.current?.postMessage(msg);
    } catch {
      // BroadcastChannel may not be available in some contexts
    }
  }, []);

  // ── 17.1: Schedule proactive token refresh 5 min before expiry ──
  const scheduleTokenRefresh = useCallback((expiresAt: number | undefined) => {
    if (!expiresAt) return;

    // Clear any existing timer
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const nowMs = Date.now();
    const expiresAtMs = expiresAt * 1000;           // Supabase gives seconds
    const fiveMinMs = 5 * 60 * 1000;
    const refreshInMs = expiresAtMs - nowMs - fiveMinMs;

    if (refreshInMs <= 0) {
      const msSinceOAuth = Date.now() - lastOAuthSignInAtRef.current;
      if (msSinceOAuth >= 0 && msSinceOAuth < 12_000) {
        refreshTimerRef.current = setTimeout(() => {
          void refreshTokenRef.current();
        }, 4000);
        return;
      }
      void refreshTokenRef.current();
      return;
    }

    refreshTimerRef.current = setTimeout(() => {
      void refreshTokenRef.current();
    }, refreshInMs);
  }, []);

  const refreshToken = useCallback(async () => {
    // Two attempts with a short delay so a transient network blip does not
    // kick the user out. supabase-js can also throw on offline/CORS so we
    // wrap each attempt in try/catch.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, error } = await refreshSession();
        if (!error && data.session) {
          const mapped = mapUser(data.session.user);
          broadcast({ event: "TOKEN_REFRESHED", user: mapped });
          scheduleTokenRefresh(data.session.expires_at);
          return;
        }
        if (error) {
          console.warn(`[auth] proactive refresh attempt ${attempt + 1} failed`, error.message);
        }
      } catch (err) {
        console.warn(`[auth] proactive refresh attempt ${attempt + 1} threw`, err);
      }
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 800));
    }

    console.warn("[auth] proactive refresh exhausted retries — signing out");
    await authSignOut();
    dispatch({ type: "SET_USER", payload: null });
    localStorage.clear();
    if (typeof globalThis.window !== "undefined") globalThis.location.href = "/";
  }, [broadcast, dispatch, scheduleTokenRefresh]);

  useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);

  const handleBroadcast = useCallback((msg: AuthBroadcast) => {
    switch (msg.event) {
      case "SIGNED_IN":
        dispatch({ type: "SET_USER", payload: msg.user });
        break;
      case "SIGNED_OUT":
        dispatch({ type: "SET_USER", payload: null });
        dispatch({ type: "RESET" });
        if (typeof globalThis.window !== "undefined") globalThis.location.href = "/";
        break;
      case "TOKEN_REFRESHED":
        dispatch({ type: "SET_USER", payload: msg.user });
        break;
    }
  }, [dispatch]);

  // ── Main effect: init auth, cross-tab channel, refresh timer ──
  useEffect(() => {
    // Open BroadcastChannel for cross-tab sync (Task 17.4)
    if (typeof BroadcastChannel !== "undefined") {
      channelRef.current = new BroadcastChannel(AUTH_CHANNEL);
      channelRef.current.onmessage = (e: MessageEvent<AuthBroadcast>) => {
        handleBroadcast(e.data);
      };
    }

    // Get initial session
    void (async () => {
      try {
        const { data: { session } } = await getSession();
        const resolvedSession =
          session?.user
            ? session
            : (await refreshSession()).data.session;

        if (resolvedSession?.user) {
          const mapped = mapUser(resolvedSession.user);
          dispatch({ type: "SET_USER", payload: mapped });
          scheduleTokenRefresh(resolvedSession.expires_at);   // Task 17.1
        }
      } catch (error) {
        console.warn("Initial session restore failed", error);
      } finally {
        setLoading(false);
      }
    })();

    // Subscribe to auth state changes (handles OAuth callback, signOut, refresh)
    const { data: { subscription } } = onAuthStateChange(
      (_event, session) => {
        const authSession = session as {
          user?: { id: string; email?: string; user_metadata?: Record<string, string> };
          expires_at?: number;
        } | null;

        if (authSession?.user) {
          const mapped = mapUser(authSession.user);
          dispatch({ type: "SET_USER", payload: mapped });
          scheduleTokenRefresh(authSession.expires_at); // Task 17.1

          if (_event === "SIGNED_IN") {
            lastOAuthSignInAtRef.current = Date.now();
            broadcast({ event: "SIGNED_IN", user: mapped });
          }
          if (_event === "TOKEN_REFRESHED") {
            broadcast({ event: "TOKEN_REFRESHED", user: mapped });
          }
        } else {
          dispatch({ type: "SET_USER", payload: null });
          if (_event === "SIGNED_OUT") {
            broadcast({ event: "SIGNED_OUT" });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      channelRef.current?.close();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [broadcast, dispatch, handleBroadcast, scheduleTokenRefresh]);

  // ── signInWithGoogle ───────────────────────────────────
  const signIn = useCallback(async () => {
    await authSignInWithGoogle();
  }, []);

  // ── signOut: disconnect WS + clear state + broadcast to other tabs ────
  const signOut = useCallback(async () => {
    // Task 16.6: Disconnect WebSocket connections before clearing state
    try {
      const ws = (globalThis as typeof globalThis & { __mirraWS?: WebSocket }).__mirraWS;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }
    } catch { /* ignore */ }

    broadcast({ event: "SIGNED_OUT" });
    await authSignOut();
    dispatch({ type: "SET_USER", payload: null });
    dispatch({ type: "RESET" });
    localStorage.clear();
    if (typeof globalThis.window !== "undefined") globalThis.location.href = "/";
  }, [broadcast, dispatch]);

  return {
    user,
    signIn,
    signOut,
    loading,
  };
}
