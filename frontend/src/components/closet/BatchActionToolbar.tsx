'use client';

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
  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed bottom-20 left-0 right-0 z-40 glass-panel border-t"
      style={{ borderColor: 'var(--outline-variant)' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Selected Count */}
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ color: 'var(--primary)' }}
            >
              check_circle
            </span>
            <span className="font-medium" style={{ color: 'var(--on-surface)' }}>
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onFavorite}
              className="px-4 py-2 rounded-lg border transition-colors flex items-center gap-2"
              style={{
                borderColor: 'var(--outline)',
                color: 'var(--on-surface)',
              }}
              title="Add to favorites"
            >
              <span className="material-symbols-outlined text-sm">favorite</span>
              <span className="hidden sm:inline">Favorite</span>
            </button>

            <button
              onClick={onArchive}
              className="px-4 py-2 rounded-lg border transition-colors flex items-center gap-2"
              style={{
                borderColor: 'var(--outline)',
                color: 'var(--on-surface)',
              }}
              title="Archive items"
            >
              <span className="material-symbols-outlined text-sm">archive</span>
              <span className="hidden sm:inline">Archive</span>
            </button>

            <button
              onClick={onUnarchive}
              className="px-4 py-2 rounded-lg border transition-colors flex items-center gap-2"
              style={{
                borderColor: 'var(--outline)',
                color: 'var(--on-surface)',
              }}
              title="Unarchive items"
            >
              <span className="material-symbols-outlined text-sm">unarchive</span>
              <span className="hidden sm:inline">Unarchive</span>
            </button>

            <button
              onClick={onDelete}
              className="px-4 py-2 rounded-lg border transition-colors flex items-center gap-2"
              style={{
                borderColor: 'var(--error)',
                color: 'var(--error)',
              }}
              title="Delete items"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              <span className="hidden sm:inline">Delete</span>
            </button>

            <div
              className="w-px h-8 mx-2"
              style={{ background: 'var(--outline-variant)' }}
            />

            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{ color: 'var(--on-surface-variant)' }}
              title="Cancel selection"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
