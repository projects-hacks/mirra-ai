"use client";

import ProductCard from "./ProductCard";

interface ProductRowProps {
  products: Array<{
    title: string;
    price: string;
    source: string;
    link: string;
    imageUrl: string;
    rating?: number;
  }>;
  onTryOn?: (imageUrl: string) => void;
}

/**
 * Horizontal scrollable row of product cards
 * Used for search results and recommendations
 */
export default function ProductRow({ products, onTryOn }: ProductRowProps) {
  if (!products || products.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto float-in" style={{ scrollbarWidth: "none" }}>
      <div className="flex gap-3 px-1 pb-2">
        {products.map((product, i) => (
          <ProductCard
            key={i}
            product={product}
            onTryOn={onTryOn}
          />
        ))}
      </div>
    </div>
  );
}
