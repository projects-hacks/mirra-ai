/**
 * Skin Scoring Strategy
 * Implements scoring logic and recommendations for skin analysis
 */

import type { SkinAnalysis } from '@/types';

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
      text = `↑ ${absChange.toFixed(0)}% better`;
    } else {
      text = `↓ ${absChange.toFixed(0)}% lower`;
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
  { key: 'darkCircle', label: 'Dark Circles' },
  { key: 'eyeBag', label: 'Eye Bags' },
  { key: 'firmness', label: 'Firmness' },
  { key: 'oiliness', label: 'Oiliness' },
  { key: 'texture', label: 'Texture' },
  { key: 'radiance', label: 'Radiance' },
  { key: 'ageSpot', label: 'Age Spots' },
];

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
