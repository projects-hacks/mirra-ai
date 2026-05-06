"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/navigation/BottomNav";
import AppHeader from "@/components/navigation/AppHeader";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/skin": "Skin Health",
  "/skin/simulate": "Skin Simulation",
  "/skin-history": "Skin History",
  "/glowup": "GlowUp",
  "/closet": "Closet",
  "/outfit": "Outfit Builder",
  "/try-on": "Try-On Studio",
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const title = useMemo(() => TITLES[pathname] ?? "Mirra", [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="glass-card text-center">
          <p className="label-caps">Mirra</p>
          <p className="mt-2 text-sm" style={{ color: "var(--on-surface-variant)" }}>
            Checking your session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center px-4"
        style={{ background: "var(--bg)", color: "var(--on-surface)" }}
      >
        <div className="glass-card max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-container)] text-[var(--primary)]">
            <ShieldAlert size={24} aria-hidden="true" />
          </div>
          <p className="label-caps">Session required</p>
          <h1 className="section-display mt-2 text-2xl">Sign in to continue</h1>
          <p className="mt-3 text-sm" style={{ color: "var(--on-surface-variant)" }}>
            Your session could not be restored for this app view. Sign in again to open your closet and saved looks.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void signIn()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-[var(--on-primary)]"
            >
              Sign in
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 py-2 text-sm font-semibold"
              style={{ color: "var(--on-surface)" }}
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--bg)", color: "var(--on-surface)" }}>
      <AppHeader title={title} user={user} />

      <main className="bottom-nav-offset px-4 pb-8 pt-4">
        <div key={pathname} className="route-transition">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
