import { SECTOR_COLORS } from '@/lib/constants';
import { sectorSlug } from '@/lib/utils';

interface Props {
  show: boolean;
  onSectorClick: (sector: string) => void;
}

export default function EmptyState({ show, onSectorClick }: Props) {
  if (!show) return null;
  return (
    <div className="empty-state">
      <div className="empty-mountain">🏔</div>
      <h2 className="empty-title">Search any NEPSE stock to get started</h2>
      <p className="empty-sub">
        Type a symbol or company name above for a full AI-powered analysis report with buy/hold/sell recommendation
      </p>
      <div className="empty-sectors">
        {Object.entries(SECTOR_COLORS).map(([sec]) => (
          <button
            type="button"
            key={sec}
            className={`empty-sector-btn ${sectorSlug(sec)}`}
            onClick={() => onSectorClick(sec)}
          >
            {sec}
          </button>
        ))}
      </div>
    </div>
  );
}
