import type { Stock } from '@/lib/types';
import { SECTOR_COLORS } from '@/lib/constants';
import { sectorSlug } from '@/lib/utils';
import SearchBar from './SearchBar';
import LoadingBar from './LoadingBar';
import ErrorBanner from './ErrorBanner';

interface Props {
  marketOpen: boolean;
  marketStatus: string;
  stocksCount: number;
  query: string;
  suggestions: Stock[];
  showSugg: boolean;
  loading: boolean;
  loadMsg: string;
  loadPct: number;
  error: string;
  reportsCount: number;
  portfolioCount: number;
  onQueryChange: (val: string) => void;
  onAnalyze: (sym: string) => void;
  onSelect: (stock: Stock) => void;
  onClear: () => void;
  onHideSugg: () => void;
  onShowSugg: () => void;
  onSectorClick: (sector: string) => void;
  onHistoryClick: () => void;
  onPortfolioClick: () => void;
}

export default function LandingHero({
  marketOpen, marketStatus, stocksCount,
  query, suggestions, showSugg, loading, loadMsg, loadPct, error,
  reportsCount, portfolioCount,
  onQueryChange, onAnalyze, onSelect, onClear, onHideSugg, onShowSugg,
  onSectorClick, onHistoryClick, onPortfolioClick,
}: Props) {
  return (
    <div className="landing-wrap">
      <div className="lp-bg" aria-hidden="true">
        {/* Subtle grid */}
        <div className="lp-bg-grid" />
        <div className="lp-bg-diamonds" />

        <div className="lp-bg-nepal">

          {/* ── Neural network lines (top portion) ── */}
          <svg
            className="lp-nepal-neural"
            viewBox="0 0 1000 400"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            {/* Connection lines */}
            <line x1="120" y1="60"  x2="280" y2="140" stroke="currentColor" strokeWidth="0.8"/>
            <line x1="280" y1="140" x2="480" y2="80"  stroke="currentColor" strokeWidth="0.8"/>
            <line x1="480" y1="80"  x2="620" y2="180" stroke="currentColor" strokeWidth="0.8"/>
            <line x1="620" y1="180" x2="820" y2="100" stroke="currentColor" strokeWidth="0.8"/>
            <line x1="820" y1="100" x2="940" y2="200" stroke="currentColor" strokeWidth="0.8"/>
            <line x1="120" y1="60"  x2="480" y2="80"  stroke="currentColor" strokeWidth="0.4"/>
            <line x1="280" y1="140" x2="620" y2="180" stroke="currentColor" strokeWidth="0.4"/>
            <line x1="480" y1="80"  x2="820" y2="100" stroke="currentColor" strokeWidth="0.4"/>
            <line x1="60"  y1="200" x2="280" y2="140" stroke="currentColor" strokeWidth="0.5"/>
            <line x1="280" y1="140" x2="380" y2="260" stroke="currentColor" strokeWidth="0.5"/>
            <line x1="620" y1="180" x2="700" y2="300" stroke="currentColor" strokeWidth="0.5"/>
            <line x1="820" y1="100" x2="880" y2="280" stroke="currentColor" strokeWidth="0.5"/>
            {/* Nodes */}
            <circle cx="120"  cy="60"  r="3" fill="currentColor"/>
            <circle cx="280"  cy="140" r="3" fill="currentColor"/>
            <circle cx="480"  cy="80"  r="3" fill="currentColor"/>
            <circle cx="620"  cy="180" r="3" fill="currentColor"/>
            <circle cx="820"  cy="100" r="3" fill="currentColor"/>
            <circle cx="940"  cy="200" r="2" fill="currentColor"/>
            <circle cx="60"   cy="200" r="2" fill="currentColor"/>
            <circle cx="380"  cy="260" r="2" fill="currentColor"/>
            <circle cx="700"  cy="300" r="2" fill="currentColor"/>
            <circle cx="880"  cy="280" r="2" fill="currentColor"/>
          </svg>

          {/* ── Himalayan mountain silhouette (bottom, full-width) ── */}
          <svg
            className="lp-nepal-himalayas"
            viewBox="0 0 1440 220"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMax meet"
            aria-hidden="true"
            focusable="false"
          >
            <path d="
              M0,220 L0,180
              L40,168 L80,152 L110,160 L140,130 L170,148 L200,110
              L230,128 L260,88 L290,108 L320,70 L350,95
              L380,52 L410,75 L440,38 L470,62 L500,30
              L530,58 L560,22 L590,50 L620,18 L650,44
              L680,28 L710,55 L740,20 L770,48 L800,35
              L830,62 L860,25 L890,50 L920,38 L950,68
              L980,45 L1010,72 L1040,55 L1070,80
              L1100,60 L1130,88 L1160,70 L1190,98
              L1220,78 L1250,105 L1280,88 L1310,115
              L1340,95 L1380,120 L1440,100
              L1440,220 Z
            " fill="currentColor"/>
          </svg>

          {/* ── Boudhanath Stupa (bottom-left) ── */}
          <svg
            className="lp-nepal-stupa"
            viewBox="0 0 130 220"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            {/* Base platform steps */}
            <rect x="5"  y="200" width="120" height="20"/>
            <rect x="12" y="188" width="106" height="14"/>
            <rect x="20" y="177" width="90"  height="13"/>
            <rect x="28" y="168" width="74"  height="11"/>
            {/* Circular drum/base */}
            <ellipse cx="65" cy="165" rx="48" ry="9"/>
            <ellipse cx="65" cy="156" rx="40" ry="8"/>
            {/* Hemisphere dome */}
            <path d="M25,156 Q25,108 65,96 Q105,108 105,156 Z"/>
            {/* Square harmika */}
            <rect x="50" y="82" width="30" height="18" rx="2"/>
            {/* Eyes (two dots per face) */}
            <ellipse cx="60" cy="90" rx="3" ry="2"/>
            <ellipse cx="70" cy="90" rx="3" ry="2"/>
            {/* Spire with 13 rings */}
            <path d="M62,82 L64,10 L65,2 L66,10 L68,82 Z"/>
            <line x1="58" y1="76" x2="72" y2="76"/>
            <line x1="59" y1="70" x2="71" y2="70"/>
            <line x1="60" y1="64" x2="70" y2="64"/>
            <line x1="60" y1="58" x2="70" y2="58"/>
            <line x1="61" y1="52" x2="69" y2="52"/>
            <line x1="61" y1="46" x2="69" y2="46"/>
            <line x1="62" y1="40" x2="68" y2="40"/>
            <line x1="62" y1="34" x2="68" y2="34"/>
            <line x1="63" y1="28" x2="67" y2="28"/>
            <line x1="63" y1="22" x2="67" y2="22"/>
            <line x1="64" y1="16" x2="66" y2="16"/>
            {/* Top finial */}
            <circle cx="65" cy="6" r="4"/>
          </svg>

          {/* ── Rhododendron flower (bottom-right) ── */}
          <svg
            className="lp-nepal-rhodo"
            viewBox="0 0 160 180"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            {/* Stem */}
            <path d="M80,180 Q82,140 85,110 Q88,80 90,60" stroke="currentColor" strokeWidth="3" fill="none"/>
            <path d="M85,130 Q70,115 55,108" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M87,115 Q100,100 112,95" stroke="currentColor" strokeWidth="2" fill="none"/>
            {/* Flower cluster - 5 petals */}
            <ellipse cx="90" cy="48" rx="14" ry="22" transform="rotate(-15 90 48)" fill="currentColor"/>
            <ellipse cx="108" cy="55" rx="14" ry="22" transform="rotate(25 108 55)" fill="currentColor"/>
            <ellipse cx="110" cy="36" rx="14" ry="22" transform="rotate(65 110 36)" fill="currentColor"/>
            <ellipse cx="90" cy="26" rx="14" ry="22" transform="rotate(95 90 26)" fill="currentColor"/>
            <ellipse cx="72" cy="36" rx="14" ry="22" transform="rotate(-55 72 36)" fill="currentColor"/>
            {/* Center */}
            <circle cx="95" cy="44" r="8" fill="currentColor" opacity="0.6"/>
            {/* Small leaf */}
            <ellipse cx="55" cy="108" rx="16" ry="8" transform="rotate(-30 55 108)" fill="currentColor"/>
            <ellipse cx="112" cy="95" rx="16" ry="8" transform="rotate(30 112 95)" fill="currentColor"/>
          </svg>

        </div>
      </div>

      <div className="lp-center">
        <div className="lp-logo-block">
          <h1 className="lp-title">Nepse<span className="lp-title-ai">AI</span></h1>
          <p className="lp-subtitle">नेपाल स्टक विश्लेषण</p>
        </div>

        <div className="lp-badges">
          <span className="lp-badge">
            <span className={`lp-badge-dot${marketOpen ? ' open' : ''}`} />
            <span>{marketOpen ? 'Market Open' : 'Market Closed'}</span>
            {!!marketStatus && <span className="lp-badge-sep">·</span>}
            {!!marketStatus && <span className="lp-badge-time">{marketStatus}</span>}
          </span>

          <span className="lp-badge">
            <span style={{ fontSize: '0.75rem' }}>◎</span>
            <span>AI Analysis</span>
          </span>

          <span className="lp-badge">
            <span style={{ fontSize: '0.7rem', color: 'rgba(96,165,250,0.8)' }}>✦</span>
            <span>{stocksCount} stocks</span>
          </span>
        </div>

        <SearchBar
          query={query} suggestions={suggestions} showSugg={showSugg}
          loading={loading} stocksCount={stocksCount}
          onQueryChange={onQueryChange}
          onAnalyze={onAnalyze}
          onSelect={onSelect}
          onClear={onClear}
          onHideSugg={onHideSugg}
          onShowSugg={onShowSugg}
        />

        <LoadingBar show={loading} loadMsg={loadMsg} loadPct={loadPct} />
        <ErrorBanner error={error} loading={loading} />

        {!loading && !error && (
          <div className="lp-sectors">
            {Object.keys(SECTOR_COLORS).map(sec => (
              <button
                type="button"
                key={sec}
                className={`lp-sector-chip ${sectorSlug(sec)}`}
                onClick={() => onSectorClick(sec)}
              >
                {sec}
              </button>
            ))}
          </div>
        )}

        {(reportsCount > 0 || portfolioCount > 0) && (
          <div className="lp-quick-links" suppressHydrationWarning>
            {reportsCount > 0 && (
              <button type="button" className="lp-quick-btn" onClick={onHistoryClick}>
                📋 {reportsCount} saved {reportsCount === 1 ? 'report' : 'reports'}
              </button>
            )}
            {portfolioCount > 0 && (
              <button type="button" className="lp-quick-btn" onClick={onPortfolioClick}>
                💼 {portfolioCount} portfolio {portfolioCount === 1 ? 'item' : 'items'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
