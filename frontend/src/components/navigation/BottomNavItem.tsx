"use client";

import type { LucideIcon } from "lucide-react";

interface BottomNavItemProps {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  color: string;
  onClick: () => void;
}

export default function BottomNavItem({
  label,
  icon: Icon,
  isActive,
  color,
  onClick,
}: Readonly<BottomNavItemProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] min-w-[58px] flex-1 items-center justify-center rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
      aria-current={isActive ? "page" : undefined}
    >
      <span
        className="flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-xs transition-all duration-200"
        style={{
          background: isActive ? color : "transparent",
          color: isActive ? "white" : "var(--on-surface-variant)",
          boxShadow: isActive ? "0 10px 24px rgba(26, 28, 30, 0.16)" : "none",
          fontFamily: "var(--font-label)",
          fontWeight: 700,
          letterSpacing: "0.12em",
        }}
      >
        <Icon size={16} strokeWidth={2.2} />
        <span className="hidden sm:inline">{label}</span>
      </span>
    </button>
  );
}
