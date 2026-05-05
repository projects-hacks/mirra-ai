/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RotateCcw, Save, Search, Sparkles } from "lucide-react";
import { glowupApi, productsApi, vtoApi, type VtoImageResponse } from "@/lib/api";
import { ToolName } from "@/lib/constants";
import { useAppDispatch, useAppState } from "@/components/providers/AppProvider";
import { useImageTransition } from "@/hooks/useImageTransition";
import type { GlowupAnalysis, GlowupHairstyle, GlowupMakeupPreset, GlowupPlan, Product } from "@/types";

type TryOnTab = "clothes" | "makeup" | "hair" | "accessories";
type AccessoryKind = "earrings" | "necklace";

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

function productImageIsLikelyUsable(product: Product): boolean {
  return product.imageUrl.startsWith("http://") || product.imageUrl.startsWith("https://");
}

function PreviewPanel({
  originalImage,
  currentImage,
  currentTitle,
}: Readonly<{
  originalImage: string;
  currentImage: string;
  currentTitle: string;
}>) {
  const { displayImage, isTransitioning } = useImageTransition(originalImage, currentImage);

  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="label-caps">Studio Preview</p>
        <h2 className="mt-2 text-2xl">Live Look</h2>
      </div>
      <div className="relative aspect-[4/5] bg-black/10">
        <img src={originalImage} alt="Original selfie" className="absolute inset-0 h-full w-full object-cover opacity-100" />
        <img
          src={displayImage ?? currentImage}
          alt={currentTitle}
          className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${isTransitioning ? "opacity-65" : "opacity-100"}`}
        />
        <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          Original underlay
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 text-white">
          <p className="text-sm font-semibold">{currentTitle}</p>
          <p className="mt-1 text-xs text-white/80">The latest VTO result stays here while you switch categories.</p>
        </div>
      </div>
    </section>
  );
}

const TABS: Array<{ id: TryOnTab; title: string; subtitle: string }> = [
  { id: "clothes", title: "Clothes", subtitle: "Paste a garment URL or search products." },
  { id: "makeup", title: "Makeup", subtitle: "Apply preset looks from the GlowUp data." },
  { id: "hair", title: "Hair", subtitle: "Transfer a reference hairstyle." },
  { id: "accessories", title: "Accessories", subtitle: "Try on earrings or necklaces from search." },
];

export default function TryOnPage() {
  const dispatch = useAppDispatch();
  const { selfie, vtoResult, isHydrated } = useAppState();

  const [activeTab, setActiveTab] = useState<TryOnTab>("clothes");
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<GlowupAnalysis | null>(null);
  const [plan, setPlan] = useState<GlowupPlan | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState("Original Selfie");
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clothesUrl, setClothesUrl] = useState("");
  const [clothesCategory, setClothesCategory] = useState<"upper" | "lower" | "full">("upper");
  const [clothesSearch, setClothesSearch] = useState("linen button-up shirt");
  const [clothesResults, setClothesResults] = useState<Product[]>([]);

  const [accessoryKind, setAccessoryKind] = useState<AccessoryKind>("earrings");
  const [accessorySearch, setAccessorySearch] = useState("gold sculptural hoop earrings");
  const [accessoryResults, setAccessoryResults] = useState<Product[]>([]);

  const previewImage = currentImage ?? vtoResult?.imageUrl ?? selfie ?? null;

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

    async function loadStudioData() {
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

        const defaultAccessoryQuery = nextPlan.accessory_queries.earrings;
        setAccessorySearch(defaultAccessoryQuery);

        const [clothesSearchResult, accessorySearchResult] = await Promise.all([
          productsApi.search("linen button-up shirt"),
          productsApi.search(defaultAccessoryQuery),
        ]);

        if (cancelled) return;
        setClothesResults(clothesSearchResult.products.slice(0, 6));
        setAccessoryResults(accessorySearchResult.products.slice(0, 6));
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Try-On Studio is unavailable right now.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadStudioData();
    return () => {
      cancelled = true;
    };
  }, [plan, selfieBlob]);

  async function runTryOn(tool: ToolName, title: string, runner: () => Promise<VtoImageResponse>) {
    if (!selfieBlob) return;

    setIsApplying(true);
    setError(null);
    dispatch({ type: "SET_PROCESSING", payload: true });
    dispatch({ type: "SET_CURRENT_TOOL", payload: tool });

    try {
      const result = await runner();
      const imageUrl = extractImageUrl(result);
      if (!imageUrl) throw new Error("The VTO result did not return an image.");

      setCurrentImage(imageUrl);
      setCurrentTitle(title);
      dispatch({
        type: "SET_VTO_RESULT",
        payload: { imageUrl, toolName: tool, timestamp: Date.now() },
      });
      dispatch({ type: "SET_CURRENT_TOOL", payload: null });
    } catch (tryError) {
      dispatch({ type: "SET_PROCESSING", payload: false });
      dispatch({ type: "SET_CURRENT_TOOL", payload: null });
      setError(tryError instanceof Error ? tryError.message : "Failed to apply that try-on.");
    } finally {
      setIsApplying(false);
    }
  }

  async function searchClothes() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await productsApi.search(clothesSearch);
      setClothesResults(response.products.slice(0, 6));
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Unable to search clothes right now.");
    } finally {
      setIsLoading(false);
    }
  }

  async function searchAccessories(queryOverride?: string, kindOverride?: AccessoryKind) {
    const nextKind = kindOverride ?? accessoryKind;
    const query = queryOverride ?? accessorySearch;
    setIsLoading(true);
    setError(null);
    try {
      const response = await productsApi.search(query);
      setAccessoryResults(response.products.slice(0, 6));
      setAccessoryKind(nextKind);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Unable to search accessories right now.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetPreview() {
    setCurrentImage(null);
    setCurrentTitle("Original Selfie");
    dispatch({ type: "CLEAR_VTO" });
    dispatch({ type: "SET_CURRENT_TOOL", payload: null });
    dispatch({ type: "SET_PROCESSING", payload: false });
  }

  function savePreview() {
    if (!previewImage) return;
    const anchor = document.createElement("a");
    anchor.href = previewImage;
    anchor.download = "mirra-try-on.jpg";
    anchor.click();
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
            The studio needs a saved selfie so you can preview clothes, makeup, hair, earrings, and necklaces on the same image.
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
        <p className="label-caps">Phase 7</p>
        <h1 className="mt-3 text-3xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
          Try-On Studio
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 sm:text-base" style={{ color: "var(--on-surface-variant)" }}>
          One portrait workspace for clothes, makeup, hair, earrings, and necklaces. Apply a look, reset instantly, and keep your best result.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {selfie && previewImage && (
        <PreviewPanel originalImage={selfie} currentImage={previewImage} currentTitle={currentTitle} />
      )}

      <section className="glass-card p-5 sm:p-6">
        <div className="grid gap-3 md:grid-cols-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${activeTab === tab.id ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-black/8 bg-white/65"}`}
            >
              <h2 className="text-base font-semibold">{tab.title}</h2>
              <p className="mt-2 text-sm leading-5" style={{ color: "var(--on-surface-variant)" }}>
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
          <div>
            <p className="label-caps">Clothes</p>
            <h2 className="mt-2 text-2xl">Paste a garment URL or search</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Garment image URL
                <input
                  value={clothesUrl}
                  onChange={(event) => setClothesUrl(event.target.value)}
                  placeholder="https://example.com/product.jpg"
                  className="mt-2 min-h-11 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="block text-sm font-medium">
                Category
                <select
                  value={clothesCategory}
                  onChange={(event) => setClothesCategory(event.target.value as "upper" | "lower" | "full")}
                  className="mt-2 min-h-11 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none"
                >
                  <option value="upper">Upper</option>
                  <option value="lower">Lower</option>
                  <option value="full">Full</option>
                </select>
              </label>

              <button
                type="button"
                className="btn-primary"
                disabled={!clothesUrl.trim() || isApplying}
                onClick={() => void runTryOn(ToolName.TRY_ON_CLOTHES, "Custom garment", () => vtoApi.clothes(selfieBlob as Blob, clothesUrl, clothesCategory))}
              >
                Try Pasted URL
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Search products
                <div className="mt-2 flex gap-2">
                  <input
                    value={clothesSearch}
                    onChange={(event) => setClothesSearch(event.target.value)}
                    placeholder="silk blouse"
                    className="min-h-11 flex-1 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none"
                  />
                  <button type="button" className="btn-secondary" onClick={() => void searchClothes()}>
                    <Search size={16} />
                  </button>
                </div>
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clothesResults.map((product) => (
              <article key={product.link} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-3">
                <div className="aspect-square overflow-hidden rounded-[1rem] bg-black/10">
                  <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                </div>
                <h3 className="mt-3 line-clamp-2 text-sm font-semibold">{product.title}</h3>
                <p className="mt-1 text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  {product.source} • {product.price}
                </p>
                <button
                  type="button"
                  className="btn-primary mt-3 w-full text-sm"
                  disabled={!productImageIsLikelyUsable(product) || isApplying}
                  onClick={() => void runTryOn(ToolName.TRY_ON_CLOTHES, product.title, () => vtoApi.clothes(selfieBlob as Blob, product.imageUrl, clothesCategory))}
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
                  disabled={isApplying}
                  onClick={() => void runTryOn(ToolName.TRY_ON_MAKEUP, preset.title, () => vtoApi.makeup(selfieBlob as Blob, preset.effects))}
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
                    disabled={isApplying}
                    onClick={() => void runTryOn(ToolName.CHANGE_HAIRSTYLE, style.title, () => vtoApi.hair(selfieBlob as Blob, style.image_url))}
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
                  className="mt-2 min-h-11 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none"
                >
                  <option value="earrings">Earrings</option>
                  <option value="necklace">Necklace</option>
                </select>
              </label>

              <label className="block text-sm font-medium">
                Search query
                <div className="mt-2 flex gap-2">
                  <input
                    value={accessorySearch}
                    onChange={(event) => setAccessorySearch(event.target.value)}
                    placeholder="gold sculptural hoop earrings"
                    className="min-h-11 flex-1 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none"
                  />
                  <button type="button" className="btn-secondary" onClick={() => void searchAccessories()}>
                    <Search size={16} />
                  </button>
                </div>
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {accessoryResults.map((product) => (
              <article key={product.link} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-3">
                <div className="aspect-square overflow-hidden rounded-[1rem] bg-black/10">
                  <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                </div>
                <h3 className="mt-3 line-clamp-2 text-sm font-semibold">{product.title}</h3>
                <p className="mt-1 text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  {product.source} • {product.price}
                </p>
                <button
                  type="button"
                  className="btn-primary mt-3 w-full text-sm"
                  disabled={isApplying}
                  onClick={() => void runTryOn(
                    accessoryKind === "earrings" ? ToolName.TRY_ON_EARRINGS : ToolName.TRY_ON_NECKLACE,
                    product.title,
                    () => accessoryKind === "earrings"
                      ? vtoApi.earrings(selfieBlob as Blob, product.imageUrl)
                      : vtoApi.necklace(selfieBlob as Blob, product.imageUrl)
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
          <h2 className="mt-2 text-2xl">Reset or save your latest result</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={resetPreview}>
            <RotateCcw size={16} className="mr-2 inline" />
            Reset
          </button>
          <button type="button" className="btn-primary" onClick={savePreview} disabled={!previewImage}>
            <Save size={16} className="mr-2 inline" />
            Save
          </button>
        </div>
      </section>
    </div>
  );
}
