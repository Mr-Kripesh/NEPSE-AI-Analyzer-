import type { Report } from '@/lib/types';
import { vClass, sectorSlug } from '@/lib/utils';

interface Props {
  reports: Report[];
  onSelect: (r: Report) => void;
  onDelete: (ticker: string) => void;
  onClearAll: () => void;
}

export default function HistoryTab({ reports, onSelect, onDelete, onClearAll }: Props) {
  return (
    <div className="tab-content">
      {reports.length === 0 ? (
        <div className="empty-tab">No reports yet. Analyze a stock to see it here.</div>
      ) : (
        <>
          <div className="tab-content-header">
            <span>{reports.length} saved report{reports.length !== 1 ? 's' : ''}</span>
            <button
              type="button"
              className="danger-btn"
              onClick={() => { if (confirm('Delete all reports?')) onClearAll(); }}
            >
              🗑 Clear All
            </button>
          </div>
          <div className="history-cards">
            {reports.map(r => (
              <div key={r.ticker} className="history-card-new" onClick={() => onSelect(r)}>
                <button
                  type="button"
                  className="hcard-del"
                  onClick={e => { e.stopPropagation(); onDelete(r.ticker); }}
                >
                  ✕
                </button>
                <div className="hcard-top">
                  <span className="hcard-sym">{r.ticker}</span>
                  <span className={`hcard-verdict verdict-pill-${vClass(r.verdict)}`}>{r.verdict}</span>
                </div>
                <div className="hcard-company">{r.company}</div>
                <div className="hcard-meta">
                  <span className="hcard-price">{r.current_price}</span>
                  <span className="hcard-date">
                    {r.savedAt
                      ? new Date(r.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                      : ''}
                  </span>
                </div>
                <div className={`hcard-sector ${sectorSlug(r.sector)}`}>{r.sector}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
