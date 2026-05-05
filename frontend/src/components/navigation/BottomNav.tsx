"use client";

import { Camera, Shirt, Sparkles, User as UserIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: Camera },
  { path: "/closet", label: "Closet", icon: Shirt },
  { path: "/skin-history", label: "Skin", icon: Sparkles },
  { path: "/profile", label: "Profile", icon: UserIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] px-3 pb-[var(--safe-bottom)] sm:px-6"
      aria-label="Primary navigation"
    >
      <div className="page-shell">
        <div className="glass-panel mx-auto flex h-[var(--nav-height)] max-w-xl items-center justify-around rounded-[1.5rem] px-2 shadow-[0_16px_40px_rgba(26,28,30,0.14)]">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => router.push(item.path)}
                className="flex min-h-[44px] min-w-[64px] flex-1 items-center justify-center"
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all duration-200"
                  style={{
                    background: isActive ? "var(--primary)" : "transparent",
                    color: isActive ? "var(--on-primary)" : "var(--on-surface-variant)",
                    boxShadow: isActive ? "0 10px 24px rgba(26, 28, 30, 0.18)" : "none",
                  }}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
