'use client';

import type { Distribution } from '@/lib/types';
import { computePercentages } from '@/lib/aggregate';

interface Props {
  distribution: Distribution;
  animationDelay?: number;
}

export default function SentimentBars({ distribution, animationDelay = 0 }: Props) {
  const pct = computePercentages(distribution);
  const total = distribution.positive + distribution.neutral + distribution.negative;

  const bars = [
    {
      label: 'Positive',
      count: distribution.positive,
      pct: pct.positive,
      color: 'var(--positive)',
      bgColor: 'rgba(74, 222, 128, 0.1)',
      delay: animationDelay + 0,
    },
    {
      label: 'Neutral',
      count: distribution.neutral,
      pct: pct.neutral,
      color: 'var(--neutral)',
      bgColor: 'rgba(148, 163, 184, 0.1)',
      delay: animationDelay + 100,
    },
    {
      label: 'Negative',
      count: distribution.negative,
      pct: pct.negative,
      color: 'var(--negative)',
      bgColor: 'rgba(248, 113, 113, 0.1)',
      delay: animationDelay + 200,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Sentiment Distribution</span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--paper-muted)',
          }}
        >
          {total} review{total !== 1 ? 's' : ''}
        </span>
      </div>

      {bars.map((bar) => (
        <div key={bar.label}>
          <div className="flex items-center justify-between mb-1.5">
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--paper-dim)',
                letterSpacing: '0.05em',
              }}
            >
              {bar.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: bar.color,
              }}
            >
              {bar.pct}%
              <span
                style={{
                  marginLeft: '0.5rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  color: 'var(--paper-muted)',
                  fontWeight: 400,
                }}
              >
                ({bar.count})
              </span>
            </span>
          </div>
          {/* Track */}
          <div
            className="relative w-full h-8 rounded-sm overflow-hidden"
            style={{ background: 'var(--charcoal-light)' }}
          >
            {/* Fill bar */}
            <div
              className="absolute left-0 top-0 h-full rounded-sm animate-bar-h"
              style={{
                width: `${bar.pct}%`,
                background: `linear-gradient(90deg, ${bar.color}CC, ${bar.color})`,
                animationDelay: `${bar.delay}ms`,
                animationDuration: '0.75s',
                boxShadow: `inset 0 0 0 1px ${bar.color}40`,
              }}
            />
            {/* Subtle misregistration stripe */}
            <div
              className="absolute left-0 top-0 h-full animate-bar-h"
              style={{
                width: `${bar.pct}%`,
                background: `linear-gradient(90deg, transparent 70%, ${bar.color}30)`,
                animationDelay: `${bar.delay + 50}ms`,
                animationDuration: '0.75s',
                transform: 'translate(2px, 1px)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
