'use client';

import type { OverallSentiment } from '@/lib/types';

interface Props {
  overall: OverallSentiment;
  averageScore: number;
}

const CONFIGS = {
  positive: {
    label: 'Overall Positive',
    color: 'var(--positive)',
    glow: 'rgba(74, 222, 128, 0.2)',
    symbol: '+',
  },
  mixed: {
    label: 'Mixed Signals',
    color: 'var(--riso-yellow)',
    glow: 'rgba(245, 200, 66, 0.15)',
    symbol: '~',
  },
  negative: {
    label: 'Overall Negative',
    color: 'var(--negative)',
    glow: 'rgba(248, 113, 113, 0.2)',
    symbol: '−',
  },
} as const;

export default function OverallScore({ overall, averageScore }: Props) {
  const config = CONFIGS[overall];
  // Score dial: map [-1, 1] to [0, 100] for display
  const dialPct = Math.round(((averageScore + 1) / 2) * 100);

  return (
    <div
      className="riso-card flex flex-col items-center justify-center gap-4 py-8 px-6 text-center"
      style={{
        border: `1px solid ${config.color}`,
        boxShadow: `0 0 32px ${config.glow}, 3px 3px 0 var(--riso-orange)`,
      }}
    >
      {/* Large symbol */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '3.5rem',
          fontWeight: 900,
          lineHeight: 1,
          color: config.color,
          textShadow: `
            -2px -1px 0 rgba(43, 95, 227, 0.4),
            2px  1px 0 rgba(255, 107, 53, 0.3)
          `,
        }}
      >
        {config.symbol}
      </div>

      <div>
        <div className="eyebrow mb-1" style={{ color: config.color }}>
          Verdict
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--paper)',
            letterSpacing: '-0.02em',
          }}
        >
          {config.label}
        </div>
      </div>

      {/* Score dial */}
      <div className="w-full">
        <div
          className="flex justify-between mb-1"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--paper-muted)' }}
        >
          <span>−1.0</span>
          <span>Avg Score</span>
          <span>+1.0</span>
        </div>
        <div
          className="w-full h-3 rounded-sm overflow-hidden relative"
          style={{
            background: 'linear-gradient(90deg, var(--negative), var(--charcoal-light) 40%, var(--charcoal-light) 60%, var(--positive))',
          }}
        >
          {/* Score indicator needle */}
          <div
            className="absolute top-0 w-0.5 h-full"
            style={{
              left: `${dialPct}%`,
              background: 'var(--paper)',
              transform: 'translateX(-50%)',
              boxShadow: '0 0 4px rgba(240, 237, 230, 0.8)',
            }}
          />
        </div>
        <div
          className="text-center mt-1"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: config.color,
          }}
        >
          {averageScore > 0 ? '+' : ''}{averageScore.toFixed(3)}
        </div>
      </div>
    </div>
  );
}
