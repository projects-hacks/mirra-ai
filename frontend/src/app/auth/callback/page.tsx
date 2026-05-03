"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

/** Inner component that uses useSearchParams (requires Suspense boundary). */
function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error params from Supabase
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");

    if (errorParam) {
      setError(errorDesc ?? errorParam);
      setTimeout(() => router.replace("/"), 3000);
      return;
    }

    // Exchange code for session
    const supabase = getSupabase();
    supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_IN") {
        router.replace("/");
      }
    });

    // Timeout fallback
    const timeout = setTimeout(() => router.replace("/"), 10000);
    return () => clearTimeout(timeout);
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-8">
        <div className="text-4xl">⚠️</div>
        <h3>Sign-in failed</h3>
        <p className="text-sm text-center" style={{ color: "var(--on-surface-variant)" }}>
          {error}
        </p>
        <p className="text-xs" style={{ color: "var(--on-surface-muted)" }}>
          Redirecting home…
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="processing-ring" />
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
