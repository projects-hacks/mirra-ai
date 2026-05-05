/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Share2, Sparkles, WandSparkles } from "lucide-react";
import { glowupApi, productsApi, vtoApi, type VtoImageResponse } from "@/lib/api";
import { ToolName } from "@/lib/constants";
import { useAppDispatch, useAppState } from "@/components/providers/AppProvider";
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

function extractImageUrl(result: VtoImageResponse): string | null {
  return result.image_url ?? result.result_image_url ?? result.url ?? null;
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
}: Readonly<{
  title: string;
  products: Product[];
  query: string;
  onTryOn: (product: Product) => void;
  isApplying: boolean;
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
        {products.map((product) => (
          <article
            key={`${title}-${product.link}`}
            className="min-w-[220px] max-w-[220px] rounded-[1.5rem] border border-white/15 bg-white/5 p-3"
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
  const { selfie, vtoResult, isHydrated } = useAppState();

  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<GlowupAnalysis | null>(null);
  const [plan, setPlan] = useState<GlowupPlan | null>(null);
  const [accessories, setAccessories] = useState<AccessoryCatalog>({ earrings: [], necklace: [] });
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState("Original Selfie");
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!selfieBlob || plan) return;
    const sourceSelfie = selfieBlob;
    let cancelled = false;

    async function loadGlowup() {
      setIsLoading(true);
      setError(null);

      try {
        const nextAnalysis = await glowupApi.analyze(sourceSelfie);
        if (cancelled) return;

        setAnalysis(nextAnalysis);
        const nextPlan = await glowupApi.recommendFromAnalysis(
          nextAnalysis.face_attributes,
          nextAnalysis.skin_tone
        );
        if (cancelled) return;

        setPlan(nextPlan);

        const [earringsResult, necklaceResult] = await Promise.allSettled([
          productsApi.search(nextPlan.accessory_queries.earrings),
          productsApi.search(nextPlan.accessory_queries.necklace),
        ]);
        if (cancelled) return;

        setAccessories({
          earrings: earringsResult.status === "fulfilled" ? earringsResult.value.products : [],
          necklace: necklaceResult.status === "fulfilled" ? necklaceResult.value.products : [],
        });
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "GlowUp is unavailable right now.");
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
  const previewImage = currentImage ?? vtoResult?.imageUrl ?? selfie ?? null;
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
      setError(applyError instanceof Error ? applyError.message : "Failed to apply look.");
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

  const handleSave = useCallback(() => {
    if (!previewImage) return;
    const anchor = document.createElement("a");
    anchor.href = previewImage;
    anchor.download = "mirra-glowup.jpg";
    anchor.click();
  }, [previewImage]);

  const handleShare = useCallback(async () => {
    if (!previewImage) return;

    if (navigator.share) {
      await navigator.share({
        title: "Mirra GlowUp",
        text: "Preview from my Mirra GlowUp flow.",
        url: previewImage,
      });
      return;
    }

    await navigator.clipboard.writeText(previewImage);
  }, [previewImage]);

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
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => router.push("/capture")}>
              Refresh Selfie
            </button>
            <button type="button" className="btn-primary" onClick={() => router.push("/dashboard")}>
              Back To Dashboard
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {selfie && previewImage && (
        <PreviewShell
          originalImage={selfie}
          currentImage={previewImage}
          title={currentTitle}
          subtitle={plan?.insight ?? "Your latest preview updates here as you apply makeup, hair, or accessory choices."}
        />
      )}

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

          <div className="glass-card p-5">
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
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
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
          <div className="glass-card p-5">
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

          <div className="glass-card p-5">
            <p className="label-caps">Step 4</p>
            <h2 className="mt-2 text-2xl">Accessories</h2>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
              Search-backed accessory pulls are tuned to your proportions and palette, then piped into earring and necklace VTO.
            </p>
            <div className="mt-4 space-y-6">
              <AccessoryRow
                title="Earrings"
                products={accessories.earrings}
                query={plan?.accessory_queries.earrings ?? "Loading..."}
                onTryOn={(product) => handleAccessory("earrings", product)}
                isApplying={isApplying}
              />
              <AccessoryRow
                title="Necklaces"
                products={accessories.necklace}
                query={plan?.accessory_queries.necklace ?? "Loading..."}
                onTryOn={(product) => handleAccessory("necklace", product)}
                isApplying={isApplying}
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
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={handleSave} disabled={!previewImage}>
            Save Look
          </button>
          <button type="button" className="btn-primary" onClick={() => void handleShare()} disabled={!previewImage}>
            <Share2 size={16} className="mr-2 inline" />
            Share
          </button>
        </div>
      </section>
    </div>
  );
}
