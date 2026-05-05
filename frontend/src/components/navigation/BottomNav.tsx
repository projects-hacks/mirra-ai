"use client";

import { Home, ScanFace, Shirt, Sparkles, WandSparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import BottomNavItem from "./BottomNavItem";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Home", icon: Home, color: "var(--primary)" },
  { path: "/skin", label: "Skin", icon: Sparkles, color: "#10b981" },
  { path: "/glowup", label: "GlowUp", icon: WandSparkles, color: "#f59e0b" },
  { path: "/closet", label: "Closet", icon: Shirt, color: "#8b5cf6" },
  { path: "/try-on", label: "Try-On", icon: ScanFace, color: "#ec4899" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] px-3 pb-[calc(var(--safe-bottom)+0.35rem)] sm:px-6"
      aria-label="Primary navigation"
    >
      <div className="page-shell">
        <div
          className="glass-panel mx-auto flex h-[var(--nav-height)] max-w-2xl items-center justify-around rounded-[1.5rem] px-2"
          style={{ boxShadow: "0 18px 44px rgba(2, 6, 23, 0.38)" }}
        >
          {NAV_ITEMS.map((item) => (
            <BottomNavItem
              key={item.path}
              label={item.label}
              icon={item.icon}
              color={item.color}
              isActive={pathname === item.path || pathname.startsWith(`${item.path}/`)}
              onClick={() => router.push(item.path)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
