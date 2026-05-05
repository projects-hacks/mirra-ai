import { getSupabase } from "@/lib/supabase";
import type { User } from "@/types";

export function mapUser(supaUser: {
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

export async function getSession() {
  const supabase = getSupabase();
  return supabase.auth.getSession();
}

export async function refreshSession() {
  const supabase = getSupabase();
  return supabase.auth.refreshSession();
}

export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  const supabase = getSupabase();
  return supabase.auth.onAuthStateChange(callback);
}

export async function signInWithGoogle() {
  const supabase = getSupabase();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${globalThis.location.origin}/auth/callback`,
      scopes: "openid profile email https://www.googleapis.com/auth/calendar.readonly",
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
}

export async function signOut() {
  const supabase = getSupabase();
  return supabase.auth.signOut();
}
