import type { Report } from '@/lib/types';
import { sectorSlug } from '@/lib/utils';

interface Props {
  report: Report;
  isWatched: boolean;
  onAddToPortfolio: (ticker: string) => void;
  onWatchlistToggle: (ticker: string) => void;
}

export default function StockIdBar({ report, isWatched, onAddToPortfolio, onWatchlistToggle }: Props) {
  return (
    <div className="stock-id-bar">
      <div className="stock-id-left">
        <div className="stock-symbol-big">{report.ticker}</div>
        <div>
          <div className="stock-name-full">{report.company}</div>
          <span className={`sector-pill ${sectorSlug(report.sector)}`}>{report.sector}</span>
        </div>
      </div>
      <div className="stock-id-right">
        <div className="stock-price-big">{report.current_price}</div>
        {report.price_change_1y && report.price_change_1y !== 'N/A' && (
          <div className={`stock-change ${report.price_change_1y.startsWith('+') ? 'up' : 'down'}`}>
            {report.price_change_1y.startsWith('+') ? '▲' : '▼'} {report.price_change_1y} (1Y)
          </div>
        )}
        <div className="stock-id-btn-row">
          <button
            type="button"
            className={`add-port-inline-btn${isWatched ? ' watched' : ''}`}
            onClick={() => onWatchlistToggle(report.ticker)}
          >
            {isWatched ? '★ Watching' : '☆ Watch'}
          </button>
          <button
            type="button"
            className="add-port-inline-btn"
            onClick={() => onAddToPortfolio(report.ticker)}
          >
            + Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}
