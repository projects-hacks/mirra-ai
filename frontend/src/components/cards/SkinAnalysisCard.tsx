"use client";

import { SkinAnalysis } from '@/types';
import RadialProgress from '@/components/ui/RadialProgress';
import { processSkinScores } from '@/lib/skinScoring';

interface SkinAnalysisCardProps {
  scores: SkinAnalysis;
  previousScores?: SkinAnalysis;
}

export default function SkinAnalysisCard({
  scores,
  previousScores,
}: Readonly<SkinAnalysisCardProps>) {
  const concerns = processSkinScores(scores, previousScores);
  const topConcerns = concerns.slice(0, 3); // Show worst 3 concerns

  return (
    <div className="glass-card w-full max-w-sm p-4 float-in">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
        <div>
          <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Skin Profile</h2>
          <div className="flex items-center gap-2 text-sm text-[var(--on-surface-variant)]">
            <span>Skin Age: <strong className="text-white">{scores.skin_age || '--'}</strong></span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">Health Score</span>
          <span className="text-2xl font-bold text-[var(--primary)]">{scores.health_score ?? '--'}</span>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] mb-3">
          Top Concerns
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {topConcerns.map((concern) => (
            <div key={concern.id} className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/10 text-center">
              <RadialProgress 
                progress={concern.value} 
                size={48} 
                strokeWidth={4} 
                color={concern.color} 
              />
              <span className="text-xs font-medium text-white mt-2 mb-1 leading-tight">{concern.label}</span>
              <span className="text-[10px] text-[var(--on-surface-variant)] leading-tight line-clamp-2">{concern.strategy}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] mb-2">
          Other Metrics
        </h3>
        <div className="flex flex-wrap gap-2">
          {concerns.slice(3).map((concern) => (
            <div key={concern.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: concern.color }} />
              <span className="text-xs text-white">{concern.label}</span>
              <span className="text-xs font-medium" style={{ color: concern.color }}>{concern.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
