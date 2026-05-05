// @deprecated: voice-mode only. Retained temporarily during the tap-driven migration.
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { ToolName } from "@/lib/constants";
import { PARAMETER_CONFIGS } from "@/constants/parameterConfigs";
import type { ParameterField } from "@/types/features";

interface ParameterModalProps {
  tool: ToolName;
  onSubmit: (params: Record<string, string>) => void;
  onCancel: () => void;
}

/**
 * Modal overlay for collecting feature parameters (URLs, text, location)
 * Validates input before submission
 */
export default function ParameterModal({
  tool,
  onSubmit,
  onCancel,
}: Readonly<ParameterModalProps>) {
  const config = PARAMETER_CONFIGS[tool];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((config?.fields ?? []).map((field) => [field.name, ""]))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus first input on mount
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    globalThis.window.addEventListener("keydown", handleEscape);
    return () => globalThis.window.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  // Focus trap
  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements.item(focusableElements.length - 1) as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    globalThis.window.addEventListener("keydown", handleTab);
    return () => globalThis.window.removeEventListener("keydown", handleTab);
  }, []);

  // Validate field
  const validateField = useCallback((field: ParameterField, value: string): string | null => {
    const trimmedValue = value.trim();

    if (field.required && !trimmedValue) {
      return "This field is required";
    }

    if (field.type === "url" && trimmedValue) {
      try {
        new URL(trimmedValue);
      } catch {
        return "Please enter a valid URL";
      }
    }

    if (field.type === "text" && field.required && trimmedValue.length < 1) {
      return "This field is required";
    }

    return null;
  }, []);

  // Handle input change
  const handleChange = useCallback((fieldName: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Handle submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!config) return;

    // Validate all fields
    const newErrors: Record<string, string> = {};
    config.fields.forEach((field) => {
      const error = validateField(field, values[field.name] || "");
      if (error) {
        newErrors[field.name] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit with trimmed values
    const trimmedValues: Record<string, string> = {};
    Object.entries(values).forEach(([key, value]) => {
      trimmedValues[key] = value.trim();
    });

    onSubmit(trimmedValues);
  }, [config, values, validateField, onSubmit]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }, [onCancel]);

  if (!config) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={handleBackdropClick}
      aria-modal="true"
      aria-labelledby="parameter-modal-title"
    >
      <div
        ref={modalRef}
        className="glass-card w-full max-w-md animate-slide-up"
        style={{
          animation: "slide-up 0.3s ease-in-out",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            id="parameter-modal-title"
            className="font-serif text-xl font-semibold"
            style={{ color: "var(--on-surface)" }}
          >
            Enter Details
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
            aria-label="Close modal"
            style={{ minWidth: "44px", minHeight: "44px" }}
          >
            <X size={20} style={{ color: "var(--on-surface)" }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {config.fields.map((field, index) => (
            <div key={field.name}>
              <label
                htmlFor={field.name}
                className="block font-sans text-sm font-medium mb-2"
                style={{ color: "var(--on-surface)" }}
              >
                {field.label}
                {field.required && (
                  <span style={{ color: "var(--error)" }}> *</span>
                )}
              </label>
              <input
                ref={index === 0 ? firstInputRef : undefined}
                id={field.name}
                type={field.type === "url" ? "url" : "text"}
                value={values[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                aria-invalid={!!errors[field.name]}
                aria-errormessage={errors[field.name] ? `${field.name}-error` : undefined}
                className="w-full px-4 py-3 rounded-lg border transition-colors"
                style={{
                  background: "var(--surface)",
                  borderColor: errors[field.name] ? "var(--error)" : "var(--outline-variant)",
                  color: "var(--on-surface)",
                  minHeight: "44px",
                }}
              />
              {errors[field.name] && (
                <p
                  id={`${field.name}-error`}
                  className="mt-1 text-xs"
                  style={{ color: "var(--error)" }}
                  role="alert"
                >
                  {errors[field.name]}
                </p>
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              ref={lastFocusableRef}
              type="submit"
              className="btn-primary flex-1"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
