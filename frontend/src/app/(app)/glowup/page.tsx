"use client";

import { useRouter } from "next/navigation";

export default function GlowupPage() {
  const router = useRouter();

  return (
    <section className="page-shell">
      <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.24em]" style={{ color: "var(--on-surface-variant)" }}>
          Coming Into Focus
        </p>
        <h2 className="mt-3 text-3xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
          GlowUp Recommendations
        </h2>
        <p className="mt-3 max-w-2xl text-sm sm:text-base" style={{ color: "var(--on-surface-variant)" }}>
          This next screen will turn your face analysis and skin tone data into makeup, hair, and accessory direction.
          The backend recommendation endpoint is ready, so the UI can plug into it next.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => router.push("/capture")}>
            Capture Fresh Selfie
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.push("/dashboard")}>
            Back To Dashboard
          </button>
        </div>
      </div>
    </section>
  );
}
