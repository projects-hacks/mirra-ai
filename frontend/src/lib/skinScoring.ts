/**
 * Skin Scoring Strategy
 * Implements scoring logic and recommendations for skin analysis
 */

import type { SkinAnalysis, SkinConcern as NormalizedSkinConcern } from '@/types';

export enum ScoreLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export interface SkinConcern {
  key: string;
  label: string;
  score: number;
  level: ScoreLevel;
  color: string;
  recommendation?: string;
}

/**
 * Strategy pattern for skin score evaluation
 */
class SkinScoreStrategy {
  /**
   * Determine score level based on value (0-100)
   */
  getLevel(score: number): ScoreLevel {
    if (score >= 80) return ScoreLevel.EXCELLENT;
    if (score >= 60) return ScoreLevel.GOOD;
    if (score >= 40) return ScoreLevel.FAIR;
    return ScoreLevel.POOR;
  }

  /**
   * Get color for score level
   */
  getColor(level: ScoreLevel): string {
    const colorMap: Record<ScoreLevel, string> = {
      [ScoreLevel.EXCELLENT]: '#2e7d32', // green
      [ScoreLevel.GOOD]: '#66bb6a',      // light green
      [ScoreLevel.FAIR]: '#ffa726',      // orange
      [ScoreLevel.POOR]: '#ef5350',      // red
    };
    return colorMap[level];
  }

  /**
   * Get recommendation based on concern and score
   */
  getRecommendation(concern: string, score: number): string {
    if (score >= 70) return ''; // No recommendation needed for good scores

    const recommendations: Record<string, string> = {
      moisture: 'Consider a hydrating serum with hyaluronic acid',
      acne: 'Try a gentle salicylic acid cleanser',
      wrinkle: 'Use a retinol-based night cream',
      pore: 'Exfoliate regularly with AHA/BHA',
      redness: 'Look for products with niacinamide',
      darkCircle: 'Try an eye cream with caffeine',
      eyeBag: 'Get adequate sleep and use a cooling eye gel',
      firmness: 'Consider peptide-rich serums',
      oiliness: 'Use oil-free, mattifying products',
      texture: 'Regular exfoliation can help smooth texture',
      radiance: 'Try vitamin C serums for brightness',
      ageSpot: 'Use SPF daily and consider vitamin C',
    };

    return recommendations[concern] || 'Consult a dermatologist for personalized advice';
  }

  /**
   * Calculate trend percentage change
   */
  calculateTrend(current: number, previous: number): {
    change: number;
    isImprovement: boolean;
    text: string;
  } {
    const change = ((current - previous) / previous) * 100;
    const isImprovement = change > 0;
    const absChange = Math.abs(change);

    let text = '';
    if (absChange < 2) {
      text = 'Stable';
    } else if (isImprovement) {
      text = `${absChange.toFixed(0)}% better`;
    } else {
      text = `${absChange.toFixed(0)}% lower`;
    }

    return { change, isImprovement, text };
  }
}

export const skinScoreStrategy = new SkinScoreStrategy();

/**
 * Concern display configuration
 */
export const SKIN_CONCERNS: Array<{ key: string; label: string }> = [
  { key: 'moisture', label: 'Moisture' },
  { key: 'acne', label: 'Acne' },
  { key: 'wrinkle', label: 'Wrinkles' },
  { key: 'pore', label: 'Pores' },
  { key: 'redness', label: 'Redness' },
  { key: 'dark_circle_v2', label: 'Dark Circles' },
  { key: 'eye_bag', label: 'Eye Bags' },
  { key: 'firmness', label: 'Firmness' },
  { key: 'oiliness', label: 'Oiliness' },
  { key: 'texture', label: 'Texture' },
  { key: 'radiance', label: 'Radiance' },
  { key: 'age_spot', label: 'Spots' },
  { key: 'droopy_upper_eyelid', label: 'Upper Eyelid' },
  { key: 'droopy_lower_eyelid', label: 'Lower Eyelid' },
];

export const CONCERN_LABELS: Record<string, string> = Object.fromEntries(
  SKIN_CONCERNS.map((concern) => [concern.key, concern.label])
);

export const CONCERN_PRODUCT_QUERIES: Record<string, string> = {
  moisture: 'hyaluronic acid hydrating serum',
  acne: 'salicylic acid acne cleanser',
  wrinkle: 'retinol anti-aging cream',
  pore: 'niacinamide pore minimizing serum',
  dark_circle_v2: 'vitamin C eye cream',
  dark_circle: 'vitamin C eye cream',
  redness: 'centella asiatica calming cream',
  oiliness: 'oil free mattifying moisturizer',
  texture: 'AHA BHA chemical exfoliant',
  radiance: 'vitamin C brightening serum',
  firmness: 'peptide firming cream',
  age_spot: 'dark spot correcting serum',
  eye_bag: 'caffeine depuffing eye cream',
};

export function getSkinScoreColor(score: number): string {
  if (score >= 80) return '#15803d';
  if (score >= 60) return '#d97706';
  return '#b91c1c';
}

export function extractSkinScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const candidate = record.ui_score ?? record.score ?? record.raw_score;
  return typeof candidate === 'number' && Number.isFinite(candidate) ? Math.round(candidate) : null;
}

export function extractRawSkinScore(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = (value as Record<string, unknown>).raw_score;
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : undefined;
}

export function normalizeSkinConcerns(scores?: Record<string, unknown> | null): NormalizedSkinConcern[] {
  if (!scores) return [];

  return SKIN_CONCERNS
    .map<NormalizedSkinConcern | null>(({ key, label }) => {
      const score = extractSkinScore(scores[key]);
      if (score === null) return null;
      const value = scores[key];
      const outputMaskName = value && typeof value === 'object'
        ? (value as Record<string, unknown>).output_mask_name
        : undefined;
      const rawScore = extractRawSkinScore(value);

      const concern: NormalizedSkinConcern = {
        key,
        label,
        score,
      };
      if (rawScore !== undefined) concern.rawScore = rawScore;
      if (typeof outputMaskName === 'string') concern.outputMaskName = outputMaskName;
      return concern;
    })
    .filter((concern): concern is NormalizedSkinConcern => concern !== null)
    .sort((a, b) => a.score - b.score);
}

export function deriveSimulationIntensities(
  scores?: Record<string, unknown> | null,
  concernKeys = ['wrinkle', 'radiance', 'acne', 'pore', 'texture', 'dark_circle_v2', 'redness', 'oiliness', 'eye_bag', 'age_spot']
): Record<string, number> {
  const intensities: Record<string, number> = {};

  for (const key of concernKeys) {
    const score = extractSkinScore(scores?.[key]);
    const simulationKey = key === 'dark_circle_v2' ? 'dark_circle' : key === 'eye_bag' ? 'eye_bags' : key === 'age_spot' ? 'spots' : key;
    intensities[simulationKey] = score === null
      ? 0.3
      : Math.max(0.1, Math.min(0.9, Number(((100 - score) / 100).toFixed(2))));
  }

  return intensities;
}

/**
 * Process raw skin analysis data into structured concerns
 */
export function processSkinScores(
  scores: Record<string, number> | SkinAnalysis,
  previousScores?: Record<string, number> | SkinAnalysis
): SkinConcern[] {
  void previousScores;
  const scoresObj = scores as Record<string, number>;

  return SKIN_CONCERNS.map(({ key, label }) => {
    const score = scoresObj[key] ?? 0;
    const level = skinScoreStrategy.getLevel(score);

    return {
      key,
      label,
      score,
      level,
      color: skinScoreStrategy.getColor(level),
      recommendation: skinScoreStrategy.getRecommendation(key, score),
    };
  }).sort((a, b) => a.score - b.score); // Sort by score (worst first)
}
