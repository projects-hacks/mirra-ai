"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { AlertCircle, CheckSquare, Plus, X } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import ClosetGrid from "@/components/closet/ClosetGrid";
import PhotoUploadModal from "@/components/closet/PhotoUploadModal";
import MetadataForm, { type ClosetItemMetadata } from "@/components/closet/MetadataForm";
import ClosetStatistics from "@/components/closet/ClosetStatistics";
import ItemDetailModal from "@/components/closet/ItemDetailModal";
import BatchActionToolbar from "@/components/closet/BatchActionToolbar";
import RecommendationsCard from "@/components/closet/RecommendationsCard";
import ClosetSubNav from "@/components/navigation/ClosetSubNav";

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
  last_worn?: string;
  occasions?: string[];
  seasons?: string[];
  formality?: number;
  created_at?: string;
}

interface ClosetApiResponse {
  items?: ClosetApiItem[];
}

/**
 * Closet Browser Page
 * Main page for browsing and managing digital closet items
 */
export default function ClosetPage() {
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

  const transformClosetItems = useCallback((data: ClosetApiResponse): ClosetItem[] => {
    return (data.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      color: item.color || item.primary_color || "Unknown",
      imageUrl: item.image_url || item.image || "",
      brand: item.brand,
      purchasePrice: item.price,
      timesWorn: item.times_worn || 0,
      lastWorn: item.last_worn,
      occasions: item.occasions ?? [],
      seasons: item.seasons ?? [],
      formality: item.formality,
      createdAt: item.created_at,
    }));
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? "");
    })();

    return () => {
      active = false;
    };
  }, []);

  const {
    data: items = [],
    error,
    isLoading,
    mutate: mutateCloset,
  } = useSWR<ClosetItem[]>(
    userId ? (["closet", userId] as const) : null,
    async ([, currentUserId]: readonly [string, string]) => {
      const data = await fetchApi<ClosetApiResponse>("/api/closet");
      return transformClosetItems(data);
    }
  );

  const fetchClosetItems = useCallback(async () => {
    await mutateCloset();
  }, [mutateCloset]);

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
        const { data: { session } } = await supabase.auth.getSession();

        if (!user || !session?.access_token) {
          throw new Error("User not authenticated");
        }

        // Create closet item
        await fetchApi("/api/closet", {
          method: "POST",
          body: JSON.stringify({
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

        await fetchApi("/api/closet/batch", {
          method: "PATCH",
          body: JSON.stringify({
            item_ids: Array.from(selectedItems),
            action,
          }),
        });

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

      await fetchApi("/api/closet/batch", {
        method: "PATCH",
        body: JSON.stringify({
          item_ids: Array.from(selectedItems),
          action: "delete",
        }),
      });

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
      <div className="flex min-h-[50dvh] items-center justify-center px-4">
        <div className="glass-card max-w-sm text-center">
          <div
            className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-2 border-[var(--outline-variant)] border-t-[var(--primary)]"
            aria-hidden="true"
          />
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            Loading your closet…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-4">
        <div className="glass-card max-w-md text-center">
          <AlertCircle
            size={48}
            className="mx-auto mb-3"
            style={{ color: "var(--error)" }}
            aria-hidden="true"
          />
          <p className="banner-error text-left">{error instanceof Error ? error.message : "Failed to load closet items"}</p>
          <button
            type="button"
            onClick={() => void fetchClosetItems()}
            className="btn-primary mt-4 w-full sm:w-auto"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-shell">
        <ClosetSubNav />
      </div>
      <div className="page-shell flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
          <span className="ui-title" style={{ color: "var(--on-surface)" }}>
            {items.length}
          </span>{" "}
          {items.length === 1 ? "item" : "items"} in your wardrobe
        </p>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] shadow-[0_12px_30px_rgba(139,92,246,0.28)] transition-[transform,box-shadow] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] active:scale-[0.98]"
          >
            <Plus size={16} aria-hidden="true" />
            Add item
          </button>
          <button
            type="button"
            onClick={toggleSelectionMode}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-sm transition-[transform,box-shadow] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] active:scale-[0.98] ${
              selectionMode
                ? "bg-[var(--primary)] text-white shadow-[0_10px_28px_rgba(139,92,246,0.35)]"
                : "glass-panel text-[var(--on-surface)]"
            }`}
          >
            {selectionMode ? <X size={16} aria-hidden="true" /> : <CheckSquare size={16} aria-hidden="true" />}
            {selectionMode ? "Cancel" : "Select"}
          </button>
        </div>
      </div>

      <div
        className={`page-shell space-y-6 sm:pb-4 ${selectionMode ? "pb-32" : "pb-2"}`}
      >

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
