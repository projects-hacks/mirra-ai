"use client";

import { getSkinScoreColor } from "@/lib/skinScoring";

interface ScoreBarProps {
  label: string;
  value: number;
  detail?: string;
}

export default function ScoreBar({ label, value, detail }: Readonly<ScoreBarProps>) {
  const color = getSkinScoreColor(value);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs" style={{ color: "var(--on-surface-variant)" }}>
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 font-semibold" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/8">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(4, Math.min(100, value))}%`, background: color }}
        />
      </div>
      {detail && (
        <p className="mt-1 text-xs" style={{ color: "var(--on-surface-muted)" }}>
          {detail}
        </p>
      )}
    </div>
  );
}
