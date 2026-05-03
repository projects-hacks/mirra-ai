"use client";

import { useEffect, useRef } from "react";
import type { Message, User, VTOResult } from "@/types";
import AgentCard from "@/components/cards/AgentCard";
import ItemCardRow from "@/components/cards/ItemCardRow";
import { ToolName } from "@/lib/constants";

interface AgentOverlayProps {
  messages: Message[];
  user: User | null;
  vtoResult: VTOResult | null;
  onRecapture: () => void;
}

/**
 * Layer 3 — Floating glassmorphic agent cards on top of camera.
 * Shows the last agent message + most recent tool result.
 * Positioned at the center/bottom of the screen, above the voice orb.
 */
export default function AgentOverlay({
  messages,
  user,
  vtoResult,
  onRecapture,
}: AgentOverlayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Get latest agent message and tool result
  const lastAgent = [...messages].reverse().find((m) => m.type === "agent");
  const lastLoading = [...messages].reverse().find((m) => m.type === "loading");
  const lastToolResult = [...messages].reverse().find((m) => m.type === "tool_result");

  // Show either loading or the last result
  const activeMessage = lastLoading ?? lastAgent;

  // Product/closet cards from tool results
  const productResults = messages.filter(
    (m) => m.type === "tool_result" && 
    ((m as any).tool === ToolName.SEARCH_PRODUCTS || (m as any).tool === ToolName.CHECK_CLOSET)
  );
  const latestProducts = productResults.length > 0 ? productResults[productResults.length - 1] : null;

  return (
    <div className="absolute inset-x-0 bottom-24 z-30 px-4 pointer-events-none">
      <div
        ref={scrollRef}
        className="flex flex-col items-center gap-3 max-h-[60vh] overflow-y-auto pointer-events-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="glass-card text-center max-w-sm float-in">
            <h3 className="mb-2">
              {user ? `Good morning, ${user.displayName}.` : "Welcome to Mirra"}
            </h3>
            <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
              Tap the mic and ask me anything about your look.
            </p>
          </div>
        )}

        {/* Agent message card */}
        {activeMessage && (
          <AgentCard message={activeMessage} />
        )}

        {/* Product / Closet cards row */}
        {latestProducts && (
          <ItemCardRow data={(latestProducts as any).data} />
        )}

        {/* Before/After when VTO is active */}
        {vtoResult && (
          <button
            onClick={onRecapture}
            className="btn-secondary pointer-events-auto text-xs"
          >
            ↩ Show Original
          </button>
        )}
      </div>
    </div>
  );
}
