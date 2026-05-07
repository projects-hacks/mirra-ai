import type { Product } from "@/types";

/** Serper / CDNs often return protocol-relative image URLs. */
export function normalizeHttpUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

/**
 * Best URL to send as ``garment_url`` for clothes VTO: product image when https,
 * otherwise product page (backend resolver may extract og:image).
 */
export function productGarmentRef(product: Product): string {
  const img = normalizeHttpUrl(product.imageUrl || "");
  if (img.startsWith("http://") || img.startsWith("https://")) {
    return img;
  }
  return normalizeHttpUrl(product.link || "");
}

export function productGarmentRefIsUsable(product: Product): boolean {
  return Boolean(productGarmentRef(product));
}
