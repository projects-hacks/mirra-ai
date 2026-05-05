"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import ClosetGrid from "@/components/closet/ClosetGrid";
import PhotoUploadModal from "@/components/closet/PhotoUploadModal";
import MetadataForm, { type ClosetItemMetadata } from "@/components/closet/MetadataForm";
import ClosetStatistics from "@/components/closet/ClosetStatistics";
import ItemDetailModal from "@/components/closet/ItemDetailModal";
import BatchActionToolbar from "@/components/closet/BatchActionToolbar";
import RecommendationsCard from "@/components/closet/RecommendationsCard";
import BottomNav from "@/components/navigation/BottomNav";

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

interface ClosetApiItem {
  id: string;
  name: string;
  category: string;
  color?: string;
  primary_color?: string;
  image_url?: string;
  image?: string;
  brand?: string;
  price?: number;
  times_worn?: number;
}

interface ClosetApiResponse {
  items?: ClosetApiItem[];
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
  
  // Selection mode states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Upload flow state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [extractedMetadata, setExtractedMetadata] = useState<ExtractedMetadata | null>(null);
  const [userId, setUserId] = useState<string>("");

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
      } else {
        setUserId(user.id);
      }

      // Fetch items from API
      const response = await fetch(`/api/closet?user_id=${user.id}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch closet items");
      }

      const data: ClosetApiResponse = await response.json();
      
      // Transform API response to match ClosetGrid interface
      const transformedItems = (data.items || []).map((item) => ({
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
    const timeoutId = window.setTimeout(() => {
      void fetchClosetItems();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchClosetItems]);

  // Handle photo upload completion
  const handleUploadComplete = useCallback(
    (imageUrl: string, metadata: ExtractedMetadata) => {
      setUploadedImageUrl(imageUrl);
      setExtractedMetadata(metadata);
      setIsUploadModalOpen(false);
      setIsMetadataFormOpen(true);
    },
    []
  );

  // Handle metadata form submission
  const handleMetadataSubmit = useCallback(
    async (metadata: ClosetItemMetadata) => {
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
  const handleSelectItem = useCallback((item: ClosetItem) => {
    if (selectionMode) {
      return; // In selection mode, clicking is handled by toggle
    }
    setSelectedItemId(item.id);
    setIsItemDetailModalOpen(true);
  }, [selectionMode]);

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(!selectionMode);
    setSelectedItems(new Set());
  }, [selectionMode]);

  // Toggle item selection
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Batch operations
  const handleBatchOperation = useCallback(
    async (action: string) => {
      if (selectedItems.size === 0) return;

      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Not authenticated");
        }

        const response = await fetch("/api/closet/batch", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            item_ids: Array.from(selectedItems),
            action,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to ${action} items`);
        }

        // Refresh items
        await fetchClosetItems();
        
        // Reset selection
        setSelectedItems(new Set());
        setSelectionMode(false);
      } catch (err) {
        console.error(`Error performing ${action}:`, err);
        alert(`Failed to ${action} items`);
      }
    },
    [selectedItems, fetchClosetItems]
  );

  const handleBatchDelete = useCallback(async () => {
    if (selectedItems.size === 0) return;

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/closet/batch", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          item_ids: Array.from(selectedItems),
          action: "delete",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete items");
      }

      // Refresh items
      await fetchClosetItems();
      
      // Reset selection
      setSelectedItems(new Set());
      setSelectionMode(false);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Error deleting items:", err);
      alert("Failed to delete items");
    }
  }, [selectedItems, fetchClosetItems]);

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
    <div className="bottom-nav-offset min-h-[100dvh] bg-transparent">
      <div className="page-header-shell">
        <div className="page-shell flex items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl" style={{ fontFamily: "var(--font-serif)" }}>My Closet</h1>
            <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
              {items.length} {items.length === 1 ? "item" : "items"} in your wardrobe
            </p>
          </div>
          <button
            onClick={toggleSelectionMode}
            className={`min-h-[44px] rounded-full px-4 py-2 transition-colors ${
              selectionMode
                ? "bg-[var(--primary)] text-white"
                : "glass-panel text-[var(--on-surface)]"
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {selectionMode ? "close" : "checklist"}
            </span>
            {selectionMode ? " Cancel" : " Select"}
          </button>
        </div>
      </div>

      <div className="page-shell px-4 py-6 sm:py-8">

      {/* Closet Statistics */}
      {items.length > 0 && <ClosetStatistics />}

      {/* Outfit Recommendations — contextual, only when closet has items */}
      {items.length >= 3 && userId && <RecommendationsCard userId={userId} occasion="casual" />}

      {/* Closet Grid */}
      <ClosetGrid
        items={items}
        onAddItem={() => setIsUploadModalOpen(true)}
        onSelectItem={handleSelectItem}
        selectionMode={selectionMode}
        selectedItems={selectedItems}
        onToggleSelect={toggleItemSelection}
      />
      </div>

      {/* Batch Action Toolbar */}
      <BatchActionToolbar
        selectedCount={selectedItems.size}
        onArchive={() => handleBatchOperation("archive")}
        onUnarchive={() => handleBatchOperation("unarchive")}
        onFavorite={() => handleBatchOperation("favorite")}
        onDelete={() => setShowDeleteConfirm(true)}
        onCancel={() => {
          setSelectionMode(false);
          setSelectedItems(new Set());
        }}
      />

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      {/* Metadata Form */}
      {isMetadataFormOpen && (
        <MetadataForm
          key={uploadedImageUrl ?? "metadata-form"}
          isOpen={isMetadataFormOpen}
          imageUrl={uploadedImageUrl}
          initialMetadata={extractedMetadata}
          onSubmit={handleMetadataSubmit}
          onCancel={handleMetadataCancel}
        />
      )}

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

      <BottomNav />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="glass-panel p-6 max-w-md w-full" style={{ background: 'var(--surface-container)' }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--on-surface)' }}>
              Delete {selectedItems.size} {selectedItems.size === 1 ? 'Item' : 'Items'}?
            </h3>
            <p style={{ color: 'var(--on-surface-variant)' }} className="mb-6">
              Are you sure you want to delete {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'}? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleBatchDelete}
                className="flex-1 px-4 py-2 rounded-lg"
                style={{ background: 'var(--error)', color: 'var(--on-error)' }}
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border"
                style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
