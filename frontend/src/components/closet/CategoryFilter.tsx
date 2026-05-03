"use client";

import { memo, useCallback } from "react";
import { throttle } from "@/lib/retry";

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

/**
 * Category Filter Component
 * Horizontal scrollable filter chips for closet categories
 * Optimized with throttling to prevent excessive re-renders
 */
const CategoryFilter = memo(function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  // Throttle category changes to prevent rapid-fire updates
  const handleCategoryChange = useCallback(
    throttle((category: string) => {
      onCategoryChange(category);
    }, 300),
    [onCategoryChange]
  );
  return (
    <div className="flex gap-4 mb-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
      {categories.map((category) => {
        const isActive = category === activeCategory;
        return (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`px-6 py-2 rounded-full font-label-caps text-label-caps whitespace-nowrap transition-all ${
              isActive ? "" : "glass-panel"
            }`}
            style={
              isActive
                ? {
                    background: "var(--primary)",
                    color: "var(--on-primary)",
                  }
                : {
                    color: "var(--primary)",
                  }
            }
          >
            {category}
          </button>
        );
      })}
    </div>
  );
});

export default CategoryFilter;
