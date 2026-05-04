"use client";

import { useState } from "react";

interface BatchActionToolbarProps {
  selectedCount: number;
  onArchive: () => void;
  onUnarchive: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function BatchActionToolbar({
  selectedCount,
  onArchive,
  onUnarchive,
  onFavorite,
  onDelete,
  onCancel,
}: BatchActionToolbarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  if (selectedCount === 0) return null;

  return (
    <>
      {/* Toolbar */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 glass-panel px-6 py-4 shadow-2xl">
        <div className="flex items-center gap-4">
          {/* Selected Count */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-mirra-accent">
              check_circle
            </span>
            <span className="font-medium">
              {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-white/20" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onArchive}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              title="Archive selected items"
            >
              <span className="material-symbols-outlined text-sm">archive</span>
              <span className="hidden sm:inline">Archive</span>
            </button>

            <button
              onClick={onUnarchive}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              title="Unarchive selected items"
            >
              <span className="material-symbols-outlined text-sm">unarchive</span>
              <span className="hidden sm:inline">Unarchive</span>
            </button>

            <button
              onClick={onFavorite}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              title="Mark as favorite"
            >
              <span className="material-symbols-outlined text-sm">favorite</span>
              <span className="hidden sm:inline">Favorite</span>
            </button>

            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors flex items-center gap-2"
              title="Delete selected items"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-white/20" />

          {/* Cancel */}
          <button
            onClick={onCancel}
            className="px-4 py-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Cancel selection"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-panel p-6 max-w-md w-full">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-red-400 text-2xl">
                  warning
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Delete {selectedCount} Items?</h3>
                <p className="text-white/70 text-sm">
                  This action cannot be undone. {selectedCount === 1 ? "This item" : "These items"} will be permanently removed from your closet.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete {selectedCount === 1 ? "Item" : "Items"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
