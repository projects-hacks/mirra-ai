"use client";

import type { Message } from "@/types";
import { LOADING_TEXT } from "@/lib/constants";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  switch (message.type) {
    case "user":
      return (
        <div className="flex justify-end">
          <div className="bubble bubble-user">{message.text}</div>
        </div>
      );

    case "agent":
      return (
        <div className="flex justify-start">
          <div className="bubble bubble-agent">{message.text}</div>
        </div>
      );

    case "loading":
      return (
        <div className="flex justify-start">
          <div className="bubble bubble-agent flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-[var(--accent)] rounded-full animate-spin" />
            <span className="text-[var(--text-secondary)]">{message.text}</span>
          </div>
        </div>
      );

    case "tool_result":
      return (
        <div className="flex justify-start w-full">
          <div className="glass-subtle p-3 w-full slide-up">
            <p className="text-caption mb-2">
              {LOADING_TEXT[message.tool]?.replace("…", "") ?? "Result"}
            </p>
            <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(message.data, null, 2)}
            </pre>
          </div>
        </div>
      );

    default:
      return null;
  }
}
