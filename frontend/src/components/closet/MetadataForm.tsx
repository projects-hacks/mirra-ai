/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useCallback } from "react";
import {
  getAllCategories,
  getAllOccasions,
  getAllSeasons,
  FORMALITY_DEFAULT,
} from "@/lib/closet-constants";
import { capitalize } from "@/utils/string";

interface MetadataFormProps {
  isOpen: boolean;
  imageUrl: string | null;
  initialMetadata: ExtractedMetadata | null;
  onSubmit: (metadata: ClosetItemMetadata) => void;
  onCancel: () => void;
}

interface ExtractedMetadata {
  category: string;
  subcategory?: string;
  primary_color: string;
  color_hex: string;
  secondary_colors?: string[];
  brand?: string;
  material?: string;
  pattern?: string;
  formality?: number;
  occasions?: string[];
  seasons?: string[];
  confidence_scores?: Record<string, number>;
}

export interface ClosetItemMetadata {
  name: string;
  category: string;
  subcategory?: string;
  color: string;
  color_hex: string;
  brand?: string;
  material?: string;
  pattern?: string;
  formality?: number;
  occasions: string[];
  seasons: string[];
  price?: number;
  purchase_date?: string;
  notes?: string;
}

// Get constants
const CATEGORIES = getAllCategories();
const OCCASIONS = getAllOccasions();
const SEASONS = getAllSeasons();

function createInitialFormData(
  initialMetadata: ExtractedMetadata | null
): ClosetItemMetadata {
  if (!initialMetadata) {
    return {
      name: "",
      category: "",
      color: "",
      color_hex: "#000000",
      occasions: [],
      seasons: [],
    };
  }

  return {
    name: initialMetadata.subcategory || initialMetadata.category || "",
    category: initialMetadata.category || "",
    subcategory: initialMetadata.subcategory,
    color: initialMetadata.primary_color || "",
    color_hex: initialMetadata.color_hex || "#000000",
    brand: initialMetadata.brand,
    material: initialMetadata.material,
    pattern: initialMetadata.pattern,
    formality: initialMetadata.formality,
    occasions: initialMetadata.occasions || [],
    seasons: initialMetadata.seasons || [],
  };
}

/**
 * Metadata Form Component
 * Allows users to review and edit AI-extracted metadata before saving closet items
 */
export default function MetadataForm({
  isOpen,
  imageUrl,
  initialMetadata,
  onSubmit,
  onCancel,
}: Readonly<MetadataFormProps>) {
  const [formData, setFormData] = useState<ClosetItemMetadata>(() =>
    createInitialFormData(initialMetadata)
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle input changes
  const handleChange = useCallback(
    (field: keyof ClosetItemMetadata, value: ClosetItemMetadata[keyof ClosetItemMetadata]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  // Handle multi-select changes
  const handleMultiSelectChange = useCallback(
    (field: "occasions" | "seasons", value: string) => {
      setFormData((prev) => {
        const currentValues = prev[field] || [];
        const newValues = currentValues.includes(value)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value];
        return { ...prev, [field]: newValues };
      });
    },
    []
  );

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Item name is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.color.trim()) {
      newErrors.color = "Color is required";
    }

    if (!formData.color_hex.match(/^#[0-9A-Fa-f]{6}$/)) {
      newErrors.color_hex = "Invalid hex color format";
    }

    if (formData.formality !== undefined) {
      if (formData.formality < 0 || formData.formality > 1) {
        newErrors.formality = "Formality must be between 0 and 1";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (validateForm()) {
        onSubmit(formData);
      }
    },
    [formData, validateForm, onSubmit]
  );

  // Get confidence indicator
  const getConfidenceIndicator = (field: string): React.ReactElement | null => {
    if (!initialMetadata?.confidence_scores) return null;

    const confidence = initialMetadata.confidence_scores[field];
    if (confidence === undefined) return null;

    const percentage = Math.round(confidence * 100);
    let colorClass = "bg-red-500";
    if (confidence >= 0.8) colorClass = "bg-green-500";
    else if (confidence >= 0.5) colorClass = "bg-yellow-500";

    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClass} transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span>{percentage}%</span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Review Item Details</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Image Preview */}
          {imageUrl && (
            <div className="mb-6">
              <img
                src={imageUrl}
                alt="Item preview"
                className="w-full h-48 object-contain rounded-lg bg-gray-800"
              />
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Item Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="e.g., Blue Denim Jacket"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Category *
                {getConfidenceIndicator("category")}
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {capitalize(cat)}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category}</p>
              )}
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Subcategory
              </label>
              <input
                type="text"
                value={formData.subcategory || ""}
                onChange={(e) => handleChange("subcategory", e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="e.g., bomber jacket, midi dress"
              />
            </div>

            {/* Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Color *
                  {getConfidenceIndicator("color")}
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleChange("color", e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="e.g., Navy Blue"
                />
                {errors.color && (
                  <p className="text-red-500 text-sm mt-1">{errors.color}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Color Hex *
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color_hex}
                    onChange={(e) => handleChange("color_hex", e.target.value)}
                    className="w-12 h-10 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color_hex}
                    onChange={(e) => handleChange("color_hex", e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="#000000"
                  />
                </div>
                {errors.color_hex && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.color_hex}
                  </p>
                )}
              </div>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Brand
                {getConfidenceIndicator("brand")}
              </label>
              <input
                type="text"
                value={formData.brand || ""}
                onChange={(e) => handleChange("brand", e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="e.g., Levi's, Zara"
              />
            </div>

            {/* Material & Pattern */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Material
                </label>
                <input
                  type="text"
                  value={formData.material || ""}
                  onChange={(e) => handleChange("material", e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="e.g., cotton, leather"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Pattern
                </label>
                <input
                  type="text"
                  value={formData.pattern || ""}
                  onChange={(e) => handleChange("pattern", e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="e.g., solid, striped"
                />
              </div>
            </div>

            {/* Formality */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Formality (0 = casual, 1 = formal)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.formality || FORMALITY_DEFAULT}
                onChange={(e) =>
                  handleChange("formality", parseFloat(e.target.value))
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Casual</span>
                <span>{formData.formality?.toFixed(1) || "0.5"}</span>
                <span>Formal</span>
              </div>
              {errors.formality && (
                <p className="text-red-500 text-sm mt-1">{errors.formality}</p>
              )}
            </div>

            {/* Occasions */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Occasions
              </label>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((occasion) => (
                  <button
                    key={occasion}
                    type="button"
                    onClick={() => handleMultiSelectChange("occasions", occasion)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      formData.occasions.includes(occasion)
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {capitalize(occasion)}
                  </button>
                ))}
              </div>
            </div>

            {/* Seasons */}
            <div>
              <label className="block text-sm font-medium mb-2">Seasons</label>
              <div className="flex flex-wrap gap-2">
                {SEASONS.map((season) => (
                  <button
                    key={season}
                    type="button"
                    onClick={() => handleMultiSelectChange("seasons", season)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      formData.seasons.includes(season)
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {capitalize(season)}
                  </button>
                ))}
              </div>
            </div>

            {/* Price & Purchase Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Price (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price || ""}
                  onChange={(e) =>
                    handleChange("price", parseFloat(e.target.value) || undefined)
                  }
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Purchase Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.purchase_date || ""}
                  onChange={(e) => handleChange("purchase_date", e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors resize-none"
                placeholder="Any additional notes about this item..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Closet
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
