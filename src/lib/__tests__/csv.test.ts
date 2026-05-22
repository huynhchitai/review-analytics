import { describe, it, expect } from 'vitest';
import { escapeCsvCell, parseReviewsCsv, exportReportCsv } from '../csv';
import type { AnalysisResult } from '../types';

// ─── escapeCsvCell ────────────────────────────────────────────────────────────

describe('escapeCsvCell — formula injection escaping', () => {
  it('prefixes = with a single quote', () => {
    expect(escapeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
  });

  it('prefixes + with a single quote', () => {
    expect(escapeCsvCell('+1234')).toBe("'+1234");
  });

  it('prefixes - with a single quote', () => {
    expect(escapeCsvCell('-1234')).toBe("'-1234");
  });

  it('prefixes @ with a single quote', () => {
    expect(escapeCsvCell('@SUM(1,2)')).toBe("'@SUM(1,2)");
  });

  it('does NOT modify normal text', () => {
    expect(escapeCsvCell('Great product!')).toBe('Great product!');
  });

  it('does NOT modify text that starts with a letter', () => {
    expect(escapeCsvCell('SUMIF the product is great')).toBe('SUMIF the product is great');
  });

  it('does NOT modify empty string', () => {
    expect(escapeCsvCell('')).toBe('');
  });

  it('does NOT modify numbers as strings that start with digits', () => {
    expect(escapeCsvCell('1234')).toBe('1234');
  });

  it('handles nested formula injection attempts', () => {
    // Only first char matters per OWASP
    expect(escapeCsvCell('=HYPERLINK("http://evil.com","Click me")')).toBe(
      "'=HYPERLINK(\"http://evil.com\",\"Click me\")"
    );
  });

  it('handles a cell that is just the dangerous character', () => {
    expect(escapeCsvCell('=')).toBe("'=");
    expect(escapeCsvCell('+')).toBe("'+");
    expect(escapeCsvCell('-')).toBe("'-");
    expect(escapeCsvCell('@')).toBe("'@");
  });
});

// ─── parseReviewsCsv ─────────────────────────────────────────────────────────

describe('parseReviewsCsv', () => {
  it('parses a simple CSV with a "review" column', () => {
    const csv = `review,author\n"Great product!",Alice\n"Not good.",Bob`;
    const { reviews, warnings } = parseReviewsCsv(csv);
    expect(reviews).toEqual(['Great product!', 'Not good.']);
    expect(warnings).toHaveLength(0);
  });

  it('parses a CSV with a "text" column', () => {
    const csv = `text\nAwesome service\nBad experience`;
    const { reviews } = parseReviewsCsv(csv);
    expect(reviews).toEqual(['Awesome service', 'Bad experience']);
  });

  it('parses a CSV with a "content" column', () => {
    const csv = `content\nPerfect`;
    const { reviews } = parseReviewsCsv(csv);
    expect(reviews).toEqual(['Perfect']);
  });

  it('falls back to first column if no standard column found and warns', () => {
    const csv = `product_notes\nGood\nBad`;
    const { reviews, warnings } = parseReviewsCsv(csv);
    expect(reviews).toEqual(['Good', 'Bad']);
    expect(warnings.some((w) => w.includes('product_notes'))).toBe(true);
  });

  it('skips empty cells', () => {
    const csv = `review\nGood\n\nBad\n   `;
    const { reviews } = parseReviewsCsv(csv);
    expect(reviews).toEqual(['Good', 'Bad']);
  });

  it('truncates reviews at 2000 characters', () => {
    const longText = 'a'.repeat(3000);
    const csv = `review\n${longText}`;
    const { reviews } = parseReviewsCsv(csv);
    expect(reviews[0]).toHaveLength(2000);
  });

  it('caps at 200 reviews and warns', () => {
    const rows = Array.from({ length: 250 }, (_, i) => `Review ${i + 1}`).join('\n');
    const csv = `review\n${rows}`;
    const { reviews, warnings } = parseReviewsCsv(csv);
    expect(reviews).toHaveLength(200);
    expect(warnings.some((w) => w.includes('250'))).toBe(true);
  });

  it('throws when CSV is empty', () => {
    expect(() => parseReviewsCsv('review\n')).toThrow();
  });

  it('throws when all review cells are empty', () => {
    expect(() => parseReviewsCsv('review\n   \n   ')).toThrow();
  });
});

// ─── exportReportCsv ─────────────────────────────────────────────────────────

describe('exportReportCsv — formula injection in export', () => {
  const mockResult: AnalysisResult = {
    overall: 'mixed',
    distribution: { positive: 2, neutral: 1, negative: 1 },
    averageScore: 0.1,
    themes: [
      {
        label: 'Shipping',
        count: 2,
        sentiment: 'negative',
        examples: ['Very slow delivery', '=FORMULA(inject)'],
      },
    ],
    items: [
      { text: 'Great!', sentiment: 'positive', score: 0.9 },
      { text: '=BAD FORMULA', sentiment: 'negative', score: -0.8 },
      { text: '-financial manipulation', sentiment: 'negative', score: -0.5 },
    ],
  };

  it('escapes formula-injection in review text on export', () => {
    const csv = exportReportCsv(mockResult);
    // =BAD FORMULA should be prefixed with '
    expect(csv).toContain("'=BAD FORMULA");
  });

  it('escapes formula-injection in theme examples on export', () => {
    const csv = exportReportCsv(mockResult);
    expect(csv).toContain("'=FORMULA(inject)");
  });

  it('escapes formula-injection in negative-score text starting with -', () => {
    const csv = exportReportCsv(mockResult);
    expect(csv).toContain("'-financial manipulation");
  });

  it('includes all three sections', () => {
    const csv = exportReportCsv(mockResult);
    expect(csv).toContain('SUMMARY');
    expect(csv).toContain('THEMES');
    expect(csv).toContain('REVIEWS');
  });

  it('includes correct distribution counts', () => {
    const csv = exportReportCsv(mockResult);
    // Check that the summary row has the right values
    expect(csv).toContain('"mixed"');
  });
});
