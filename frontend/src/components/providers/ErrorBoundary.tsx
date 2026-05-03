"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary Component
 * Catches React errors and displays graceful fallback UI
 * Prevents entire app crash from component errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 to-purple-50">
            <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg max-w-md mx-4">
              <span className="material-symbols-outlined text-[64px] text-rose-400 mb-4">
                error
              </span>
              <h2 className="text-2xl font-serif text-gray-800 mb-4">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-6">
                We're sorry for the inconvenience. Please try refreshing the
                page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-rose-400 to-purple-400 text-white rounded-full hover:shadow-lg transition-all"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
