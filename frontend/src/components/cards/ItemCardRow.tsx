"use client";

/** Horizontal scrollable row of product/closet item cards. */
export default function ItemCardRow({ data }: Readonly<{ data: unknown }>) {
  // Parse items from tool result data
  const items = Array.isArray(data) ? data : (data as any)?.items ?? [];

  if (items.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto float-in" style={{ scrollbarWidth: "none" }}>
      <div className="flex gap-3 px-1 pb-2">
        {items.map((item: any) => (
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
                className="w-full h-[160px] flex items-center justify-center text-3xl"
                style={{ background: "var(--surface-container)" }}
              >
                👔
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
