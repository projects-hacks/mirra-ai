/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';

interface ItemDetailModalProps {
  isOpen: boolean;
  itemId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

interface ClosetItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  color: string;
  color_hex?: string;
  brand?: string;
  image_url?: string;
  price?: number;
  purchase_date?: string;
  times_worn: number;
  last_worn?: string;
  occasions?: string[];
  seasons?: string[];
  formality?: number;
  notes?: string;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
}

interface OutfitLog {
  id: string;
  occasion: string;
  created_at: string;
  outcome: string;
}

export default function ItemDetailModal({
  isOpen,
  itemId,
  onClose,
  onUpdate,
}: ItemDetailModalProps) {
  const [item, setItem] = useState<ClosetItem | null>(null);
  const [outfitLogs, setOutfitLogs] = useState<OutfitLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState<Partial<ClosetItem>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fetch item details
  useEffect(() => {
    if (!isOpen || !itemId) return;

    const fetchItemDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('Not authenticated');
        }

        // Fetch item details
        const { data: itemData, error: itemError } = await supabase
          .from('closet_items')
          .select('*')
          .eq('id', itemId)
          .single();

        if (itemError) throw itemError;
        setItem(itemData);
        setEditedItem(itemData);

        // Fetch outfit logs that include this item
        const { data: logsData, error: logsError } = await supabase
          .from('outfit_logs')
          .select('id, occasion, created_at, outcome')
          .contains('items', [{ id: itemId }])
          .order('created_at', { ascending: false })
          .limit(10);

        if (logsError) throw logsError;
        setOutfitLogs(logsData || []);
      } catch (err) {
        console.error('Error fetching item details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [isOpen, itemId]);

  // Calculate cost-per-wear
  const calculateCPW = () => {
    if (!item?.price || item.times_worn === 0) return null;
    return (item.price / item.times_worn).toFixed(2);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    if (!item) return;

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`/api/closet/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          is_favorite: !item.is_favorite,
        }),
      });

      if (!response.ok) throw new Error('Failed to update favorite status');

      const updatedItem = await response.json();
      setItem(updatedItem);
      onUpdate();
    } catch (err) {
      console.error('Error toggling favorite:', err);
      alert('Failed to update favorite status');
    }
  };

  // Handle archive toggle
  const handleToggleArchive = async () => {
    if (!item) return;

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`/api/closet/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          is_archived: !item.is_archived,
        }),
      });

      if (!response.ok) throw new Error('Failed to update archive status');

      const updatedItem = await response.json();
      setItem(updatedItem);
      onUpdate();
    } catch (err) {
      console.error('Error toggling archive:', err);
      alert('Failed to update archive status');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!item) return;

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`/api/closet/${item.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete item');

      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item');
    }
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!item) return;

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`/api/closet/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(editedItem),
      });

      if (!response.ok) throw new Error('Failed to update item');

      const updatedItem = await response.json();
      setItem(updatedItem);
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Error updating item:', err);
      alert('Failed to update item');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="glass-panel max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--surface-container)' }}
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p style={{ color: 'var(--on-surface-variant)' }}>Loading item details...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-[64px] mb-4" style={{ color: 'var(--error)' }}>
              error
            </span>
            <p style={{ color: 'var(--error)' }} className="mb-4">
              {error}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            >
              Close
            </button>
          </div>
        ) : item ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--on-surface)' }}>
                {isEditing ? 'Edit Item' : item.name}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ color: 'var(--on-surface)' }}>
                  close
                </span>
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Image */}
              <div>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full rounded-lg object-cover"
                    style={{ maxHeight: '500px' }}
                  />
                ) : (
                  <div
                    className="w-full rounded-lg flex items-center justify-center"
                    style={{ height: '500px', background: 'var(--surface-variant)' }}
                  >
                    <span className="material-symbols-outlined text-[128px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.3 }}>
                      checkroom
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                {!isEditing && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleToggleFavorite}
                      className="flex-1 px-4 py-2 rounded-lg border transition-colors"
                      style={{
                        borderColor: 'var(--outline)',
                        background: item.is_favorite ? 'var(--primary)' : 'transparent',
                        color: item.is_favorite ? 'var(--on-primary)' : 'var(--on-surface)',
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {item.is_favorite ? 'favorite' : 'favorite_border'}
                      </span>
                      {item.is_favorite ? ' Favorited' : ' Favorite'}
                    </button>
                    <button
                      onClick={handleToggleArchive}
                      className="flex-1 px-4 py-2 rounded-lg border transition-colors"
                      style={{
                        borderColor: 'var(--outline)',
                        color: 'var(--on-surface)',
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {item.is_archived ? 'unarchive' : 'archive'}
                      </span>
                      {item.is_archived ? ' Unarchive' : ' Archive'}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column - Details */}
              <div className="space-y-6">
                {isEditing ? (
                  <>
                    {/* Edit Form */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                        Name
                      </label>
                      <input
                        type="text"
                        value={editedItem.name || ''}
                        onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          background: 'var(--surface-variant)',
                          borderColor: 'var(--outline)',
                          color: 'var(--on-surface)',
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                          Category
                        </label>
                        <input
                          type="text"
                          value={editedItem.category || ''}
                          onChange={(e) => setEditedItem({ ...editedItem, category: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border"
                          style={{
                            background: 'var(--surface-variant)',
                            borderColor: 'var(--outline)',
                            color: 'var(--on-surface)',
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                          Brand
                        </label>
                        <input
                          type="text"
                          value={editedItem.brand || ''}
                          onChange={(e) => setEditedItem({ ...editedItem, brand: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border"
                          style={{
                            background: 'var(--surface-variant)',
                            borderColor: 'var(--outline)',
                            color: 'var(--on-surface)',
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                          Color
                        </label>
                        <input
                          type="text"
                          value={editedItem.color || ''}
                          onChange={(e) => setEditedItem({ ...editedItem, color: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border"
                          style={{
                            background: 'var(--surface-variant)',
                            borderColor: 'var(--outline)',
                            color: 'var(--on-surface)',
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                          Price
                        </label>
                        <input
                          type="number"
                          value={editedItem.price || ''}
                          onChange={(e) => setEditedItem({ ...editedItem, price: parseFloat(e.target.value) })}
                          className="w-full px-4 py-2 rounded-lg border"
                          style={{
                            background: 'var(--surface-variant)',
                            borderColor: 'var(--outline)',
                            color: 'var(--on-surface)',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                        Notes
                      </label>
                      <textarea
                        value={editedItem.notes || ''}
                        onChange={(e) => setEditedItem({ ...editedItem, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          background: 'var(--surface-variant)',
                          borderColor: 'var(--outline)',
                          color: 'var(--on-surface)',
                        }}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 px-4 py-2 rounded-lg"
                        style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedItem(item);
                        }}
                        className="flex-1 px-4 py-2 rounded-lg border"
                        style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div>
                      <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                        Details
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--on-surface-variant)' }}>Category:</span>
                          <span style={{ color: 'var(--on-surface)' }} className="font-medium">
                            {item.category}
                          </span>
                        </div>
                        {item.subcategory && (
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--on-surface-variant)' }}>Subcategory:</span>
                            <span style={{ color: 'var(--on-surface)' }} className="font-medium">
                              {item.subcategory}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--on-surface-variant)' }}>Color:</span>
                          <div className="flex items-center gap-2">
                            {item.color_hex && (
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ background: item.color_hex, borderColor: 'var(--outline)' }}
                              />
                            )}
                            <span style={{ color: 'var(--on-surface)' }} className="font-medium">
                              {item.color}
                            </span>
                          </div>
                        </div>
                        {item.brand && (
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--on-surface-variant)' }}>Brand:</span>
                            <span style={{ color: 'var(--on-surface)' }} className="font-medium">
                              {item.brand}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Purchase Info */}
                    {(item.price || item.purchase_date) && (
                      <div>
                        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                          Purchase Information
                        </h3>
                        <div className="space-y-2">
                          {item.price && (
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--on-surface-variant)' }}>Price:</span>
                              <span style={{ color: 'var(--on-surface)' }} className="font-medium">
                                ${item.price.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {item.purchase_date && (
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--on-surface-variant)' }}>Purchase Date:</span>
                              <span style={{ color: 'var(--on-surface)' }} className="font-medium">
                                {formatDate(item.purchase_date)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Wear Stats */}
                    <div>
                      <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                        Wear Statistics
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--on-surface-variant)' }}>Times Worn:</span>
                          <span style={{ color: 'var(--on-surface)' }} className="font-medium">
                            {item.times_worn}
                          </span>
                        </div>
                        {item.last_worn && (
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--on-surface-variant)' }}>Last Worn:</span>
                            <span style={{ color: 'var(--on-surface)' }} className="font-medium">
                              {formatDate(item.last_worn)}
                            </span>
                          </div>
                        )}
                        {calculateCPW() && (
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--on-surface-variant)' }}>Cost Per Wear:</span>
                            <span style={{ color: 'var(--success)' }} className="font-medium">
                              ${calculateCPW()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Occasions & Seasons */}
                    {(item.occasions?.length || item.seasons?.length) && (
                      <div>
                        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                          Suitable For
                        </h3>
                        {item.occasions && item.occasions.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                              Occasions:
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.occasions.map((occasion) => (
                                <span
                                  key={occasion}
                                  className="px-2 py-1 rounded-full text-xs"
                                  style={{
                                    background: 'var(--primary-container)',
                                    color: 'var(--on-primary-container)',
                                  }}
                                >
                                  {occasion}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.seasons && item.seasons.length > 0 && (
                          <div>
                            <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                              Seasons:
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.seasons.map((season) => (
                                <span
                                  key={season}
                                  className="px-2 py-1 rounded-full text-xs"
                                  style={{
                                    background: 'var(--secondary-container)',
                                    color: 'var(--on-secondary-container)',
                                  }}
                                >
                                  {season}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Outfit History */}
                    {outfitLogs.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                          Worn In ({outfitLogs.length} outfits)
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {outfitLogs.map((log) => (
                            <div
                              key={log.id}
                              className="p-3 rounded-lg"
                              style={{ background: 'var(--surface-variant)' }}
                            >
                              <div className="flex justify-between items-center">
                                <span style={{ color: 'var(--on-surface)' }} className="font-medium capitalize">
                                  {log.occasion}
                                </span>
                                <span style={{ color: 'var(--on-surface-variant)' }} className="text-xs">
                                  {formatDate(log.created_at)}
                                </span>
                              </div>
                              <span
                                className="text-xs capitalize"
                                style={{ color: 'var(--on-surface-variant)' }}
                              >
                                {log.outcome}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <div>
                        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                          Notes
                        </h3>
                        <p style={{ color: 'var(--on-surface)' }} className="text-sm">
                          {item.notes}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex-1 px-4 py-2 rounded-lg"
                        style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                      >
                        <span className="material-symbols-outlined text-sm">edit</span> Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 rounded-lg border"
                        style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="glass-panel p-6 max-w-md w-full" style={{ background: 'var(--surface-container)' }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--on-surface)' }}>
              Delete Item?
            </h3>
            <p style={{ color: 'var(--on-surface-variant)' }} className="mb-6">
              Are you sure you want to delete &quot;{item?.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
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
