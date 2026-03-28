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
        <div className="lp-bg-grid" />
        <div className="lp-bg-diamonds" />
        <div className="lp-bg-nepal">

          {/* Dharahara Tower — bottom-left */}
          <svg className="lp-nepal-dharahara" viewBox="0 0 80 180"
               xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <rect x="0" y="165" width="80" height="15"/>
            <rect x="8" y="153" width="64" height="12"/>
            <polygon points="16,153 14,90 12,72 20,68 18,52 30,28 50,28 62,52 60,68 68,72 66,90 64,153"/>
            <rect x="10" y="64" width="60" height="8"/>
            <rect x="28" y="16" width="24" height="14"/>
            <ellipse cx="40" cy="16" rx="14" ry="8"/>
            <rect x="38" y="2" width="4" height="14"/>
          </svg>

          {/* Bodhi Tree (Lumbini) — bottom-right */}
          <svg className="lp-nepal-bodhi" viewBox="0 0 120 160"
               xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <rect x="52" y="100" width="16" height="38"/>
            <path d="M52,130 L44,145 L36,150 L42,138 L38,155 L52,138Z"/>
            <path d="M68,130 L76,145 L84,150 L78,138 L82,155 L68,138Z"/>
            <ellipse cx="60" cy="94" rx="44" ry="26"/>
            <ellipse cx="20" cy="88" rx="20" ry="14" transform="rotate(-20 20 88)"/>
            <ellipse cx="100" cy="88" rx="20" ry="14" transform="rotate(20 100 88)"/>
            <ellipse cx="60" cy="68" rx="34" ry="22"/>
            <ellipse cx="60" cy="44" rx="24" ry="20"/>
            <ellipse cx="60" cy="22" rx="14" ry="16"/>
          </svg>

          {/* One-Horned Rhino — left-mid */}
          <svg className="lp-nepal-rhino" viewBox="0 0 180 110"
               xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M30,90 L28,60 Q26,38 40,32 Q55,26 72,24 Q82,16 96,18 Q110,20 118,28 Q138,26 152,38 Q168,48 166,68 Q164,82 154,88 L30,90Z"/>
            <path d="M28,60 Q14,54 8,64 Q4,72 12,78 Q18,82 28,80 L28,60Z"/>
            <path d="M8,64 Q2,48 9,40 Q14,38 18,48 L14,64Z"/>
            <path d="M94,18 Q100,8 106,12 Q108,18 102,22Z"/>
            <rect x="38" y="86" width="14" height="20" rx="2"/>
            <rect x="56" y="86" width="14" height="20" rx="2"/>
            <rect x="110" y="86" width="14" height="20" rx="2"/>
            <rect x="130" y="86" width="14" height="20" rx="2"/>
            <path d="M154,68 Q168,60 172,54 Q168,64 162,74Z"/>
          </svg>

          {/* Himalayan Elephant — right-mid */}
          <svg className="lp-nepal-elephant" viewBox="0 0 180 120"
               xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M40,100 Q30,95 28,70 Q26,50 36,38 Q48,26 68,22 Q80,18 100,20 Q130,22 148,34 Q164,46 166,68 Q168,88 154,98 L40,100Z"/>
            <path d="M36,38 Q28,30 20,36 Q10,44 12,60 Q14,74 28,78 Q34,80 40,76 L40,50 Q40,42 36,38Z"/>
            <path d="M36,38 Q20,20 8,28 Q0,38 4,54 Q8,68 20,70 Q30,70 36,60 L36,38Z"/>
            <path d="M12,60 Q4,72 2,88 Q0,100 8,104 Q14,106 16,98 Q16,86 22,74 L28,78Z"/>
            <rect x="50" y="96" width="18" height="20" rx="4"/>
            <rect x="72" y="96" width="18" height="20" rx="4"/>
            <rect x="116" y="96" width="18" height="20" rx="4"/>
            <rect x="138" y="96" width="18" height="20" rx="4"/>
            <path d="M154,78 Q168,72 174,64 Q170,74 164,84Z"/>
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
            <span>🤖</span>
            <span>AI Analysis</span>
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
