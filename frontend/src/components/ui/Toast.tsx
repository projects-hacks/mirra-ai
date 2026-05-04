"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  showToast: (message: string, type: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/** Helper: get background color for toast type */
function getToastBackground(type: Toast["type"]): string {
  if (type === "error") return "rgba(239, 68, 68, 0.95)";
  if (type === "success") return "rgba(34, 197, 94, 0.95)";
  return "rgba(59, 130, 246, 0.95)";
}

/** Helper: get icon for toast type */
function ToastIcon({ type }: Readonly<{ type: Toast["type"] }>) {
  if (type === "error") return <XCircle size={20} style={{ color: "white", flexShrink: 0 }} />;
  if (type === "success") return <CheckCircle size={20} style={{ color: "white", flexShrink: 0 }} />;
  return <Info size={20} style={{ color: "white", flexShrink: 0 }} />;
}

/**
 * Toast Provider Component
 * Provides toast notification system for user feedback
 * Auto-dismisses after 5 seconds
 */
export function ToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismissAfterDelay = useCallback((id: string) => {
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const showToast = useCallback((message: string, type: Toast["type"]) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    dismissAfterDelay(id);
  }, [dismissAfterDelay]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Memoize context value to prevent unnecessary re-renders (S6481)
  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div 
        className="fixed z-50 space-y-2"
        style={{
          bottom: "max(1rem, env(safe-area-inset-bottom))",
          right: "max(1rem, env(safe-area-inset-right))",
          left: "max(1rem, env(safe-area-inset-left))",
          maxWidth: "400px",
          marginLeft: "auto",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="glass-card flex items-center gap-3 p-4 animate-slide-in-right"
            style={{
              background: getToastBackground(toast.type),
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
            role="alert"
            aria-live="polite"
          >
            <ToastIcon type={toast.type} />
            <span className="flex-1 font-sans text-sm" style={{ color: "white" }}>
              {toast.message}
            </span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Dismiss notification"
              style={{ minWidth: "28px", minHeight: "28px" }}
            >
              <X size={16} style={{ color: "white" }} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};
