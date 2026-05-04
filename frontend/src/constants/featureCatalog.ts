/* ── Feature Catalog ── */

import {
  Sparkles,
  Palette,
  ScanFace,
  Shirt,
  Circle,
  Gem,
  Scissors,
  Search,
  Cloud,
  Calendar,
  Shuffle,
  FileCheck,
} from "lucide-react";
import { ToolName } from "@/lib/constants";
import { FeatureCategory, type FeatureConfig } from "@/types/features";

/**
 * Complete catalog of all 13 available features
 * Organized by category for menu display
 */
export const FEATURE_CATALOG: FeatureConfig[] = [
  // ── Beauty Analysis ──────────────────────────────
  {
    tool: ToolName.ANALYZE_SKIN,
    icon: Sparkles,
    label: "Analyze Skin",
    description: "Get detailed skin analysis",
    category: FeatureCategory.BEAUTY_ANALYSIS,
    requiresParams: false,
  },
  {
    tool: ToolName.ANALYZE_SKIN_TONE,
    icon: Palette,
    label: "Detect Skin Tone",
    description: "Find your skin tone and undertone",
    category: FeatureCategory.BEAUTY_ANALYSIS,
    requiresParams: false,
  },
  {
    tool: ToolName.ANALYZE_FACE,
    icon: ScanFace,
    label: "Face Attributes",
    description: "Analyze facial features",
    category: FeatureCategory.BEAUTY_ANALYSIS,
    requiresParams: false,
  },

  // ── Virtual Try-On ───────────────────────────────
  {
    tool: ToolName.TRY_ON_CLOTHES,
    icon: Shirt,
    label: "Try On Clothes",
    description: "Virtual clothing try-on",
    category: FeatureCategory.VIRTUAL_TRY_ON,
    requiresParams: true,
  },
  {
    tool: ToolName.TRY_ON_MAKEUP,
    icon: Sparkles,
    label: "Try On Makeup",
    description: "Virtual makeup application",
    category: FeatureCategory.VIRTUAL_TRY_ON,
    requiresParams: false,
  },
  {
    tool: ToolName.TRY_ON_EARRINGS,
    icon: Circle,
    label: "Try On Earrings",
    description: "Virtual earring try-on",
    category: FeatureCategory.VIRTUAL_TRY_ON,
    requiresParams: true,
  },
  {
    tool: ToolName.TRY_ON_NECKLACE,
    icon: Gem,
    label: "Try On Necklace",
    description: "Virtual necklace try-on",
    category: FeatureCategory.VIRTUAL_TRY_ON,
    requiresParams: true,
  },
  {
    tool: ToolName.CHANGE_HAIRSTYLE,
    icon: Scissors,
    label: "Change Hairstyle",
    description: "Virtual hairstyle try-on",
    category: FeatureCategory.VIRTUAL_TRY_ON,
    requiresParams: true,
  },

  // ── Shopping ─────────────────────────────────────
  {
    tool: ToolName.SEARCH_PRODUCTS,
    icon: Search,
    label: "Search Products",
    description: "Find beauty products",
    category: FeatureCategory.SHOPPING,
    requiresParams: true,
  },

  // ── Context ──────────────────────────────────────
  {
    tool: ToolName.CHECK_WEATHER,
    icon: Cloud,
    label: "Check Weather",
    description: "Get weather for outfit planning",
    category: FeatureCategory.CONTEXT,
    requiresParams: false,
  },
  {
    tool: ToolName.CHECK_CALENDAR,
    icon: Calendar,
    label: "Check Calendar",
    description: "View upcoming events",
    category: FeatureCategory.CONTEXT,
    requiresParams: false,
  },

  // ── Closet ───────────────────────────────────────
  {
    tool: ToolName.MATCH_CLOSET,
    icon: Shuffle,
    label: "Match Closet",
    description: "Find matching outfits",
    category: FeatureCategory.CLOSET,
    requiresParams: false,
  },
  {
    tool: ToolName.GENERATE_PROOF_CARD,
    icon: FileCheck,
    label: "Generate Proof Card",
    description: "Create outfit proof card",
    category: FeatureCategory.CLOSET,
    requiresParams: false,
  },
];

/**
 * Get features by category
 */
export function getFeaturesByCategory(category: FeatureCategory): FeatureConfig[] {
  return FEATURE_CATALOG.filter((feature) => feature.category === category);
}

/**
 * Get all unique categories in order
 */
export function getAllCategories(): FeatureCategory[] {
  return [
    FeatureCategory.BEAUTY_ANALYSIS,
    FeatureCategory.VIRTUAL_TRY_ON,
    FeatureCategory.SHOPPING,
    FeatureCategory.CONTEXT,
    FeatureCategory.CLOSET,
  ];
}
