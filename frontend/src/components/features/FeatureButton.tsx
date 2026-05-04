"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

interface FeatureButtonProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  isLoading: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

/**
 * Individual feature button with icon, label, and loading state
 * Follows Lumina Ethos design system with glassmorphism styling
 */
const FeatureButton = memo(function FeatureButton({
  icon: Icon,
  label,
  description,
  isLoading,
  isDisabled,
  onClick,
}: Readonly<FeatureButtonProps>) {
  const disabled = isDisabled || isLoading;
  const ariaLabel = description ? `${label} - ${description}` : label;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled) {
        onClick();
      }
    }
  };

  return (
    <button
      role="menuitem"
      aria-label={ariaLabel}
      aria-busy={isLoading}
      disabled={disabled}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      className="glass-card group relative flex flex-col items-start gap-2 p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      style={{
        minHeight: "44px",
        minWidth: "44px",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Icon and Loading Spinner */}
      <div className="flex items-center gap-3 w-full">
        {isLoading ? (
          <Loader2
            className="animate-spin flex-shrink-0"
            size={24}
            style={{ color: "var(--on-surface)" }}
          />
        ) : (
          <Icon
            className="flex-shrink-0"
            size={24}
            style={{ color: "var(--on-surface)" }}
          />
        )}

        {/* Label */}
        <span
          className="font-sans font-medium text-left flex-1"
          style={{
            fontSize: "clamp(0.8125rem, 2.5vw, 0.875rem)",
            color: "var(--on-surface)",
          }}
        >
          {label}
        </span>
      </div>

      {/* Description */}
      {description && (
        <p
          className="font-sans text-left w-full"
          style={{
            fontSize: "clamp(0.6875rem, 2vw, 0.75rem)",
            color: "var(--on-surface-variant)",
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      )}

      {/* Loading State Indicator */}
      {isLoading && (
        <div
          className="absolute inset-0 rounded-[var(--radius-xl)] pointer-events-none"
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(4px)",
          }}
        />
      )}
    </button>
  );
});

export default FeatureButton;
