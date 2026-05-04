/* ── Parameter Configurations ── */

import { ToolName } from "@/lib/constants";
import type { ParameterConfig } from "@/types/features";

/**
 * Parameter configurations for features requiring user input
 * Maps tool names to their required parameter fields
 */
export const PARAMETER_CONFIGS: Partial<Record<ToolName, ParameterConfig>> = {
  [ToolName.TRY_ON_CLOTHES]: {
    fields: [
      {
        name: "garment_url",
        type: "url",
        label: "Garment Image URL",
        placeholder: "https://example.com/image.jpg",
        required: true,
      },
    ],
  },
  [ToolName.TRY_ON_EARRINGS]: {
    fields: [
      {
        name: "earring_url",
        type: "url",
        label: "Earring Image URL",
        placeholder: "https://example.com/earrings.jpg",
        required: true,
      },
    ],
  },
  [ToolName.TRY_ON_NECKLACE]: {
    fields: [
      {
        name: "necklace_url",
        type: "url",
        label: "Necklace Image URL",
        placeholder: "https://example.com/necklace.jpg",
        required: true,
      },
    ],
  },
  [ToolName.CHANGE_HAIRSTYLE]: {
    fields: [
      {
        name: "ref_hair_url",
        type: "url",
        label: "Hairstyle Image URL",
        placeholder: "https://example.com/hairstyle.jpg",
        required: true,
      },
    ],
  },
  [ToolName.SEARCH_PRODUCTS]: {
    fields: [
      {
        name: "query",
        type: "text",
        label: "Search Query",
        placeholder: "red lipstick",
        required: true,
      },
    ],
  },
  [ToolName.CHECK_WEATHER]: {
    fields: [
      {
        name: "location",
        type: "text",
        label: "Location",
        placeholder: "San Francisco, CA",
        required: false,
      },
    ],
  },
};
