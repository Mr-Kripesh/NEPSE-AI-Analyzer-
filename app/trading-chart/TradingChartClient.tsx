'use client';
import { useRef, useEffect, useState, useCallback, useId } from 'react';
import { STATIC_STOCKS } from '@/lib/companies';

const DEFAULT_TICKER = 'NABIL';

export default function TradingChartClient() {
  const [ticker, setTicker]       = useState(DEFAULT_TICKER);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('nepsai_theme') as 'light' | 'dark' | null;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return (saved ?? preferred) === 'dark';
  });
  const [query, setQuery]         = useState('');
  const [open, setOpen]           = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [failed, setFailed]       = useState(false);
  const [loading, setLoading]     = useState(true);
  const chartRef  = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Listen for theme change events
  useEffect(() => {
    const handler = (e: Event) => {
      setIsDark((e as CustomEvent<'light' | 'dark'>).detail === 'dark');
    };
    window.addEventListener('nepse-theme-change', handler);
    return () => window.removeEventListener('nepse-theme-change', handler);
  }, []);

  // Build and mount TradingView widget
  useEffect(() => {
    if (!chartRef.current) return;
    const container = chartRef.current;
    container.innerHTML = '';

    setLoading(true);
    const resetFailedTimer = setTimeout(() => setFailed(false), 0);
    const id = 'tv_tc_' + Date.now();
    container.innerHTML = `<div id="${id}" style="height:620px"></div>`;

    // Fallback only for when the TradingView script itself fails to load
    let fallbackTimer: ReturnType<typeof setTimeout>;

    const mount = () => {
      const TV = (window as any).TradingView;
      if (!TV) { setTimeout(mount, 500); return; }

      // Cancel the "script didn't load" fallback — TV is available
      clearTimeout(fallbackTimer);

      const widget = new TV.widget({
        container_id: id,
        width: '100%',
        height: 620,
        symbol: `NEPSE:${ticker}`,
        interval: 'D',
        timezone: 'Asia/Kathmandu',
        theme: isDark ? 'dark' : 'light',
        style: '1',
        locale: 'en',
        toolbar_bg:          isDark ? '#111820' : '#f8f6f2',
        backgroundColor:     isDark ? '#111820' : '#ffffff',
        hide_side_toolbar:   false,
        hide_top_toolbar:    false,
        allow_symbol_change: true,
        save_image:          true,
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
        // Widget ready callback
        containerReadyCallback: () => setLoading(false),
      });
      // Fallback: hide loader after 2s if widget doesn't call back
      setTimeout(() => setLoading(false), 2000);
      void widget;
    };

    // Only use fallback if the TV script itself never loads (network failure etc.)
    fallbackTimer = setTimeout(() => {
      if (!(window as any).TradingView) setFailed(true);
      setLoading(false);
    }, 8000);

    setTimeout(mount, 400);

    return () => {
      clearTimeout(fallbackTimer);
      clearTimeout(resetFailedTimer);
    };
  }, [ticker, isDark]);

  // Filtered stock list for dropdown
  const q = query.trim().toLowerCase();
  const filtered = q
    ? STATIC_STOCKS.filter(
        s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      ).slice(0, 40)
    : STATIC_STOCKS.slice(0, 40);

  const selectStock = useCallback((symbol: string) => {
    setTicker(symbol);
    setQuery('');
    setOpen(false);
    setHighlighted(-1);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true);
      return;
    }
    if (e.key === 'Escape') { setOpen(false); setHighlighted(-1); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      selectStock(filtered[highlighted].symbol);
    }
  };

  const currentStock = STATIC_STOCKS.find(s => s.symbol === ticker);

  return (
    <>
      {/* Stock picker */}
      <div className="tc-picker">
        <div className="tc-search-wrap">
          <input
            ref={inputRef}
            type="text"
            className="tc-search-input"
            placeholder="Search stock… (e.g. NABIL, Hydropower)"
            role="combobox"
            aria-haspopup="listbox"
            aria-label="Search stock"
            aria-expanded={open ? 'true' : 'false'}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={highlighted >= 0 ? `tc-opt-${highlighted}` : undefined}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setHighlighted(-1); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {open && filtered.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              className="tc-dropdown"
            >
              {filtered.map((s, i) => (
                <li
                  key={s.symbol}
                  id={`tc-opt-${i}`}
                  role="option"
                  aria-selected={i === highlighted}
                  className={`tc-dropdown-item${i === highlighted ? ' selected' : ''}`}
                  onMouseDown={() => selectStock(s.symbol)}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  <span className="tc-ticker">{s.symbol}</span>
                  <span className="tc-name">{s.name}</span>
                  <span className="tc-sector">{s.sector}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {currentStock && (
          <div className="tc-current-badge">
            <span className="tc-ticker">{currentStock.symbol}</span>
            <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{currentStock.name}</span>
            <span className="tc-sector">{currentStock.sector}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="tc-chart-wrap" style={{ minHeight: 400, position: 'relative' }}>
        {loading && (
          <div className="tc-chart-skeleton animate-pulse absolute inset-0 flex flex-col items-center justify-center z-10 bg-gradient-to-b from-gray-100/60 to-gray-200/80 dark:from-[#181c1f]/80 dark:to-[#101214]/90">
            <div className="w-4/5 h-8 bg-gray-300/60 dark:bg-gray-700/40 rounded mb-4" />
            <div className="w-11/12 h-64 bg-gray-200/80 dark:bg-gray-800/40 rounded" />
            <div className="w-2/3 h-6 bg-gray-300/60 dark:bg-gray-700/40 rounded mt-6" />
          </div>
        )}
        {failed && (
          <div className="tc-fallback">
            <span style={{ fontSize: '2rem' }}>📊</span>
            <span style={{ fontSize: '0.82rem' }}>TradingView chart not available for {ticker}</span>
            <a
              href={`https://nepsealpha.com/nepse/company/${ticker.toLowerCase()}`}
              target="_blank"
              rel="noreferrer"
              className="tc-fallback-link"
            >
              View {ticker} on NepseAlpha →
            </a>
          </div>
        )}
        <div
          ref={chartRef}
          style={{ display: failed ? 'none' : 'block' }}
        />
      </div>
    </>
  );
}
