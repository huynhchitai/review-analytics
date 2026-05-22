'use client';

import type { Theme } from '@/lib/types';

interface Props {
  themes: Theme[];
  totalReviews: number;
  animationDelay?: number;
}

const SENTIMENT_COLOR = {
  positive: 'var(--positive)',
  neutral: 'var(--neutral)',
  negative: 'var(--negative)',
} as const;

export default function ThemeBreakdown({ themes, totalReviews, animationDelay = 0 }: Props) {
  const maxCount = Math.max(...themes.map((t) => t.count), 1);

  return (
    <div className="flex flex-col gap-5">
      <span className="eyebrow">Recurring Themes</span>

      {themes.map((theme, i) => {
        const widthPct = Math.round((theme.count / maxCount) * 100);
        const coveragePct = Math.round((theme.count / totalReviews) * 100);
        const color = SENTIMENT_COLOR[theme.sentiment];

        return (
          <div
            key={theme.label}
            className="animate-fade-up"
            style={{ animationDelay: `${animationDelay + i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-4 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {/* Riso dot indicator */}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: color,
                    boxShadow: `1px 1px 0 ${theme.sentiment === 'positive' ? 'var(--riso-orange)' : 'var(--riso-blue)'}`,
                  }}
                />
                <span
                  className="truncate"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    color: 'var(--paper)',
                  }}
                >
                  {theme.label}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    color: 'var(--paper-muted)',
                  }}
                >
                  {coveragePct}% of reviews
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color,
                  }}
                >
                  {theme.count}
                </span>
              </div>
            </div>

            {/* Bar */}
            <div
              className="w-full h-2 rounded-sm overflow-hidden mb-2"
              style={{ background: 'var(--charcoal-light)' }}
            >
              <div
                className="h-full rounded-sm animate-bar-h"
                style={{
                  width: `${widthPct}%`,
                  background: color,
                  opacity: 0.7,
                  animationDelay: `${animationDelay + i * 60 + 150}ms`,
                  animationDuration: '0.6s',
                }}
              />
            </div>

            {/* Example quotes */}
            {theme.examples.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {theme.examples.map((ex, j) => (
                  <span
                    key={j}
                    className="max-w-xs truncate"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.625rem',
                      color: 'var(--paper-muted)',
                      background: 'var(--charcoal-light)',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '2px',
                      border: '1px solid var(--rule-soft)',
                    }}
                    title={ex}
                  >
                    &ldquo;{ex}&rdquo;
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
