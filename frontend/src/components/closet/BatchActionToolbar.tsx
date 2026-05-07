"use client";

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
      className="fixed left-1/2 z-30 max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-x-auto rounded-2xl px-3 py-3 shadow-2xl glass-panel sm:px-6 sm:py-4"
      style={{
        bottom: "calc(var(--nav-height) + var(--safe-bottom) + 4.75rem)",
      }}
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <span className="material-symbols-outlined text-mirra-accent">check_circle</span>
          <span className="whitespace-nowrap font-medium text-sm sm:text-base">
            {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
          </span>
        </div>

        <div className="hidden h-8 w-px shrink-0 bg-white/20 sm:block" />

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onArchive}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2.5 py-2 transition-colors hover:bg-white/20 sm:px-4"
            title="Archive selected items"
          >
            <span className="material-symbols-outlined text-sm">archive</span>
            <span className="hidden sm:inline">Archive</span>
          </button>

          <button
            type="button"
            onClick={onUnarchive}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2.5 py-2 transition-colors hover:bg-white/20 sm:px-4"
            title="Unarchive selected items"
          >
            <span className="material-symbols-outlined text-sm">unarchive</span>
            <span className="hidden sm:inline">Unarchive</span>
          </button>

          <button
            type="button"
            onClick={onFavorite}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2.5 py-2 transition-colors hover:bg-white/20 sm:px-4"
            title="Mark as favorite"
          >
            <span className="material-symbols-outlined text-sm">favorite</span>
            <span className="hidden sm:inline">Favorite</span>
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-2 text-red-300 transition-colors hover:bg-red-500/30 sm:px-4"
            title="Delete selected items"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        <div className="hidden h-8 w-px shrink-0 bg-white/20 sm:block" />

        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-lg p-2 hover:bg-white/10"
          title="Cancel selection"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  );
}
