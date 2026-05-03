/**
 * Skin Analysis Modal
 * Displays detailed skin scores with radial progress charts
 */

"use client";

import { useEffect } from 'react';
import { SkinAnalysis } from '@/types';
import RadialProgress from '@/components/ui/RadialProgress';
import { processSkinScores, skinScoreStrategy } from '@/lib/skinScoring';

interface SkinAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: SkinAnalysis;
  previousScores?: SkinAnalysis;
}

export default function SkinAnalysisModal({
  isOpen,
  onClose,
  scores,
  previousScores,
}: SkinAnalysisModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const concerns = processSkinScores(scores, previousScores);
  const topConcerns = concerns.slice(0, 3); // Show worst 3 concerns

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="
            bg-[var(--surface)] 
            w-full sm:max-w-2xl sm:rounded-[2rem] 
            max-h-[90vh] overflow-y-auto
            slide-up
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-[var(--surface)]/95 backdrop-blur-xl border-b border-[var(--outline-variant)]/20 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="font-h2 text-h3">Skin Analysis</h2>
              {scores.overallScore && (
                <p className="text-sm text-[var(--on-surface-variant)] mt-1">
                  Overall Score: {Math.round(scores.overallScore)}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-[var(--surface-container)] transition-colors flex items-center justify-center"
              aria-label="Close"
            >
              <span className="text-2xl text-[var(--on-surface-variant)]">×</span>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-8">
            {/* Skin Age */}
            {scores.overallScore && (
              <div className="text-center py-4">
                <div className="inline-flex flex-col items-center gap-2">
                  <RadialProgress
                    value={scores.overallScore}
                    size={120}
                    strokeWidth={10}
                    color="var(--primary)"
                    showValue={true}
                  />
                  <p className="font-h3 text-2xl mt-2">
                    Overall Health
                  </p>
                  <p className="text-sm text-[var(--on-surface-variant)]">
                    {skinScoreStrategy.getLevel(scores.overallScore).toUpperCase()}
                  </p>
                </div>
              </div>
            )}

            {/* Top Concerns */}
            {topConcerns.length > 0 && (
              <div>
                <h3 className="font-h3 text-lg mb-4">Areas to Focus On</h3>
                <div className="space-y-3">
                  {topConcerns.map((concern) => (
                    <div
                      key={concern.key}
                      className="glass-card p-4 flex items-start gap-4"
                    >
                      <RadialProgress
                        value={concern.score}
                        size={60}
                        strokeWidth={5}
                        color={concern.color}
                        showValue={false}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-[var(--on-surface)]">
                            {concern.label}
                          </h4>
                          <span
                            className="text-sm font-bold"
                            style={{ color: concern.color }}
                          >
                            {Math.round(concern.score)}
                          </span>
                        </div>
                        {concern.recommendation && (
                          <p className="text-sm text-[var(--on-surface-variant)]">
                            {concern.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Scores Grid */}
            <div>
              <h3 className="font-h3 text-lg mb-4">Detailed Scores</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {concerns.map((concern) => (
                  <RadialProgress
                    key={concern.key}
                    value={concern.score}
                    size={80}
                    strokeWidth={6}
                    color={concern.color}
                    label={concern.label}
                    showValue={true}
                  />
                ))}
              </div>
            </div>

            {/* Trend Comparison */}
            {previousScores && (
              <div className="glass-card p-4">
                <h3 className="font-h3 text-lg mb-3">Since Last Scan</h3>
                <div className="space-y-2">
                  {concerns.slice(0, 5).map((concern) => {
                    const prevScore = (previousScores as any)[concern.key];
                    if (!prevScore) return null;

                    const trend = skinScoreStrategy.calculateTrend(
                      concern.score,
                      prevScore
                    );

                    return (
                      <div
                        key={concern.key}
                        className="flex items-center justify-between py-2 border-b border-[var(--outline-variant)]/20 last:border-0"
                      >
                        <span className="text-sm text-[var(--on-surface)]">
                          {concern.label}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            trend.isImprovement
                              ? 'text-[var(--success)]'
                              : 'text-[var(--error)]'
                          }`}
                        >
                          {trend.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-[var(--surface)]/95 backdrop-blur-xl border-t border-[var(--outline-variant)]/20 px-6 py-4">
            <button
              onClick={onClose}
              className="btn-primary w-full"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
