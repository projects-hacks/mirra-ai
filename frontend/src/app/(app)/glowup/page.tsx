/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Share2, Sparkles, WandSparkles } from "lucide-react";
import { extractImageUrl, formatApiError, glowupApi, outfitApi, productsApi, vtoApi, type VtoImageResponse } from "@/lib/api";
import { glowupPlanToAgentInsight } from "@/lib/agentAdapters";
import { ToolName } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import { useAppDispatch, useAppState } from "@/components/providers/AppProvider";
import AgentInsightCard from "@/components/dashboard/AgentInsightCard";
import { useImageTransition } from "@/hooks/useImageTransition";
import type {
  GlowupAnalysis,
  GlowupHairstyle,
  GlowupMakeupPreset,
  GlowupPlan,
  GlowupRecommendation,
  Product,
} from "@/types";

type AccessoryKind = "earrings" | "necklace";

interface AccessoryCatalog {
  earrings: Product[];
  necklace: Product[];
}

const CLIENT_MAKEUP_PRESETS: GlowupMakeupPreset[] = [
  {
    id: "natural-glow",
    title: "Natural Glow",
    description: "Soft skin polish with lifted eyes and a fresh lip.",
    best_for: ["warm", "neutral", "cool"],
    effects: [
      { category: "foundation", shade: "warm-beige", intensity: 0.45 },
      { category: "blush", pattern: "soft-lift", color: "#D68C7A", intensity: 0.38 },
      { category: "lipstick", finish: "satin", color: "#BC6B66", intensity: 0.46 },
      { category: "eyeshadow", finish: "matte", color: "#8C6A58", intensity: 0.28 },
    ],
  },
  {
    id: "bold-lip",
    title: "Bold Lip",
    description: "Clean skin with the focus pushed to lip definition.",
    best_for: ["cool", "neutral"],
    effects: [
      { category: "foundation", shade: "neutral-ivory", intensity: 0.4 },
      { category: "blush", pattern: "minimal", color: "#C4899A", intensity: 0.24 },
      { category: "lipstick", finish: "cream", color: "#9F375D", intensity: 0.72 },
      { category: "eyeshadow", finish: "matte", color: "#6F6470", intensity: 0.22 },
    ],
  },
];

const CLIENT_HAIRSTYLES: GlowupHairstyle[] = [
  {
    id: "soft-volume",
    title: "Soft Volume",
    description: "Clean lift around the crown with movement at the ends.",
    image_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "relaxed-waves",
    title: "Relaxed Waves",
    description: "Soft width and texture that balances angular features.",
    image_url: "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=900&q=80",
  },
];

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  const binary = globalThis.atob(base64Data);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

async function imageStringToBlob(image: string): Promise<Blob> {
  if (image.startsWith("data:")) {
    return dataUrlToBlob(image);
  }

  const response = await fetch(image);
  return response.blob();
}

function formatFaceAnalysis(analysis: GlowupAnalysis | null) {
  const face = analysis?.face_attributes ?? {};
  const tone = analysis?.skin_tone ?? {};
  const faceShape = String(face.shape ?? "Balanced");
  const eyeShape = String(face.eye_shape ?? "Defined");
  const lipShape = String(face.lip_shape ?? "Natural");
  const undertone = String(tone.undertone ?? "neutral");
  const hairColor = String(tone.hair_color_name ?? tone.hair_color ?? "Natural");

  return { faceShape, eyeShape, lipShape, undertone, hairColor };
}

function getRecommendationByCategory(
  recommendations: GlowupRecommendation[] | undefined,
  category: GlowupRecommendation["category"]
) {
  return recommendations?.filter((item) => item.category === category) ?? [];
}

function buildClientGlowupPlan(analysis: GlowupAnalysis): GlowupPlan {
  const formatted = formatFaceAnalysis(analysis);
  const undertone = formatted.undertone.toLowerCase();
  const metal = undertone.includes("warm") ? "gold" : "silver";

  return {
    face_attributes: analysis.face_attributes,
    skin_tone: analysis.skin_tone,
    steps: [
      { icon: "face", text: `Read your face direction as ${formatted.faceShape}.`, status: "complete" },
      { icon: "palette", text: `Mapped your palette as ${formatted.undertone}.`, status: "complete" },
      { icon: "sparkle", text: "Built a starter GlowUp plan across makeup, hair, and accessories.", status: "complete" },
    ],
    insight: "Use balanced enhancement first: even the complexion, keep shape around the eyes, and use accessories that frame the face without stealing focus.",
    recommendations: [
      { category: "makeup", title: "Natural polish", why: "Keeps the scan-driven look wearable while adding definition." },
      { category: "hair", title: "Soft face-framing volume", why: "Adds shape without changing your proportions too aggressively." },
      { category: "accessories", title: `${metal} face-framing jewelry`, why: "Matches the palette and keeps attention near the face." },
    ],
    tool_calls_made: ["client-fallback"],
    makeup_presets: CLIENT_MAKEUP_PRESETS,
    hairstyles: CLIENT_HAIRSTYLES,
    accessory_queries: {
      earrings: `${metal} face framing earrings`,
      necklace: `${metal} pendant necklace`,
    },
  };
}

function normalizeGlowupPlan(plan: GlowupPlan, analysis: GlowupAnalysis): GlowupPlan {
  const fallback = buildClientGlowupPlan(analysis);
  return {
    ...fallback,
    ...plan,
    face_attributes: plan.face_attributes ?? analysis.face_attributes,
    skin_tone: plan.skin_tone ?? analysis.skin_tone,
    steps: Array.isArray(plan.steps) && plan.steps.length ? plan.steps : fallback.steps,
    recommendations: Array.isArray(plan.recommendations) && plan.recommendations.length ? plan.recommendations : fallback.recommendations,
    tool_calls_made: Array.isArray(plan.tool_calls_made) ? plan.tool_calls_made : fallback.tool_calls_made,
    makeup_presets: Array.isArray(plan.makeup_presets) && plan.makeup_presets.length ? plan.makeup_presets : fallback.makeup_presets,
    hairstyles: Array.isArray(plan.hairstyles) && plan.hairstyles.length ? plan.hairstyles : fallback.hairstyles,
    accessory_queries: {
      earrings: plan.accessory_queries?.earrings || fallback.accessory_queries.earrings,
      necklace: plan.accessory_queries?.necklace || fallback.accessory_queries.necklace,
    },
  };
}

function PreviewShell({
  originalImage,
  currentImage,
  title,
  subtitle,
}: Readonly<{
  originalImage: string;
  currentImage: string;
  title: string;
  subtitle: string;
}>) {
  const { displayImage, isTransitioning } = useImageTransition(originalImage, currentImage);

  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="label-caps">Final Comparison</p>
        <h2 className="mt-2 text-2xl">GlowUp Preview</h2>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
          {subtitle}
        </p>
      </div>

      <div className="grid gap-0 md:grid-cols-2">
        <div className="relative aspect-[4/5] bg-black/10">
          <img src={originalImage} alt="Original selfie" className="h-full w-full object-cover" />
          <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            Before
          </span>
        </div>
        <div className="relative aspect-[4/5] bg-black/10">
          <img
            src={displayImage ?? currentImage}
            alt={title}
            className={`h-full w-full object-cover transition duration-300 ${isTransitioning ? "opacity-70" : "opacity-100"}`}
          />
          <span className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-900 backdrop-blur">
            After
          </span>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent p-4 text-white">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs text-white/80">Latest applied transformation</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AccessoryRow({
  title,
  products,
  query,
  onTryOn,
  isApplying,
  isLoading,
  statusMessage,
}: Readonly<{
  title: string;
  products: Product[];
  query: string;
  onTryOn: (product: Product) => void;
  isApplying: boolean;
  isLoading: boolean;
  statusMessage?: string | null;
}>) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            Query: {query}
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {isLoading && (
          <div className="flex min-h-32 min-w-full items-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
            <LoaderCircle className="animate-spin" size={18} />
            Loading product options...
          </div>
        )}
        {!isLoading && statusMessage && products.length === 0 && (
          <div className="min-w-full rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
            {statusMessage}
          </div>
        )}
        {!isLoading && products.length === 0 && !statusMessage && (
          <div className="min-w-full rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
            No product images are available for this query yet. Try refreshing the GlowUp plan after product search is healthy.
          </div>
        )}
        {products.map((product) => (
          <article
            key={`${title}-${product.link}`}
            className="min-w-[180px] max-w-[220px] rounded-[1.5rem] border border-white/15 bg-white/5 p-3 sm:min-w-[220px]"
          >
            <div className="aspect-square overflow-hidden rounded-[1.1rem] bg-black/10">
              <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
            </div>
            <h4 className="mt-3 line-clamp-2 text-sm font-semibold">{product.title}</h4>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs" style={{ color: "var(--on-surface-variant)" }}>
              <span>{product.source}</span>
              <span>{product.price}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => onTryOn(product)} className="btn-primary flex-1 text-xs" disabled={isApplying}>
                Try On
              </button>
              <a href={product.link} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
                Shop
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function GlowupPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selfie, isHydrated } = useAppState();

  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<GlowupAnalysis | null>(null);
  const [plan, setPlan] = useState<GlowupPlan | null>(null);
  const [accessories, setAccessories] = useState<AccessoryCatalog>({ earrings: [], necklace: [] });
  const [accessoryStatuses, setAccessoryStatuses] = useState<Record<AccessoryKind, string | null>>({ earrings: null, necklace: null });
  const [earliestSelfieUrl, setEarliestSelfieUrl] = useState<string | null>(null);
  const [latestSavedSelfieUrl, setLatestSavedSelfieUrl] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState("Original Selfie");
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [activeHairId, setActiveHairId] = useState<string | null>(null);
  const [activeAccessoryUrl, setActiveAccessoryUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selfie) return;
    const selfieImage = selfie;
    let cancelled = false;

    async function prepareSelfie() {
      const blob = await imageStringToBlob(selfieImage);
      if (!cancelled) setSelfieBlob(blob);
    }

    void prepareSelfie();
    return () => {
      cancelled = true;
    };
  }, [selfie]);

  useEffect(() => {
    let cancelled = false;

    async function loadComparisonImages() {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) return;

      const [earliestResult, latestResult] = await Promise.all([
        supabase
          .from("skin_scans")
          .select("selfie_url")
          .eq("user_id", userId)
          .not("selfie_url", "is", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("skin_scans")
          .select("selfie_url")
          .eq("user_id", userId)
          .not("selfie_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      setEarliestSelfieUrl(earliestResult.data?.selfie_url ?? null);
      setLatestSavedSelfieUrl(latestResult.data?.selfie_url ?? null);
    }

    void loadComparisonImages();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selfieBlob || plan) return;
    const sourceSelfie = selfieBlob;
    let cancelled = false;

    async function loadGlowup() {
      setIsLoading(true);
      setError(null);
      setPlanNotice(null);

      try {
        let nextAnalysis: GlowupAnalysis;
        try {
          nextAnalysis = await glowupApi.analyze(sourceSelfie);
        } catch {
          nextAnalysis = {
            face_attributes: { shape: "Balanced", eye_shape: "Defined", lip_shape: "Natural" },
            skin_tone: { undertone: "neutral" },
          };
          setPlanNotice("Using a starter GlowUp plan because face analysis is temporarily unavailable.");
        }
        if (cancelled) return;

        setAnalysis(nextAnalysis);
        let nextPlan: GlowupPlan;
        try {
          const recommendedPlan = await glowupApi.recommendFromAnalysis(
            nextAnalysis.face_attributes,
            nextAnalysis.skin_tone
          );
          nextPlan = normalizeGlowupPlan(recommendedPlan, nextAnalysis);
        } catch {
          nextPlan = buildClientGlowupPlan(nextAnalysis);
          setPlanNotice("Using a starter GlowUp plan because recommendations are temporarily unavailable.");
        }
        if (cancelled) return;

        setPlan(nextPlan);

        const [earringsResult, necklaceResult] = await Promise.allSettled([
          productsApi.search(nextPlan.accessory_queries.earrings),
          productsApi.search(nextPlan.accessory_queries.necklace),
        ]);
        if (cancelled) return;

        const nextAccessories = {
          earrings: earringsResult.status === "fulfilled" ? earringsResult.value.products : [],
          necklace: necklaceResult.status === "fulfilled" ? necklaceResult.value.products : [],
        };
        setAccessories(nextAccessories);
        setAccessoryStatuses({
          earrings: earringsResult.status === "rejected"
            ? "Earring recommendations are temporarily unavailable."
            : nextAccessories.earrings.length
              ? null
              : "No earring products came back for the current query.",
          necklace: necklaceResult.status === "rejected"
            ? "Necklace recommendations are temporarily unavailable."
            : nextAccessories.necklace.length
              ? null
              : "No necklace products came back for the current query.",
        });
      } catch (loadError) {
        if (cancelled) return;
        setError(formatApiError(loadError, "GlowUp is unavailable right now."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadGlowup();
    return () => {
      cancelled = true;
    };
  }, [plan, selfieBlob]);

  const formatted = useMemo(() => formatFaceAnalysis(analysis), [analysis]);
  const beforeImage = earliestSelfieUrl ?? selfie ?? null;
  const previewImage = currentImage ?? latestSavedSelfieUrl ?? selfie ?? null;
  const hasAppliedLook = Boolean(currentImage);
  const makeupRecommendations = useMemo(
    () => getRecommendationByCategory(plan?.recommendations, "makeup"),
    [plan?.recommendations]
  );
  const hairRecommendations = useMemo(
    () => getRecommendationByCategory(plan?.recommendations, "hair"),
    [plan?.recommendations]
  );
  const accessoryRecommendations = useMemo(
    () => getRecommendationByCategory(plan?.recommendations, "accessories"),
    [plan?.recommendations]
  );
  const reasoningInsight = useMemo(() => glowupPlanToAgentInsight(plan), [plan]);

  const applyResult = useCallback((tool: ToolName, title: string, imageUrl: string) => {
    setCurrentTitle(title);
    setCurrentImage(imageUrl);
    dispatch({
      type: "SET_VTO_RESULT",
      payload: { imageUrl, toolName: tool, timestamp: Date.now() },
    });
    dispatch({ type: "SET_CURRENT_TOOL", payload: null });
  }, [dispatch]);

  const runVto = useCallback(async (
    tool: ToolName,
    title: string,
    runner: () => Promise<VtoImageResponse>
  ) => {
    if (!selfieBlob) return;

    setIsApplying(true);
    setError(null);
    setSaveMessage(null);
    dispatch({ type: "SET_PROCESSING", payload: true });
    dispatch({ type: "SET_CURRENT_TOOL", payload: tool });

    try {
      const result = await runner();
      const imageUrl = extractImageUrl(result);
      if (!imageUrl) throw new Error("GlowUp preview came back without an image.");
      applyResult(tool, title, imageUrl);
    } catch (applyError) {
      dispatch({ type: "SET_PROCESSING", payload: false });
      dispatch({ type: "SET_CURRENT_TOOL", payload: null });
      setError(formatApiError(applyError, "Failed to apply look."));
    } finally {
      setIsApplying(false);
    }
  }, [applyResult, dispatch, selfieBlob]);

  const handleMakeup = useCallback((preset: GlowupMakeupPreset) => {
    setActivePresetId(preset.id);
    setActiveHairId(null);
    setActiveAccessoryUrl(null);
    void runVto(
      ToolName.TRY_ON_MAKEUP,
      preset.title,
      () => vtoApi.makeup(selfieBlob as Blob, preset.effects)
    );
  }, [runVto, selfieBlob]);

  const handleHair = useCallback((style: GlowupHairstyle) => {
    setActiveHairId(style.id);
    setActivePresetId(null);
    setActiveAccessoryUrl(null);
    void runVto(
      ToolName.CHANGE_HAIRSTYLE,
      style.title,
      () => vtoApi.hair(selfieBlob as Blob, style.image_url)
    );
  }, [runVto, selfieBlob]);

  const handleAccessory = useCallback((kind: AccessoryKind, product: Product) => {
    const tool = kind === "earrings" ? ToolName.TRY_ON_EARRINGS : ToolName.TRY_ON_NECKLACE;
    setActiveAccessoryUrl(product.imageUrl);
    setActivePresetId(null);
    setActiveHairId(null);
    void runVto(
      tool,
      product.title,
      () => (kind === "earrings"
        ? vtoApi.earrings(selfieBlob as Blob, product.imageUrl)
        : vtoApi.necklace(selfieBlob as Blob, product.imageUrl))
    );
  }, [runVto, selfieBlob]);

  const handleSave = useCallback(async () => {
    if (!currentImage) {
      setError("Apply a GlowUp result before saving this look.");
      return;
    }

    setError(null);
    setSaveMessage(null);

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Sign in again before saving this look.");

      await outfitApi.proofCard({
        user_id: userId,
        look_name: currentTitle,
        selected_items: [
          {
            name: currentTitle,
            category: activePresetId ? "makeup" : activeHairId ? "hair" : activeAccessoryUrl ? "accessories" : "glowup",
            source: "GlowUp Studio",
            imageUrl: currentImage,
          },
        ],
        occasion: "glowup studio",
        vto_image_url: currentImage,
      });

      setSaveMessage("Saved to your look diary.");
    } catch (saveError) {
      setError(formatApiError(saveError, "Unable to save this GlowUp look."));
    }
  }, [activeAccessoryUrl, activeHairId, activePresetId, currentImage, currentTitle]);

  const handleShare = useCallback(async () => {
    if (!currentImage) {
      setError("Apply a GlowUp result before sharing this look.");
      return;
    }

    const shareData: ShareData = {
      title: "Mirra GlowUp",
      text: "Preview from my Mirra GlowUp flow.",
    };

    try {
      const parsedUrl = new URL(currentImage);
      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        shareData.url = parsedUrl.toString();
      }
    } catch {
      // Data URLs and temporary blob strings are not valid Web Share `url` values.
    }

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(shareData.url ?? currentImage);
  }, [currentImage]);

  const handleReasoningTap = useCallback((action: string) => {
    if (action === "tab:makeup") {
      document.getElementById("glowup-makeup-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action === "tab:hair") {
      document.getElementById("glowup-hair-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action === "tab:accessories") {
      document.getElementById("glowup-accessories-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  if (isHydrated && !selfie) {
    return (
      <section className="page-shell">
        <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <p className="label-caps">GlowUp Studio</p>
          <h1 className="mt-3 text-3xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            Start from a selfie
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
            GlowUp needs a saved selfie so it can read your face shape, map your undertone, and preview makeup,
            hair, and accessories on your own image.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/capture" className="btn-primary">Capture Selfie</Link>
            <Link href="/dashboard" className="btn-secondary">Back To Dashboard</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-caps">Phase 5</p>
            <h1 className="mt-3 text-3xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              GlowUp Studio
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 sm:text-base" style={{ color: "var(--on-surface-variant)" }}>
              Move from face analysis into undertone-aware makeup, hairstyle transfer, and accessory try-on in one guided flow.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => router.push("/capture")}>
              Refresh Selfie
            </button>
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => router.push("/dashboard")}>
              Back To Dashboard
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="banner-error" role="alert">
          {error}
        </div>
      )}

      {planNotice && !error && (
        <div className="banner-warn" role="status">
          {planNotice}
        </div>
      )}

      {saveMessage && !error && (
        <div className="banner-success" role="status">
          {saveMessage}
        </div>
      )}

      {beforeImage && previewImage && (
        <PreviewShell
          originalImage={beforeImage}
          currentImage={previewImage}
          title={currentTitle}
          subtitle={plan?.insight ?? "Your latest preview updates here as you apply makeup, hair, or accessory choices."}
        />
      )}

      <AgentInsightCard
        insight={reasoningInsight}
        isLoading={isLoading}
        onRecommendationTap={handleReasoningTap}
      />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="label-caps">Step 1</p>
                <h2 className="text-2xl">Face Analysis</h2>
              </div>
            </div>

            {isLoading ? (
              <div className="mt-5 flex items-center gap-3 text-sm" style={{ color: "var(--on-surface-variant)" }}>
                <LoaderCircle className="animate-spin" size={18} />
                Reading your features and building a glowup direction.
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="label-caps">Face Shape</p>
                  <p className="mt-2 text-lg font-semibold">{formatted.faceShape}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="label-caps">Undertone</p>
                  <p className="mt-2 text-lg font-semibold capitalize">{formatted.undertone}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="label-caps">Eye Shape</p>
                  <p className="mt-2 text-lg font-semibold">{formatted.eyeShape}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="label-caps">Lip + Hair</p>
                  <p className="mt-2 text-lg font-semibold">{formatted.lipShape}</p>
                  <p className="mt-1 text-sm" style={{ color: "var(--on-surface-variant)" }}>
                    Hair tone: {formatted.hairColor}
                  </p>
                </div>
              </div>
            )}

            {plan?.steps?.length ? (
              <div className="mt-5 space-y-3">
                {plan.steps.map((step) => (
                  <div key={`${step.icon}-${step.text}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-sm font-medium">{step.text}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--on-surface-variant)" }}>
                      {step.status}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div id="glowup-makeup-section" className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f59e0b]/15 text-[#f59e0b]">
                <WandSparkles size={20} />
              </div>
              <div>
                <p className="label-caps">Step 2</p>
                <h2 className="text-2xl">Makeup Looks</h2>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
              Based on your {formatted.faceShape.toLowerCase()} face and {formatted.undertone.toLowerCase()} undertone, these are the strongest first looks.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {(plan?.makeup_presets ?? []).map((preset) => (
                <article
                  key={preset.id}
                  className={`rounded-[1.5rem] border p-4 transition ${activePresetId === preset.id ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-white/10 bg-white/5"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{preset.title}</h3>
                      <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
                        {preset.description}
                      </p>
                    </div>
                    <span className="max-w-full rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] break-words text-right">
                      {preset.best_for.join(" / ")}
                    </span>
                  </div>
                  <button type="button" className="btn-primary mt-4 w-full" disabled={isApplying} onClick={() => handleMakeup(preset)}>
                    Apply Look
                  </button>
                </article>
              ))}
            </div>
            {makeupRecommendations.length > 0 && (
              <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <p className="label-caps">AI Direction</p>
                <div className="mt-2 space-y-2">
                  {makeupRecommendations.map((item) => (
                    <p key={`${item.category}-${item.title}`} className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                      <span className="font-medium" style={{ color: "var(--on-surface)" }}>{item.title}:</span> {item.why}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div id="glowup-hair-section" className="glass-card p-5">
            <p className="label-caps">Step 3</p>
            <h2 className="mt-2 text-2xl">Hairstyle Transfer</h2>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
              Tap a reference to run the current selfie through the hairstyle transfer endpoint.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(plan?.hairstyles ?? []).map((style) => (
                <article
                  key={style.id}
                  className={`overflow-hidden rounded-[1.5rem] border transition ${activeHairId === style.id ? "border-[var(--primary)]" : "border-white/10"}`}
                >
                  <div className="aspect-[4/5] bg-black/10">
                    <img src={style.image_url} alt={style.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold">{style.title}</h3>
                    <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
                      {style.description}
                    </p>
                    <button type="button" className="btn-secondary mt-4 w-full" disabled={isApplying} onClick={() => handleHair(style)}>
                      Try Hairstyle
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {hairRecommendations.length > 0 && (
              <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                {hairRecommendations.map((item) => (
                  <p key={item.title} className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                    <span className="font-medium" style={{ color: "var(--on-surface)" }}>{item.title}:</span> {item.why}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div id="glowup-accessories-section" className="glass-card p-5">
            <p className="label-caps">Step 4</p>
            <h2 className="mt-2 text-2xl">Accessories</h2>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
              Search-backed accessory pulls are tuned to your proportions and palette, then piped into earring and necklace VTO.
            </p>
            <div className="mt-4 space-y-6">
              <AccessoryRow
                title="Earrings"
                products={accessories.earrings}
                query={plan?.accessory_queries.earrings ?? "Preparing earring query"}
                onTryOn={(product) => handleAccessory("earrings", product)}
                isApplying={isApplying}
                isLoading={isLoading}
                statusMessage={accessoryStatuses.earrings}
              />
              <AccessoryRow
                title="Necklaces"
                products={accessories.necklace}
                query={plan?.accessory_queries.necklace ?? "Preparing necklace query"}
                onTryOn={(product) => handleAccessory("necklace", product)}
                isApplying={isApplying}
                isLoading={isLoading}
                statusMessage={accessoryStatuses.necklace}
              />
            </div>
            {activeAccessoryUrl && accessoryRecommendations.length > 0 && (
              <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                {accessoryRecommendations.map((item) => (
                  <p key={item.title} className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                    <span className="font-medium" style={{ color: "var(--on-surface)" }}>{item.title}:</span> {item.why}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="glass-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="label-caps">Save The Look</p>
          <h2 className="mt-2 text-2xl">Share or keep this version</h2>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => void handleSave()} disabled={!hasAppliedLook}>
            Save Look
          </button>
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => void handleShare()} disabled={!hasAppliedLook}>
            <Share2 size={16} className="mr-2 inline" />
            Share
          </button>
        </div>
      </section>
    </div>
  );
}
