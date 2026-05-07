"use client";

import { useState, useMemo, memo, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownUp, Camera, Plus, Search, SearchX, Shirt, SlidersHorizontal } from "lucide-react";
import ClosetItemCard from "./ClosetItemCard";
import CategoryFilter from "./CategoryFilter";
import { getAllOccasions, getAllSeasons, FORMALITY_MIN, FORMALITY_MAX } from "@/lib/closet-constants";

interface ClosetGridProps {
  items: ClosetGridItem[];
  onAddItem?: () => void;
  onSelectItem?: (item: ClosetGridItem) => void;
  selectionMode?: boolean;
  selectedItems?: Set<string>;
  onToggleSelect?: (itemId: string) => void;
}

interface ClosetGridItem {
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
}

type SortOption = "recent" | "worn" | "cpw" | "alpha" | "most_worn";

const SORT_OPTIONS: readonly SortOption[] = ["recent", "worn", "cpw", "alpha", "most_worn"];

function isSortOption(value: string): value is SortOption {
  return (SORT_OPTIONS as readonly string[]).includes(value);
}

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
  const [columnCount, setColumnCount] = useState(4);

  // Load preferences from session storage
  useEffect(() => {
    try {
      const savedSort = sessionStorage.getItem("closet_sort");
      const savedFilters = sessionStorage.getItem("closet_filters");

      if (savedSort && isSortOption(savedSort)) {
        setSortBy(savedSort);
      }

      if (savedFilters) {
        const parsed: unknown = JSON.parse(savedFilters);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const o = parsed as Partial<FilterState>;
          setFilters((prev) => ({
            color: typeof o.color === "string" ? o.color : prev.color,
            occasion: typeof o.occasion === "string" ? o.occasion : prev.occasion,
            season: typeof o.season === "string" ? o.season : prev.season,
            formalityMin:
              typeof o.formalityMin === "number" && !Number.isNaN(o.formalityMin)
                ? o.formalityMin
                : prev.formalityMin,
            formalityMax:
              typeof o.formalityMax === "number" && !Number.isNaN(o.formalityMax)
                ? o.formalityMax
                : prev.formalityMax,
          }));
        }
      }
    } catch {
      /* ignore corrupt or legacy sessionStorage */
    }
  }, []);

  useEffect(() => {
    const syncColumns = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setColumnCount(1);
      } else if (width < 1024) {
        setColumnCount(3);
      } else {
        setColumnCount(4);
      }
    };

    syncColumns();
    window.addEventListener("resize", syncColumns);
    return () => window.removeEventListener("resize", syncColumns);
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

  // Setup virtualizer for responsive grid
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
      {/* Category Filters */}
      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Search and Sort Controls */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search
            size={18}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--on-surface-variant)" }}
          />
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
        <div className="relative min-w-[200px] lg:w-[240px]">
          <ArrowDownUp
            size={18}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--on-surface-variant)" }}
          />
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
          <SlidersHorizontal size={18} aria-hidden="true" />
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          className={useVirtualization ? "overflow-auto" : ""}
          style={useVirtualization ? { contain: "strict", maxHeight: "min(70vh, calc(100dvh - 20rem))" } : undefined}
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
                    <div
                      className="grid gap-4"
                      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
                    >
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
            <div
              className="grid gap-4 sm:gap-5"
              style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
            >
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
          className="mx-auto flex max-w-xl flex-col items-center rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-6 py-12 text-center shadow-[0_18px_60px_rgba(2,6,23,0.18)]"
          style={{ color: "var(--on-surface-variant)" }}
        >
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-container)] text-[var(--primary)]">
            {hasActiveFilters ? <SearchX size={26} aria-hidden="true" /> : <Shirt size={26} aria-hidden="true" />}
          </div>
          <p className="text-lg font-semibold" style={{ color: "var(--on-surface)" }}>
            {hasActiveFilters ? "No items match your filters" : "Your closet is empty"}
          </p>
          <p className="mt-2 text-sm">
            {hasActiveFilters
              ? "Try adjusting your search or filters"
              : activeCategory === "All Items"
              ? "Add a photo to start building outfits and recommendations."
              : "Try selecting a different category"}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={handleClearFilters}
              className="mt-5 inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 hover:bg-white/10"
              style={{ color: "var(--primary)" }}
            >
              Clear all filters
            </button>
          ) : (
            onAddItem && (
              <button
                onClick={onAddItem}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(139,92,246,0.28)] transition-transform hover:-translate-y-0.5"
              >
                <Camera size={16} aria-hidden="true" />
                Add photo
              </button>
            )
          )}
        </div>
      )}

      {/* Compact mobile add affordance */}
      {onAddItem && (
        <button
          onClick={onAddItem}
          className="fixed right-4 z-[var(--z-nav)] inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold shadow-lg transition-transform duration-300 hover:scale-105 sm:hidden"
          style={{
            background: "var(--primary)",
            color: "var(--on-primary)",
            bottom: "calc(var(--nav-height) + var(--safe-bottom) + 0.85rem)",
          }}
          aria-label="Add closet photo"
        >
          <Plus size={18} aria-hidden="true" />
          Add
        </button>
      )}
    </div>
  );
});

export default ClosetGrid;
