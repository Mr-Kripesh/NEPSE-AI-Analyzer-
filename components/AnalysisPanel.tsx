'use client';
import { useRef, useEffect } from 'react';
import type { Report } from '@/lib/types';
import StockIdBar from './StockIdBar';
import VerdictCard from './VerdictCard';
import MetricsGrid from './MetricsGrid';
import RiskMeter from './RiskMeter';
import ChartCard from './ChartCard';
import AnalysisAccordion from './AnalysisAccordion';

interface Props {
  report: Report;
  chartRange: string;
  theme: 'light' | 'dark';
  activeSection: string | null;
  isWatched: boolean;
  onChartRangeChange: (r: string) => void;
  onSectionToggle: (key: string | null) => void;
  onAddToPortfolio: (ticker: string) => void;
  onWatchlistToggle: (ticker: string) => void;
}

export default function AnalysisPanel({
  report, chartRange, theme, activeSection, isWatched,
  onChartRangeChange, onSectionToggle, onAddToPortfolio, onWatchlistToggle,
}: Props) {
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reportRef.current)
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }, [report.ticker]);

  return (
    <div className="report-wrap" ref={reportRef}>
      <StockIdBar report={report} isWatched={isWatched} onAddToPortfolio={onAddToPortfolio} onWatchlistToggle={onWatchlistToggle} />
      <VerdictCard verdict={report.verdict} reasoning={report.verdict_reasoning} />
      <MetricsGrid report={report} />
      <RiskMeter riskLevel={report.risk_level} riskScore={report.risk_score} />
      <ChartCard
        ticker={report.ticker}
        chartRange={chartRange}
        theme={theme}
        onRangeChange={onChartRangeChange}
      />
      <AnalysisAccordion
        sections={report.sections}
        activeSection={activeSection}
        onSectionToggle={onSectionToggle}
      />
      <div className="disclaimer-bar">
        ⚠ DISCLAIMER: AI analysis for educational purposes only. Not financial advice. Consult a SEBON-registered broker before investing.
      </div>
    </div>
  );
}
