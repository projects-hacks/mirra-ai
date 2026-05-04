'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the whole app
 */
export default class ErrorBoundary extends Component<Props, State> {
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Log to error reporting service (Sentry, LogRocket, etc.)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div
            className="glass-panel p-8 max-w-md w-full text-center"
            style={{ background: 'var(--surface-container)' }}
          >
            <span
              className="material-symbols-outlined text-[64px] mb-4"
              style={{ color: 'var(--error)' }}
            >
              error
            </span>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: 'var(--on-surface)' }}
            >
              Something went wrong
            </h2>
            <p
              className="mb-6"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 rounded-lg font-medium transition-colors"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--on-primary)',
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-6 py-3 rounded-lg border font-medium transition-colors"
                style={{
                  borderColor: 'var(--outline)',
                  color: 'var(--on-surface)',
                }}
              >
                Go Home
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary
                  className="cursor-pointer text-sm font-medium mb-2"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  Error Details (Dev Only)
                </summary>
                <pre
                  className="text-xs p-4 rounded-lg overflow-auto"
                  style={{
                    background: 'var(--surface-variant)',
                    color: 'var(--on-surface)',
                  }}
                >
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based Error Boundary Wrapper
 * For use in functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
