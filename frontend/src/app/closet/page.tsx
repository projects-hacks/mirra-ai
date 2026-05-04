"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import ClosetGrid from "@/components/closet/ClosetGrid";
import PhotoUploadModal from "@/components/closet/PhotoUploadModal";
import MetadataForm from "@/components/closet/MetadataForm";
import ClosetStatistics from "@/components/closet/ClosetStatistics";
import ItemDetailModal from "@/components/closet/ItemDetailModal";
import ClosetNav from "@/components/navigation/ClosetNav";

interface ClosetItem {
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

/**
 * Closet Browser Page
 * Main page for browsing and managing digital closet items
 */
export default function ClosetPage() {
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isMetadataFormOpen, setIsMetadataFormOpen] = useState(false);
  const [isItemDetailModalOpen, setIsItemDetailModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Upload flow state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [extractedMetadata, setExtractedMetadata] = useState<ExtractedMetadata | null>(null);

  // Fetch closet items
  const fetchClosetItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to view your closet");
        return;
      }

      // Fetch items from API
      const response = await fetch(`/api/closet?user_id=${user.id}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch closet items");
      }

      const data = await response.json();
      
      // Transform API response to match ClosetGrid interface
      const transformedItems = (data.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        color: item.color || item.primary_color || "Unknown",
        imageUrl: item.image_url || item.image || "",
        brand: item.brand,
        purchasePrice: item.price,
        timesWorn: item.times_worn || 0,
      }));

      setItems(transformedItems);
    } catch (err) {
      console.error("Error fetching closet items:", err);
      setError(err instanceof Error ? err.message : "Failed to load closet items");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load items on mount
  useEffect(() => {
    fetchClosetItems();
  }, [fetchClosetItems]);

  // Handle photo upload completion
  const handleUploadComplete = useCallback(
    (imageUrl: string, metadata: any) => {
      setUploadedImageUrl(imageUrl);
      setExtractedMetadata(metadata);
      setIsUploadModalOpen(false);
      setIsMetadataFormOpen(true);
    },
    []
  );

  // Handle metadata form submission
  const handleMetadataSubmit = useCallback(
    async (metadata: any) => {
      try {
        const supabase = getSupabase();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("User not authenticated");
        }

        // Create closet item
        const response = await fetch("/api/closet", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            name: metadata.name,
            category: metadata.category,
            subcategory: metadata.subcategory,
            color: metadata.color,
            color_hex: metadata.color_hex,
            brand: metadata.brand,
            material: metadata.material,
            pattern: metadata.pattern,
            formality: metadata.formality,
            occasions: metadata.occasions,
            seasons: metadata.seasons,
            price: metadata.price,
            purchase_date: metadata.purchase_date,
            notes: metadata.notes,
            image_url: uploadedImageUrl,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create closet item");
        }

        // Close form and refresh items
        setIsMetadataFormOpen(false);
        setUploadedImageUrl(null);
        setExtractedMetadata(null);
        
        // Refresh closet items
        await fetchClosetItems();
      } catch (err) {
        console.error("Error creating closet item:", err);
        alert(err instanceof Error ? err.message : "Failed to add item to closet");
      }
    },
    [uploadedImageUrl, fetchClosetItems]
  );

  // Handle metadata form cancel
  const handleMetadataCancel = useCallback(() => {
    setIsMetadataFormOpen(false);
    setUploadedImageUrl(null);
    setExtractedMetadata(null);
  }, []);

  // Handle item selection
  const handleSelectItem = useCallback((item: any) => {
    setSelectedItemId(item.id);
    setIsItemDetailModalOpen(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your closet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="material-symbols-outlined text-[64px] text-red-500 mb-4">
            error
          </span>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchClosetItems}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      {/* Header with item count */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Closet</h1>
            <p className="text-gray-400">
              {items.length} {items.length === 1 ? "item" : "items"} in your wardrobe
            </p>
          </div>
        </div>
      </div>

      {/* Closet Statistics */}
      {items.length > 0 && <ClosetStatistics />}

      {/* Closet Grid */}
      <ClosetGrid
        items={items}
        onAddItem={() => setIsUploadModalOpen(true)}
        onSelectItem={handleSelectItem}
      />

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      {/* Metadata Form */}
      <MetadataForm
        isOpen={isMetadataFormOpen}
        imageUrl={uploadedImageUrl}
        initialMetadata={extractedMetadata}
        onSubmit={handleMetadataSubmit}
        onCancel={handleMetadataCancel}
      />

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={isItemDetailModalOpen}
        itemId={selectedItemId}
        onClose={() => {
          setIsItemDetailModalOpen(false);
          setSelectedItemId(null);
        }}
        onUpdate={fetchClosetItems}
      />

      {/* Navigation */}
      <ClosetNav />
    </div>
  );
}
