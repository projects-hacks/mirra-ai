"use client";

import { ExternalLink, Search } from "lucide-react";
import type { Product } from "@/types";
import type { ProductRecommendationGroup } from "@/hooks/useSkinAnalysis";

interface ProductRecommendationsProps {
  groups: ProductRecommendationGroup[];
  isLoading?: boolean;
}

function ProductCard({ product }: Readonly<{ product: Product }>) {
  return (
    <a
      href={product.link}
      target="_blank"
      rel="noreferrer"
      className="group flex min-w-[220px] max-w-[240px] shrink-0 flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_10px_24px_rgba(17,24,39,0.06)]"
    >
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrl} alt={product.title} className="aspect-square w-full bg-[#f8fafc] object-cover" loading="lazy" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-[#f8fafc] text-[#64748b]">
          <Search size={28} aria-hidden="true" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-5">{product.title}</p>
        <p className="mt-2 text-xs" style={{ color: "var(--on-surface-variant)" }}>
          {product.source}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-sm font-semibold">{product.price}</span>
          <ExternalLink size={15} className="text-[#64748b] transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
        </div>
      </div>
    </a>
  );
}

export default function ProductRecommendations({ groups, isLoading = false }: Readonly<ProductRecommendationsProps>) {
  return (
    <section className="rounded-[1.25rem] border border-black/8 bg-white/78 p-5 shadow-[0_14px_34px_rgba(17,24,39,0.07)] backdrop-blur">
      <div>
        <p className="label-caps">Products</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Targeted recommendations</h2>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--on-surface-variant)" }}>
          Live shopping results are matched to your lowest skin scores.
        </p>
      </div>

      {isLoading ? (
        <p className="mt-5 rounded-2xl border border-black/6 bg-[#f8fafc] p-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
          Searching product results...
        </p>
      ) : groups.length ? (
        <div className="mt-5 space-y-5">
          {groups.map((group) => (
            <div key={group.concern.key}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{group.concern.label}</p>
                  <p className="text-xs" style={{ color: "var(--on-surface-muted)" }}>
                    Query: {group.query}
                  </p>
                </div>
                <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-medium">
                  {group.concern.score}/100
                </span>
              </div>
              {group.products.length ? (
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                  {group.products.map((product) => (
                    <ProductCard key={`${group.concern.key}-${product.link}-${product.title}`} product={product} />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-black/6 bg-[#f8fafc] p-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
                  No live product results came back for this concern.
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-black/6 bg-[#f8fafc] p-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
          Product recommendations appear after your scan scores load.
        </p>
      )}
    </section>
  );
}
