"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

/** Inner component that uses useSearchParams (requires Suspense boundary). */
function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Check for error params from Supabase
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");

    if (errorParam) {
      setError(errorDesc ?? errorParam);
      setTimeout(() => router.replace("/"), 3000);
      return;
    }

    // Exchange code for session (PKCE flow)
    const supabase = getSupabase();
    const code = searchParams.get("code");

    async function handleCallback() {
      if (!code) {
        setError("No authorization code received");
        setTimeout(() => router.replace("/"), 3000);
        return;
      }

      try {
        // Exchange the auth code for a session — this stores the session in cookies
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          setTimeout(() => router.replace("/"), 3000);
          return;
        }

        // Verify the user was created and get user data
        setIsVerifying(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setError("Failed to verify user session");
          setTimeout(() => router.replace("/"), 3000);
          return;
        }

        // Verify user has required fields (email is essential)
        if (!user.email) {
          setError("User email not found");
          setTimeout(() => router.replace("/"), 3000);
          return;
        }

        // Database triggers automatically create profile and user_preferences rows
        // Session is now stored and user is verified — redirect to main page
        // The main page will check onboarding status and show OnboardingFlow if needed
        router.replace("/");
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("An unexpected error occurred during sign-in");
        setTimeout(() => router.replace("/"), 3000);
      }
    }

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-8">
        <div className="text-4xl">⚠️</div>
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
      {isVerifying && (
        <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
          Verifying your account…
        </p>
      )}
    </div>
  );
}

/** OAuth callback page — wraps handler in Suspense as required by Next.js for useSearchParams. */
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
