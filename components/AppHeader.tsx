interface Props {
  marketOpen: boolean;
  marketStatus: string;
}

export default function AppHeader({ marketOpen, marketStatus }: Props) {
  return (
    <header className="app-header">
      <div className="flag-row">
        <div className="flag-bar" />
        <div className="flag-dot" />
        <div className="flag-bar flag-bar-rev" />
      </div>
      <h1 className="app-logo">Nepse<span>AI</span></h1>
      <p className="app-tagline">Nepal Stock Exchange · AI-Powered Analysis</p>
      <div className="market-badge-row">
        <div className="market-badge">
          <span className={`market-dot ${marketOpen ? 'open' : ''}`} />
          <span className={`market-label ${marketOpen ? 'open' : 'closed'}`}>
            {marketOpen ? 'Market Open' : 'Market Closed'}
          </span>
          <span className="market-time">{marketStatus}</span>
        </div>
      </div>
    </header>
  );
}
