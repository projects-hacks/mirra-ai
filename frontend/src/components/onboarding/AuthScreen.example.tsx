/**
 * Example usage of AuthScreen component
 * 
 * This file demonstrates how to integrate AuthScreen into the onboarding flow.
 */

"use client";

import { AuthScreen } from "./AuthScreen";
import { useOnboarding } from "@/contexts/OnboardingContext";
import type { User } from "@/types/onboarding";

export function AuthScreenExample() {
  const { completeAuth, setError } = useOnboarding();

  const handleAuthComplete = (user: User) => {
    console.log("Authentication successful:", user);
    // This will advance to the camera_permission step
    completeAuth(user);
  };

  const handleAuthError = (error: Error) => {
    console.error("Authentication failed:", error);
    setError({
      step: "auth",
      message: error.message,
      code: "AUTH_FAILED",
      retryable: true,
    });
  };

  return (
    <AuthScreen
      onAuthComplete={handleAuthComplete}
      onError={handleAuthError}
    />
  );
}

/**
 * Integration Notes:
 * 
 * 1. The AuthScreen component handles the Google OAuth flow via Supabase Auth
 * 2. On success, it redirects to /auth/callback which should:
 *    - Extract the session from the URL
 *    - Create profile and user_preferences rows (via database trigger)
 *    - Call onAuthComplete with the user data
 *    - Redirect back to the onboarding flow
 * 
 * 3. The component displays:
 *    - Glassmorphic card with Google OAuth button
 *    - Loading spinner during OAuth redirect
 *    - Error messages with retry button
 *    - Privacy notice
 * 
 * 4. Error handling:
 *    - Network errors: "Network error. Please check your internet connection..."
 *    - OAuth cancellation: "Sign-in was cancelled. Please try again."
 *    - Invalid credentials: "Invalid credentials. Please try again."
 *    - Generic errors: "Authentication failed. Please check your connection..."
 * 
 * 5. Accessibility:
 *    - Button has aria-label="Continue with Google"
 *    - Error messages have role="alert"
 *    - Button is disabled during loading
 *    - Keyboard navigation supported
 */
