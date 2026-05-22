export type Sentiment = 'positive' | 'neutral' | 'negative';
export type OverallSentiment = 'positive' | 'mixed' | 'negative';

/** A single classified review item */
export interface ReviewItem {
  text: string;
  sentiment: Sentiment;
  /** Normalized score: positive=1, neutral=0, negative=-1 (model may give finer grain) */
  score: number;
}

/** A recurring theme extracted from the review set */
export interface Theme {
  label: string;
  count: number;
  sentiment: Sentiment;
  examples: string[];
}

/** Sentiment distribution counts */
export interface Distribution {
  positive: number;
  neutral: number;
  negative: number;
}

/** Full analysis result */
export interface AnalysisResult {
  overall: OverallSentiment;
  distribution: Distribution;
  averageScore: number;
  themes: Theme[];
  items: ReviewItem[];
}

/** Success response from POST /api/analyze */
export interface AnalyzeResponse {
  ok: true;
  result: AnalysisResult;
  meta: {
    reviewCount: number;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
  };
}

/** Error response from POST /api/analyze */
export interface AnalyzeError {
  ok: false;
  error: AnalyzeErrorCode;
  message: string;
}

export type AnalyzeErrorCode =
  | 'RATE_LIMIT'
  | 'VALIDATION_ERROR'
  | 'AI_ERROR'
  | 'PARSE_ERROR'
  | 'INTERNAL_ERROR';
