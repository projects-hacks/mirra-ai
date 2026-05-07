/**
 * Empty State Component
 * Displays helpful messages and CTAs when there's no content to show
 */

import { materialSymbolLigature } from "@/lib/materialSymbols";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export default function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  const ligature = materialSymbolLigature(icon);
  return (
    <div className="glass-panel p-12 text-center">
      <span
        className="material-symbols-outlined text-[80px] mb-4 block"
        style={{ color: 'var(--on-surface-variant)', opacity: 0.3 }}
      >
        {ligature}
      </span>
      <h2
        className="text-2xl font-bold mb-2"
        style={{ color: 'var(--on-surface)' }}
      >
        {title}
      </h2>
      <p
        className="mb-6 max-w-md mx-auto"
        style={{ color: 'var(--on-surface-variant)' }}
      >
        {description}
      </p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex gap-3 justify-center">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-6 py-3 rounded-lg font-medium transition-all"
              style={{
                background: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-6 py-3 rounded-lg border font-medium transition-colors"
              style={{
                borderColor: 'var(--outline)',
                color: 'var(--on-surface)',
              }}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Predefined Empty States for common scenarios
 */

export function EmptyCloset({ onAddItem }: { onAddItem: () => void }) {
  return (
    <EmptyState
      icon="checkroom"
      title="Your Closet is Empty"
      description="Start building your digital wardrobe by adding your first item. Take a photo or upload an image to get started."
      actionLabel="Add First Item"
      onAction={onAddItem}
    />
  );
}

export function EmptyOutfitHistory({ onStartStyling }: { onStartStyling: () => void }) {
  return (
    <EmptyState
      icon="history"
      title="No Outfit History Yet"
      description="Your outfit history will appear here once you start approving proof cards and tracking what you wear."
      actionLabel="Start Styling"
      onAction={onStartStyling}
    />
  );
}

export function EmptyLookDiary({ onStartStyling }: { onStartStyling: () => void }) {
  return (
    <EmptyState
      icon="photo_library"
      title="No Looks Yet"
      description="Your look diary will showcase all your styled outfits. Create your first look to get started!"
      actionLabel="Create First Look"
      onAction={onStartStyling}
    />
  );
}

export function EmptySearchResults({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <EmptyState
      icon="search_off"
      title="No Results Found"
      description="We couldn't find any items matching your search criteria. Try adjusting your filters or search terms."
      actionLabel="Clear Filters"
      onAction={onClearFilters}
    />
  );
}

export function EmptyAnalytics() {
  return (
    <EmptyState
      icon="analytics"
      title="Not Enough Data Yet"
      description="Add more items to your closet and track your outfits to see detailed analytics about your wardrobe."
    />
  );
}

export function EmptyRecommendations() {
  return (
    <EmptyState
      icon="lightbulb"
      title="No Recommendations Available"
      description="We need more information about your style preferences and wardrobe to provide personalized recommendations."
    />
  );
}
