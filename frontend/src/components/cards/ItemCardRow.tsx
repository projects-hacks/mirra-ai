/* eslint-disable @next/next/no-img-element */
"use client";

import { Shirt } from "lucide-react";

interface RowItem {
  id?: string;
  source?: string;
  owned?: boolean;
  name?: string;
  title?: string;
  image_url?: string;
  imageUrl?: string;
  price?: string | number;
  purchase_price?: string | number;
}

function getItems(data: unknown): RowItem[] {
  if (Array.isArray(data)) {
    return data as RowItem[];
  }

  if (data && typeof data === "object" && "items" in data) {
    const items = (data as { items?: unknown }).items;
    return Array.isArray(items) ? (items as RowItem[]) : [];
  }

  return [];
}

/** Horizontal scrollable row of product/closet item cards. */
export default function ItemCardRow({ data }: Readonly<{ data: unknown }>) {
  const items = getItems(data);

  if (items.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto float-in" style={{ scrollbarWidth: "none" }}>
      <div className="flex gap-3 px-1 pb-2">
        {items.map((item) => (
          <div
            key={
              item.id ||
              `${item.source ?? "item"}-${item.name ?? item.title ?? "unknown"}-${item.image_url ?? item.imageUrl ?? "na"}`
            }
            className="item-card"
          >
            {item.image_url || item.imageUrl ? (
              <img
                src={item.image_url ?? item.imageUrl}
                alt={item.name ?? item.title ?? "Item"}
                loading="lazy"
              />
            ) : (
              <div
                className="w-full h-[160px] flex items-center justify-center"
                style={{ background: "var(--surface-container)", color: "var(--on-surface-variant)" }}
              >
                <Shirt size={34} aria-hidden="true" />
              </div>
            )}
            <div className="item-info">
              <div className="item-name truncate-2">
                {item.name ?? item.title ?? "Item"}
              </div>
              <div className="item-meta">
                {item.source === "closet" || item.owned ? (
                  <span className="owned-badge">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Owned
                  </span>
                ) : (
                  item.price ?? item.purchase_price ?? ""
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
