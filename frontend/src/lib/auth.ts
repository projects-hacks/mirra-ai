import { getSupabase } from "@/lib/supabase";
import type { User } from "@/types";

function normalizeOrigin(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function getAuthRedirectUrl() {
  if (typeof globalThis.window !== "undefined") {
    const { origin, hostname } = globalThis.location;
    if (isLocalHostname(hostname)) {
      return `${normalizeOrigin(origin)}/auth/callback`;
    }
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return `${normalizeOrigin(configured)}/auth/callback`;
  }

  if (typeof globalThis.window !== "undefined") {
    const { origin } = globalThis.location;

    console.warn(
      "NEXT_PUBLIC_SITE_URL is not configured. Falling back to the current origin for OAuth redirects."
    );
    return `${normalizeOrigin(origin)}/auth/callback`;
  }

  return "http://localhost:3000/auth/callback";
}

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
      redirectTo: getAuthRedirectUrl(),
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
