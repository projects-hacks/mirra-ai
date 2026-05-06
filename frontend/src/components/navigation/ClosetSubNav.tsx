"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BarChart3, BookMarked, History, Shirt } from "lucide-react";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/closet", label: "Closet", icon: Shirt },
  { href: "/closet/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/outfit-history", label: "Outfits", icon: History },
  { href: "/look-diary", label: "Looks", icon: BookMarked },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/closet") {
    return pathname === "/closet";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface ClosetSubNavProps {
  /** Lighter chips for purple gradient standalone pages (outfit history, look diary). */
  variant?: "default" | "gradient";
}

/** Inline wardrobe section links — use instead of a second fixed bottom bar (avoids stacking with BottomNav). */
export default function ClosetSubNav({ variant = "default" }: Readonly<ClosetSubNavProps>) {
  const pathname = usePathname();
  const inactiveClass =
    variant === "gradient"
      ? "border border-white/18 bg-white/10 text-white/85 hover:bg-white/16 hover:text-white"
      : "glass-panel text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]";
  const focusClass =
    variant === "gradient"
      ? "focus-visible:outline-white/80"
      : "focus-visible:outline-[var(--primary)]";

  return (
    <nav
      aria-label="Wardrobe sections"
      className="scrollbar-none flex gap-2 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const on = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-[transform,box-shadow,background-color] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] ${focusClass} ${
              on
                ? "bg-[var(--primary)] text-white shadow-[0_10px_24px_rgba(139,92,246,0.35)]"
                : inactiveClass
            }`}
          >
            <Icon size={15} strokeWidth={2.25} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
