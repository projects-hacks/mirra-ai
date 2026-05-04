"use client";

import { useEffect, useRef, useState } from "react";
import type { Message, User, VTOResult } from "@/types";
import AgentCard from "@/components/cards/AgentCard";
import ItemCardRow from "@/components/cards/ItemCardRow";
import ProofCard from "@/components/cards/ProofCard";
import { ToolName } from "@/lib/constants";

interface AgentOverlayProps {
  messages: Message[];
  user: User | null;
  vtoResult: VTOResult | null;
  onRecapture: () => void;
}

/**
 * Format match_closet results into flat array for ItemCardRow
 * match_closet returns: { matches: { top: [...], bottom: [...] }, gaps: [...] }
 */
function _formatMatchClosetData(data: any): any[] {
  if (!data?.matches) return [];
  
  const items: any[] = [];
  
  // Flatten all categories into single array
  Object.entries(data.matches).forEach(([category, matches]: [string, any]) => {
    if (Array.isArray(matches)) {
      matches.forEach((match: any) => {
        items.push({
          ...match,
          source: "closet",
          owned: true,
          image_url: match.imageUrl,
        });
      });
    }
  });
  
  return items;
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
}: Readonly<AgentOverlayProps>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Get latest agent message (skip loading messages - they create "stuck" feeling)
  const lastAgent = [...messages].reverse().find((m) => m.type === "agent");

  // Show only agent messages, not loading states
  const activeMessage = lastAgent;

  // Product/closet cards from tool results
  const productResults = messages.filter(
    (m) => m.type === "tool_result" && 
    ((m as any).tool === ToolName.SEARCH_PRODUCTS || 
     (m as any).tool === ToolName.CHECK_CLOSET ||
     (m as any).tool === ToolName.MATCH_CLOSET)
  );
  const latestProducts = productResults.at(-1) ?? null;

  // Proof card from tool results
  const proofCardResults = messages.filter(
    (m) => m.type === "tool_result" && (m as any).tool === ToolName.GENERATE_PROOF_CARD
  );
  const latestProofCard = proofCardResults.at(-1) ?? null;
  const [showProofCard, setShowProofCard] = useState(false);

  // Show proof card when it arrives
  useEffect(() => {
    if (latestProofCard) {
      setShowProofCard(true);
    }
  }, [latestProofCard]);

  // Format match_closet results for ItemCardRow
  const formattedData = latestProducts && (latestProducts as any).tool === ToolName.MATCH_CLOSET
    ? _formatMatchClosetData((latestProducts as any).data)
    : (latestProducts as any)?.data;

  return (
    <div className="absolute inset-x-0 bottom-20 sm:bottom-24 z-30 px-3 sm:px-4 pointer-events-none">
      <div
        ref={scrollRef}
        className="flex flex-col items-center gap-2 sm:gap-3 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto pointer-events-auto"
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
        {latestProducts && !showProofCard && (
          <ItemCardRow data={formattedData} />
        )}

        {/* Proof Card */}
        {showProofCard && latestProofCard && (latestProofCard as any).data?.card && (
          <ProofCard
            card={(latestProofCard as any).data.card}
            onApprove={() => {
              console.log("Proof card approved");
              setShowProofCard(false);
            }}
            onAdjust={() => {
              console.log("Adjusting proof card");
              setShowProofCard(false);
            }}
            onSave={() => {
              console.log("Proof card saved");
              setShowProofCard(false);
            }}
            onClose={() => setShowProofCard(false)}
          />
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
