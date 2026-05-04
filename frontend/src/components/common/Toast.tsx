'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
}

/**
 * Toast Notification Component
 * Displays temporary notifications with auto-dismiss
 */
export default function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success':
        return 'var(--success)';
      case 'error':
        return 'var(--error)';
      case 'warning':
        return '#f59e0b';
      default:
        return 'var(--primary)';
    }
  };

  return (
    <div
      className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[100] glass-panel px-6 py-4 rounded-lg shadow-lg animate-slide-up flex items-center gap-3 max-w-md"
      style={{ background: 'var(--surface-container)' }}
    >
      <span
        className="material-symbols-outlined text-[24px]"
        style={{ color: getColor() }}
      >
        {getIcon()}
      </span>
      <p style={{ color: 'var(--on-surface)' }}>{message}</p>
      <button
        onClick={onClose}
        className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
      >
        <span className="material-symbols-outlined text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          close
        </span>
      </button>
    </div>
  );
}

/**
 * Toast Container Hook
 * Manages multiple toasts
 */
export function useToast() {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return { toasts, showToast, removeToast };
}

// Add to globals.css:
/*
@keyframes slide-up {
  from {
    transform: translate(-50%, 100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
*/
