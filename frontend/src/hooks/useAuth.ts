"use client";

import { useEffect, useCallback, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
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

  // ── Helper: map Supabase user → app User ──────────────
  function mapUser(supaUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, string>;
  }): User {
    return {
      id: supaUser.id,
      email: supaUser.email ?? "",
      displayName:
        supaUser.user_metadata?.full_name ??
        supaUser.user_metadata?.name ??
        supaUser.email?.split("@")[0] ??
        "User",
      avatarUrl: supaUser.user_metadata?.avatar_url,
    };
  }

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
      // Token already close to expiry — refresh immediately
      refreshToken();
      return;
    }

    refreshTimerRef.current = setTimeout(() => {
      refreshToken();
    }, refreshInMs);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshToken = useCallback(async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      // Refresh failed → sign out and redirect
      console.warn("Token refresh failed — signing out", error?.message);
      await supabase.auth.signOut();
      dispatch({ type: "SET_USER", payload: null });
      localStorage.clear();
      if (typeof globalThis.window !== "undefined") globalThis.location.href = "/";
      return;
    }

    // Broadcast refresh to other tabs (Task 17.4)
    const mapped = mapUser(data.session.user);
    broadcast({ event: "TOKEN_REFRESHED", user: mapped });
    scheduleTokenRefresh(data.session.expires_at);
  }, [dispatch, scheduleTokenRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 17.4: BroadcastChannel helpers ────────────────────
  function broadcast(msg: AuthBroadcast) {
    try {
      channelRef.current?.postMessage(msg);
    } catch { /* BroadcastChannel may not be available in some contexts */ }
  }

  function handleBroadcast(msg: AuthBroadcast) {
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
  }

  // ── Main effect: init auth, cross-tab channel, refresh timer ──
  useEffect(() => {
    const supabase = getSupabase();

    // Open BroadcastChannel for cross-tab sync (Task 17.4)
    if (typeof BroadcastChannel !== "undefined") {
      channelRef.current = new BroadcastChannel(AUTH_CHANNEL);
      channelRef.current.onmessage = (e: MessageEvent<AuthBroadcast>) => {
        handleBroadcast(e.data);
      };
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const mapped = mapUser(session.user);
        dispatch({ type: "SET_USER", payload: mapped });
        scheduleTokenRefresh(session.expires_at);   // Task 17.1
      }
    });

    // Subscribe to auth state changes (handles OAuth callback, signOut, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const mapped = mapUser(session.user);
          dispatch({ type: "SET_USER", payload: mapped });
          scheduleTokenRefresh(session.expires_at); // Task 17.1

          if (_event === "SIGNED_IN") {
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
  }, [dispatch, scheduleTokenRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── signInWithGoogle ───────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${globalThis.location.origin}/auth/callback`,
        // Use implicit flow — PKCE fails when @supabase/ssr cookies are
        // cleared between the OAuth redirect hops in a pure client-side app.
        queryParams: { response_type: "token" },
      },
    });
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

    const supabase = getSupabase();
    broadcast({ event: "SIGNED_OUT" });
    await supabase.auth.signOut();
    dispatch({ type: "SET_USER", payload: null });
    dispatch({ type: "RESET" });
    localStorage.clear();
    if (typeof globalThis.window !== "undefined") globalThis.location.href = "/";
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    user,
    isAuthenticated: !!user,
    signInWithGoogle,
    signOut,
  };
}
