'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import {
  getAllCategories,
  getAllOccasions,
  getAllSeasons,
  formatCategoryLabel,
  formatOccasionLabel,
  formatSeasonLabel,
} from '@/lib/closet-constants';

interface ItemDetailModalProps {
  isOpen: boolean;
  itemId: string | null;
  onClose: () => void;
  onUpdate?: () => void;
}

interface ClosetItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  subcategory?: string;
  color: string;
  color_hex?: string;
  brand?: string;
  price?: number;
  purchase_date?: string;
  image_url?: string;
  occasions?: string[];
  seasons?: string[];
  formality?: number;
  last_worn?: string;
  times_worn: number;
  is_favorite: boolean;
  is_archived: boolean;
  notes?: string;
  created_at: string;
}

interface OutfitLog {
  id: string;
  occasion: string;
  outcome: string;
  created_at: string;
}

export default function ItemDetailModal({
  isOpen,
  itemId,
  onClose,
  onUpdate,
}: ItemDetailModalProps) {
  const [item, setItem] = useState<ClosetItem | null>(null);
  const [outfitLogs, setOutfitLogs] = useState<OutfitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch item details and outfit logs
  useEffect(() => {
    if (!isOpen || !itemId) return;

    const fetchItemDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: { session } } = await supabase.auth.getSession();

        if (!user || !session) {
          setError('Please sign in to view item details');
          return;
        }

        // Fetch item details
        const itemResult = await supabase
          .from('closet_items')
          .select('*')
          .eq('id', itemId)
          .eq('user_id', user.id)
          .single();

        if (itemResult.error) {
          throw new Error('Failed to fetch item details');
        }

        setItem(itemResult.data);

        // Fetch outfit logs that include this item
        const logsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/outfit-history?user_id=${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          // Filter logs that include this item
          const itemLogs = (logsData.outfit_logs || []).filter((log: any) =>
            log.items?.some((logItem: any) => logItem.id === itemId)
          );
          setOutfitLogs(itemLogs);
        }
      } catch (err) {
        console.error('Error fetching item details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [isOpen, itemId]);

  // Calculate cost per wear
  const calculateCPW = () => {
    if (!item?.price || item.times_worn === 0) return null;
    return (item.price / item.times_worn).toFixed(2);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Handle favorite toggle
  const handleFavoriteToggle = async () => {
    if (!item) return;

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Please sign in to update items');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/closet/${item.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ is_favorite: !item.is_favorite }),
        }
      );

      if (!response.ok) throw new Error('Failed to update favorite status');

      setItem({ ...item, is_favorite: !item.is_favorite });
      onUpdate?.();
    } catch (err) {
      console.error('Error toggling favorite:', err);
      alert('Failed to update favorite status');
    }
  };

  // Handle archive toggle
  const handleArchiveToggle = async () => {
    if (!item) return;

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Please sign in to update items');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/closet/${item.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ is_archived: !item.is_archived }),
        }
      );

      if (!response.ok) throw new Error('Failed to update archive status');

      setItem({ ...item, is_archived: !item.is_archived });
      onUpdate?.();
    } catch (err) {
      console.error('Error toggling archive:', err);
      alert('Failed to update archive status');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!item) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Please sign in to delete items');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/closet/${item.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete item');

      onUpdate?.();
      onClose();
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-white/70">Loading item details...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-red-400 text-5xl mb-4">error</span>
            <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
            <p className="text-white/70 mb-4">{error}</p>
            <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              Close
            </button>
          </div>
        ) : item ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-white mb-2">{item.name}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                    {formatCategoryLabel(item.category)}
                  </span>
                  {item.subcategory && (
                    <span className="px-3 py-1 bg-white/10 text-white/70 rounded-full text-sm">
                      {item.subcategory}
                    </span>
                  )}
                  {item.is_favorite && (
                    <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">favorite</span>
                      Favorite
                    </span>
                  )}
                  {item.is_archived && (
                    <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-full text-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">archive</span>
                      Archived
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-white">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Image and Actions */}
              <div>
                {/* Image */}
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full aspect-square object-cover rounded-lg bg-white/5 mb-4"
                  />
                ) : (
                  <div className="w-full aspect-square bg-white/5 rounded-lg flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-white/30 text-6xl">
                      checkroom
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleFavoriteToggle}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      item.is_favorite
                        ? 'bg-pink-500/20 text-pink-300 hover:bg-pink-500/30'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <span className="material-symbols-outlined">
                      {item.is_favorite ? 'favorite' : 'favorite_border'}
                    </span>
                    {item.is_favorite ? 'Favorited' : 'Favorite'}
                  </button>
                  <button
                    onClick={handleArchiveToggle}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      item.is_archived
                        ? 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <span className="material-symbols-outlined">
                      {item.is_archived ? 'unarchive' : 'archive'}
                    </span>
                    {item.is_archived ? 'Unarchive' : 'Archive'}
                  </button>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-3 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">delete</span>
                    Delete
                  </button>
                </div>
              </div>

              {/* Right Column - Details */}
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Details</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-white/50">palette</span>
                      <span className="text-white/70">Color:</span>
                      <div className="flex items-center gap-2">
                        {item.color_hex && (
                          <div
                            className="w-5 h-5 rounded border border-white/20"
                            style={{ backgroundColor: item.color_hex }}
                          />
                        )}
                        <span className="text-white">{item.color}</span>
                      </div>
                    </div>
                    {item.brand && (
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-white/50">label</span>
                        <span className="text-white/70">Brand:</span>
                        <span className="text-white">{item.brand}</span>
                      </div>
                    )}
                    {item.formality !== undefined && (
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-white/50">style</span>
                        <span className="text-white/70">Formality:</span>
                        <span className="text-white">
                          {item.formality < 0.3
                            ? 'Casual'
                            : item.formality < 0.7
                            ? 'Smart Casual'
                            : 'Formal'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purchase Info */}
                {(item.price || item.purchase_date) && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Purchase Info</h3>
                    <div className="space-y-2">
                      {item.price && (
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-white/50">
                            payments
                          </span>
                          <span className="text-white/70">Price:</span>
                          <span className="text-white">${item.price.toFixed(2)}</span>
                        </div>
                      )}
                      {item.purchase_date && (
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-white/50">
                            calendar_today
                          </span>
                          <span className="text-white/70">Purchased:</span>
                          <span className="text-white">{formatDate(item.purchase_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Wear Stats */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Wear Statistics</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-white/50">
                        counter_1
                      </span>
                      <span className="text-white/70">Times Worn:</span>
                      <span className="text-white font-semibold">{item.times_worn}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-white/50">schedule</span>
                      <span className="text-white/70">Last Worn:</span>
                      <span className="text-white">{formatDate(item.last_worn)}</span>
                    </div>
                    {calculateCPW() && (
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-white/50">
                          trending_down
                        </span>
                        <span className="text-white/70">Cost Per Wear:</span>
                        <span className="text-green-300 font-semibold">${calculateCPW()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Occasions & Seasons */}
                {((item.occasions && item.occasions.length > 0) ||
                  (item.seasons && item.seasons.length > 0)) && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Suitable For</h3>
                    {item.occasions && item.occasions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-white/70 text-sm mb-2">Occasions:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.occasions.map((occasion) => (
                            <span
                              key={occasion}
                              className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                            >
                              {formatOccasionLabel(occasion)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.seasons && item.seasons.length > 0 && (
                      <div>
                        <p className="text-white/70 text-sm mb-2">Seasons:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.seasons.map((season) => (
                            <span
                              key={season}
                              className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                            >
                              {formatSeasonLabel(season)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {item.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Notes</h3>
                    <p className="text-white/70 text-sm">{item.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Outfit History */}
            {outfitLogs.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Worn in {outfitLogs.length} {outfitLogs.length === 1 ? 'Outfit' : 'Outfits'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {outfitLogs.slice(0, 6).map((log) => (
                    <div key={log.id} className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium capitalize">
                          {log.occasion || 'Casual'}
                        </span>
                        <span className="text-white/50 text-sm">{formatDate(log.created_at)}</span>
                      </div>
                      <span
                        className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                          log.outcome === 'wore' || log.outcome === 'loved'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-gray-500/20 text-gray-300'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </div>
                  ))}
                </div>
                {outfitLogs.length > 6 && (
                  <p className="text-white/50 text-sm mt-3 text-center">
                    +{outfitLogs.length - 6} more outfits
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
