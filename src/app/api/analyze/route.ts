import { NextRequest, NextResponse } from 'next/server';
import { getVertex, MODEL_ID } from '@/lib/vertex';
import { checkRate, getClientIp } from '@/lib/ratelimit';
import { analyzeInputSchema, llmOutputSchema, geminiResponseSchema } from '@/lib/schema';
import { buildAnalysisPrompt } from '@/lib/prompt';
import { aggregate } from '@/lib/aggregate';
import type { AnalyzeResponse, AnalyzeError, AnalyzeErrorCode } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const BATCH_SIZE = 50; // Max reviews per Gemini call to avoid hitting token limits

export async function POST(req: NextRequest) {
  const started = Date.now();
  const ip = getClientIp(req);

  // ── Rate limit ─────────────────────────────────────────────────────────────
  const rate = await checkRate(ip);
  if (!rate.ok) {
    return err('RATE_LIMIT', `Rate limit exceeded (${rate.limit}/day). Try again later.`, 429);
  }

  // ── Parse + zod-validate input ────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err('VALIDATION_ERROR', 'Invalid JSON body.', 400);
  }

  const parsed = analyzeInputSchema.safeParse(body);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', `Invalid request: ${parsed.error.message}`, 400);
  }

  const { reviews } = parsed.data;

  // ── Build Gemini client ───────────────────────────────────────────────────
  let vertex;
  try {
    vertex = getVertex();
  } catch (e) {
    console.error('[analyze] Vertex init failed:', e);
    return err('INTERNAL_ERROR', 'AI service is not configured.', 503);
  }

  const model = vertex.preview.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: geminiResponseSchema as Record<string, unknown>,
      maxOutputTokens: 8192,
      temperature: 0,
    },
  });

  // ── Batch reviews into Gemini calls ───────────────────────────────────────
  // For ≤50 reviews: single call. For >50: process in batches, then merge.
  // We still do a final merge pass via a second call if needed.
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    let allItems: { text: string; sentiment: 'positive' | 'neutral' | 'negative'; score: number }[] = [];
    let allThemes: {
      label: string;
      count: number;
      sentiment: 'positive' | 'neutral' | 'negative';
      examples: string[];
    }[] = [];

    // Process in batches
    const batches: string[][] = [];
    for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
      batches.push(reviews.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const prompt = buildAnalysisPrompt(batch);
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const candidate = response.response.candidates?.[0];
      if (!candidate) {
        throw new Error('Gemini returned no candidates.');
      }

      // Track token usage
      const usage = response.response.usageMetadata;
      if (usage) {
        totalInputTokens += usage.promptTokenCount ?? 0;
        totalOutputTokens += usage.candidatesTokenCount ?? 0;
      }

      const rawText = candidate.content?.parts?.[0]?.text ?? '';
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(rawText);
      } catch {
        throw new Error(`Gemini returned non-JSON output: ${rawText.slice(0, 200)}`);
      }

      // Zod-validate the LLM output
      const validated = llmOutputSchema.safeParse(rawJson);
      if (!validated.success) {
        throw new Error(`Gemini output failed validation: ${validated.error.message}`);
      }

      allItems = allItems.concat(validated.data.items);

      // Merge themes across batches: accumulate by label
      for (const theme of validated.data.themes) {
        const existing = allThemes.find(
          (t) => t.label.toLowerCase() === theme.label.toLowerCase()
        );
        if (existing) {
          existing.count += theme.count;
          // Combine examples, dedupe, cap at 5
          const combined = [...existing.examples, ...theme.examples];
          existing.examples = Array.from(new Set(combined)).slice(0, 5);
          // Recompute dominant sentiment by majority
          // (simple: keep existing; a full merge would need per-theme sentiment tracking)
        } else {
          allThemes.push({ ...theme });
        }
      }
    }

    // Sort themes by count descending and cap at 15
    allThemes.sort((a, b) => b.count - a.count);
    allThemes = allThemes.slice(0, 15);

    // Aggregate into final result
    const result = aggregate({ items: allItems, themes: allThemes });

    const response: AnalyzeResponse = {
      ok: true,
      result,
      meta: {
        reviewCount: reviews.length,
        durationMs: Date.now() - started,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
    };

    return NextResponse.json(response);
  } catch (e) {
    const msg = (e as Error).message ?? 'Unknown error';
    console.error('[analyze] AI pipeline error:', msg);
    // Distinguish parse errors from AI errors
    if (msg.includes('validation') || msg.includes('JSON')) {
      return err('PARSE_ERROR', 'AI returned malformed output. Please try again.', 502);
    }
    return err('AI_ERROR', 'AI analysis failed. Please try again.', 502);
  }
}

function err(code: AnalyzeErrorCode, message: string, status: number) {
  const body: AnalyzeError = { ok: false, error: code, message };
  return NextResponse.json(body, { status });
}
