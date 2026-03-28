'use client';
import { useRef, useEffect } from 'react';
import type { Stock } from '@/lib/types';
import { sectorSlug } from '@/lib/utils';
import { POPULAR_CHIPS } from '@/lib/constants';

interface Props {
  query: string;
  suggestions: Stock[];
  showSugg: boolean;
  loading: boolean;
  stocksCount: number;
  onQueryChange: (val: string) => void;
  onAnalyze: (sym: string) => void;
  onSelect: (stock: Stock) => void;
  onClear: () => void;
  onHideSugg: () => void;
  onShowSugg: () => void;
}

export default function SearchBar({
  query, suggestions, showSugg, loading, stocksCount,
  onQueryChange, onAnalyze, onSelect, onClear, onHideSugg, onShowSugg,
}: Props) {
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) onHideSugg();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onHideSugg]);

  return (
    <div className="search-hero">
      <div ref={searchRef} className="search-container">
        <div className="search-box">
          <span className="search-icon-left">🔍</span>
          <input
            ref={inputRef}
            className="search-field"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const sym = query.split('—')[0].trim().toUpperCase() || query.trim().toUpperCase();
                if (sym) { onHideSugg(); onAnalyze(sym); }
              }
              if (e.key === 'Escape') onHideSugg();
            }}
            onFocus={() => { if (query && suggestions.length) onShowSugg(); }}
            placeholder="Search NEPSE stocks by symbol, name or sector…"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => { onClear(); inputRef.current?.focus(); }}
            >
              ✕
            </button>
          )}
          <button
            type="button"
            className={`search-analyze-btn ${loading ? 'loading' : ''}`}
            disabled={loading || !query.trim()}
            onClick={() => {
              const sym = query.split('—')[0].trim().toUpperCase() || query.trim().toUpperCase();
              if (sym) onAnalyze(sym);
            }}
          >
            {loading ? <span className="btn-spinner" /> : <>Analyze <span className="btn-arrow">→</span></>}
          </button>
        </div>

        {showSugg && suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {suggestions.map(s => (
              <div
                key={s.symbol}
                className="suggestion-row"
                onMouseDown={e => { e.preventDefault(); onSelect(s); }}
              >
                <div className="sugg-info">
                  <span className="sugg-sym">{s.symbol}</span>
                  <span className="sugg-name">{s.name}</span>
                </div>
                <div className="sugg-right">
                  {s.ltp && (
                    <span className="sugg-price">
                      Rs.{parseFloat(s.ltp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      {s.change && (
                        <span className={`sugg-change ${parseFloat(s.change) >= 0 ? 'up' : 'down'}`}>
                          {' '}{s.change}%
                        </span>
                      )}
                    </span>
                  )}
                  <span className={`sugg-tag ${sectorSlug(s.sector)}`}>{s.sector}</span>
                </div>
              </div>
            ))}
            <div className="suggestions-footer">{stocksCount} stocks loaded · Type to filter</div>
          </div>
        )}
      </div>

      <div className="popular-row">
        <span className="popular-label">Popular:</span>
        {POPULAR_CHIPS.map(sym => (
          <button type="button" key={sym} className="pop-chip" onClick={() => onAnalyze(sym)}>
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}
