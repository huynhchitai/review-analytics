import Papa from 'papaparse';
import type { AnalysisResult } from './types';

// ─── Formula-injection escaping ──────────────────────────────────────────────

/**
 * Escapes a cell value to prevent CSV formula injection.
 * Cells starting with = + - @ are prefixed with a single quote (').
 * This is the standard defense recommended by OWASP.
 */
export function escapeCsvCell(value: string): string {
  if (value.length === 0) return value;
  const firstChar = value[0];
  if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@') {
    return `'${value}`;
  }
  return value;
}

// ─── CSV parsing for uploaded review files ───────────────────────────────────

export interface ParsedReviews {
  reviews: string[];
  warnings: string[];
}

/**
 * Parses a CSV file containing reviews.
 * Looks for a column named "review", "text", "content", or "body" (case-insensitive).
 * Falls back to the first column if none of those are found.
 * Max 200 rows, each review truncated at 2000 chars.
 */
export function parseReviewsCsv(csvText: string): ParsedReviews {
  const warnings: string[] = [];

  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (result.errors.length > 0) {
    // 'Delimiter/UndetectableDelimiter' is non-fatal: PapaParse defaults to comma and still parses correctly.
    const fatalErrors = result.errors.filter((e) => e.type === 'Quotes');
    if (fatalErrors.length > 0) {
      throw new Error(`CSV parse error: ${fatalErrors[0].message}`);
    }
    warnings.push(`CSV had ${result.errors.length} non-fatal parse warning(s).`);
  }

  if (!result.data || result.data.length === 0) {
    throw new Error('CSV contains no data rows.');
  }

  // Find the review column
  const preferredColumns = ['review', 'text', 'content', 'body', 'comment', 'feedback'];
  const headers = Object.keys(result.data[0] ?? {});
  const reviewColumn =
    preferredColumns.find((col) => headers.includes(col)) ?? headers[0];

  if (!reviewColumn) {
    throw new Error('CSV has no columns.');
  }

  if (!preferredColumns.includes(reviewColumn)) {
    warnings.push(`Using first column "${reviewColumn}" as review text (no standard column name found).`);
  }

  const rows = result.data.slice(0, 200);
  if (result.data.length > 200) {
    warnings.push(`CSV had ${result.data.length} rows; only the first 200 were imported.`);
  }

  const reviews: string[] = [];
  for (const row of rows) {
    const cell = row[reviewColumn];
    if (!cell || cell.trim() === '') continue;
    const trimmed = cell.trim().slice(0, 2000);
    reviews.push(trimmed);
  }

  if (reviews.length === 0) {
    throw new Error('CSV contained no non-empty review cells.');
  }

  return { reviews, warnings };
}

// ─── CSV export ───────────────────────────────────────────────────────────────

/**
 * Exports the full analysis result as a CSV string.
 * All string cells are formula-injection escaped.
 */
export function exportReportCsv(result: AnalysisResult): string {
  const sections: string[] = [];

  // Section 1: Summary
  const summaryHeaders = ['overall_sentiment', 'average_score', 'positive_count', 'neutral_count', 'negative_count'];
  const summaryRow = [
    escapeCsvCell(result.overall),
    String(result.averageScore),
    String(result.distribution.positive),
    String(result.distribution.neutral),
    String(result.distribution.negative),
  ];
  sections.push('SUMMARY');
  sections.push(summaryHeaders.join(','));
  sections.push(summaryRow.map(quoteCsvField).join(','));
  sections.push('');

  // Section 2: Themes
  const themeHeaders = ['theme', 'count', 'sentiment', 'example_1', 'example_2', 'example_3'];
  sections.push('THEMES');
  sections.push(themeHeaders.join(','));
  for (const theme of result.themes) {
    const examples = [...theme.examples, '', '', ''].slice(0, 3);
    const row = [
      escapeCsvCell(theme.label),
      String(theme.count),
      escapeCsvCell(theme.sentiment),
      escapeCsvCell(examples[0] ?? ''),
      escapeCsvCell(examples[1] ?? ''),
      escapeCsvCell(examples[2] ?? ''),
    ];
    sections.push(row.map(quoteCsvField).join(','));
  }
  sections.push('');

  // Section 3: Individual reviews
  const itemHeaders = ['review_text', 'sentiment', 'score'];
  sections.push('REVIEWS');
  sections.push(itemHeaders.join(','));
  for (const item of result.items) {
    const row = [
      escapeCsvCell(item.text),
      escapeCsvCell(item.sentiment),
      String(item.score),
    ];
    sections.push(row.map(quoteCsvField).join(','));
  }

  return sections.join('\n');
}

function quoteCsvField(value: string): string {
  // Always quote to handle commas and newlines in review text
  return `"${value.replace(/"/g, '""')}"`;
}
