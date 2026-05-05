"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/navigation/BottomNav";
import AppHeader from "@/components/navigation/AppHeader";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/skin": "Skin Health",
  "/glowup": "GlowUp",
  "/closet": "Closet",
  "/try-on": "Try-On Studio",
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const title = useMemo(() => TITLES[pathname] ?? "Mirra", [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  if (loading || !user) {
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

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--bg)", color: "var(--on-surface)" }}>
      <AppHeader title={title} user={user} />

      <main className="bottom-nav-offset px-4 pb-8 pt-4">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
