import { describe, it, expect } from 'vitest';
import {
  computeDistribution,
  computeAverageScore,
  computeOverall,
  computePercentages,
  aggregate,
} from '../aggregate';
import type { ReviewItem } from '../types';
import type { LlmOutput } from '../schema';

// ─── computeDistribution ─────────────────────────────────────────────────────

describe('computeDistribution', () => {
  it('counts positive, neutral, negative correctly', () => {
    const items: ReviewItem[] = [
      { text: 'A', sentiment: 'positive', score: 0.9 },
      { text: 'B', sentiment: 'positive', score: 0.7 },
      { text: 'C', sentiment: 'neutral', score: 0.0 },
      { text: 'D', sentiment: 'negative', score: -0.5 },
    ];
    expect(computeDistribution(items)).toEqual({ positive: 2, neutral: 1, negative: 1 });
  });

  it('handles all-positive', () => {
    const items: ReviewItem[] = [
      { text: 'A', sentiment: 'positive', score: 1 },
      { text: 'B', sentiment: 'positive', score: 0.8 },
    ];
    expect(computeDistribution(items)).toEqual({ positive: 2, neutral: 0, negative: 0 });
  });

  it('handles empty array', () => {
    expect(computeDistribution([])).toEqual({ positive: 0, neutral: 0, negative: 0 });
  });
});

// ─── computeAverageScore ─────────────────────────────────────────────────────

describe('computeAverageScore', () => {
  it('computes mean correctly', () => {
    const items: ReviewItem[] = [
      { text: 'A', sentiment: 'positive', score: 1.0 },
      { text: 'B', sentiment: 'negative', score: -1.0 },
    ];
    expect(computeAverageScore(items)).toBe(0);
  });

  it('rounds to 3 decimal places', () => {
    const items: ReviewItem[] = [
      { text: 'A', sentiment: 'positive', score: 1 },
      { text: 'B', sentiment: 'positive', score: 0.5 },
      { text: 'C', sentiment: 'neutral', score: 0 },
    ];
    // (1 + 0.5 + 0) / 3 = 0.5
    expect(computeAverageScore(items)).toBe(0.5);
  });

  it('returns 0 for empty array', () => {
    expect(computeAverageScore([])).toBe(0);
  });

  it('returns exact score for single item', () => {
    const items: ReviewItem[] = [{ text: 'A', sentiment: 'positive', score: 0.75 }];
    expect(computeAverageScore(items)).toBe(0.75);
  });
});

// ─── computeOverall ──────────────────────────────────────────────────────────

describe('computeOverall', () => {
  it('returns positive when >60% positive and avgScore > 0.2', () => {
    expect(computeOverall({ positive: 7, neutral: 1, negative: 2 }, 0.5)).toBe('positive');
  });

  it('returns negative when >60% negative and avgScore < -0.2', () => {
    expect(computeOverall({ positive: 1, neutral: 1, negative: 8 }, -0.6)).toBe('negative');
  });

  it('returns mixed when split evenly', () => {
    expect(computeOverall({ positive: 5, neutral: 0, negative: 5 }, 0.0)).toBe('mixed');
  });

  it('returns mixed when positive ratio >60% but avgScore ≤ 0.2', () => {
    expect(computeOverall({ positive: 7, neutral: 1, negative: 2 }, 0.1)).toBe('mixed');
  });

  it('returns mixed for empty distribution', () => {
    expect(computeOverall({ positive: 0, neutral: 0, negative: 0 }, 0)).toBe('mixed');
  });

  it('returns mixed when negative ratio >60% but avgScore ≥ -0.2', () => {
    expect(computeOverall({ positive: 1, neutral: 1, negative: 8 }, -0.1)).toBe('mixed');
  });
});

// ─── computePercentages ──────────────────────────────────────────────────────

describe('computePercentages', () => {
  it('computes correct percentages', () => {
    const dist = { positive: 3, neutral: 1, negative: 1 };
    const pct = computePercentages(dist);
    expect(pct.positive).toBe(60);
    expect(pct.neutral).toBe(20);
    expect(pct.negative).toBe(20);
  });

  it('handles zero total', () => {
    const pct = computePercentages({ positive: 0, neutral: 0, negative: 0 });
    expect(pct).toEqual({ positive: 0, neutral: 0, negative: 0 });
  });

  it('sums to approximately 100 for typical distributions', () => {
    const pct = computePercentages({ positive: 3, neutral: 3, negative: 3 });
    expect(pct.positive + pct.neutral + pct.negative).toBeCloseTo(100, 0);
  });
});

// ─── aggregate ───────────────────────────────────────────────────────────────

describe('aggregate', () => {
  const mockInput: LlmOutput = {
    items: [
      { text: 'Great!', sentiment: 'positive', score: 0.9 },
      { text: 'Okay.', sentiment: 'neutral', score: 0.0 },
      { text: 'Terrible!', sentiment: 'negative', score: -0.8 },
      { text: 'Loved it!', sentiment: 'positive', score: 0.85 },
      { text: 'Loved it again!', sentiment: 'positive', score: 0.8 },
      { text: 'Loved it one more!', sentiment: 'positive', score: 0.75 },
      { text: 'Still good.', sentiment: 'positive', score: 0.7 },
      { text: 'Pretty good.', sentiment: 'positive', score: 0.65 },
      { text: 'Decent.', sentiment: 'positive', score: 0.6 },
      { text: 'Not bad.', sentiment: 'positive', score: 0.55 },
    ],
    themes: [
      { label: 'Quality', count: 5, sentiment: 'positive', examples: ['Great!', 'Loved it!'] },
      { label: 'Service', count: 3, sentiment: 'neutral', examples: ['Okay.'] },
      { label: 'Shipping', count: 2, sentiment: 'negative', examples: ['Terrible!'] },
    ],
  };

  it('preserves all items', () => {
    const result = aggregate(mockInput);
    expect(result.items).toHaveLength(10);
  });

  it('computes distribution correctly', () => {
    const result = aggregate(mockInput);
    expect(result.distribution).toEqual({ positive: 8, neutral: 1, negative: 1 });
  });

  it('clamps scores to [-1, 1]', () => {
    const input: LlmOutput = {
      items: [{ text: 'x', sentiment: 'positive', score: 1.5 }],
      themes: [{ label: 'T', count: 1, sentiment: 'positive', examples: ['x'] }],
    };
    const result = aggregate(input);
    expect(result.items[0].score).toBe(1);
  });

  it('sorts themes by count descending', () => {
    const result = aggregate(mockInput);
    expect(result.themes[0].label).toBe('Quality');
    expect(result.themes[1].label).toBe('Service');
    expect(result.themes[2].label).toBe('Shipping');
  });

  it('caps theme examples at 3', () => {
    const input: LlmOutput = {
      items: [{ text: 'x', sentiment: 'positive', score: 0.5 }],
      themes: [
        {
          label: 'Quality',
          count: 1,
          sentiment: 'positive',
          examples: ['ex1', 'ex2', 'ex3', 'ex4', 'ex5'],
        },
      ],
    };
    const result = aggregate(input);
    expect(result.themes[0].examples).toHaveLength(3);
  });

  it('caps theme examples text at 120 chars', () => {
    const longExample = 'a'.repeat(200);
    const input: LlmOutput = {
      items: [{ text: 'x', sentiment: 'positive', score: 0.5 }],
      themes: [{ label: 'Quality', count: 1, sentiment: 'positive', examples: [longExample] }],
    };
    const result = aggregate(input);
    expect(result.themes[0].examples[0]).toHaveLength(120);
  });

  it('computes averageScore as mean of item scores', () => {
    const input: LlmOutput = {
      items: [
        { text: 'A', sentiment: 'positive', score: 1.0 },
        { text: 'B', sentiment: 'negative', score: -1.0 },
      ],
      themes: [{ label: 'T', count: 1, sentiment: 'neutral', examples: ['A'] }],
    };
    const result = aggregate(input);
    expect(result.averageScore).toBe(0);
  });
});
