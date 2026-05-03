"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@/types/onboarding";

interface AuthScreenProps {
  onAuthComplete: (user: User) => void;
  onError: (error: Error) => void;
}

export function AuthScreen({ onAuthComplete, onError }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      
      // Client-side OAuth with PKCE (handled automatically by Supabase)
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        throw authError;
      }

      // User will be redirected to Google OAuth
      // Callback will handle session establishment
      
    } catch (err) {
      setIsLoading(false);

      const errorMessage = err instanceof Error ? err.message : "Authentication failed";
      
      let userMessage = "Authentication failed. Please try again.";
      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        userMessage = "Network error. Please check your internet connection.";
      }

      setError(userMessage);
      onError(new Error(userMessage));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div
        className="glassmorphic-card flex flex-col items-center gap-6 text-center"
        style={{
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "24px",
          padding: "32px",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-white">Welcome to Mirra</h1>
          <p className="text-sm text-white/80">Your AI appearance operator</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-3 font-medium text-gray-900 shadow-lg transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Continue with Google"
        >
          {isLoading ? (
            <>
              <svg
                className="h-5 w-5 animate-spin text-gray-900"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {error && (
          <div
            className="w-full rounded-lg bg-red-500/20 p-3 text-sm text-red-100"
            role="alert"
          >
            <p className="font-medium">Error</p>
            <p className="mt-1">{error}</p>
            <button
              onClick={handleGoogleSignIn}
              className="mt-2 text-xs font-medium underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        <p className="text-xs text-white/60">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
