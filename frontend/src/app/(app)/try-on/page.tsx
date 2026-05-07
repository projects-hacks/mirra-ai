/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Download, LoaderCircle, RotateCcw, Save, Search, Shirt, Smartphone, Sparkles, SwitchCamera, Upload, UserRound } from "lucide-react";
import AgentInsightCard from "@/components/dashboard/AgentInsightCard";
import { tryOnPlanToAgentInsight } from "@/lib/agentAdapters";
import { extractImageUrl, formatApiError, glowupApi, outfitApi, productsApi, vtoApi, type VtoImageResponse } from "@/lib/api";
import { ToolName } from "@/lib/constants";
import { useAppDispatch, useAppState } from "@/components/providers/AppProvider";
import { useImageTransition } from "@/hooks/useImageTransition";
import { useCamera } from "@/hooks/useCamera";
import { getSupabase } from "@/lib/supabase";
import type { GlowupAnalysis, GlowupHairstyle, GlowupMakeupPreset, GlowupPlan, Product } from "@/types";

type TryOnTab = "clothes" | "makeup" | "hair" | "accessories";
type AccessoryKind = "earrings" | "necklace";
const BODY_IMAGE_STORAGE_KEY = "mirra:body_tryon_image";
const MAX_PERSISTED_IMAGE_CHARS = 4_500_000;

function persistBodyImage(dataUrl: string): void {
  try {
    if (dataUrl.length > MAX_PERSISTED_IMAGE_CHARS) {
      localStorage.removeItem(BODY_IMAGE_STORAGE_KEY);
      return;
    }
    localStorage.setItem(BODY_IMAGE_STORAGE_KEY, dataUrl);
  } catch {
    // Storage can be blocked or full; the in-memory image still works.
  }
}

const FALLBACK_MAKEUP_PRESETS: GlowupMakeupPreset[] = [
  {
    id: "starter-natural",
    title: "Starter Natural",
    description: "Even complexion, soft cheek color, and a wearable lip for first-pass try-on.",
    best_for: ["warm", "neutral", "cool"],
    effects: [
      { category: "foundation", shade: "neutral", intensity: 0.4 },
      { category: "blush", pattern: "soft-lift", color: "#D0897A", intensity: 0.3 },
      { category: "lipstick", finish: "satin", color: "#B86C66", intensity: 0.42 },
    ],
  },
  {
    id: "starter-defined",
    title: "Starter Defined",
    description: "A stronger lip and eye balance for a more polished pass.",
    best_for: ["neutral", "cool"],
    effects: [
      { category: "foundation", shade: "neutral", intensity: 0.38 },
      { category: "eyeshadow", finish: "matte", color: "#7A625B", intensity: 0.24 },
      { category: "lipstick", finish: "cream", color: "#9D4F62", intensity: 0.56 },
    ],
  },
];

const FALLBACK_HAIRSTYLES: GlowupHairstyle[] = [
  {
    id: "textured-crop",
    title: "Textured Crop",
    description: "Short structured shape with light volume on top (demo reference).",
    image_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1024&q=80&fm=jpg",
  },
  {
    id: "natural-curls",
    title: "Natural Curls",
    description: "Curl-forward reference shot — use a clear front selfie for best transfer.",
    image_url:
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1024&q=80&fm=jpg",
  },
];

function buildFallbackPlan(analysis: GlowupAnalysis | null): GlowupPlan {
  const undertone = String(analysis?.skin_tone?.undertone ?? "neutral").toLowerCase();
  const metal = undertone.includes("warm") ? "gold" : "silver";

  return {
    face_attributes: analysis?.face_attributes ?? { shape: "Balanced", eye_shape: "Defined", lip_shape: "Natural" },
    skin_tone: analysis?.skin_tone ?? { undertone: "neutral" },
    steps: [
      { icon: "face", text: "Loaded a fallback face and palette profile.", status: "complete" },
      { icon: "sparkle", text: "Enabled starter makeup, hair, and accessory try-on options.", status: "complete" },
    ],
    insight: "Reasoning is temporarily limited, so the studio is using stable starter looks and search queries.",
    recommendations: [],
    tool_calls_made: ["client-fallback"],
    makeup_presets: FALLBACK_MAKEUP_PRESETS,
    hairstyles: FALLBACK_HAIRSTYLES,
    accessory_queries: {
      earrings: `${metal} sculptural hoop earrings`,
      necklace: `${metal} layered pendant necklace`,
    },
  };
}

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read the selected image."));
    reader.readAsDataURL(file);
  });
}

function getImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Failed to inspect the selected image."));
    image.src = dataUrl;
  });
}

const BODY_IMAGE_MIN_SHORT_SIDE = 480;
const BODY_IMAGE_SOFT_SHORT_SIDE = 720;

async function validateBodyImage(dataUrl: string): Promise<{ error: string | null; hint: string | null }> {
  const { width, height } = await getImageSize(dataUrl);
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);

  if (longSide > 4096) {
    return { error: "Resize the full-body image so its longest side is 4096px or less.", hint: null };
  }

  if (shortSide < BODY_IMAGE_MIN_SHORT_SIDE) {
    return {
      error: `This photo is too small. Use an image where the shorter side is at least ${BODY_IMAGE_MIN_SHORT_SIDE}px.`,
      hint: null,
    };
  }

  const hints: string[] = [];

  if (height <= width) {
    hints.push("Portrait (taller than wide) usually gives the best full-body fit; landscape is still accepted.");
  }

  if (shortSide < BODY_IMAGE_SOFT_SHORT_SIDE) {
    hints.push(`Short side is under ${BODY_IMAGE_SOFT_SHORT_SIDE}px — results may be softer; re-shoot if VTO looks weak.`);
  }

  return { error: null, hint: hints.length ? hints.join(" ") : null };
}

function productImageIsLikelyUsable(product: Product): boolean {
  return product.imageUrl.startsWith("http://") || product.imageUrl.startsWith("https://");
}

function PreviewPanel({
  originalImage,
  currentImage,
  currentTitle,
  mode = "face",
}: Readonly<{
  originalImage: string;
  currentImage: string;
  currentTitle: string;
  mode?: "face" | "clothes";
}>) {
  const { displayImage, isTransitioning } = useImageTransition(originalImage, currentImage);
  const topLayerUrl = displayImage ?? currentImage;
  const isClothes = mode === "clothes";
  const showingComposite = isClothes && topLayerUrl !== originalImage;

  return (
    <section id="tryon-live-preview" className="glass-card overflow-hidden scroll-mt-[calc(var(--nav-height)+1rem)]">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="label-caps">{isClothes ? "Clothes try-on" : "Studio preview"}</p>
        <h2 className="mt-2 text-2xl" style={{ fontFamily: "var(--font-serif)" }}>
          {isClothes ? "Your body + garment" : "Live look"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
          {isClothes
            ? showingComposite
              ? "The top layer is the AI composite: your chosen piece applied on the full-body photo below it."
              : "This is your base full-body shot. Pick a garment below, then try on — the result appears as a new layer here."
            : "Your portrait stays as the base; makeup, hair, or accessories render on top."}
        </p>
      </div>
      <div className="relative aspect-[4/5] bg-black/10">
        <img
          src={originalImage}
          alt={isClothes ? "Your full-body base photo" : "Original portrait base"}
          className="absolute inset-0 h-full w-full object-cover opacity-100"
        />
        <img
          src={topLayerUrl}
          alt={currentTitle}
          className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${isTransitioning ? "opacity-65" : "opacity-100"}`}
        />
        <span className="absolute left-4 top-4 max-w-[85%] rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          {isClothes ? "Base · full-body photo" : "Original · base layer"}
        </span>
        {isClothes && showingComposite && (
          <span className="absolute right-4 top-4 rounded-full bg-[var(--primary)]/90 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur">
            Composite · try-on result
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 text-white">
          <p className="text-sm font-semibold">{currentTitle}</p>
          <p className="mt-1 text-xs text-white/80">
            {isClothes
              ? "Scroll down to change the garment or upload a new body photo."
              : "The latest VTO result stays here while you switch categories."}
          </p>
        </div>
      </div>
    </section>
  );
}

function GarmentFlowStrip({
  bodyImage,
  garment,
  garmentIntentText,
  resultImage,
}: Readonly<{
  bodyImage: string | null;
  garment: { imageUrl: string | null; label: string } | null;
  /** Non-empty clothes URL field — user intends to paste try-on. */
  garmentIntentText?: string | null;
  resultImage: string | null;
}>) {
  const intent = (garmentIntentText ?? "").trim();
  const step1Done = Boolean(bodyImage);
  const step2Done = Boolean(garment?.label) || Boolean(intent);
  const step3Done = Boolean(resultImage);

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--on-surface-muted)]">How garment try-on flows</p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
        The service needs <strong className="font-semibold text-[var(--on-surface)]">your photo</strong>, then{" "}
        <strong className="font-semibold text-[var(--on-surface)]">a garment image</strong>. The{" "}
        <a href="#tryon-live-preview" className="font-semibold text-[var(--secondary)] underline-offset-2 hover:underline">
          live preview
        </a>{" "}
        at the top of this page stacks the result over your body shot.
      </p>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-white/10 bg-black/15 p-3 sm:p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--on-surface-muted)]">
            {step1Done ? <CheckCircle2 className="text-emerald-400" size={16} /> : <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/30 text-[10px]">1</span>}
            Body
          </div>
          <div className="mt-3 flex min-h-[5.5rem] items-center justify-center overflow-hidden rounded-xl bg-black/25">
            {bodyImage ? (
              <img src={bodyImage} alt="" className="h-20 w-full object-cover object-top sm:h-24" />
            ) : (
              <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
                <UserRound className="text-white/35" size={28} />
                <span className="text-[11px] leading-snug text-white/55">Upload or capture below</span>
              </div>
            )}
          </div>
        </div>

        <div className="hidden items-center justify-center text-white/35 sm:flex sm:shrink-0">
          <ArrowRight size={22} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-white/10 bg-black/15 p-3 sm:p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--on-surface-muted)]">
            {step2Done ? <CheckCircle2 className="text-emerald-400" size={16} /> : <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/30 text-[10px]">2</span>}
            Garment
          </div>
          <div className="mt-3 flex min-h-[5.5rem] items-center justify-center overflow-hidden rounded-xl bg-black/25">
            {garment?.imageUrl ? (
              <img src={garment.imageUrl} alt="" className="max-h-24 w-full object-contain" />
            ) : intent ? (
              <div className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-center">
                <Shirt className="text-[var(--secondary)]/70" size={24} />
                <span className="line-clamp-2 break-all text-[10px] font-medium text-[var(--on-surface-variant)]">{intent}</span>
                <span className="text-[10px] text-white/50">Tap “Try Pasted URL” when ready</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
                <Shirt className="text-white/35" size={28} />
                <span className="text-[11px] leading-snug text-white/55">
                  Paste a URL or pick a product card
                </span>
              </div>
            )}
          </div>
          {garment?.label && (
            <p className="mt-2 line-clamp-2 text-center text-[11px] font-medium text-[var(--on-surface-variant)]">{garment.label}</p>
          )}
          {!garment?.label && intent && (
            <p className="mt-2 text-center text-[11px] text-[var(--on-surface-muted)]">Garment link ready</p>
          )}
        </div>

        <div className="hidden items-center justify-center text-white/35 sm:flex sm:shrink-0">
          <ArrowRight size={22} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-white/10 bg-black/15 p-3 sm:p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--on-surface-muted)]">
            {step3Done ? <CheckCircle2 className="text-emerald-400" size={16} /> : <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/30 text-[10px]">3</span>}
            Result
          </div>
          <div className="mt-3 flex min-h-[5.5rem] items-center justify-center overflow-hidden rounded-xl bg-black/25">
            {resultImage ? (
              <img src={resultImage} alt="" className="h-20 w-full object-cover object-top sm:h-24" />
            ) : (
              <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
                <Sparkles className="text-[var(--primary)]/55" size={28} />
                <span className="text-[11px] leading-snug text-white/55">Shows in preview after try-on</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudioStatus({
  isApplying,
  stage,
  currentTitle,
  savedMessage,
}: Readonly<{
  isApplying: boolean;
  stage: string | null;
  currentTitle: string;
  savedMessage: string | null;
}>) {
  return (
    <section className="glass-card p-5">
      <p className="label-caps">Render State</p>
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
          {isApplying ? (
            <LoaderCircle className="animate-spin text-[var(--primary)]" size={18} />
          ) : (
            <CheckCircle2 className="text-emerald-500" size={18} />
          )}
          <div>
            <p className="text-sm font-semibold">{isApplying ? stage ?? "Rendering try-on" : "Preview ready"}</p>
            <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>{currentTitle}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-5" style={{ color: "var(--on-surface-variant)" }}>
          Product links are resolved on the backend before Perfect Corp sees them, so product pages and temporary thumbnails can be converted into image references.
        </div>
        {savedMessage && (
          <div className="banner-success text-xs" role="status">
            {savedMessage}
          </div>
        )}
      </div>
    </section>
  );
}

const TABS: Array<{ id: TryOnTab; title: string; subtitle: string }> = [
  { id: "clothes", title: "Clothes", subtitle: "Full-body photo + garment image → composite preview at top." },
  { id: "makeup", title: "Makeup", subtitle: "Apply preset looks from the GlowUp data." },
  { id: "hair", title: "Hair", subtitle: "Transfer a reference hairstyle." },
  { id: "accessories", title: "Accessories", subtitle: "Try on earrings or necklaces from search." },
];

const tryOnInputClass =
  "min-h-11 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-[var(--on-surface)] outline-none placeholder:text-[var(--on-surface-muted)]";
const tryOnInputBlockClass = `mt-2 w-full ${tryOnInputClass}`;

export default function TryOnPage() {
  const dispatch = useAppDispatch();
  const { selfie, isHydrated } = useAppState();
  const prevSelfieRef = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<TryOnTab>("clothes");
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<GlowupAnalysis | null>(null);
  const [plan, setPlan] = useState<GlowupPlan | null>(null);
  const [facePreviewImage, setFacePreviewImage] = useState<string | null>(null);
  const [facePreviewTitle, setFacePreviewTitle] = useState("Original Selfie");
  const [clothesPreviewImage, setClothesPreviewImage] = useState<string | null>(null);
  const [clothesPreviewTitle, setClothesPreviewTitle] = useState("Full-Body Source");
  const [isResetToOriginal, setIsResetToOriginal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studioNotice, setStudioNotice] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [bodyImage, setBodyImage] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(BODY_IMAGE_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [bodyBlob, setBodyBlob] = useState<Blob | null>(null);
  const [bodyImageStatus, setBodyImageStatus] = useState<string | null>(null);
  const [showBodyCamera, setShowBodyCamera] = useState(false);
  /** Rear (environment) camera is default so you can step back for a full-body shot on a phone. */
  const [bodyCameraFacing, setBodyCameraFacing] = useState<"user" | "environment">("environment");

  const [clothesUrl, setClothesUrl] = useState("");
  const [clothesCategory, setClothesCategory] = useState<"upper" | "lower" | "full">("upper");
  const [clothesSearch, setClothesSearch] = useState("linen button-up shirt");
  const [clothesResults, setClothesResults] = useState<Product[]>([]);
  const [clothesStatus, setClothesStatus] = useState<string | null>(null);
  /** Last garment applied or attempted (for flow visualization). */
  const [clothesGarmentDisplay, setClothesGarmentDisplay] = useState<{ imageUrl: string | null; label: string } | null>(
    null
  );

  const [accessoryKind, setAccessoryKind] = useState<AccessoryKind>("earrings");
  const [accessorySearch, setAccessorySearch] = useState("gold sculptural hoop earrings");
  const [accessoryResults, setAccessoryResults] = useState<Product[]>([]);
  const [accessoryStatus, setAccessoryStatus] = useState<string | null>(null);

  const {
    videoRef: bodyVideoRef,
    capture: captureBodyImage,
    isReady: isBodyCameraReady,
    error: bodyCameraError,
    stop: stopBodyCamera,
  } = useCamera({
    enabled: showBodyCamera,
    cropToPortrait: false,
    mirrorCapture: false,
    facingMode: bodyCameraFacing,
    idealWidth: 1920,
    idealHeight: 1080,
  });

  const activeBaseImage = activeTab === "clothes" ? bodyImage : selfie;
  const activeResultImage = activeTab === "clothes" ? clothesPreviewImage : facePreviewImage;
  const currentTitle = activeTab === "clothes" ? clothesPreviewTitle : facePreviewTitle;
  const previewImage = isResetToOriginal
    ? activeBaseImage ?? null
    : activeResultImage ?? activeBaseImage ?? null;
  const reasoningInsight = tryOnPlanToAgentInsight(plan);

  useEffect(() => {
    if (!isHydrated || !selfie) return;
    if (prevSelfieRef.current !== null && prevSelfieRef.current !== selfie) {
      setPlan(null);
      setAnalysis(null);
      setFacePreviewImage(null);
      setFacePreviewTitle("Original Selfie");
      setStudioNotice(null);
      setError(null);
    }
    prevSelfieRef.current = selfie;
  }, [isHydrated, selfie]);

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
    if (!bodyImage) return;
    let cancelled = false;
    void imageStringToBlob(bodyImage)
      .then((blob) => {
        if (!cancelled) setBodyBlob(blob);
      })
      .catch(() => {
        if (!cancelled) {
          setBodyImage(null);
          setBodyBlob(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bodyImage]);

  useEffect(() => {
    if (!selfieBlob) return;
    const sourceSelfie = selfieBlob;
    let cancelled = false;

    async function loadStudioData() {
      setIsLoading(true);
      setError(null);
      setStudioNotice(null);
      setClothesStatus(null);
      setAccessoryStatus(null);

      let defaultAccessoryQuery = "gold sculptural hoop earrings";

      try {
        let nextAnalysis: GlowupAnalysis | null = null;
        try {
          nextAnalysis = await glowupApi.analyze(sourceSelfie);
          if (cancelled) return;
          setAnalysis(nextAnalysis);

          const nextPlan = await glowupApi.recommendFromAnalysis(
            nextAnalysis.face_attributes,
            nextAnalysis.skin_tone
          );
          if (cancelled) return;
          setPlan(nextPlan);

          defaultAccessoryQuery = nextPlan.accessory_queries.earrings;
          setAccessorySearch(defaultAccessoryQuery);
        } catch (planError) {
          if (!cancelled) {
            const fallbackPlan = buildFallbackPlan(nextAnalysis);
            setPlan(fallbackPlan);
            defaultAccessoryQuery = fallbackPlan.accessory_queries.earrings;
            setAccessorySearch(defaultAccessoryQuery);
            setStudioNotice(formatApiError(planError, "Using starter studio recommendations while GlowUp reasoning is unavailable."));
          }
        }

        const [clothesSearchResult, accessorySearchResult] = await Promise.all([
          productsApi.search("linen button-up shirt"),
          productsApi.search(defaultAccessoryQuery),
        ]);

        if (cancelled) return;
        setClothesResults(clothesSearchResult.products.slice(0, 6));
        setAccessoryResults(accessorySearchResult.products.slice(0, 6));
        setClothesStatus(
          clothesSearchResult.products.length
            ? null
            : "No clothing products came back for the starter search yet. Try another query."
        );
        setAccessoryStatus(
          accessorySearchResult.products.length
            ? null
            : "No accessories came back for the current query yet. Try another query."
        );
      } catch (loadError) {
        if (cancelled) return;
        setError(formatApiError(loadError, "Try-On Studio is unavailable right now."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadStudioData();
    return () => {
      cancelled = true;
    };
  }, [selfieBlob]);

  async function runTryOn(
    tool: ToolName,
    title: string,
    runner: () => Promise<VtoImageResponse>,
    source: "face" | "body" = "face",
    garmentDisplay?: { imageUrl: string | null }
  ) {
    if (source === "face" && !selfieBlob) return;
    if (source === "body" && !bodyBlob) return;

    if (source === "body") {
      setClothesGarmentDisplay({
        imageUrl: garmentDisplay?.imageUrl ?? null,
        label: title,
      });
    }

    setIsApplying(true);
    setActiveStage("Resolving reference image");
    setSaveMessage(null);
    setIsResetToOriginal(false);
    setError(null);
    dispatch({ type: "SET_PROCESSING", payload: true });
    dispatch({ type: "SET_CURRENT_TOOL", payload: tool });

    try {
      window.setTimeout(() => {
        setActiveStage((stage) => stage === "Resolving reference image" ? "Rendering with Perfect Corp" : stage);
      }, 900);
      const result = await runner();
      const imageUrl = extractImageUrl(result);
      if (!imageUrl) throw new Error("The VTO result did not return an image.");

      if (source === "body") {
        setClothesPreviewImage(imageUrl);
        setClothesPreviewTitle(title);
      } else {
        setFacePreviewImage(imageUrl);
        setFacePreviewTitle(title);
      }
      dispatch({
        type: "SET_VTO_RESULT",
        payload: { imageUrl, toolName: tool, timestamp: Date.now() },
      });
      dispatch({ type: "SET_CURRENT_TOOL", payload: null });
      setActiveStage("Ready to save");
    } catch (tryError) {
      dispatch({ type: "SET_PROCESSING", payload: false });
      dispatch({ type: "SET_CURRENT_TOOL", payload: null });
      setError(formatApiError(tryError, "Failed to apply that try-on."));
    } finally {
      setIsApplying(false);
      setActiveStage(null);
    }
  }

  async function searchClothes() {
    setIsLoading(true);
    setError(null);
    setClothesStatus(null);
    try {
      const response = await productsApi.search(clothesSearch);
      setClothesResults(response.products.slice(0, 6));
      if (!response.products.length) {
        setClothesStatus("No matching clothes were found. Try a broader product query.");
      }
    } catch (searchError) {
      const message = formatApiError(searchError, "Unable to search clothes right now.");
      setClothesStatus(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function searchAccessories(queryOverride?: string, kindOverride?: AccessoryKind) {
    const nextKind = kindOverride ?? accessoryKind;
    const query = queryOverride ?? accessorySearch;
    setIsLoading(true);
    setError(null);
    setAccessoryStatus(null);
    try {
      const response = await productsApi.search(query);
      setAccessoryResults(response.products.slice(0, 6));
      setAccessoryKind(nextKind);
      if (!response.products.length) {
        setAccessoryStatus("No matching accessories were found. Try a broader or simpler query.");
      }
    } catch (searchError) {
      const message = formatApiError(searchError, "Unable to search accessories right now.");
      setAccessoryStatus(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function resetPreview() {
    if (activeTab === "clothes") {
      setClothesPreviewImage(null);
      setClothesPreviewTitle("Full-Body Source");
      setClothesGarmentDisplay(null);
    } else {
      setFacePreviewImage(null);
      setFacePreviewTitle("Original Selfie");
    }
    setIsResetToOriginal(true);
    setSaveMessage(null);
    dispatch({ type: "CLEAR_VTO" });
    dispatch({ type: "SET_CURRENT_TOOL", payload: null });
    dispatch({ type: "SET_PROCESSING", payload: false });
  }

  function downloadPreview() {
    if (!previewImage) return;
    const anchor = document.createElement("a");
    anchor.href = previewImage;
    anchor.download = "mirra-try-on.jpg";
    anchor.click();
  }

  async function handleBodyImageUpload(file: File) {
    const looksLikeImage =
      file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!looksLikeImage) {
      setBodyImageStatus("Choose an image file (JPG, PNG, WebP, HEIC, or similar).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setBodyImageStatus("Keep the full-body image under 10MB.");
      return;
    }

    try {
      const nextDataUrl = await fileToDataUrl(file);
      const { error: validationError, hint } = await validateBodyImage(nextDataUrl);
      if (validationError) {
        setBodyImageStatus(validationError);
        return;
      }
      const nextBlob = await imageStringToBlob(nextDataUrl);
      setBodyImage(nextDataUrl);
      setBodyBlob(nextBlob);
      setBodyImageStatus(
        hint ? `Full-body image ready for clothes try-on. ${hint}` : "Full-body image ready for clothes try-on."
      );
      persistBodyImage(nextDataUrl);
      setClothesPreviewImage(null);
      setClothesPreviewTitle("Full-Body Source");
      setClothesGarmentDisplay(null);
      if (activeTab === "clothes") {
        setIsResetToOriginal(true);
      }
    } catch (uploadError) {
      setBodyImageStatus(formatApiError(uploadError, "Failed to load that full-body image."));
    }
  }

  async function handleBodyCameraCapture() {
    const tryCapture = () => captureBodyImage();
    let captured = tryCapture();
    if (!captured) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      captured = tryCapture();
    }

    if (!captured) {
      setBodyImageStatus(
        "Could not read the camera frame yet. Wait until the live preview is sharp, then tap again. If this keeps happening, allow camera access or use Upload from gallery."
      );
      return;
    }

    try {
      const { error: validationError, hint } = await validateBodyImage(captured);
      if (validationError) {
        setBodyImageStatus(validationError);
        return;
      }

      const nextBlob = await imageStringToBlob(captured);
      setBodyImage(captured);
      setBodyBlob(nextBlob);
      setBodyImageStatus(
        hint ? `Full-body capture is ready for clothes try-on. ${hint}` : "Full-body capture is ready for clothes try-on."
      );
      persistBodyImage(captured);
      setClothesPreviewImage(null);
      setClothesPreviewTitle("Full-Body Source");
      setClothesGarmentDisplay(null);
      setIsResetToOriginal(true);
      stopBodyCamera();
      setShowBodyCamera(false);
    } catch (captureError) {
      setBodyImageStatus(formatApiError(captureError, "Failed to validate that full-body capture."));
    }
  }

  async function savePreview() {
    const imageUrl = activeTab === "clothes" ? clothesPreviewImage : facePreviewImage;
    if (!imageUrl) {
      setError("Apply a try-on result before saving to your diary.");
      return;
    }

    setSaveMessage(null);
    setError(null);

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
            category: activeTab,
            source: "Try-On Studio",
            imageUrl,
          },
        ],
        occasion: "try-on studio",
        vto_image_url: imageUrl,
      });

      setSaveMessage("Saved to your look diary.");
    } catch (saveError) {
      setError(formatApiError(saveError, "Unable to save this look."));
    }
  }

  function handleReasoningTap(action: string) {
    if (action === "tab:clothes") {
      setActiveTab("clothes");
      return;
    }
    if (action === "tab:makeup") {
      setActiveTab("makeup");
      return;
    }
    if (action === "tab:hair") {
      setActiveTab("hair");
      return;
    }
    if (action === "tab:accessories") {
      setActiveTab("accessories");
    }
  }

  function clearBodyImage() {
    setBodyImage(null);
    setBodyBlob(null);
    setBodyImageStatus("Removed the current full-body image.");
    setClothesPreviewImage(null);
    setClothesPreviewTitle("Full-Body Source");
    setClothesGarmentDisplay(null);
    setIsResetToOriginal(true);
    setShowBodyCamera(false);
    stopBodyCamera();
    try {
      localStorage.removeItem(BODY_IMAGE_STORAGE_KEY);
    } catch {
      // no-op
    }
  }

  if (isHydrated && !selfie) {
    return (
      <section className="page-shell">
        <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <p className="label-caps">Try-On Studio</p>
          <h1 className="mt-3 text-3xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            Start with a selfie
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
            The studio needs a saved portrait selfie for makeup, hair, earrings, and necklace. Clothes try-on uses a separate full-body photo (portrait orientation, head to toe).
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6" style={{ color: "var(--on-surface-muted)" }}>
            Demo path: capture a selfie on <Link href="/capture" className="text-[var(--secondary)] underline-offset-2 hover:underline">/capture</Link>
            {" "}or finish a skin scan so the app saves your portrait, then open Try-On again.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/capture" className="btn-primary">
              Capture selfie
            </Link>
            <Link href="/skin" className="btn-secondary">
              Skin scan
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              Dashboard
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="page-shell max-w-full space-y-6">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <p className="label-caps">Phase 7</p>
        <h1 className="mt-3 text-3xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
          Try-On Studio
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 sm:text-base" style={{ color: "var(--on-surface-variant)" }}>
          Clothes try-on uses a dedicated full-body image. Makeup, hair, earrings, and necklace stay on your portrait selfie.
        </p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--on-surface-muted)]">Demo checklist</p>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
            <li>
              <strong className="font-semibold text-[var(--on-surface)]">Clothes:</strong> open the Clothes tab, upload or capture a full-body photo (short side at least 480px; portrait is recommended). Search or paste a garment URL, then try on.
            </li>
            <li>
              <strong className="font-semibold text-[var(--on-surface)]">Face tabs:</strong> switch to Makeup, Hair, or Accessories — they always use your saved selfie, not the body shot.
            </li>
            <li>
              <strong className="font-semibold text-[var(--on-surface)]">Save:</strong> after a result appears in the preview, use Save To Diary at the bottom (proof card).
            </li>
          </ol>
        </div>
      </section>

      {error && (
        <div className="banner-error" role="alert">
          {error}
        </div>
      )}

      {studioNotice && !error && (
        <div className="banner-warn" role="status">
          {studioNotice}
        </div>
      )}

      {activeTab === "clothes" && selfie && !bodyImage && (
        <div className="banner-warn" role="status">
          <strong className="font-semibold text-[var(--on-surface)]">Clothes mode:</strong> upload or capture a full-body image below. The large preview stays empty until a body source is set (your selfie alone is not used for garment VTO).
        </div>
      )}

      {activeBaseImage && previewImage && (
        <div className="grid gap-4 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          <PreviewPanel
            originalImage={activeBaseImage}
            currentImage={previewImage}
            currentTitle={currentTitle}
            mode={activeTab === "clothes" ? "clothes" : "face"}
          />
          <StudioStatus
            isApplying={isApplying}
            stage={activeStage}
            currentTitle={currentTitle}
            savedMessage={saveMessage}
          />
        </div>
      )}

      <AgentInsightCard
        insight={reasoningInsight}
        isLoading={isLoading}
        onRecommendationTap={handleReasoningTap}
      />

      <section className="glass-card p-5 sm:p-6">
        <div className="grid gap-3 md:grid-cols-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${activeTab === tab.id ? "border-[var(--primary)] bg-[var(--primary)]/12 shadow-[0_0_0_1px_rgba(139,92,246,0.28)]" : "border-white/10 bg-white/[0.04]"}`}
            >
              <h2 className="text-base font-semibold text-[var(--on-surface)]">
                {tab.title}
              </h2>
              <p
                className="mt-2 text-sm leading-5"
                style={{ color: "var(--on-surface-variant)" }}
              >
                {tab.subtitle}
              </p>
            </button>
          ))}
        </div>
      </section>

      {isLoading && (
        <section className="glass-card flex items-center gap-3 p-5">
          <LoaderCircle className="animate-spin" size={18} />
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            Loading studio assets and product results.
          </p>
        </section>
      )}

      {activeTab === "clothes" && (
        <section className="glass-card space-y-5 p-5 sm:p-6">
          <GarmentFlowStrip
            bodyImage={bodyImage}
            garment={clothesGarmentDisplay}
            garmentIntentText={clothesUrl}
            resultImage={clothesPreviewImage}
          />

          <div>
            <p className="label-caps">Step-by-step · Clothes</p>
            <h2 className="mt-2 text-2xl" style={{ fontFamily: "var(--font-serif)" }}>
              Add your body shot, then choose the garment
            </h2>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Step 1 · Full-body source image</p>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
                  Perfect Corp clothes try-on needs a full-body photo: head to toe visible, straight pose, arms slightly away from the body, even lighting, and a plain background.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
                <label className="btn-secondary w-full cursor-pointer">
                  <Upload size={16} className="mr-2 inline" />
                  Upload from gallery
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleBodyImageUpload(file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <label className="btn-secondary w-full cursor-pointer">
                  <Smartphone size={16} className="mr-2 inline" />
                  Take photo (phone camera)
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleBodyImageUpload(file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => {
                    setBodyImageStatus(null);
                    setShowBodyCamera((current) => {
                      if (current) {
                        stopBodyCamera();
                      }
                      return !current;
                    });
                  }}
                >
                  {showBodyCamera ? "Close in-browser camera" : "Capture in browser"}
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3" style={{ color: "var(--on-surface-variant)" }}>
              <p>• Head to toe visible</p>
              <p>• Straight pose facing camera</p>
              <p>• Arms slightly away from body</p>
              <p>• Even lighting</p>
              <p>• Plain background</p>
              <p>• Short side ≥ 480px (720px+ ideal)</p>
              <p>• Fitted clothing helps body detection</p>
            </div>
            {showBodyCamera && (
              <div className="mt-4 space-y-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <div className="overflow-hidden rounded-[1.25rem] border border-white/10">
                  <video
                    ref={bodyVideoRef}
                    className="h-[420px] w-full bg-black object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        bodyCameraFacing === "environment"
                          ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--on-surface)]"
                          : "border-white/20 bg-white/5"
                      }`}
                      onClick={() => setBodyCameraFacing("environment")}
                    >
                      <SwitchCamera size={14} className="mr-1.5 inline opacity-80" />
                      Back camera
                    </button>
                    <button
                      type="button"
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        bodyCameraFacing === "user"
                          ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--on-surface)]"
                          : "border-white/20 bg-white/5"
                      }`}
                      onClick={() => setBodyCameraFacing("user")}
                    >
                      Front camera
                    </button>
                  </div>
                  <p className="text-sm sm:max-w-md" style={{ color: "var(--on-surface-variant)" }}>
                    Hold the phone vertically, use <strong className="font-semibold opacity-95">back camera</strong> to step back for head-to-toe framing, or switch to front if you need a selfie-style setup.
                  </p>
                  <button
                    type="button"
                    className="btn-primary w-full sm:w-auto sm:shrink-0"
                    disabled={!isBodyCameraReady}
                    onClick={() => void handleBodyCameraCapture()}
                  >
                    {isBodyCameraReady ? "Use This Capture" : "Preparing Camera..."}
                  </button>
                </div>
                {bodyCameraError && (
                  <div className="banner-error" role="alert">
                    {bodyCameraError}
                  </div>
                )}
              </div>
            )}
            {bodyImageStatus && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm" style={{ color: "var(--on-surface-variant)" }}>
                {bodyImageStatus}
              </div>
            )}
            {bodyImage && (
              <div className="mt-4 grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/10">
                  <img src={bodyImage} alt="Full-body source" className="h-full w-full object-cover" />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Full-body source ready</p>
                    <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
                      Clothes try-on will use this image until you replace or remove it. Portrait-based tabs still use your saved selfie.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className="btn-secondary w-full sm:w-auto" onClick={clearBodyImage}>
                      Remove Body Image
                    </button>
                    <button
                      type="button"
                      className="btn-secondary w-full sm:w-auto"
                      onClick={() => {
                        setBodyImageStatus(null);
                        setShowBodyCamera((current) => {
                          if (current) {
                            stopBodyCamera();
                          }
                          return !current;
                        });
                      }}
                    >
                      {showBodyCamera ? "Close Camera" : "Retake With Camera"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {!bodyImage && (
              <div className="banner-warn mt-4" role="status">
                Upload a full-body image before running clothes try-on.
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--on-surface-muted)]">Step 2 · Garment</p>
              <label className="block text-sm font-medium">
                Garment image URL
                <input
                  value={clothesUrl}
                  onChange={(event) => setClothesUrl(event.target.value)}
                  placeholder="https://example.com/product.jpg"
                  className={tryOnInputBlockClass}
                />
              </label>
              <p className="text-xs leading-5" style={{ color: "var(--on-surface-variant)" }}>
                Paste a product or <strong className="font-semibold text-[var(--on-surface)]">direct garment image</strong> URL. The backend resolves it before VTO. Then choose{" "}
                <strong className="font-semibold text-[var(--on-surface)]">upper</strong>, <strong className="font-semibold text-[var(--on-surface)]">lower</strong>, or{" "}
                <strong className="font-semibold text-[var(--on-surface)]">full outfit</strong> so the API maps the piece correctly.
              </p>

              <label className="block text-sm font-medium">
                Category
                <select
                  value={clothesCategory}
                  onChange={(event) => setClothesCategory(event.target.value as "upper" | "lower" | "full")}
                  className={tryOnInputBlockClass}
                >
                  <option value="upper">Upper</option>
                  <option value="lower">Lower</option>
                  <option value="full">Full</option>
                </select>
              </label>

              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                disabled={!clothesUrl.trim() || isApplying || !bodyBlob}
                onClick={() => {
                  const trimmedUrl = clothesUrl.trim();
                  void runTryOn(
                    ToolName.TRY_ON_CLOTHES,
                    "Custom garment",
                    () => vtoApi.clothes(bodyBlob as Blob, trimmedUrl, clothesCategory),
                    "body",
                    { imageUrl: null }
                  );
                }}
              >
                Try Pasted URL
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--on-surface-muted)]">Also try · Search</p>
              <label className="block text-sm font-medium">
                Search products
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={clothesSearch}
                    onChange={(event) => setClothesSearch(event.target.value)}
                    placeholder="silk blouse"
                    className={`min-h-11 flex-1 ${tryOnInputClass}`}
                  />
                  <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => void searchClothes()}>
                    <Search size={16} />
                  </button>
                </div>
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <p className="text-sm leading-relaxed md:col-span-2 xl:col-span-3" style={{ color: "var(--on-surface-variant)" }}>
              Each tile is a <strong className="font-semibold text-[var(--on-surface)]">garment reference image</strong>. Try On pairs it with your full-body photo from step 1; the composite appears in the{" "}
              <a href="#tryon-live-preview" className="font-semibold text-[var(--secondary)] underline-offset-2 hover:underline">
                live preview
              </a>.
            </p>
            {clothesStatus && clothesResults.length === 0 && (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm md:col-span-2 xl:col-span-3" style={{ color: "var(--on-surface-variant)" }}>
                {clothesStatus}
              </div>
            )}
            {clothesResults.map((product) => (
              <article key={product.link} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-3">
                <div className="aspect-square overflow-hidden rounded-[1rem] bg-black/10">
                  <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                </div>
                <h3 className="mt-3 line-clamp-2 text-sm font-semibold">{product.title}</h3>
                <p className="mt-1 text-xs" style={{ color: "var(--on-surface-muted)" }}>
                  {product.source} • {product.price}
                </p>
                <p className="mt-2 text-[11px] leading-snug" style={{ color: "var(--on-surface-muted)" }}>
                  Pairs this product photo with your step 1 full-body shot; see the merge in the live preview.
                </p>
                <button
                  type="button"
                  className="btn-primary mt-3 w-full text-sm"
                  disabled={!productImageIsLikelyUsable(product) || isApplying || !bodyBlob}
                  onClick={() => void runTryOn(
                    ToolName.TRY_ON_CLOTHES,
                    product.title,
                    () => vtoApi.clothes(bodyBlob as Blob, product.imageUrl, clothesCategory),
                    "body",
                    { imageUrl: product.imageUrl }
                  )}
                >
                  Try On
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "makeup" && (
        <section className="glass-card space-y-5 p-5 sm:p-6">
          <div>
            <p className="label-caps">Makeup</p>
            <h2 className="mt-2 text-2xl">Preset looks</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
              {analysis ? `Loaded from your ${String(analysis.skin_tone?.undertone ?? "neutral")} undertone plan.` : "Loading your undertone-aware looks."}
            </p>
          </div>
          {!plan?.makeup_presets?.length && (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
              Makeup recommendations are still loading.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(plan?.makeup_presets ?? []).map((preset: GlowupMakeupPreset) => (
              <article key={preset.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{preset.title}</h3>
                  <Sparkles size={16} className="text-[var(--primary)]" />
                </div>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
                  {preset.description}
                </p>
                <button
                  type="button"
                  className="btn-primary mt-4 w-full text-sm"
                  disabled={isApplying || !selfieBlob}
                  onClick={() => void runTryOn(ToolName.TRY_ON_MAKEUP, preset.title, () => vtoApi.makeup(selfieBlob as Blob, preset.effects), "face")}
                >
                  Apply Look
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "hair" && (
        <section className="glass-card space-y-5 p-5 sm:p-6">
          <div>
            <p className="label-caps">Hair</p>
            <h2 className="mt-2 text-2xl">Reference hairstyles</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {!plan?.hairstyles?.length && (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm sm:col-span-2 xl:col-span-4" style={{ color: "var(--on-surface-variant)" }}>
                Hairstyle references are still loading.
              </div>
            )}
            {(plan?.hairstyles ?? []).map((style: GlowupHairstyle) => (
              <article key={style.id} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5">
                <div className="aspect-[4/5] bg-black/10">
                  <img src={style.image_url} alt={style.title} className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold">{style.title}</h3>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
                    {style.description}
                  </p>
                  <button
                    type="button"
                    className="btn-primary mt-4 w-full text-sm"
                    disabled={isApplying || !selfieBlob}
                    onClick={() => void runTryOn(ToolName.CHANGE_HAIRSTYLE, style.title, () => vtoApi.hair(selfieBlob as Blob, style.image_url), "face")}
                  >
                    Try Hairstyle
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "accessories" && (
        <section className="glass-card space-y-5 p-5 sm:p-6">
          <div>
            <p className="label-caps">Accessories</p>
            <h2 className="mt-2 text-2xl">Search and try on</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Category
                <select
                  value={accessoryKind}
                  onChange={(event) => {
                    const nextKind = event.target.value as AccessoryKind;
                    setAccessoryKind(nextKind);
                    const query = nextKind === "earrings"
                      ? plan?.accessory_queries.earrings ?? "gold sculptural hoop earrings"
                      : plan?.accessory_queries.necklace ?? "gold layered pendant necklace";
                    setAccessorySearch(query);
                    void searchAccessories(query, nextKind);
                  }}
                  className={tryOnInputBlockClass}
                >
                  <option value="earrings">Earrings</option>
                  <option value="necklace">Necklace</option>
                </select>
              </label>

              <label className="block text-sm font-medium">
                Search query
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={accessorySearch}
                    onChange={(event) => setAccessorySearch(event.target.value)}
                    placeholder="gold sculptural hoop earrings"
                    className={`min-h-11 flex-1 ${tryOnInputClass}`}
                  />
                  <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => void searchAccessories()}>
                    <Search size={16} />
                  </button>
                </div>
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {accessoryStatus && accessoryResults.length === 0 && (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm md:col-span-2 xl:col-span-3" style={{ color: "var(--on-surface-variant)" }}>
                {accessoryStatus}
              </div>
            )}
            {accessoryResults.map((product) => (
              <article key={product.link} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-3">
                <div className="aspect-square overflow-hidden rounded-[1rem] bg-black/10">
                  <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                </div>
                <h3 className="mt-3 line-clamp-2 text-sm font-semibold">{product.title}</h3>
                <p className="mt-1 text-xs" style={{ color: "var(--on-surface-muted)" }}>
                  {product.source} • {product.price}
                </p>
                <button
                  type="button"
                  className="btn-primary mt-3 w-full text-sm"
                  disabled={isApplying || !selfieBlob}
                  onClick={() => void runTryOn(
                    accessoryKind === "earrings" ? ToolName.TRY_ON_EARRINGS : ToolName.TRY_ON_NECKLACE,
                    product.title,
                    () => accessoryKind === "earrings"
                      ? vtoApi.earrings(selfieBlob as Blob, product.imageUrl)
                      : vtoApi.necklace(selfieBlob as Blob, product.imageUrl),
                    "face"
                  )}
                >
                  Try On
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="glass-card flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <div>
          <p className="label-caps">Studio Controls</p>
          <h2 className="mt-2 text-2xl">Reset, download, or save your latest result</h2>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={resetPreview}>
            <RotateCcw size={16} className="mr-2 inline" />
            Reset
          </button>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={downloadPreview} disabled={!activeResultImage}>
            <Download size={16} className="mr-2 inline" />
            Download
          </button>
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={() => void savePreview()}
            disabled={activeTab === "clothes" ? !clothesPreviewImage : !facePreviewImage}
          >
            <Save size={16} className="mr-2 inline" />
            Save To Diary
          </button>
        </div>
      </section>
    </div>
  );
}
