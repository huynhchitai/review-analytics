# Review Analytics

Paste a batch of customer reviews — get sentiment, recurring themes, and an exportable report.

> Portfolio Project #9 — [Tai Huynh](https://github.com/huynhchitai)

---

## Demo

Best demo input — load the 12-line sample via **Load sample** in the UI, or paste your own reviews (one per line):

```
The build quality is exceptional — feels like it'll last years.
Delivery took 3 weeks, which was frustrating since the listing said 5-7 days.
Customer support was incredibly responsive and resolved my issue within an hour.
Product looks nothing like the photos. Very disappointed.
Exactly what I needed. Simple, sturdy, does the job.
```

CSV upload also supported: a column named `review`, `text`, `content`, `body`, `comment`, or `feedback` is auto-detected; falls back to the first column with a warning.

---

## Stack

- **Next.js 14** — App Router, `src/` layout, serverless function
- **TypeScript** — `strict: true` throughout
- **Tailwind CSS 3** — dark risograph-print theme, CSS variables
- **Vertex AI — Gemini 2.5 Flash** — structured JSON output via `responseSchema`
- **zod 4** — validates both input and LLM output
- **Upstash Redis** — sliding-window rate limit (25/day/IP); graceful no-op without it
- **papaparse** — CSV ingestion + export
- **Vitest** — `csv.ts` and `aggregate.ts` unit tests
- **pnpm / Vercel**

---

## Run locally

```bash
pnpm install
cp .env.example .env.local
# fill in .env.local — GOOGLE_CLOUD_PROJECT is the only required var for AI calls
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000).

For rate limiting, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in `.env.local`. The app works without them — rate limiting silently degrades to a no-op.

---

## Tests

```bash
pnpm test
```

Vitest covers:

- `src/lib/csv.ts` — formula-injection escaping (all four dangerous first chars), CSV parsing (column detection, row caps, truncation), export format
- `src/lib/aggregate.ts` — distribution math, average score, overall verdict logic, theme sorting, score clamping

---

## Pipeline at a glance

```
User input (textarea / CSV upload)
        │
        ▼
  [Client] zod-style validation (count, length)
        │
        ▼ POST /api/analyze { reviews: string[] }
        │
  [Server] Rate limit — Upstash sliding window 25/day/IP
        │
  [Server] zod input validate — 1–200 items · ≤2000 chars each
        │
  [Server] prompt.ts — reviews wrapped in [REVIEW N] DATA blocks
        │
  [Server] Gemini 2.5 Flash — responseSchema structured output
           (batched: ≤50 reviews per call)
        │
  [Server] zod output validate — llmOutputSchema
        │
  [Server] aggregate.ts — distribution, avgScore, overall verdict, theme merge
        │
        ▼ JSON response
  [Client] Dashboard — SentimentBars, ThemeBreakdown, ReviewList
        │
  [Client] exportReportCsv() / JSON.stringify() → download
```

---

## Security stance

### Defended

| Threat | Mitigation |
|---|---|
| Abusive AI usage | Upstash sliding-window rate limit (25/day/IP); graceful no-op when unconfigured |
| Oversized input | Hard caps: max 200 reviews, max 2,000 chars each — enforced server-side by zod |
| Malformed LLM output | All Gemini output is zod-validated; structural mismatches return typed errors, never raw exceptions |
| CSV formula injection (export) | `escapeCsvCell()` prefixes `=`, `+`, `-`, `@` cells with `'` (OWASP CSV injection guidance) |
| Prompt injection (basic) | Reviews are placed in numbered `[REVIEW N]` / `[/REVIEW N]` data blocks with explicit instruction not to treat them as commands |
| Stack traces leaking to client | All `catch` blocks log detail server-side; client receives typed error codes only |
| Credential exposure | Service-account key patterns in `.gitignore`; env vars are server-only; `.env.example` has no real values |
| Runaway generation | `maxOutputTokens: 8192` capped; `maxDuration: 60` on the route |

### Known gaps

- **Prompt injection (advanced):** Delimiter-based separation is heuristic. A sufficiently sophisticated adversary could craft a review that overrides model instructions. Full mitigation requires a separate intent-classification pass or fine-tuned injection detection. Flagging the gap rather than hiding it.
- **Theme deduplication across batches:** Cross-batch theme merging uses case-insensitive string equality. Semantically similar themes (e.g. "delivery time" vs "shipping speed") are not merged. A clustering pass or a second consolidation Gemini call would improve quality.
- **No persistent storage:** Results are not cached or persisted. Re-submitting the same reviews will burn tokens again. Input-hash caching in Upstash is the natural next step.
- **DNS rebinding:** Not applicable — this project makes no outbound fetches to user-supplied URLs.

---

## Known limits

- Max 200 reviews per request (zod-enforced both client and server).
- Each review is truncated at 2,000 characters on CSV import.
- Large batches (200 reviews) make 4 sequential Gemini calls; expect ~15–30s wall time.
- Gemini theme labels are in the language of the reviews — no translation or normalisation.
- The overall verdict heuristic (>60% + avgScore threshold) is intentionally simple; for nuanced products, examining the distribution directly is more useful.
