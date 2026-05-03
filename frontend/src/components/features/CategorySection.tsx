"use client";

import { memo } from "react";
import { ToolName } from "@/lib/constants";
import type { FeatureConfig } from "@/types/features";
import FeatureButton from "./FeatureButton";

interface CategorySectionProps {
  title: string;
  features: FeatureConfig[];
  isLoading: (tool: ToolName) => boolean;
  onFeatureClick: (tool: ToolName, requiresParams: boolean) => void;
}

/**
 * Groups related features under a category header
 * Responsive grid: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
 */
const CategorySection = memo(function CategorySection({
  title,
  features,
  isLoading,
  onFeatureClick,
}: CategorySectionProps) {
  if (features.length === 0) return null;

  return (
    <div role="group" aria-labelledby={`category-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      {/* Category Header */}
      <h3
        id={`category-${title.toLowerCase().replace(/\s+/g, "-")}`}
        className="label-caps mb-3"
      >
        {title}
      </h3>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => (
          <FeatureButton
            key={feature.tool}
            icon={feature.icon}
            label={feature.label}
            description={feature.description}
            isLoading={isLoading(feature.tool)}
            isDisabled={false}
            onClick={() => onFeatureClick(feature.tool, feature.requiresParams)}
          />
        ))}
      </div>
    </div>
  );
});

export default CategorySection;
