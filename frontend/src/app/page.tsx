"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const FEATURE_CARDS = [
  {
    title: "Skin Health",
    description: "Track scan trends, spot changes, and simulate improvement.",
  },
  {
    title: "GlowUp",
    description: "Turn your face shape and tone data into styling direction.",
  },
  {
    title: "Smart Closet",
    description: "Keep a visual wardrobe and pull context-aware outfit ideas fast.",
  },
  {
    title: "Try-On Studio",
    description: "Preview makeup, accessories, and styling changes in one flow.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { signIn, loading } = useAuth();

  const ctaLabel = useMemo(() => {
    if (loading) return "Checking session...";
    return "Try Now";
  }, [loading]);

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[linear-gradient(180deg,#f6f1ec_0%,#efe4d6_22%,#dbe5ef_100%)] text-[var(--ink-900,#18212b)]">
      <div className="relative isolate">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-12rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(236,162,112,0.42),transparent_62%)] blur-3xl" />
          <div className="absolute right-[-10rem] top-[10rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(100,139,184,0.35),transparent_64%)] blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.55))]" />
        </div>

        <section className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-6 pb-12 pt-10 sm:px-10 lg:px-12">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7a5b41]">Mirra</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl" style={{ fontFamily: "var(--font-serif)" }}>
                Your AI Appearance Operator
              </h1>
            </div>
            <div className="hidden rounded-full border border-white/60 bg-white/55 px-4 py-2 text-sm text-[#5e6670] shadow-[0_12px_30px_rgba(24,33,43,0.08)] backdrop-blur md:block">
              Skin, style, context, one guided flow
            </div>
          </div>

          <div className="mt-14 grid flex-1 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="max-w-xl text-lg leading-8 text-[#4b5563] sm:text-xl">
                Capture one selfie, understand what matters, and move from scan to recommendation without hunting through tools.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void signIn();
                  }}
                  disabled={loading}
                  className="rounded-full bg-[#1e293b] px-6 py-3 text-sm font-medium text-white shadow-[0_16px_32px_rgba(24,33,43,0.18)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {ctaLabel}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/privacy")}
                  className="rounded-full border border-white/70 bg-white/45 px-6 py-3 text-sm font-medium text-[#334155] backdrop-blur"
                >
                  See How We Handle Data
                </button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {FEATURE_CARDS.map((card) => (
                  <article
                    key={card.title}
                    className="rounded-[1.75rem] border border-white/55 bg-white/50 p-5 shadow-[0_18px_40px_rgba(24,33,43,0.08)] backdrop-blur"
                  >
                    <h2 className="text-lg font-semibold">{card.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#5e6670]">{card.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[2rem] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,255,255,0.42))] p-5 shadow-[0_24px_60px_rgba(24,33,43,0.12)] backdrop-blur">
                <div className="rounded-[1.6rem] bg-[#122033] p-5 text-white shadow-inner">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.28em] text-white/60">90 Second Demo</p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Guided Flow</span>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl bg-white/8 p-4">
                      <p className="text-sm text-white/70">1. Capture one selfie</p>
                      <p className="mt-1 text-base font-medium">Quality-gated Camera Kit scan</p>
                    </div>
                    <div className="rounded-2xl bg-white/8 p-4">
                      <p className="text-sm text-white/70">2. Read the signal</p>
                      <p className="mt-1 text-base font-medium">Skin, tone, face shape, and context in one pass</p>
                    </div>
                    <div className="rounded-2xl bg-white/8 p-4">
                      <p className="text-sm text-white/70">3. Take action</p>
                      <p className="mt-1 text-base font-medium">Move into glowup, closet, and try-on decisions fast</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
