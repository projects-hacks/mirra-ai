"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/navigation/BottomNav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isDashboard = pathname === "/dashboard";

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--bg)", color: "var(--on-surface)" }}>
      {!isDashboard && (
        <header className="sticky top-0 z-[var(--z-nav)] px-4 pt-4">
          <div className="page-shell flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em]" style={{ color: "var(--on-surface-variant)" }}>
                Mirra
              </p>
              <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
                {pathname === "/glowup" ? "GlowUp" : pathname === "/try-on" ? "Try-On Studio" : "Dashboard"}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/60"
              style={{ backdropFilter: "blur(14px)" }}
              aria-label="Open profile"
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="text-sm font-semibold">
                  {user?.displayName?.[0]?.toUpperCase() ?? "M"}
                </span>
              )}
            </button>
          </div>
        </header>
      )}

      <main className={isDashboard ? "" : "bottom-nav-offset px-4 pb-8 pt-4"}>
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
