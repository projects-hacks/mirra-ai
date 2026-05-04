"use client";

import { useState, useMemo, memo, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ClosetItemCard from "./ClosetItemCard";
import CategoryFilter from "./CategoryFilter";
import { getAllOccasions, getAllSeasons, FORMALITY_MIN, FORMALITY_MAX } from "@/lib/closet-constants";

interface ClosetGridProps {
  items: Array<{
    id: string;
    name: string;
    category: string;
    color: string;
    imageUrl: string;
    brand?: string;
    purchasePrice?: number;
    timesWorn?: number;
    lastWorn?: string;
    occasions?: string[];
    seasons?: string[];
    formality?: number;
    createdAt?: string;
  }>;
  onAddItem?: () => void;
  onSelectItem?: (item: any) => void;
  selectionMode?: boolean;
  selectedItems?: Set<string>;
  onToggleSelect?: (itemId: string) => void;
}

type SortOption = "recent" | "worn" | "cpw" | "alpha" | "most_worn";

interface FilterState {
  color: string;
  occasion: string;
  season: string;
  formalityMin: number;
  formalityMax: number;
}

/**
 * Closet Grid Component
 * Bento grid layout for closet items with search, filtering, and sorting
 * Optimized with virtualization for large lists (100+ items)
 */
const ClosetGrid = memo(function ClosetGrid({
  items,
  onAddItem,
  onSelectItem,
  selectionMode = false,
  selectedItems = new Set(),
  onToggleSelect,
}: ClosetGridProps) {
  const [activeCategory, setActiveCategory] = useState("All Items");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    color: "",
    occasion: "",
    season: "",
    formalityMin: FORMALITY_MIN,
    formalityMax: FORMALITY_MAX,
  });
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Load preferences from session storage
  useEffect(() => {
    const savedSort = sessionStorage.getItem("closet_sort");
    const savedFilters = sessionStorage.getItem("closet_filters");
    
    if (savedSort) setSortBy(savedSort as SortOption);
    if (savedFilters) setFilters(JSON.parse(savedFilters));
  }, []);

  // Save preferences to session storage
  useEffect(() => {
    sessionStorage.setItem("closet_sort", sortBy);
    sessionStorage.setItem("closet_filters", JSON.stringify(filters));
  }, [sortBy, filters]);

  // Extract unique categories, colors (memoized)
  const { categories, colors } = useMemo(() => {
    const cats = new Set(items.map((item) => item.category));
    const cols = new Set(items.map((item) => item.color));
    return {
      categories: ["All Items", ...Array.from(cats).sort((a, b) => a.localeCompare(b))],
      colors: Array.from(cols).sort((a, b) => a.localeCompare(b)),
    };
  }, [items]);

  // Filter and search items (memoized)
  const filteredItems = useMemo(() => {
    let result = items;

    // Apply category filter
    if (activeCategory !== "All Items") {
      result = result.filter((item) => item.category === activeCategory);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query) ||
          item.color.toLowerCase().includes(query)
      );
    }

    // Apply advanced filters
    if (filters.color) {
      result = result.filter((item) => item.color === filters.color);
    }
    if (filters.occasion) {
      result = result.filter((item) =>
        item.occasions?.includes(filters.occasion)
      );
    }
    if (filters.season) {
      result = result.filter((item) => item.seasons?.includes(filters.season));
    }
    if (
      filters.formalityMin !== FORMALITY_MIN ||
      filters.formalityMax !== FORMALITY_MAX
    ) {
      result = result.filter(
        (item) =>
          item.formality !== undefined &&
          item.formality >= filters.formalityMin &&
          item.formality <= filters.formalityMax
      );
    }

    return result;
  }, [items, activeCategory, searchQuery, filters]);

  // Sort filtered items (memoized)
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];

    switch (sortBy) {
      case "recent":
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        break;
      case "worn":
        sorted.sort((a, b) => {
          const aDate = a.lastWorn ? new Date(a.lastWorn).getTime() : 0;
          const bDate = b.lastWorn ? new Date(b.lastWorn).getTime() : 0;
          return bDate - aDate;
        });
        break;
      case "most_worn":
        sorted.sort((a, b) => (b.timesWorn || 0) - (a.timesWorn || 0));
        break;
      case "cpw":
        sorted.sort((a, b) => {
          const aCpw =
            a.purchasePrice && a.timesWorn
              ? a.purchasePrice / a.timesWorn
              : Infinity;
          const bCpw =
            b.purchasePrice && b.timesWorn
              ? b.purchasePrice / b.timesWorn
              : Infinity;
          return aCpw - bCpw;
        });
        break;
      case "alpha":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return sorted;
  }, [filteredItems, sortBy]);

  // Use virtualization only for large lists (>50 items)
  const useVirtualization = sortedItems.length > 50;

  // Setup virtualizer for grid (4 columns)
  const columnCount = 4;
  const rowCount = Math.ceil(sortedItems.length / columnCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // Estimated row height
    overscan: 2, // Render 2 extra rows for smooth scrolling
    enabled: useVirtualization,
  });

  // Clear all filters handler
  const handleClearFilters = () => {
    setFilters({
      color: "",
      occasion: "",
      season: "",
      formalityMin: FORMALITY_MIN,
      formalityMax: FORMALITY_MAX,
    });
    setSearchQuery("");
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery.trim() ||
    filters.color ||
    filters.occasion ||
    filters.season ||
    filters.formalityMin !== FORMALITY_MIN ||
    filters.formalityMax !== FORMALITY_MAX;

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

      {/* Search and Sort Controls */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px]"
            style={{ color: "var(--on-surface-variant)" }}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Search by name, brand, or color..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm font-body-md text-body-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/20"
            style={{ color: "var(--on-surface)" }}
          />
        </div>

        {/* Sort Dropdown */}
        <div className="relative min-w-[200px]">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px]"
            style={{ color: "var(--on-surface-variant)" }}
          >
            sort
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm font-body-md text-body-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
            style={{ color: "var(--on-surface)" }}
          >
            <option value="recent">Recently Added</option>
            <option value="worn">Recently Worn</option>
            <option value="most_worn">Most Worn</option>
            <option value="cpw">Best Value (CPW)</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm font-body-md text-body-md transition-all duration-300 hover:bg-white/10 flex items-center gap-2"
          style={{ color: "var(--on-surface)" }}
        >
          <span className="material-symbols-outlined text-[20px]">
            tune
          </span>
          <span>Filters</span>
          {hasActiveFilters && (
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--primary)" }}
            />
          )}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3
              className="font-h3 text-h3"
              style={{ color: "var(--on-surface)" }}
            >
              Advanced Filters
            </h3>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-1.5 rounded-lg text-sm transition-all duration-300 hover:bg-white/10"
                style={{ color: "var(--primary)" }}
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Color Filter */}
            <div>
              <label
                className="block mb-2 font-body-sm text-body-sm"
                style={{ color: "var(--on-surface-variant)" }}
              >
                Color
              </label>
              <select
                value={filters.color}
                onChange={(e) =>
                  setFilters({ ...filters, color: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm font-body-md text-body-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/20"
                style={{ color: "var(--on-surface)" }}
              >
                <option value="">All Colors</option>
                {colors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>

            {/* Occasion Filter */}
            <div>
              <label
                className="block mb-2 font-body-sm text-body-sm"
                style={{ color: "var(--on-surface-variant)" }}
              >
                Occasion
              </label>
              <select
                value={filters.occasion}
                onChange={(e) =>
                  setFilters({ ...filters, occasion: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm font-body-md text-body-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/20"
                style={{ color: "var(--on-surface)" }}
              >
                <option value="">All Occasions</option>
                {getAllOccasions().map((occasion) => (
                  <option key={occasion} value={occasion}>
                    {occasion.charAt(0).toUpperCase() + occasion.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Season Filter */}
            <div>
              <label
                className="block mb-2 font-body-sm text-body-sm"
                style={{ color: "var(--on-surface-variant)" }}
              >
                Season
              </label>
              <select
                value={filters.season}
                onChange={(e) =>
                  setFilters({ ...filters, season: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm font-body-md text-body-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/20"
                style={{ color: "var(--on-surface)" }}
              >
                <option value="">All Seasons</option>
                {getAllSeasons().map((season) => (
                  <option key={season} value={season}>
                    {season.charAt(0).toUpperCase() + season.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Formality Range */}
            <div>
              <label
                className="block mb-2 font-body-sm text-body-sm"
                style={{ color: "var(--on-surface-variant)" }}
              >
                Formality: {filters.formalityMin.toFixed(1)} -{" "}
                {filters.formalityMax.toFixed(1)}
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min={FORMALITY_MIN}
                  max={FORMALITY_MAX}
                  step="0.1"
                  value={filters.formalityMin}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      formalityMin: parseFloat(e.target.value),
                    })
                  }
                  className="flex-1"
                />
                <input
                  type="range"
                  min={FORMALITY_MIN}
                  max={FORMALITY_MAX}
                  step="0.1"
                  value={filters.formalityMax}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      formalityMax: parseFloat(e.target.value),
                    })
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      {(hasActiveFilters || activeCategory !== "All Items") && (
        <div
          className="mb-4 font-body-sm text-body-sm"
          style={{ color: "var(--on-surface-variant)" }}
        >
          Showing {sortedItems.length} of {items.length} items
        </div>
      )}

      {/* Grid with Virtualization */}
      {sortedItems.length > 0 ? (
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
                const rowItems = sortedItems.slice(
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
                          selectionMode={selectionMode}
                          isSelected={selectedItems.has(item.id)}
                          onToggleSelect={onToggleSelect}
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
              {sortedItems.map((item) => (
                <ClosetItemCard
                  key={item.id}
                  item={item}
                  onSelect={onSelectItem}
                  selectionMode={selectionMode}
                  isSelected={selectedItems.has(item.id)}
                  onToggleSelect={onToggleSelect}
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
            {hasActiveFilters ? "search_off" : "checkroom"}
          </span>
          <p className="text-lg">
            {hasActiveFilters ? "No items match your filters" : "No items in this category"}
          </p>
          <p className="text-sm mt-2">
            {hasActiveFilters
              ? "Try adjusting your search or filters"
              : activeCategory === "All Items"
              ? "Add items to your closet to get started"
              : "Try selecting a different category"}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 rounded-lg transition-all duration-300 hover:bg-white/10"
              style={{ color: "var(--primary)" }}
            >
              Clear all filters
            </button>
          )}
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
