'use client';

import { useState } from 'react';
import type { ReviewItem } from '@/lib/types';

interface Props {
  items: ReviewItem[];
  animationDelay?: number;
}

type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative';

const PILL_CLASS = {
  positive: 'pill-positive',
  neutral: 'pill-neutral',
  negative: 'pill-negative',
} as const;

const SENTIMENT_LABEL = {
  positive: '+ Positive',
  neutral: '~ Neutral',
  negative: '− Negative',
} as const;

export default function ReviewList({ items, animationDelay = 0 }: Props) {
  const [filter, setFilter] = useState<SentimentFilter>('all');
  const [showAll, setShowAll] = useState(false);

  const filtered = filter === 'all' ? items : items.filter((i) => i.sentiment === filter);
  const PAGE = 20;
  const visible = showAll ? filtered : filtered.slice(0, PAGE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <span className="eyebrow">Per-Review Breakdown</span>

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'positive', 'neutral', 'negative'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setShowAll(false); }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '0.25rem 0.625rem',
                borderRadius: '2px',
                border: '1px solid',
                borderColor: filter === f ? 'var(--riso-blue)' : 'var(--rule)',
                background: filter === f ? 'var(--riso-blue-glow)' : 'transparent',
                color: filter === f ? 'var(--riso-blue)' : 'var(--paper-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {f === 'all' ? 'All' : f}
              <span style={{ marginLeft: '0.375rem', opacity: 0.7 }}>
                {f === 'all' ? items.length : items.filter((i) => i.sentiment === f).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Review rows */}
      <div className="flex flex-col gap-2">
        {visible.map((item, i) => (
          <div
            key={i}
            className="riso-card animate-fade-up"
            style={{
              padding: '0.75rem 1rem',
              animationDelay: `${animationDelay + i * 30}ms`,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '0.75rem',
              alignItems: 'start',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                color: 'var(--paper-dim)',
                lineHeight: '1.5',
                margin: 0,
                wordBreak: 'break-word',
              }}
            >
              {item.text}
            </p>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className={PILL_CLASS[item.sentiment]}>
                {SENTIMENT_LABEL[item.sentiment]}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  color: 'var(--paper-muted)',
                }}
              >
                {item.score > 0 ? '+' : ''}{item.score.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length > PAGE && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="riso-btn riso-btn-secondary self-center"
          style={{ marginTop: '0.5rem' }}
        >
          Show all {filtered.length} reviews ↓
        </button>
      )}

      {filtered.length === 0 && (
        <div
          className="riso-card text-center py-10"
          style={{ color: 'var(--paper-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}
        >
          No reviews match this filter.
        </div>
      )}
    </div>
  );
}
