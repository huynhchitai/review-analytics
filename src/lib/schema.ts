import { z } from 'zod';

// ─── Input validation ────────────────────────────────────────────────────────

export const analyzeInputSchema = z.object({
  reviews: z
    .array(
      z.string().min(1, 'Review cannot be empty').max(2000, 'Review exceeds 2000 characters')
    )
    .min(1, 'At least one review is required')
    .max(200, 'Maximum 200 reviews per request'),
});

export type AnalyzeInput = z.infer<typeof analyzeInputSchema>;

// ─── LLM output validation ───────────────────────────────────────────────────

const sentimentEnum = z.enum(['positive', 'neutral', 'negative']);

export const reviewItemSchema = z.object({
  text: z.string().min(1),
  sentiment: sentimentEnum,
  score: z.number().min(-1).max(1),
});

export const themeSchema = z.object({
  label: z.string().min(1).max(100),
  count: z.number().int().min(1),
  sentiment: sentimentEnum,
  examples: z.array(z.string().min(1)).min(1).max(5),
});

export const llmOutputSchema = z.object({
  items: z.array(reviewItemSchema).min(1),
  themes: z.array(themeSchema).min(1).max(20),
});

export type LlmOutput = z.infer<typeof llmOutputSchema>;

// ─── Gemini responseSchema (OpenAPI subset) ──────────────────────────────────

export const geminiResponseSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
          score: { type: 'number' },
        },
        required: ['text', 'sentiment', 'score'],
      },
    },
    themes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          count: { type: 'integer' },
          sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
          examples: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['label', 'count', 'sentiment', 'examples'],
      },
    },
  },
  required: ['items', 'themes'],
} as const;
