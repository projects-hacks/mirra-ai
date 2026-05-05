// @deprecated: voice-mode only. Retained temporarily during the tap-driven migration.
"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Message,
  ProofCard as ProofCardData,
  SkinAnalysis,
  ToolResultMessage,
  User,
  VTOResult,
} from "@/types";
import AgentCard from "@/components/cards/AgentCard";
import ItemCardRow from "@/components/cards/ItemCardRow";
import ProofCard from "@/components/cards/ProofCard";
import SkinSimulationCard from "@/components/cards/SkinSimulationCard";
import SkinAnalysisCard from "@/components/cards/SkinAnalysisCard";
import { ToolName } from "@/lib/constants";

interface AgentOverlayProps {
  messages: Message[];
  user: User | null;
  vtoResult: VTOResult | null;
  onRecapture: () => void;
  originalSelfieUrl?: string;
}

/**
 * Format match_closet results into flat array for ItemCardRow
 * match_closet returns: { matches: { top: [...], bottom: [...] }, gaps: [...] }
 */
interface MatchClosetItem {
  id?: string;
  name?: string;
  title?: string;
  imageUrl?: string;
  image_url?: string;
  owned?: boolean;
  source?: string;
}

interface MatchClosetData {
  matches?: Record<string, MatchClosetItem[]>;
}

interface ProofCardToolData {
  card?: ProofCardData;
}

interface SkinSimulationToolData {
  simulation_url?: string;
  intensities_used?: Record<string, number>;
}

function isToolResultMessage(message: Message): message is ToolResultMessage {
  return message.type === "tool_result";
}

function isToolResultFor(message: Message, tool: ToolName): message is ToolResultMessage {
  return isToolResultMessage(message) && message.tool === tool;
}

function formatMatchClosetData(data: unknown): MatchClosetItem[] {
  if (!data || typeof data !== "object" || !("matches" in data)) {
    return [];
  }

  const matches = (data as MatchClosetData).matches;
  if (!matches) return [];

  return Object.values(matches).flatMap((categoryMatches) =>
    Array.isArray(categoryMatches)
      ? categoryMatches.map((match) => ({
          ...match,
          source: "closet",
          owned: true,
          image_url: match.imageUrl,
        }))
      : []
  );
}

function getProofCardData(data: unknown): ProofCardToolData | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  return data as ProofCardToolData;
}

function getSkinSimulationData(data: unknown): SkinSimulationToolData | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  return data as SkinSimulationToolData;
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
  originalSelfieUrl,
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
    (message): message is ToolResultMessage =>
      isToolResultMessage(message) &&
      (message.tool === ToolName.SEARCH_PRODUCTS ||
        message.tool === ToolName.MATCH_CLOSET)
  );
  const latestProducts = productResults.at(-1) ?? null;

  // Proof card from tool results
  const proofCardResults = messages.filter(
    (message): message is ToolResultMessage =>
      isToolResultMessage(message) &&
      message.tool === ToolName.GENERATE_PROOF_CARD
  );
  const latestProofCard = proofCardResults.at(-1) ?? null;
  const [dismissedProofCardId, setDismissedProofCardId] = useState<string | null>(null);
  const proofCardData = getProofCardData(latestProofCard?.data);
  const shouldShowProofCard =
    Boolean(latestProofCard && proofCardData?.card) &&
    latestProofCard?.id !== dismissedProofCardId;

  // Skin simulation results
  const skinSimResults = messages.filter(
    (message): message is ToolResultMessage =>
      isToolResultFor(message, ToolName.SIMULATE_SKIN)
  );
  const latestSkinSim = skinSimResults.at(-1) ?? null;
  const skinSimulationData = getSkinSimulationData(latestSkinSim?.data);

  // Skin analysis results
  const skinAnalysisResults = messages.filter(
    (message): message is ToolResultMessage =>
      isToolResultFor(message, ToolName.ANALYZE_SKIN)
  );
  const latestSkinAnalysis = skinAnalysisResults.at(-1) ?? null;

  // Format match_closet results for ItemCardRow
  const formattedData =
    latestProducts?.tool === ToolName.MATCH_CLOSET
      ? formatMatchClosetData(latestProducts.data)
      : latestProducts?.data;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-[var(--z-agent)] px-3 sm:px-5">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[rgba(249,249,249,0.6)] to-transparent"
      />
      <div
        ref={scrollRef}
        className="pointer-events-auto absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(62vh,540px)] w-full max-w-[var(--camera-overlay-max)] flex-col items-center gap-3 overflow-y-auto rounded-t-[2rem] px-3 pt-24 sm:right-5 sm:left-auto sm:top-24 sm:bottom-28 sm:max-h-[calc(100dvh-9rem)] sm:rounded-[2rem] sm:border sm:border-white/45 sm:bg-[rgba(255,255,255,0.52)] sm:px-4 sm:pt-6 sm:shadow-[0_18px_50px_rgba(26,28,30,0.12)]"
        style={{
          scrollbarWidth: "none",
          paddingBottom: "calc(var(--orb-size) + var(--orb-bottom) + 1rem)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
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
        {latestProducts && !shouldShowProofCard && (
          <ItemCardRow data={formattedData} />
        )}

        {/* Proof Card */}
        {shouldShowProofCard && proofCardData?.card && (
          <ProofCard
            card={proofCardData.card}
            onApprove={() => {
              console.log("Proof card approved");
              setDismissedProofCardId(latestProofCard?.id ?? null);
            }}
            onAdjust={() => {
              console.log("Adjusting proof card");
              setDismissedProofCardId(latestProofCard?.id ?? null);
            }}
            onSave={() => {
              console.log("Proof card saved");
              setDismissedProofCardId(latestProofCard?.id ?? null);
            }}
            onClose={() => setDismissedProofCardId(latestProofCard?.id ?? null)}
          />
        )}

        {/* Skin Simulation Card */}
        {latestSkinSim && originalSelfieUrl && skinSimulationData?.simulation_url && (
          <SkinSimulationCard
            originalUrl={originalSelfieUrl}
            simulatedUrl={skinSimulationData.simulation_url}
            intensities={skinSimulationData.intensities_used ?? {}}
          />
        )}

        {/* Skin Analysis Card */}
        {latestSkinAnalysis && !latestSkinSim && (
          <SkinAnalysisCard
            scores={latestSkinAnalysis.data as SkinAnalysis}
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
