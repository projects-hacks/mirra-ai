'use client';

import { useOnlineStatus } from '@/hooks/useMobile';

/**
 * Offline Indicator Component
 * Shows a banner when the user is offline
 */
export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] py-2 px-4 text-center text-sm font-medium"
      style={{
        background: 'var(--error)',
        color: 'var(--on-error)',
      }}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-sm">cloud_off</span>
        <span>You&apos;re offline. Some features may not be available.</span>
      </div>
    </div>
  );
}
