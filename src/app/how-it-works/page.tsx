import type { Metadata } from 'next';
import Link from 'next/link';
import RisoNav from '@/components/RisoNav';

export const metadata: Metadata = {
  title: 'How it works — Review Analytics · Tai Huynh',
};

const PIPELINE_ASCII = `
  ┌─────────────────────────────────────────────────────────────────┐
  │                        POST /api/analyze                        │
  └────────────────────────────┬────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Rate limit (IP)    │  25 req/day — Upstash
                    │   rl:reviews prefix  │  sliding window
                    └──────────┬──────────┘
                               │ ok
                    ┌──────────▼──────────┐
                    │  Zod input validate  │  { reviews: string[] }
                    │  1–200 · ≤2000 each  │  hard caps server-side
                    └──────────┬──────────┘
                               │ valid
                    ┌──────────▼──────────┐
                    │  Build prompt        │  reviews in DATA blocks
                    │  (prompt.ts)         │  injection-resistant
                    └──────────┬──────────┘
                               │
               ┌───────────────▼───────────────┐
               │  Gemini 2.5 Flash              │
               │  responseSchema (structured)   │  batched: ≤50/call
               │  temperature=0, max 8k tokens  │
               └───────────────┬───────────────┘
                               │ raw JSON
                    ┌──────────▼──────────┐
                    │  Zod output validate │  llmOutputSchema
                    │  reject on bad shape │  score clamped [-1,1]
                    └──────────┬──────────┘
                               │ typed LlmOutput
                    ┌──────────▼──────────┐
                    │  Aggregate (pure fn) │  distribution, avgScore
                    │  (aggregate.ts)      │  overall verdict, themes
                    └──────────┬──────────┘
                               │ AnalysisResult
                    ┌──────────▼──────────┐
                    │  JSON response       │  typed AnalyzeResponse
                    └─────────────────────┘

  Client export path:
  AnalysisResult → csv.ts → escapeCsvCell() → download
                 → JSON.stringify()         → download
`.trim();

const STEPS = [
  {
    n: '01',
    title: 'Rate limiting',
    body: 'Upstash sliding-window rate limiter — 25 requests per IP per day, keyed under prefix rl:reviews. Degrades gracefully to a no-op when Upstash is not configured, so the demo works in development without Redis.',
  },
  {
    n: '02',
    title: 'Input validation (zod)',
    body: 'The request body is zod-parsed before any AI call. reviews must be a string array with 1–200 items, each ≤ 2000 characters. Oversized arrays or strings are rejected with a 400 before anything reaches the model. Same caps are enforced client-side for immediate feedback, but the server is the authoritative check.',
  },
  {
    n: '03',
    title: 'Prompt injection defence',
    body: 'Review text is untrusted user data. Each review is wrapped in numbered [REVIEW N] / [/REVIEW N] delimiters inside a clearly labelled DATA SECTION. The system instruction explicitly tells the model not to follow directives embedded inside reviews. This is defence-in-depth — large models are still susceptible to sophisticated injections, but naive "ignore previous instructions" payloads are cleanly rejected.',
  },
  {
    n: '04',
    title: 'Gemini 2.5 Flash — structured output',
    body: 'A single batched call (or multiple calls for >50 reviews) using responseSchema — an OpenAPI-subset object schema. Structured output means the model produces JSON directly without wrapping prose, with schema-enforced field types and enum constraints on sentiment values. Temperature is 0 for determinism. maxOutputTokens is 8192 — generous but capped.',
  },
  {
    n: '05',
    title: 'Batching strategy',
    body: 'Reviews are chunked to ≤50 per Gemini call. For a 200-review batch that is 4 calls, all sequential (Vertex AI on the free tier has per-minute token limits). Themes across batches are merged by case-insensitive label matching and re-sorted by count. A future improvement would be a second "theme consolidation" call to merge semantically similar labels (e.g. "delivery speed" vs "shipping time").',
  },
  {
    n: '06',
    title: 'LLM output validation (zod)',
    body: 'The raw JSON from Gemini is zod-parsed against llmOutputSchema. Scores are clamped to [-1, 1], theme labels are trimmed, example quotes are capped at 120 characters. Any structural mismatch (missing field, wrong type, empty items array) returns a typed PARSE_ERROR to the client — never a raw exception stack.',
  },
  {
    n: '07',
    title: 'Aggregation (pure math)',
    body: 'aggregate.ts is a pure function — no network calls, no side effects. It computes distribution counts, average score (rounded to 3dp), and overall verdict (positive if >60% positive and avgScore > 0.2; negative if >60% negative and avgScore < -0.2; mixed otherwise). This is 100% deterministic and covered by Vitest.',
  },
  {
    n: '08',
    title: 'CSV export — formula injection escaping',
    body: 'When exporting to CSV, every string cell is passed through escapeCsvCell(). Cells starting with = + - @ are prefixed with a single quote, per OWASP\'s CSV injection guidance. This prevents a reviewer from embedding a malicious Excel formula like =HYPERLINK("http://evil.com","Click") that would execute when the analyst opens the file in a spreadsheet. The escaping is tested in Vitest.',
  },
  {
    n: '09',
    title: 'No stack traces to the client',
    body: 'All catch blocks log the full error server-side with console.error and return a typed error code (AI_ERROR, PARSE_ERROR, INTERNAL_ERROR) with a human-readable message. The raw exception — which could contain model output, prompt internals, or GCP credentials path — never leaves the server.',
  },
  {
    n: '10',
    title: 'maxDuration + token cap',
    body: 'The route declares export const maxDuration = 60, giving a 60-second wall-clock budget on Vercel Pro. Gemini is called with maxOutputTokens: 8192 — enough for 200 short reviews but prevents runaway generation. For the 4-batch worst case, each call gets a natural per-call timeout from the Vertex SDK.',
  },
];

export default function HowItWorks() {
  return (
    <>
      <RisoNav />

      <main className="mx-auto max-w-[1200px] px-6 sm:px-10">
        {/* Hero */}
        <header className="pt-14 sm:pt-20 pb-12">
          <div className="mb-4">
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5625rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--riso-orange)',
              }}
            >
              Engineering notes
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(2.2rem, 7vw, 5.5rem)',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: 'var(--paper)',
              textShadow: `
                -1.5px -1px 0 rgba(43, 95, 227, 0.4),
                1.5px 1px 0 rgba(255, 107, 53, 0.3)
              `,
              marginBottom: '1.5rem',
            }}
          >
            How this analyser
            <br />
            <span style={{ color: 'var(--riso-blue)' }}>actually works.</span>
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1rem, 2vw, 1.125rem)',
              color: 'var(--paper-dim)',
              maxWidth: '60ch',
              lineHeight: 1.7,
            }}
          >
            One Vercel serverless function with a 60-second budget. Reviews go in,
            structured JSON comes back from Gemini, pure math does the rest.
            Below: all ten steps, the non-obvious decisions, and the gaps that are
            honestly disclosed.
          </p>
        </header>

        <div style={{ borderTop: '2px solid var(--riso-orange)', opacity: 0.4, marginBottom: '3rem' }} />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-12 pb-24">

          {/* Main: pipeline + steps */}
          <div className="lg:col-span-8">

            {/* ASCII pipeline */}
            <div className="mb-12">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.5625rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--riso-blue)',
                  display: 'block',
                  marginBottom: '1rem',
                }}
              >
                Pipeline at a glance
              </span>
              <pre
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'clamp(0.5rem, 1.2vw, 0.6875rem)',
                  lineHeight: 1.6,
                  color: 'var(--paper-dim)',
                  background: 'var(--charcoal-mid)',
                  border: '1px solid var(--rule)',
                  padding: '1.5rem',
                  borderRadius: '2px',
                  overflowX: 'auto',
                  whiteSpace: 'pre',
                }}
              >
                {PIPELINE_ASCII}
              </pre>
            </div>

            {/* Step-by-step */}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5625rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--riso-blue)',
                display: 'block',
                marginBottom: '1.5rem',
              }}
            >
              Step by step
            </span>

            <ol className="flex flex-col gap-8">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3rem 1fr',
                    gap: '1.25rem',
                    paddingBottom: '2rem',
                    borderBottom: '1px solid var(--rule-soft)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      color: 'var(--riso-orange)',
                      paddingTop: '0.25rem',
                    }}
                  >
                    {step.n}
                  </span>
                  <div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.125rem',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        color: 'var(--paper)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.9375rem',
                        lineHeight: 1.65,
                        color: 'var(--paper-dim)',
                      }}
                    >
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Sidebar: notes */}
          <aside className="lg:col-span-4">
            <div className="sticky top-10 flex flex-col gap-6">

              <SideNote title="Security stance" accent="blue">
                <p>Input capped server-side (zod). LLM output zod-validated. Rate limited by IP. Reviews treated as untrusted data in the prompt. No stack traces to client. CSV export escapes formula-injection characters.</p>
                <p style={{ marginTop: '0.75rem' }}>
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem' }}>
                    What this does not cover:
                  </strong>{' '}
                  Prompt injection from a sophisticated adversary is not fully mitigated — delimiter-based separation is heuristic. The model could theoretically be manipulated by a sufficiently crafted review. Full mitigation requires a separate classification pass or fine-tuned intent detection. Flagging the gap rather than hiding it.
                </p>
              </SideNote>

              <SideNote title="Theme quality" accent="orange">
                <p>Gemini identifies themes within each batch independently. Cross-batch merging is by case-insensitive string match — &ldquo;shipping speed&rdquo; and &ldquo;delivery time&rdquo; would not merge. A second consolidation call or embedding-based clustering would improve quality for large review sets. Out of scope for the demo.</p>
              </SideNote>

              <SideNote title="Cost &amp; limits">
                <p>Gemini 2.5 Flash, temperature 0, max 8k tokens per call. 200 reviews in 4 batches ≈ 4 calls ≈ ~$0.003 total. Rate limit: 25/day/IP. No caching of results (results are deterministic enough that caching by input hash would save tokens for repeat runs — future work).</p>
              </SideNote>

              <SideNote title="Tests">
                <p>
                  Vitest covers <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75em' }}>csv.ts</code>{' '}
                  (formula-injection escaping, CSV parsing, export format) and{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75em' }}>aggregate.ts</code>{' '}
                  (distribution math, score averaging, overall verdict logic, theme sorting). Run with <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75em' }}>pnpm test</code>.
                </p>
              </SideNote>

            </div>
          </aside>
        </div>

        {/* CTA */}
        <section
          style={{
            borderTop: '2px solid var(--rule)',
            paddingTop: '2.5rem',
            paddingBottom: '4rem',
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '2rem',
          }}
          className="sm:grid-cols-2"
        >
          <div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5625rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--riso-orange)',
              }}
            >
              Next step
            </span>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: 'var(--paper)',
                marginTop: '0.75rem',
                lineHeight: 1.1,
              }}
            >
              Want this for your product?
            </h3>
          </div>
          <div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                lineHeight: 1.7,
                color: 'var(--paper-dim)',
                marginBottom: '1.5rem',
              }}
            >
              This demo is a portfolio piece, but the architecture ships in client builds —
              wired to internal review platforms, app store scrapes, NPS exports. If you
              have a customer feedback problem and need structured insight at scale, email me.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:huynhchitai.070306@gmail.com?subject=Freelance%20enquiry%20—%20Review%20Analytics"
                className="riso-btn riso-btn-primary"
              >
                Email me →
              </a>
              <Link href="/" className="riso-btn riso-btn-secondary">
                ← Back to demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--rule)' }}>
        <div
          className="mx-auto max-w-[1200px] px-6 sm:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--paper-muted)' }}>
            Tai Huynh · 2026 · built with Next.js, Vertex AI &amp; Vitest
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--paper-muted)' }}>
            <a href="https://github.com/0CCHacker" className="hover:text-[var(--paper)] transition-colors">Tai Huynh</a>
            <span className="mx-2" style={{ color: 'var(--rule)' }}>·</span>
            <a href="https://github.com/0CCHacker" className="hover:text-[var(--paper)] transition-colors">github</a>
            <span className="mx-2" style={{ color: 'var(--rule)' }}>·</span>
            <a href="mailto:huynhchitai.070306@gmail.com" className="hover:text-[var(--paper)] transition-colors">email</a>
          </p>
        </div>
      </footer>
    </>
  );
}

function SideNote({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: 'blue' | 'orange';
  children: React.ReactNode;
}) {
  const accentColor = accent === 'blue'
    ? 'var(--riso-blue)'
    : accent === 'orange'
    ? 'var(--riso-orange)'
    : 'var(--rule)';

  return (
    <div
      style={{
        background: 'var(--charcoal-mid)',
        border: `1px solid ${accentColor}`,
        borderRadius: '2px',
        padding: '1.25rem',
        boxShadow: accent ? `3px 3px 0 ${accent === 'blue' ? 'var(--riso-orange)' : 'var(--riso-blue)'}` : 'none',
      }}
    >
      <h4
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: accentColor,
          paddingBottom: '0.625rem',
          borderBottom: `1px solid ${accentColor}40`,
          marginBottom: '0.75rem',
        }}
      >
        {title}
      </h4>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.8125rem',
          lineHeight: 1.6,
          color: 'var(--paper-dim)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
