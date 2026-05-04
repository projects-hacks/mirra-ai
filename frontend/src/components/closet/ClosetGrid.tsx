"use client";

import { useState, useMemo, memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ClosetItemCard from "./ClosetItemCard";
import CategoryFilter from "./CategoryFilter";

interface ClosetGridProps {
  items: Array<{
    id: string;
    name: string;
    category: string;
    color: string;
    imageUrl: string;
    brand?: string;
    purchasePrice?: number;
  }>;
  onAddItem?: () => void;
  onSelectItem?: (item: any) => void;
}

/**
 * Closet Grid Component
 * Bento grid layout for closet items with category filtering
 * Optimized with virtualization for large lists (100+ items)
 */
const ClosetGrid = memo(function ClosetGrid({
  items,
  onAddItem,
  onSelectItem,
}: ClosetGridProps) {
  const [activeCategory, setActiveCategory] = useState("All Items");
  const parentRef = useRef<HTMLDivElement>(null);

  // Extract unique categories (memoized)
  const categories = useMemo(() => {
    const cats = new Set(items.map((item) => item.category));
    return ["All Items", ...Array.from(cats).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  // Filter items by category (memoized)
  const filteredItems = useMemo(() => {
    if (activeCategory === "All Items") {
      return items;
    }
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  // Use virtualization only for large lists (>50 items)
  const useVirtualization = filteredItems.length > 50;

  // Setup virtualizer for grid (4 columns)
  const columnCount = 4;
  const rowCount = Math.ceil(filteredItems.length / columnCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // Estimated row height
    overscan: 2, // Render 2 extra rows for smooth scrolling
    enabled: useVirtualization,
  });

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="font-h1 text-h1 mb-2"
          style={{ color: "var(--primary)" }}
        >
          Digital Closet
        </h1>
        <p
          className="font-body-lg text-body-lg max-w-2xl"
          style={{ color: "var(--on-surface-variant)" }}
        >
          Manage your collection. Mix, match, and discover new combinations with
          your curated items.
        </p>
      </div>

      {/* Category Filters */}
      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Grid with Virtualization */}
      {filteredItems.length > 0 ? (
        <div
          ref={parentRef}
          className="h-[calc(100vh-300px)] overflow-auto"
          style={{ contain: "strict" }}
        >
          {useVirtualization ? (
            // Virtualized grid for large lists
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const startIdx = virtualRow.index * columnCount;
                const rowItems = filteredItems.slice(
                  startIdx,
                  startIdx + columnCount
                );

                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {rowItems.map((item) => (
                        <ClosetItemCard
                          key={item.id}
                          item={item}
                          onSelect={onSelectItem}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Regular grid for small lists
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <ClosetItemCard
                  key={item.id}
                  item={item}
                  onSelect={onSelectItem}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="text-center py-16"
          style={{ color: "var(--on-surface-variant)" }}
        >
          <span className="material-symbols-outlined text-[64px] opacity-30 mb-4">
            checkroom
          </span>
          <p className="text-lg">No items in this category</p>
          <p className="text-sm mt-2">
            {activeCategory === "All Items"
              ? "Add items to your closet to get started"
              : "Try selecting a different category"}
          </p>
        </div>
      )}

      {/* FAB */}
      {onAddItem && (
        <button
          onClick={onAddItem}
          className="fixed bottom-24 md:bottom-8 right-6 z-40 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300 border border-white/20"
          style={{
            background: "var(--primary)",
            color: "var(--on-primary)",
          }}
        >
          <span className="material-symbols-outlined text-[28px]">
            add_a_photo
          </span>
        </button>
      )}
    </div>
  );
});

export default ClosetGrid;
