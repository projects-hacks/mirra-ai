"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

function CallbackHandler() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabase();

        const url = new URL(globalThis.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const callbackError =
          url.searchParams.get("error_description") ??
          hashParams.get("error_description") ??
          url.searchParams.get("error") ??
          hashParams.get("error");
        if (callbackError) {
          throw new Error(callbackError);
        }

        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error("No session established");
        }

        // Extract Google provider token for calendar access
        const providerToken = session.provider_token;
        const providerRefreshToken = session.provider_refresh_token;
        
        if (providerToken) {
          // Store calendar token in user_preferences
          try {
            await supabase.from("user_preferences").upsert({
              user_id: session.user.id,
              calendar_connected: true,
              google_calendar_token: JSON.stringify({
                token: providerToken,
                refresh_token: providerRefreshToken,
                token_uri: "https://oauth2.googleapis.com/token",
                scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
              }),
            } as never, {
              onConflict: "user_id"
            });
            
            console.log("Calendar token stored successfully");
          } catch (tokenError) {
            console.warn("Failed to store calendar token:", tokenError);
            // Don't fail the auth flow if calendar token storage fails
          }
        }

        try {
          const { data } = await supabase
            .from("profiles")
            .select("onboarded")
            .eq("id", session.user.id)
            .single();

          const isOnboarded = (data as { onboarded?: boolean } | null)?.onboarded ?? false;
          router.replace(isOnboarded ? "/dashboard" : "/capture");
        } catch {
          router.replace("/capture");
        }
        
      } catch (err) {
        console.error("OAuth callback error:", err);
        const errorMessage = err instanceof Error ? err.message : "Authentication failed";
        setError(errorMessage);
        setTimeout(() => router.replace("/"), 3000);
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-8">
        <TriangleAlert size={40} className="text-[var(--error)]" aria-hidden="true" />
        <h3 className="text-lg font-semibold">Sign-in failed</h3>
        <p className="text-sm text-center max-w-md" style={{ color: "var(--on-surface-variant)" }}>
          {error}
        </p>
        <p className="text-xs" style={{ color: "var(--on-surface-muted)" }}>
          Redirecting home…
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <div className="processing-ring" />
      <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
        Completing sign-in…
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="processing-ring" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
