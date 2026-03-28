'use client';
import { useRef, useEffect } from 'react';
import { TV_SUPPORTED, RANGE_MAP } from '@/lib/constants';

interface Props {
  ticker: string;
  chartRange: string;
  theme: 'light' | 'dark';
  onRangeChange: (r: string) => void;
}

export default function ChartCard({ ticker, chartRange, theme, onRangeChange }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const container = chartRef.current;
    container.innerHTML = '';

    if (!TV_SUPPORTED.has(ticker)) {
      container.innerHTML = `
        <div style="height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--muted);background:var(--card2);border-radius:4px">
          <span style="font-size:2rem">📊</span>
          <span style="font-size:0.78rem;font-family:var(--font-stack-sans)">Live chart not available for ${ticker} on TradingView</span>
          <a href="https://nepsealpha.com/nepse/company/${ticker.toLowerCase()}" target="_blank"
            style="font-size:0.68rem;color:var(--crimson);text-decoration:none;border:1px solid var(--crimson);padding:5px 14px;">
            View on NepseAlpha →
          </a>
        </div>`;
      return;
    }

    const id = 'tv_' + Date.now();
    container.innerHTML = `<div id="${id}" style="height:420px"></div>`;

    const mount = () => {
      const TV = (window as any).TradingView;
      if (!TV) { setTimeout(mount, 500); return; }
      const isDark = theme === 'dark';
      const cfg = RANGE_MAP[chartRange] || RANGE_MAP['1M'];
      new TV.widget({
        container_id: id, width: '100%', height: 420,
        symbol: `NEPSE:${ticker}`,
        interval: cfg.interval, range: cfg.range,
        timezone: 'Asia/Kathmandu',
        theme: isDark ? 'dark' : 'light',
        style: '1', locale: 'en',
        toolbar_bg:          isDark ? '#111820' : '#f8f6f2',
        backgroundColor:     isDark ? '#111820' : '#ffffff',
        hide_side_toolbar:   true,
        allow_symbol_change: false,
        save_image:          false,
        withdateranges:      true,
        studies:             ['Volume@tv-basicstudies'],
        overrides: {
          'mainSeriesProperties.candleStyle.upColor':         '#1a9e72',
          'mainSeriesProperties.candleStyle.downColor':       '#c0392b',
          'mainSeriesProperties.candleStyle.borderUpColor':   '#1a9e72',
          'mainSeriesProperties.candleStyle.borderDownColor': '#c0392b',
          'mainSeriesProperties.candleStyle.wickUpColor':     '#1a9e72',
          'mainSeriesProperties.candleStyle.wickDownColor':   '#c0392b',
        },
      });
    };
    setTimeout(mount, 400);
  }, [ticker, chartRange, theme]);

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-card-title">
          <span>📉</span>
          <span>Price Chart — {ticker}</span>
          {!TV_SUPPORTED.has(ticker) && (
            <span className="chart-unavail-badge">Chart may be limited</span>
          )}
        </div>
        <div className="chart-range-btns">
          {['1D', '5D', '1M', '3M', '6M', '1Y'].map(r => (
            <button
              type="button"
              key={r}
              className={`range-btn ${chartRange === r ? 'active' : ''}`}
              onClick={() => onRangeChange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartRef} className="chart-body" />
    </div>
  );
}
