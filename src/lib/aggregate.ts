import type { ReviewItem, Theme, Distribution, OverallSentiment, AnalysisResult } from './types';
import type { LlmOutput } from './schema';

/**
 * Aggregates raw LLM output into a fully computed AnalysisResult.
 * All math is deterministic — no LLM involvement here.
 */
export function aggregate(raw: LlmOutput): AnalysisResult {
  const items: ReviewItem[] = raw.items.map((item) => ({
    text: item.text,
    sentiment: item.sentiment,
    score: clamp(item.score, -1, 1),
  }));

  const distribution = computeDistribution(items);
  const averageScore = computeAverageScore(items);
  const overall = computeOverall(distribution, averageScore);

  // Normalize themes: ensure count doesn't exceed review count
  const themes: Theme[] = raw.themes
    .slice(0, 15)
    .map((t) => ({
      label: t.label.trim(),
      count: Math.min(t.count, items.length),
      sentiment: t.sentiment,
      examples: t.examples.slice(0, 3).map((e) => e.slice(0, 120)),
    }))
    .sort((a, b) => b.count - a.count);

  return { overall, distribution, averageScore, themes, items };
}

export function computeDistribution(items: ReviewItem[]): Distribution {
  const dist: Distribution = { positive: 0, neutral: 0, negative: 0 };
  for (const item of items) {
    dist[item.sentiment]++;
  }
  return dist;
}

export function computeAverageScore(items: ReviewItem[]): number {
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, item) => acc + item.score, 0);
  return roundTo(sum / items.length, 3);
}

export function computeOverall(
  distribution: Distribution,
  averageScore: number
): OverallSentiment {
  const total = distribution.positive + distribution.neutral + distribution.negative;
  if (total === 0) return 'mixed';

  const posRatio = distribution.positive / total;
  const negRatio = distribution.negative / total;

  // Strongly positive: >60% positive and average score > 0.2
  if (posRatio > 0.6 && averageScore > 0.2) return 'positive';
  // Strongly negative: >60% negative and average score < -0.2
  if (negRatio > 0.6 && averageScore < -0.2) return 'negative';
  return 'mixed';
}

export function computePercentages(distribution: Distribution): {
  positive: number;
  neutral: number;
  negative: number;
} {
  const total = distribution.positive + distribution.neutral + distribution.negative;
  if (total === 0) return { positive: 0, neutral: 0, negative: 0 };
  return {
    positive: roundTo((distribution.positive / total) * 100, 1),
    neutral: roundTo((distribution.neutral / total) * 100, 1),
    negative: roundTo((distribution.negative / total) * 100, 1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
