'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import RisoNav from '@/components/RisoNav';
import type { AnalyzeResponse, AnalyzeError, AnalysisResult } from '@/lib/types';
import { parseReviewsCsv } from '@/lib/csv';

// Dynamically import dashboard components (client-only, after analysis)
const SentimentBars = dynamic(() => import('@/components/SentimentBars'));
const ThemeBreakdown = dynamic(() => import('@/components/ThemeBreakdown'));
const ReviewList = dynamic(() => import('@/components/ReviewList'));
const ExportButtons = dynamic(() => import('@/components/ExportButtons'));
const OverallScore = dynamic(() => import('@/components/OverallScore'));

const SAMPLE_REVIEWS = `The build quality is exceptional — feels like it'll last years.
Delivery took 3 weeks, which was frustrating since the listing said 5-7 days.
Customer support was incredibly responsive and resolved my issue within an hour.
Product looks nothing like the photos. Very disappointed.
Exactly what I needed. Simple, sturdy, does the job.
The packaging was terrible — arrived with dents. Product itself is fine.
Been using it daily for 2 months with no issues. Highly recommend.
Price is great but the instructions are completely incomprehensible.
Love the design but the material feels cheap for the price point.
Shipping was fast, product is perfect. Five stars.
It broke after two weeks. Complete waste of money.
Good quality overall, just wish it came in more colors.`.trim();

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function Home() {
  const [reviewText, setReviewText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [meta, setMeta] = useState<{ reviewCount: number; durationMs: number; inputTokens: number; outputTokens: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const analyze = useCallback(async (reviews: string[]) => {
    setStatus('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews }),
      });

      const data: AnalyzeResponse | AnalyzeError = await res.json();

      if (!data.ok) {
        const errData = data as AnalyzeError;
        setErrorMsg(errData.message);
        setStatus('error');
        return;
      }

      const successData = data as AnalyzeResponse;
      setResult(successData.result);
      setMeta(successData.meta);
      setStatus('done');

      // Scroll to dashboard
      setTimeout(() => {
        dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const lines = reviewText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setErrorMsg('Please enter at least one review.');
      setStatus('error');
      return;
    }

    if (lines.length > 200) {
      setErrorMsg('Maximum 200 reviews per analysis. Please trim your input.');
      setStatus('error');
      return;
    }

    const tooLong = lines.find((l) => l.length > 2000);
    if (tooLong) {
      setErrorMsg('One or more reviews exceed 2000 characters. Please shorten them.');
      setStatus('error');
      return;
    }

    analyze(lines);
  }

  function handleLoadSample() {
    setReviewText(SAMPLE_REVIEWS);
    setStatus('idle');
    setErrorMsg('');
    setCsvWarnings([]);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('CSV file must be under 5 MB.');
      setStatus('error');
      return;
    }

    try {
      const text = await file.text();
      const { reviews, warnings } = parseReviewsCsv(text);
      setReviewText(reviews.join('\n'));
      setCsvWarnings(warnings);
      setStatus('idle');
      setErrorMsg('');
    } catch (err) {
      setErrorMsg((err as Error).message ?? 'Failed to parse CSV file.');
      setStatus('error');
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleReset() {
    setReviewText('');
    setResult(null);
    setStatus('idle');
    setErrorMsg('');
    setCsvWarnings([]);
    setMeta(null);
  }

  const reviewCount = reviewText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length;

  return (
    <>
      <RisoNav />

      <main>
        {/* ── Hero input section ──────────────────────────────────────────── */}
        <section className="px-6 sm:px-10 pt-12 pb-16 max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-10 animate-fade-up" style={{ animationDelay: '0ms' }}>
            {/* Decorative riso overprint block */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.5625rem',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color: 'var(--riso-orange)',
                    background: 'var(--riso-orange-glow)',
                    border: '1px solid var(--riso-orange)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '2px',
                  }}
                >
                  Portfolio Project #9 — Tai Huynh
                </div>
              </div>
            </div>

            <h1
              className="riso-heading mb-4"
              style={{
                fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                maxWidth: '18ch',
              }}
            >
              <span className="riso-text-blue">Review</span>
              <br />
              <span style={{ color: 'var(--riso-orange)' }}>Analytics.</span>
            </h1>

            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                color: 'var(--paper-dim)',
                maxWidth: '55ch',
                lineHeight: 1.7,
              }}
            >
              Paste a batch of customer reviews — get sentiment classification,
              recurring themes, and an exportable report. Powered by{' '}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875em', color: 'var(--riso-blue)' }}>
                Gemini 2.5 Flash
              </span>{' '}
              structured output.
            </p>
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div
              className="riso-card-accent p-6 sm:p-8"
              style={{ maxWidth: '760px' }}
            >
              <div className="flex items-center justify-between mb-3">
                <label
                  htmlFor="reviews-input"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--paper)',
                  }}
                >
                  Customer Reviews
                </label>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.625rem',
                    color: reviewCount > 200 ? 'var(--negative)' : 'var(--paper-muted)',
                  }}
                >
                  {reviewCount} / 200
                </span>
              </div>

              <textarea
                id="reviews-input"
                className="riso-input"
                rows={10}
                value={reviewText}
                onChange={(e) => {
                  setReviewText(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                placeholder={`One review per line — e.g.\nThe product is excellent, shipping was fast.\nPoor packaging but the item works fine.\nCompletely disappointed, broke after a week.`}
                disabled={status === 'loading'}
                aria-describedby="reviews-hint"
              />

              <p
                id="reviews-hint"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  color: 'var(--paper-muted)',
                  marginTop: '0.5rem',
                }}
              >
                One review per line · max 200 reviews · max 2000 chars each · or upload a CSV
              </p>

              {/* CSV warnings */}
              {csvWarnings.length > 0 && (
                <div
                  className="mt-3 p-3 rounded-sm"
                  style={{
                    background: 'rgba(245, 200, 66, 0.08)',
                    border: '1px solid rgba(245, 200, 66, 0.3)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    color: 'var(--riso-yellow)',
                  }}
                >
                  {csvWarnings.map((w, i) => (
                    <div key={i}>⚠ {w}</div>
                  ))}
                </div>
              )}

              {/* Error message */}
              {status === 'error' && errorMsg && (
                <div
                  className="mt-3 p-3 rounded-sm animate-fade-in"
                  style={{
                    background: 'rgba(248, 113, 113, 0.08)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    color: 'var(--negative)',
                  }}
                >
                  ✗ {errorMsg}
                </div>
              )}

              {/* Actions row */}
              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  type="submit"
                  className="riso-btn riso-btn-primary"
                  disabled={status === 'loading' || reviewText.trim().length === 0}
                >
                  {status === 'loading' ? (
                    <>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          border: '2px solid currentColor',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.7s linear infinite',
                        }}
                      />
                      Analyzing…
                    </>
                  ) : (
                    'Analyze Reviews →'
                  )}
                </button>

                {/* CSV upload */}
                <label className="riso-btn riso-btn-secondary cursor-pointer">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <path d="M6.5 9V1M3.5 4L6.5 1l3 3M1 10.5v1a.5.5 0 00.5.5h10a.5.5 0 00.5-.5v-1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Upload CSV
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={handleFileUpload}
                    disabled={status === 'loading'}
                  />
                </label>

                <button
                  type="button"
                  className="riso-btn riso-btn-secondary"
                  onClick={handleLoadSample}
                  disabled={status === 'loading'}
                >
                  Load sample
                </button>
              </div>
            </div>
          </form>

          {/* Capabilities strip */}
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 animate-fade-up" style={{ animationDelay: '200ms' }}>
            {[
              ['01', 'Per-review sentiment'],
              ['02', 'Recurring theme extraction'],
              ['03', 'Score aggregation'],
              ['04', 'CSV + JSON export'],
            ].map(([n, label]) => (
              <div key={n} className="flex items-center gap-2">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.5625rem',
                    color: 'var(--riso-blue)',
                    letterSpacing: '0.1em',
                  }}
                >
                  {n}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8125rem',
                    color: 'var(--paper-muted)',
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Dashboard section ───────────────────────────────────────────── */}
        {(status === 'done' && result) && (
          <section
            ref={dashboardRef}
            className="px-6 sm:px-10 pb-20 max-w-[1200px] mx-auto"
            aria-label="Analysis results"
          >
            {/* Section header */}
            <div
              className="flex items-center justify-between mb-8 animate-fade-up"
              style={{ animationDelay: '0ms' }}
            >
              <div>
                <div className="eyebrow mb-1">Analysis Complete</div>
                <h2
                  className="riso-heading"
                  style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}
                >
                  Your Report
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {meta && (
                  <div
                    className="hidden sm:flex flex-col items-end gap-0.5"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--paper-muted)' }}
                  >
                    <span>{meta.reviewCount} reviews · {(meta.durationMs / 1000).toFixed(1)}s</span>
                    <span>{meta.inputTokens.toLocaleString()} in / {meta.outputTokens.toLocaleString()} out tokens</span>
                  </div>
                )}
                <ExportButtons result={result} />
                <button
                  onClick={handleReset}
                  className="riso-btn riso-btn-secondary"
                >
                  New Analysis
                </button>
              </div>
            </div>

            {/* Separator */}
            <div className="mb-8" style={{ borderTop: '2px solid var(--riso-blue)', opacity: 0.4 }} />

            {/* Top row: Overall score + Sentiment bars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="sm:col-span-1 animate-fade-up" style={{ animationDelay: '50ms' }}>
                <OverallScore overall={result.overall} averageScore={result.averageScore} />
              </div>
              <div
                className="sm:col-span-2 riso-card p-6 animate-fade-up"
                style={{ animationDelay: '100ms' }}
              >
                <SentimentBars distribution={result.distribution} animationDelay={150} />
              </div>
            </div>

            {/* Theme breakdown */}
            <div
              className="riso-card p-6 mb-8 animate-fade-up"
              style={{ animationDelay: '200ms' }}
            >
              <ThemeBreakdown
                themes={result.themes}
                totalReviews={result.items.length}
                animationDelay={250}
              />
            </div>

            {/* Per-review list */}
            <div className="animate-fade-up" style={{ animationDelay: '300ms' }}>
              <ReviewList items={result.items} animationDelay={350} />
            </div>
          </section>
        )}

        {/* Loading state */}
        {status === 'loading' && (
          <section className="px-6 sm:px-10 pb-20 max-w-[1200px] mx-auto animate-fade-in">
            <div
              className="riso-card p-12 text-center"
              style={{ borderColor: 'var(--riso-blue)' }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--riso-blue)',
                  marginBottom: '1rem',
                }}
              >
                Processing
              </div>
              {/* Animated riso dots */}
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-sm"
                    style={{
                      background: i % 2 === 0 ? 'var(--riso-blue)' : 'var(--riso-orange)',
                      animation: `pulse 1s ease-in-out ${i * 0.15}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  color: 'var(--paper-muted)',
                }}
              >
                Classifying sentiments and extracting themes via Gemini 2.5 Flash…
              </p>
            </div>
          </section>
        )}
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--rule)',
          marginTop: '4rem',
        }}
      >
        <div className="mx-auto max-w-[1200px] px-6 sm:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.625rem',
              letterSpacing: '0.08em',
              color: 'var(--paper-muted)',
            }}
          >
            Tai Huynh · 2026 · Review Analytics · Portfolio Project #9
          </p>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.625rem',
              letterSpacing: '0.08em',
              color: 'var(--paper-muted)',
            }}
          >
            <a href="https://github.com/0CCHacker" className="hover:text-[var(--paper)] transition-colors">Tai Huynh</a>
            <span className="mx-2" style={{ color: 'var(--rule)' }}>·</span>
            <a href="https://github.com/0CCHacker" className="hover:text-[var(--paper)] transition-colors">github</a>
            <span className="mx-2" style={{ color: 'var(--rule)' }}>·</span>
            <a href="mailto:huynhchitai.070306@gmail.com" className="hover:text-[var(--paper)] transition-colors">email</a>
          </p>
        </div>
      </footer>

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { from { opacity: 0.3; transform: scale(0.9); } to { opacity: 1; transform: scale(1.1); } }
        @media (prefers-reduced-motion: reduce) {
          @keyframes spin { to { transform: none; } }
          @keyframes pulse { to { opacity: 1; transform: none; } }
        }
      `}</style>
    </>
  );
}
