'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function ClosetNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { path: '/closet', label: 'Closet', icon: 'checkroom' },
    { path: '/closet/analytics', label: 'Analytics', icon: 'analytics' },
    { path: '/outfit-history', label: 'Outfits', icon: 'history' },
    { path: '/look-diary', label: 'Looks', icon: 'photo_library' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 min-h-[44px] min-w-[44px] rounded-lg transition-colors ${
                  isActive
                    ? 'text-purple-400'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
