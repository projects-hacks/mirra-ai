"use client";

import { useCallback, useMemo } from "react";
import { Menu, X } from "lucide-react";
import { useAppState, useAppDispatch, createLoadingMessage } from "@/components/providers/AppProvider";
import { ToolName, LOADING_TEXT } from "@/lib/constants";
import { getAllCategories, getFeaturesByCategory } from "@/constants/featureCatalog";
import { useToast } from "@/components/ui/Toast";
import CategorySection from "./CategorySection";
import ParameterModal from "./ParameterModal";

/**
 * Feature Menu - Main container for feature discovery UI
 * Top hamburger menu with slide-down panel showing all 13 features
 */
export default function FeatureMenu() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const { isVisible, activeFeature, showParameterModal } = state.menu;

  // Helper to send tool execution commands via WebSocket
  const sendToolCommand = useCallback((tool: ToolName, params: Record<string, string>) => {
    // Access WebSocket from window (set by useVoiceAgent)
    const ws = (globalThis as typeof globalThis & { __mirraWS?: WebSocket }).__mirraWS;
    
    if (ws?.readyState !== WebSocket.OPEN) {
      showToast("Connection lost. Please reconnect.", "error");
      return;
    }

    // Send tool execution message
    ws.send(JSON.stringify({
      type: "tool_execute",
      tool,
      params,
    }));
  }, [showToast]);

  // Check if a feature is currently loading
  const isFeatureLoading = useCallback(
    (tool: ToolName): boolean => {
      return state.currentTool === tool;
    },
    [state.currentTool]
  );

  // Toggle menu visibility
  const handleToggleMenu = useCallback(() => {
    dispatch({ type: "TOGGLE_MENU" });
  }, [dispatch]);

  // Handle feature click
  const handleFeatureClick = useCallback(
    (tool: ToolName, requiresParams: boolean) => {
      // Check prerequisites
      if (!state.isConnected) {
        showToast("Not connected. Tap the mic to connect.", "error");
        return;
      }

      if (!state.selfie) {
        showToast("Please wait for camera to initialize", "info");
        return;
      }

      // If feature requires parameters, show modal
      if (requiresParams) {
        dispatch({ type: "SET_ACTIVE_FEATURE", payload: tool });
        dispatch({ type: "SHOW_PARAMETER_MODAL", payload: true });
        return;
      }

      // Execute feature without parameters
      dispatch({ type: "SET_CURRENT_TOOL", payload: tool });
      dispatch({
        type: "ADD_MESSAGE",
        payload: createLoadingMessage(tool, LOADING_TEXT[tool] ?? "Processing…"),
      });
      dispatch({ type: "SET_MENU_VISIBLE", payload: false });

      // Send tool execution command via WebSocket
      sendToolCommand(tool, {});
    },
    [state.isConnected, state.selfie, dispatch, showToast, sendToolCommand]
  );

  // Handle parameter submission
  const handleParameterSubmit = useCallback(
    (params: Record<string, string>) => {
      if (!activeFeature) return;

      dispatch({ type: "SET_CURRENT_TOOL", payload: activeFeature });
      dispatch({
        type: "ADD_MESSAGE",
        payload: createLoadingMessage(
          activeFeature,
          LOADING_TEXT[activeFeature] ?? "Processing…"
        ),
      });
      dispatch({ type: "SHOW_PARAMETER_MODAL", payload: false });
      dispatch({ type: "SET_MENU_VISIBLE", payload: false });
      dispatch({ type: "SET_ACTIVE_FEATURE", payload: null });

      // Send tool execution command with parameters via WebSocket
      sendToolCommand(activeFeature, params);
      showToast("Request sent successfully", "success");
    },
    [activeFeature, dispatch, showToast, sendToolCommand]
  );

  // Handle parameter modal cancel
  const handleParameterCancel = useCallback(() => {
    dispatch({ type: "SHOW_PARAMETER_MODAL", payload: false });
    dispatch({ type: "SET_ACTIVE_FEATURE", payload: null });
  }, [dispatch]);

  // Get all categories
  const categories = useMemo(() => getAllCategories(), []);

  return (
    <>
      {/* Menu Toggle Button */}
      <button
        onClick={handleToggleMenu}
        aria-label="Open feature menu"
        aria-expanded={isVisible}
        aria-controls="feature-menu-panel"
        className="fixed z-40 glass-card p-3 transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          left: "max(1rem, env(safe-area-inset-left))",
          minWidth: "44px",
          minHeight: "44px",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {isVisible ? (
          <X size={20} style={{ color: "var(--on-surface)" }} />
        ) : (
          <Menu size={20} style={{ color: "var(--on-surface)" }} />
        )}
      </button>

      {/* Menu Panel */}
      {isVisible && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-40 transition-opacity duration-300"
            style={{
              background: "rgba(0, 0, 0, 0.2)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            onClick={handleToggleMenu}
            aria-label="Close feature menu"
          />

          {/* Panel */}
          <div
            id="feature-menu-panel"
            role="menu"
            aria-label="Available features"
            className="fixed top-0 left-0 right-0 z-40 max-h-[80vh] overflow-y-auto"
            style={{
              paddingTop: "max(1rem, env(safe-area-inset-top))",
              paddingLeft: "env(safe-area-inset-left)",
              paddingRight: "env(safe-area-inset-right)",
              animation: "slide-down 0.3s ease-in-out",
            }}
          >
            <div
              className="glass-card mx-4 mt-16 mb-4 p-6 space-y-6"
              style={{
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              {/* Menu Title */}
              <div className="mb-6">
                <h2
                  className="font-serif text-2xl font-semibold mb-2"
                  style={{ color: "var(--on-surface)" }}
                >
                  Features
                </h2>
                <p
                  className="font-sans text-sm"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  Tap any feature to activate it, or use voice commands
                </p>
              </div>

              {/* Category Sections */}
              {categories.map((category) => (
                <CategorySection
                  key={category}
                  title={category}
                  features={getFeaturesByCategory(category)}
                  isLoading={isFeatureLoading}
                  onFeatureClick={handleFeatureClick}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Parameter Modal */}
      {showParameterModal && activeFeature && (
        <ParameterModal
          tool={activeFeature}
          onSubmit={handleParameterSubmit}
          onCancel={handleParameterCancel}
        />
      )}
    </>
  );
}
