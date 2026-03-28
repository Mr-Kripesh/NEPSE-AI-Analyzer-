interface Props {
  show: boolean;
  tab: 'search' | 'history' | 'portfolio';
  reportCount: number;
  portfolioCount: number;
  onTabChange: (t: 'search' | 'history' | 'portfolio') => void;
}

export default function TabBar({ show, tab, reportCount, portfolioCount, onTabChange }: Props) {
  if (!show) return null;
  return (
    <div className="tab-bar">
      <button
        type="button"
        className={`tab-btn ${tab === 'search' ? 'active' : ''}`}
        onClick={() => onTabChange('search')}
      >
        📊 Analysis
      </button>
      <button
        type="button"
        className={`tab-btn ${tab === 'history' ? 'active' : ''}`}
        onClick={() => onTabChange('history')}
      >
        📋 History
        {reportCount > 0 && <span className="tab-badge">{reportCount}</span>}
      </button>
      <button
        type="button"
        className={`tab-btn ${tab === 'portfolio' ? 'active' : ''}`}
        onClick={() => onTabChange('portfolio')}
      >
        💼 Portfolio
        {portfolioCount > 0 && <span className="tab-badge">{portfolioCount}</span>}
      </button>
    </div>
  );
}
