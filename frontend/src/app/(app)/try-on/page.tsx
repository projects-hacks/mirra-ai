"use client";

import { useRouter } from "next/navigation";

export default function TryOnPage() {
  const router = useRouter();

  return (
    <section className="page-shell">
      <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.24em]" style={{ color: "var(--on-surface-variant)" }}>
          Studio Mode
        </p>
        <h2 className="mt-3 text-3xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
          Try-On Studio
        </h2>
        <p className="mt-3 max-w-2xl text-sm sm:text-base" style={{ color: "var(--on-surface-variant)" }}>
          Your VTO endpoints for clothes, makeup, earrings, necklaces, and hair are ready. This screen is the app-shell
          placeholder so judges can navigate the future flow cleanly while we build the richer studio UI.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => router.push("/dashboard")}>
            Open Main Camera
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.push("/closet")}>
            Browse Closet
          </button>
        </div>
      </div>
    </section>
  );
}
