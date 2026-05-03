/* ── Feature Types ── */

import type { LucideIcon } from "lucide-react";
import { ToolName } from "@/lib/constants";

/**
 * Feature category for grouping related features
 */
export enum FeatureCategory {
  BEAUTY_ANALYSIS = "Beauty Analysis",
  VIRTUAL_TRY_ON = "Virtual Try-On",
  SHOPPING = "Shopping",
  CONTEXT = "Context",
  CLOSET = "Closet",
}

/**
 * Configuration for a single feature in the menu
 */
export interface FeatureConfig {
  tool: ToolName;
  icon: LucideIcon;
  label: string;
  description: string;
  category: FeatureCategory;
  requiresParams: boolean;
}

/**
 * Parameter field configuration for features requiring input
 */
export interface ParameterField {
  name: string;
  type: "url" | "text";
  label: string;
  placeholder: string;
  required: boolean;
}

/**
 * Parameter configuration for a tool
 */
export interface ParameterConfig {
  fields: ParameterField[];
}
