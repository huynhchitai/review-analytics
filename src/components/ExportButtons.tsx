'use client';

import { exportReportCsv } from '@/lib/csv';
import type { AnalysisResult } from '@/lib/types';

interface Props {
  result: AnalysisResult;
}

export default function ExportButtons({ result }: Props) {
  function downloadCsv() {
    const csv = exportReportCsv(result);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'review-analytics-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJson() {
    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'review-analytics-report.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button onClick={downloadCsv} className="riso-btn riso-btn-primary">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Export CSV
      </button>
      <button onClick={downloadJson} className="riso-btn riso-btn-secondary">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Export JSON
      </button>
    </div>
  );
}
