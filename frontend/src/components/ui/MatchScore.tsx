"use client";

interface MatchScoreProps {
  label: string;
  score: number;
  icon?: string;
  showBar?: boolean;
}

/**
 * Reusable match score display component
 * Used in ProofCard to show tone match, style fit, etc.
 */
export default function MatchScore({
  label,
  score,
  icon = "check_circle",
  showBar = true,
}: Readonly<MatchScoreProps>) {
  const percentage = Math.round(score);
  const barWidth = `${percentage}%`;

  return (
    <div className="flex items-center gap-4 px-4 min-h-14 justify-between">
      <div className="flex items-center gap-4">
        <div
          className="flex items-center justify-center rounded-lg shrink-0 size-10"
          style={{ background: "var(--surface-container)" }}
        >
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
        <p className="text-base font-normal leading-normal flex-1 truncate">
          {label} ({percentage}%)
        </p>
      </div>
      {showBar && (
        <div className="shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-[88px] overflow-hidden rounded-sm"
              style={{ background: "var(--surface-variant)" }}
            >
              <div
                className="h-1 rounded-full"
                style={{
                  width: barWidth,
                  background: "var(--primary)",
                }}
              />
            </div>
            <p className="text-sm font-medium leading-normal">{percentage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
