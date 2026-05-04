"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

type WindowWithSentry = typeof globalThis & {
  Sentry?: {
    captureException: (
      error: Error,
      context: { contexts: { react: { componentStack: string } } }
    ) => void;
  };
};

/**
 * Error Boundary for Onboarding Flow
 * 
 * Catches React component errors during onboarding and displays
 * a fallback UI with retry functionality.
 * 
 * Requirements: 21.13, 21.14
 */
export class OnboardingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error("OnboardingErrorBoundary caught error:", error, errorInfo);

    // In production, you would log to a centralized logging service
    // e.g., Sentry, LogRocket, etc.
    const sentry = (globalThis as WindowWithSentry).Sentry;
    if (sentry) {
      sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack || "",
          },
        },
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      // Use custom fallback if provided
      if (this.props.fallback && error) {
        return this.props.fallback(error, this.handleRetry);
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="text-center">
              {/* Error Icon */}
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>

              {/* Error Message */}
              <h2 className="text-2xl font-semibold text-white mb-3">
                Something went wrong
              </h2>
              <p className="text-gray-300 mb-6">
                We encountered an unexpected error during onboarding. Please try
                again or contact support if the problem persists.
              </p>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === "development" && error && (
                <div className="mb-6 p-4 bg-black/30 rounded-lg text-left">
                  <p className="text-xs text-red-300 font-mono break-all">
                    {error.message}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Try Again
                </button>

                <button
                  onClick={() => {
                    globalThis.location.href = "/";
                  }}
                  className="w-full py-3 px-6 bg-white/10 text-white font-medium rounded-full hover:bg-white/20 transition-all duration-200 border border-white/20"
                >
                  Return to Home
                </button>
              </div>

              {/* Support Link */}
              <p className="mt-6 text-sm text-gray-400">
                Need help?{" "}
                <a
                  href="mailto:support@mirra.app"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for easier usage
 */
export function withOnboardingErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error, retry: () => void) => ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <OnboardingErrorBoundary fallback={fallback}>
        <Component {...props} />
      </OnboardingErrorBoundary>
    );
  };
}
