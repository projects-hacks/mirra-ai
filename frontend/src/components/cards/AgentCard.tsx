"use client";

import type { Message } from "@/types";
import { LOADING_TEXT } from "@/lib/constants";

interface AgentCardProps {
  message: Message;
}

/** Glassmorphic agent card that floats over the camera. */
export default function AgentCard({ message }: AgentCardProps) {
  if (message.type === "loading") {
    return (
      <div className="agent-card float-in">
        <div className="flex items-center gap-3">
          <span className="inline-block w-5 h-5 border-2 border-[var(--outline-variant)] border-t-[var(--primary)] rounded-full animate-spin" />
          <span className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            {message.text}
          </span>
        </div>
      </div>
    );
  }

  if (message.type === "agent") {
    return (
      <div className="agent-card float-in">
        <div className="agent-label">Mirra Agent</div>
        <div className="agent-text">{message.text}</div>
      </div>
    );
  }

  if (message.type === "user") {
    return (
      <div className="agent-card float-in" style={{ background: "var(--secondary-container)" }}>
        <div className="agent-text">{message.text}</div>
      </div>
    );
  }

  if (message.type === "tool_result") {
    return (
      <div className="agent-card float-in">
        <div className="agent-label">
          {LOADING_TEXT[message.tool]?.replace("…", "") ?? "Result"}
        </div>
        <pre className="text-xs mt-2 whitespace-pre-wrap overflow-x-auto" style={{ color: "var(--on-surface-variant)" }}>
          {JSON.stringify(message.data, null, 2)}
        </pre>
      </div>
    );
  }

  return null;
}
