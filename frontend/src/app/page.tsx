/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  CloudSun,
  Eye,
  Layers3,
  LockKeyhole,
  ScanFace,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  WandSparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const HERO_IMAGE =
  "https://plugins-media.makeupar.com/smb/blog/post/2025-04-17/4edad54f-ef6b-4842-b104-d114889318b1.jpg";

const FEATURE_ROWS = [
  {
    title: "Skin Health",
    eyebrow: "Analyze, track, simulate",
    description:
      "Mirra turns one quality-gated selfie into fourteen skin scores, skin age, tone context, trends, treatment simulation, and product direction.",
    image:
      "https://d3ss46vukfdtpo.cloudfront.net/static/media/img_demostore_skincarelive_topbanner.0cffe3a7.jpg",
    stats: ["14 concerns", "Skin age", "Before and after"],
    icon: Activity,
  },
  {
    title: "GlowUp Studio",
    eyebrow: "Face-aware styling",
    description:
      "Face shape, undertone, hair, lip, eye, and brow colors become coordinated makeup, hair, earring, and necklace choices.",
    image:
      "https://bcw-media.s3.ap-northeast-1.amazonaws.com/shade_finder_s5_poster_2_8a8f9307d2.png",
    stats: ["Tone-aware", "Face shape", "VTO results"],
    icon: WandSparkles,
  },
  {
    title: "Closet and Try-On",
    eyebrow: "From wardrobe to proof",
    description:
      "Mirra ranks what you own, finds what you are missing, lets you try products on, and produces a proof card before purchase.",
    image:
      "https://plugins-media.makeupar.com/smb/blog/post/2025-01-15/10a4b980-f571-4d08-8f5d-e3ed48db77aa.jpg",
    stats: ["Closet match", "Gap search", "Proof card"],
    icon: ShoppingBag,
  },
];

const API_STACK = [
  "Skin analysis",
  "Skin tone",
  "Face attributes",
  "Skin simulation",
  "Clothes VTO",
  "Makeup VTO",
  "Hair transfer",
  "Earrings VTO",
  "Necklace VTO",
];

const WORKFLOW = [
  {
    title: "Capture once",
    description:
      "A guided selfie flow checks lighting and framing so skin, face, and try-on features get a usable portrait—no mystery uploads.",
    icon: Camera,
  },
  {
    title: "Read the signal",
    description:
      "Perfect Corp powers skin, tone, face attributes, and virtual try-on. Mirra folds those results into one profile you can actually use.",
    icon: ScanFace,
  },
  {
    title: "Add real-world context",
    description:
      "Gemini ties together your scan, weather, history, closet, and product search into a visible reasoning trace—so recommendations match the day, not a generic model.",
    icon: Layers3,
  },
  {
    title: "Decide with proof",
    description:
      "Simulate skin improvements, preview makeup and hair, match outfits, and see a proof-style summary before you spend.",
    icon: BadgeCheck,
  },
];

const PROOF_ITEMS = [
  ["Tone match", "97%"],
  ["Style fit", "94%"],
  ["Skin-safe", "Clear"],
  ["New spend", "$127"],
];

export default function LandingPage() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();
  const ctaLabel = loading ? "Checking session..." : user ? "Open Dashboard" : "Try Now";

  const startSignIn = () => {
    if (user) {
      router.push("/dashboard");
      return;
    }
    void signIn();
  };

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#f7f2ea] text-[#16202a] [&_section[id]]:scroll-mt-20 md:[&_section[id]]:scroll-mt-24">
      <section className="relative isolate min-h-[88svh] overflow-hidden bg-[#111827] text-white">
        <img
          src={HERO_IMAGE}
          alt="AI skin simulation preview"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(10,15,24,0.88)_0%,rgba(10,15,24,0.72)_44%,rgba(10,15,24,0.26)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-[linear-gradient(180deg,transparent,#f7f2ea)]" />

        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <a href="#top" className="inline-flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 bg-white/12 backdrop-blur">
              <Sparkles size={18} aria-hidden="true" />
            </span>
            <span>
              <span className="eyebrow block text-sm text-white">MIRRA</span>
              <span className="block max-w-[14rem] text-[0.7rem] leading-snug text-white/65 sm:max-w-none sm:text-xs">
                Skin, style, closet &amp; try-on—one guided flow
              </span>
            </span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-white/72 md:flex">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#workflow" className="transition-colors hover:text-white">Workflow</a>
            <a href="#proof" className="transition-colors hover:text-white">Proof</a>
            <a href="#trust" className="transition-colors hover:text-white">Trust</a>
          </nav>
          <button
            type="button"
            onClick={startSignIn}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#111827] shadow-[0_16px_36px_rgba(0,0,0,0.22)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {ctaLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </header>

        <nav
          aria-label="Page sections"
          className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-8 lg:px-10 md:hidden [&::-webkit-scrollbar]:hidden"
        >
          {[
            ["#features", "Features"],
            ["#workflow", "Flow"],
            ["#proof", "Proof"],
            ["#trust", "Trust"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/85 backdrop-blur transition-colors hover:bg-white/16"
            >
              {label}
            </a>
          ))}
        </nav>

        <div id="top" className="mx-auto flex min-h-[calc(88svh-84px)] w-full max-w-7xl items-center px-5 pb-20 pt-8 sm:px-8 sm:pt-12 lg:px-10 md:pt-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3 py-2 text-xs font-medium text-white/80 backdrop-blur">
              <Star size={14} aria-hidden="true" />
              Built for the Perfect Corp AI hackathon
            </div>
            <h1 className="hero-display mt-6 max-w-3xl text-5xl text-white sm:text-6xl lg:text-7xl">
              Mirra
            </h1>
            <p className="section-display mt-5 max-w-2xl text-xl text-white/88 sm:text-2xl">
              One good selfie powers your whole look—skin scores, face-aware makeup and hair, closet matching, and try-ons you can review before you buy.
            </p>
            <p className="body-copy mt-5 max-w-2xl text-base text-white/68 sm:text-lg">
              Instead of juggling separate beauty apps, Mirra connects Perfect Corp analysis, weather and context, your wardrobe, and product search so you see what changed, what to try next, and why it fits—then decide with proof, not guesswork.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startSignIn}
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#d9f99d] px-6 py-3 text-sm font-semibold text-[#17210f] shadow-[0_18px_40px_rgba(217,249,157,0.22)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {ctaLabel}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <a
                href="#workflow"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/22 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/16"
              >
                See the flow
              </a>
            </div>
            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["9", "AI APIs"],
                ["1", "Selfie"],
                ["90s", "Demo flow"],
              ].map(([value, label]) => (
                <div key={label} className="border-l border-white/20 pl-4">
                  <dt className="metric-display text-3xl text-white">{value}</dt>
                  <dd className="eyebrow mt-1 text-[0.68rem] text-white/54">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#f7f2ea] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="eyebrow text-[0.72rem] text-[#7a3f35]">What Mirra Shows</p>
              <h2 className="section-display text-ink-strong mt-3 max-w-xl text-4xl sm:text-5xl">
                Everything about how you look, wired together—not a one-off try-on toy.
              </h2>
            </div>
            <p className="body-copy max-w-2xl text-base text-[#51606f] lg:justify-self-end">
              People do not want another disconnected score or random product grid. Mirra turns analysis into a path: what the scan means, what to simulate, how your closet covers the moment, what to try on, and what is worth buying.
            </p>
          </div>

          <div className="mt-12 space-y-5">
            {FEATURE_ROWS.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="surface-card grid overflow-hidden rounded-lg border border-[#ded6ca] bg-white shadow-[0_18px_48px_rgba(24,33,43,0.07)] lg:grid-cols-[0.78fr_1.22fr]"
                >
                  <div className={`${index % 2 ? "lg:order-2" : ""} min-h-[260px] bg-[#dfe5ec]`}>
                    <img src={feature.image} alt={feature.title} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-6 sm:p-8 lg:p-10">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#111827] text-white">
                      <Icon size={20} aria-hidden="true" />
                    </div>
                    <p className="eyebrow mt-6 text-[0.72rem] text-[#a15c45]">{feature.eyebrow}</p>
                    <h3 className="section-display text-card-strong mt-3 text-3xl">{feature.title}</h3>
                    <p className="body-copy text-card-muted mt-4 max-w-2xl text-base">{feature.description}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {feature.stats.map((stat) => (
                        <span key={stat} className="eyebrow text-card-muted rounded-full border border-[#ded6ca] bg-[#f8f4ed] px-3 py-1.5 text-[0.68rem]">
                          {stat}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-[#17202b] px-5 py-16 text-white sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className="eyebrow text-[0.72rem] text-[#b9d991]">Guided flow</p>
              <h2 className="section-display mt-3 text-4xl text-white sm:text-5xl">
                See the “why,” then do the next step.
              </h2>
              <p className="body-copy mt-5 text-base text-white/64">
                Mirra is built like an operator for your appearance: one capture, then analysis, context, previews, and a clear decision—not a black box that only shows a final image.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {WORKFLOW.map((step, index) => {
                const Icon = step.icon;
                return (
                  <article key={step.title} className="rounded-lg border border-white/10 bg-white/7 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#17202b]">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <span className="metric-display text-sm text-white/40">0{index + 1}</span>
                    </div>
                    <h3 className="section-display mt-5 text-xl text-white">{step.title}</h3>
                    <p className="body-copy mt-3 text-sm text-white/62">{step.description}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="mt-12 rounded-lg border border-white/10 bg-[#0f1722] p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Skin signal", "Moisture dropped while oiliness stayed stable."],
                ["Context", "Low humidity increases dehydration risk today."],
                ["Action", "Simulate hydration improvement and compare HA serum options."],
              ].map(([label, text]) => (
                <div key={label} className="rounded-lg bg-white/6 p-4">
                  <p className="eyebrow text-[0.68rem] text-[#b9d991]">{label}</p>
                  <p className="body-copy mt-3 text-sm text-white/76">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fbfaf7] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="surface-card rounded-lg border border-[#ded6ca] bg-white p-6 shadow-[0_18px_48px_rgba(24,33,43,0.07)] sm:p-8">
            <p className="eyebrow text-[0.72rem] text-[#7a3f35]">API Depth</p>
            <h2 className="section-display text-card-strong mt-3 text-4xl sm:text-5xl">
              Nine Perfect Corp APIs become one consumer journey.
            </h2>
            <p className="body-copy text-card-muted mt-5 text-base">
              In one journey you can go from skin analysis to simulation, GlowUp-style makeup and hair, clothes and accessory try-on, and a proof-oriented summary—without hopping between disconnected demos.
            </p>
            <button
              type="button"
              onClick={startSignIn}
              disabled={loading}
              className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#111827] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              Start with a selfie
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {API_STACK.map((api, index) => (
              <div key={api} className="surface-subcard rounded-lg border border-[#ded6ca] bg-white p-4 shadow-[0_12px_28px_rgba(24,33,43,0.05)]">
                <div className="mb-5 flex items-center justify-between">
                  <CheckCircle2 size={18} className="text-[#157347]" aria-hidden="true" />
                  <span className="eyebrow text-card-muted text-[0.68rem]">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <p className="ui-title text-card-strong text-sm">{api}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="bg-[#ebe1d6] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="rounded-lg border border-[#d4c4b2] bg-[#fbfaf7] p-5 shadow-[0_18px_50px_rgba(24,33,43,0.08)] sm:p-6">
            <div className="relative overflow-hidden rounded-lg bg-[#111827]">
              <img
                src="https://bcw-media.s3.ap-northeast-1.amazonaws.com/skin_analysis_s5_poster_3_dt_85efe14952.png"
                alt="Beauty technology result preview"
                className="h-[320px] w-full object-cover opacity-82"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(17,24,39,0.82))]" />
              <div className="absolute bottom-5 left-5 right-5">
                <p className="eyebrow text-[0.72rem] text-white/62">Proof Card</p>
                <h3 className="section-display mt-2 text-2xl text-white">Buy after the look makes sense.</h3>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {PROOF_ITEMS.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#ded6ca] bg-white p-4">
                  <p className="eyebrow text-[0.64rem] text-[#6b7280]">{label}</p>
                  <p className="metric-display mt-1 text-xl text-[#18212b]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow text-[0.72rem] text-[#7a3f35]">Retail Value</p>
            <h2 className="section-display mt-3 text-4xl text-[#18212b] sm:text-5xl">
              Confidence before checkout.
            </h2>
            <p className="body-copy mt-5 text-base text-[#51606f]">
              Before checkout, Mirra surfaces tone match, fit with your closet, skin compatibility, and what new spend would add—so try-on feels accountable, not like a filter.
            </p>
            <div className="mt-7 grid gap-3">
              {[
                [Eye, "Preview products on the user, not on a model."],
                [Search, "Search real products when the closet has a gap."],
                [ShieldCheck, "Show why a recommendation fits before asking for payment."],
              ].map(([Icon, text]) => {
                const TypedIcon = Icon as typeof Eye;
                return (
                  <div key={text as string} className="flex gap-3 rounded-lg bg-white/70 p-4">
                    <TypedIcon size={20} className="mt-0.5 text-[#7a3f35]" aria-hidden="true" />
                    <p className="body-copy text-sm text-[#394554]">{text as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="trust" className="bg-[#101820] px-5 py-14 text-white sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow text-[0.72rem] text-[#b9d991]">Privacy and Control</p>
            <h2 className="section-display mt-3 text-3xl text-white sm:text-4xl">
              Built around consent, session auth, and clear data use.
            </h2>
            <p className="body-copy mt-4 text-sm text-white/62">
              Google sign-in starts the flow, selfies are used to create the user profile, and product recommendations are generated from the user&apos;s own scan signals.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            {[
              [LockKeyhole, "Auth-gated app"],
              [CloudSun, "Context-aware tips"],
              [ShieldCheck, "Transparent reasoning"],
              [Sparkles, "User-first previews"],
            ].map(([Icon, label]) => {
              const TypedIcon = Icon as typeof LockKeyhole;
              return (
                <div key={label as string} className="rounded-lg border border-white/10 bg-white/7 p-4">
                  <TypedIcon size={19} className="text-[#b9d991]" aria-hidden="true" />
                  <p className="ui-title mt-3 text-sm text-white">{label as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="bg-[#101820] px-5 pb-8 text-white sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/54 sm:flex-row sm:items-center sm:justify-between">
          <p className="ui-title">Mirra — skin, style, closet &amp; try-on in one flow.</p>
          <div className="flex gap-5">
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
