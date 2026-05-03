"use client";

import { useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAppDispatch, useAppState } from "@/components/providers/AppProvider";
import type { User } from "@/types";

/** Hook: manages Supabase auth state and syncs to AppContext. */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { user } = useAppState();

  // Listen to auth state changes
  useEffect(() => {
    const supabase = getSupabase();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      if (session?.user) {
        const mapped = mapUser(session.user);
        dispatch({ type: "SET_USER", payload: mapped });
      }
    });

    // Subscribe to changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (session?.user) {
        dispatch({ type: "SET_USER", payload: mapUser(session.user) });
      } else {
        dispatch({ type: "SET_USER", payload: null });
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    []
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    dispatch({ type: "SET_USER", payload: null });
  }, [dispatch]);

  return {
    user,
    isAuthenticated: !!user,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  };
}

// ── Helper ──────────────────────────────────────────
function mapUser(supaUser: { id: string; email?: string; user_metadata?: Record<string, string> }): User {
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
