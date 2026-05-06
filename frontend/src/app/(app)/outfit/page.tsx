/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloudSun, LoaderCircle, Shirt, Sparkles, Wand2 } from "lucide-react";
import ProofCard from "@/components/cards/ProofCard";
import { useAppDispatch, useAppState } from "@/components/providers/AppProvider";
import { extractImageUrl, formatApiError, outfitApi, productsApi, vtoApi, weatherApi } from "@/lib/api";
import { Occasion } from "@/lib/closet-constants";
import { ToolName } from "@/lib/constants";
import { resolveUserLocation } from "@/lib/userContext";
import { useAuth } from "@/hooks/useAuth";
import type { Product, WeatherInfo } from "@/types";

type OccasionOption = {
  value: string;
  title: string;
  subtitle: string;
  mood: string;
  accent: string;
};

type MatchItem = {
  id: string;
  name: string;
  category: string;
  score: number;
  reasons?: string[];
  imageUrl?: string;
};

type MatchResponse = {
  matches: Record<string, MatchItem[]>;
  gaps: string[];
  context?: {
    occasion?: string;
    weather?: string;
    season?: string;
    formality?: number;
    color_analysis?: string;
  };
};

type ProofCardShape = {
  look_name: string;
  vto_image_url?: string;
  tone_match: number;
  style_fit: number;
  skin_safe: boolean;
  owned_items: Array<{ name: string; price?: number; imageUrl?: string; owned?: boolean }>;
  new_items: Array<{ name: string; price?: number; imageUrl?: string; owned?: boolean }>;
  total_new_spend: number;
  occasion: string;
  weather: string;
};

const BODY_IMAGE_STORAGE_KEY = "mirra:body_tryon_image";

const OCCASIONS: OccasionOption[] = [
  { value: Occasion.WORK, title: "Board Meeting", subtitle: "Polished, high-trust layers", mood: "Work", accent: "#0f766e" },
  { value: Occasion.DATE, title: "Date Night", subtitle: "Elevated and memorable", mood: "Date", accent: "#be185d" },
  { value: Occasion.CASUAL, title: "Casual Friday", subtitle: "Relaxed but put together", mood: "Casual", accent: "#2563eb" },
  { value: Occasion.ATHLETIC, title: "Workout", subtitle: "Movement-first utility", mood: "Athletic", accent: "#ea580c" },
  { value: Occasion.FORMAL, title: "Wedding Guest", subtitle: "Formal with standout details", mood: "Formal", accent: "#7c3aed" },
  { value: Occasion.PARTY, title: "Beach Day", subtitle: "Lightweight and sun-ready", mood: "Party", accent: "#0891b2" },
];

function inferGarmentCategory(category: string): "upper" | "lower" | "full" {
  const normalized = category.toLowerCase();
  if (["dress"].includes(normalized)) return "full";
  if (["pants", "jeans", "shorts", "skirt"].includes(normalized)) return "lower";
  return "upper";
}

function normalizePrice(price: string): number | undefined {
  const numeric = Number(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : undefined;
}

function productToSelectedItem(product: Product) {
  return {
    name: product.title,
    imageUrl: product.imageUrl,
    price: normalizePrice(product.price),
    owned: false,
    category: "new",
  };
}

async function imageStringToBlob(image: string): Promise<Blob> {
  if (image.startsWith("data:")) {
    const [header, base64Data] = image.split(",");
    const mime = header.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
    const binary = globalThis.atob(base64Data);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mime });
  }

  const response = await fetch(image);
  return response.blob();
}

function MatchGroup({
  label,
  items,
}: Readonly<{
  label: string;
  items: MatchItem[];
}>) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">{label}</h3>
        <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--on-surface-variant)" }}>
          Top {items.length}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-3">
            <div className="flex gap-3">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[1rem] bg-black/10">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--on-surface-variant)]">
                    <Shirt size={28} aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="line-clamp-2 text-sm font-semibold">{item.name}</h4>
                  <span className="rounded-full bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
                    {Math.round(item.score)}
                  </span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.16em]" style={{ color: "var(--on-surface-variant)" }}>
                  {item.category}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(item.reasons ?? []).slice(0, 3).map((reason) => (
                    <span key={`${item.id}-${reason}`} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px]" style={{ color: "var(--on-surface-variant)" }}>
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function OutfitPage() {
  const dispatch = useAppDispatch();
  const { selfie } = useAppState();
  const { user } = useAuth();

  const [selectedOccasion, setSelectedOccasion] = useState<OccasionOption | null>(null);
  const [location, setLocation] = useState("San Francisco");
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);
  const [gapProducts, setGapProducts] = useState<Record<string, Product[]>>({});
  const [gapStatuses, setGapStatuses] = useState<Record<string, string>>({});
  const [selectedGapProducts, setSelectedGapProducts] = useState<Record<string, Product>>({});
  const [proofCard, setProofCard] = useState<ProofCardShape | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outfitPreviewImage, setOutfitPreviewImage] = useState<string | null>(null);
  const [bodyImage, setBodyImage] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(BODY_IMAGE_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [bodyBlob, setBodyBlob] = useState<Blob | null>(null);

  const groupedMatches = matchResult?.matches
    ? Object.entries(matchResult.matches).filter(([, items]) => items.length > 0)
    : [];

  const selectedOwnedItems = groupedMatches.flatMap(([, items]) => items.slice(0, 1)).map((item) => ({
      name: item.name,
      imageUrl: item.imageUrl,
      owned: true,
      category: item.category,
    }));

  const canBuildProofCard = selectedOwnedItems.length > 0 || Object.keys(selectedGapProducts).length > 0;

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

  async function handleOccasionSelect(occasion: OccasionOption) {
    if (!user?.id) {
      setError("Sign in to build an outfit.");
      return;
    }

    setSelectedOccasion(occasion);
    setProofCard(null);
    setError(null);
    setOutfitPreviewImage(null);
    setIsLoading(true);

    try {
      const userLocation = await resolveUserLocation(user.id);
      setLocation(userLocation);

      const [weatherInfo, match] = await Promise.all([
        weatherApi.current(userLocation),
        outfitApi.match({ user_id: user.id, occasion: occasion.value, location: userLocation }),
      ]);

      setWeather(weatherInfo);
      setMatchResult(match as MatchResponse);

      const gapList = ((match as MatchResponse).gaps ?? []).slice(0, 3);
      if (gapList.length > 0) {
        const productEntries = await Promise.allSettled(
          gapList.map(async (gap) => {
            const response = await productsApi.search(gap);
            return [gap, response.products.slice(0, 4)] as const;
          })
        );
        const nextProducts: Record<string, Product[]> = {};
        const nextStatuses: Record<string, string> = {};

        productEntries.forEach((entry, index) => {
          const gap = gapList[index];
          if (entry.status === "fulfilled") {
            nextProducts[gap] = entry.value[1];
            if (!entry.value[1].length) {
              nextStatuses[gap] = "No products came back for this gap yet. Try a broader query in Try-On Studio.";
            }
          } else {
            nextProducts[gap] = [];
            nextStatuses[gap] = "Product search is temporarily unavailable for this gap.";
          }
        });

        setGapProducts(nextProducts);
        setGapStatuses(nextStatuses);
      } else {
        setGapProducts({});
        setGapStatuses({});
      }
      setSelectedGapProducts({});
    } catch (loadError) {
      setError(formatApiError(loadError, "Unable to build your outfit right now."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTryLook() {
    if (!bodyBlob || groupedMatches.length === 0) {
      setError("Add a full-body image in Try-On Studio before previewing clothes from Outfit Builder.");
      return;
    }

    const topApparel = groupedMatches
      .flatMap(([, items]) => items)
      .find((item) => item.imageUrl && !["shoes", "accessory", "jewelry", "bag", "hat", "scarf", "belt"].includes(item.category.toLowerCase()));

    if (!topApparel?.imageUrl) {
      setError("No garment image is available to preview from this outfit.");
      return;
    }

    setIsTryingOn(true);
    setError(null);
    dispatch({ type: "SET_PROCESSING", payload: true });
    dispatch({ type: "SET_CURRENT_TOOL", payload: ToolName.TRY_ON_CLOTHES });

    try {
      const result = await vtoApi.clothes(bodyBlob, topApparel.imageUrl, inferGarmentCategory(topApparel.category));
      const imageUrl = extractImageUrl(result);
      if (!imageUrl) throw new Error("Try-on preview came back without an image.");

      dispatch({
        type: "SET_VTO_RESULT",
        payload: { imageUrl, toolName: ToolName.TRY_ON_CLOTHES, timestamp: Date.now() },
      });
      setOutfitPreviewImage(imageUrl);
      dispatch({ type: "SET_CURRENT_TOOL", payload: null });
    } catch (tryError) {
      dispatch({ type: "SET_PROCESSING", payload: false });
      dispatch({ type: "SET_CURRENT_TOOL", payload: null });
      setError(formatApiError(tryError, "Failed to preview this look."));
    } finally {
      setIsTryingOn(false);
    }
  }

  function handleSelectGapProduct(gap: string, product: Product) {
    setSelectedGapProducts((prev) => ({ ...prev, [gap]: product }));
  }

  async function handleTryGapProduct(product: Product) {
    if (!bodyBlob) {
      setError("Add a full-body image in Try-On Studio before previewing clothes from Outfit Builder.");
      return;
    }

    setIsTryingOn(true);
    setError(null);
    dispatch({ type: "SET_PROCESSING", payload: true });
    dispatch({ type: "SET_CURRENT_TOOL", payload: ToolName.TRY_ON_CLOTHES });

    try {
      const result = await vtoApi.clothes(bodyBlob, product.imageUrl, "upper");
      const imageUrl = extractImageUrl(result);
      if (!imageUrl) throw new Error("Product try-on did not return an image.");

      dispatch({
        type: "SET_VTO_RESULT",
        payload: { imageUrl, toolName: ToolName.TRY_ON_CLOTHES, timestamp: Date.now() },
      });
      setOutfitPreviewImage(imageUrl);
      dispatch({ type: "SET_CURRENT_TOOL", payload: null });
    } catch (tryError) {
      dispatch({ type: "SET_PROCESSING", payload: false });
      dispatch({ type: "SET_CURRENT_TOOL", payload: null });
      setError(formatApiError(tryError, "Failed to try on this product."));
    } finally {
      setIsTryingOn(false);
    }
  }

  async function handleBuildProofCard() {
    if (!user?.id || !selectedOccasion || !canBuildProofCard) return;

    setError(null);
    setIsLoading(true);

    try {
      const selectedItems = [
        ...selectedOwnedItems,
        ...Object.values(selectedGapProducts).map(productToSelectedItem),
      ];

      const result = await outfitApi.proofCard({
        user_id: user.id,
        look_name: `${selectedOccasion.title} Look`,
        selected_items: selectedItems,
        occasion: selectedOccasion.value,
        vto_image_url: outfitPreviewImage ?? undefined,
        weather: weather ? `${Math.round(weather.temp)}F ${weather.condition}` : matchResult?.context?.weather,
        season: matchResult?.context?.season,
      });

      setProofCard((result.card ?? null) as ProofCardShape | null);
    } catch (proofError) {
      setError(formatApiError(proofError, "Unable to build the proof card."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page-shell space-y-6">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-caps">Phase 6</p>
            <h1 className="mt-3 text-3xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Outfit Builder
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 sm:text-base" style={{ color: "var(--on-surface-variant)" }}>
              Pick the moment, pull weather-aware closet matches, fill the gaps, and turn the final outfit into a proof card.
            </p>
          </div>
          <Link href="/closet" className="btn-secondary">
            Manage Closet
          </Link>
        </div>
      </section>

      {error && (
        <div className="banner-error" role="alert">
          {error}
        </div>
      )}

      {!selfie && (
        <div className="banner-warn" role="status">
          Capture a selfie first if you want to build the outfit context and proof card.
        </div>
      )}

      {!bodyImage && (
        <div className="banner-warn" role="status">
          Clothes preview in Outfit Builder needs the same full-body image used by{" "}
          <Link href="/try-on" className="font-semibold underline decoration-[#fde68a]/80 underline-offset-2">
            Try-On Studio
          </Link>
          . Add it there before using clothes VTO here.
        </div>
      )}

      <section className="glass-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
              <Sparkles size={20} />
            </div>
          <div>
            <p className="label-caps">Step 1</p>
            <h2 className="text-2xl">Choose the occasion</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {OCCASIONS.map((occasion) => (
            <button
              key={occasion.title}
              type="button"
              onClick={() => void handleOccasionSelect(occasion)}
              className={`rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-0.5 ${selectedOccasion?.title === occasion.title ? "border-current bg-white/10" : "border-black/8 bg-white/70"}`}
              style={{ color: selectedOccasion?.title === occasion.title ? occasion.accent : "inherit" }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">{occasion.mood}</p>
              <h3 className="mt-3 text-lg font-semibold" style={{ color: "var(--on-surface)" }}>
                {occasion.title}
              </h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
                {occasion.subtitle}
              </p>
            </button>
          ))}
        </div>
      </section>

      {isLoading && (
        <section className="glass-card flex items-center gap-3 p-5">
          <LoaderCircle className="animate-spin" size={18} />
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            Loading weather, closet matches, and any missing pieces.
          </p>
        </section>
      )}

      {selectedOccasion && weather && (
        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <CloudSun size={20} className="text-sky-500" />
              <div>
                <p className="label-caps">Weather Context</p>
                <h2 className="mt-1 text-2xl">{location}</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
              {Math.round(weather.temp)}F, {weather.condition}, humidity {weather.humidity}%. {weather.aiTip}
            </p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <Shirt size={20} className="text-violet-500" />
              <div>
                <p className="label-caps">Match Context</p>
                <h2 className="mt-1 text-2xl capitalize">{matchResult?.context?.occasion ?? selectedOccasion.value}</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
              Season {matchResult?.context?.season ?? "current"} with {matchResult?.context?.color_analysis ?? "hybrid"} color logic.
            </p>
          </div>
        </section>
      )}

      {groupedMatches.length > 0 && (
        <section className="glass-card space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label-caps">Step 2</p>
              <h2 className="mt-2 text-2xl">Matched closet items</h2>
            </div>
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => void handleTryLook()} disabled={isTryingOn || !bodyBlob}>
              {isTryingOn ? "Trying On..." : "Try This Look"}
            </button>
          </div>

          <div className="space-y-6">
            {groupedMatches.map(([category, items]) => (
              <MatchGroup key={category} label={category} items={items} />
            ))}
          </div>
        </section>
      )}

      {(matchResult?.gaps?.length ?? 0) > 0 && (
        <section className="glass-card space-y-5 p-5 sm:p-6">
          <div>
            <p className="label-caps">Step 3</p>
            <h2 className="mt-2 text-2xl">Fill the gaps</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
              The matcher found a few missing pieces. Pick one if you want it included in the proof card.
            </p>
          </div>

          <div className="space-y-6">
            {matchResult?.gaps.map((gap) => (
              <div key={gap} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{gap}</h3>
                    <p className="mt-1 text-sm" style={{ color: "var(--on-surface-variant)" }}>
                      Shop options pulled from product search.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                  {gapStatuses[gap] && (gapProducts[gap] ?? []).length === 0 && (
                    <div className="min-w-full rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
                      {gapStatuses[gap]}
                    </div>
                  )}
                  {(gapProducts[gap] ?? []).map((product) => {
                    const isSelected = selectedGapProducts[gap]?.link === product.link;
                    return (
                      <article
                        key={`${gap}-${product.link}`}
                        className={`min-w-[220px] max-w-[220px] rounded-[1.4rem] border p-3 ${isSelected ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-white/10 bg-white/5"}`}
                      >
                        <div className="aspect-square overflow-hidden rounded-[1rem] bg-black/10">
                          <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                        </div>
                        <h4 className="mt-3 line-clamp-2 text-sm font-semibold">{product.title}</h4>
                        <div className="mt-2 flex items-center justify-between text-xs" style={{ color: "var(--on-surface-variant)" }}>
                          <span>{product.source}</span>
                          <span>{product.price}</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button type="button" className="btn-secondary flex-1 text-xs" onClick={() => handleSelectGapProduct(gap, product)}>
                            {isSelected ? "Selected" : "Add To Look"}
                          </button>
                          <button type="button" className="btn-primary text-xs" onClick={() => void handleTryGapProduct(product)} disabled={isTryingOn || !bodyBlob}>
                            Try On
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(groupedMatches.length > 0 || Object.keys(selectedGapProducts).length > 0) && (
        <section className="glass-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label-caps">Step 4</p>
              <h2 className="mt-2 text-2xl">Proof card</h2>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
                Turn your owned pieces and selected new items into a final approval card.
              </p>
              {!outfitPreviewImage && bodyImage && (
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
                  Build the proof card now, or run clothes preview first if you want the generated try-on image attached.
                </p>
              )}
            </div>
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => void handleBuildProofCard()} disabled={!canBuildProofCard || isLoading}>
              <Wand2 size={16} className="mr-2 inline" />
              See Proof Card
            </button>
          </div>

          {proofCard && (
            <div className="mt-6">
              <ProofCard card={proofCard} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
