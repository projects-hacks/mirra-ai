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
    // Check for auth success/error params from backend
    const authSuccess = searchParams.get("auth_success");
    const authError = searchParams.get("auth_error");
    const userId = searchParams.get("user_id");

    if (authError) {
      setError(authError);
      setTimeout(() => router.replace("/"), 3000);
      return;
    }

    if (authSuccess === "true" && userId) {
      // Backend has already established the session
      // Verify the session is accessible client-side
      verifySession(userId);
    } else {
      setError("Invalid authentication response");
      setTimeout(() => router.replace("/"), 3000);
    }
  }, [router, searchParams]);

  async function verifySession(userId: string) {
    try {
      setIsVerifying(true);
      const supabase = getSupabase();
      
      // Verify the user session exists
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user || user.id !== userId) {
        setError("Failed to verify user session");
        setTimeout(() => router.replace("/"), 3000);
        return;
      }

      // Verify user has required fields
      if (!user.email) {
        setError("User email not found");
        setTimeout(() => router.replace("/"), 3000);
        return;
      }

      // Session verified — redirect to main page
      // The main page will check onboarding status and show OnboardingFlow if needed
      router.replace("/");
    } catch (err) {
      console.error("Session verification error:", err);
      setError("An unexpected error occurred during sign-in");
      setTimeout(() => router.replace("/"), 3000);
    }
  }

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
