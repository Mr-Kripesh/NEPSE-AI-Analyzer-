import type { Report } from '@/lib/types';

interface Props {
  report: Report;
}

export default function MetricsGrid({ report }: Props) {
  const metrics = [
    { icon: 'Rs', label: 'Current Price',  val: report.current_price,  highlight: true },
    { icon: '📊', label: 'P/E Ratio',      val: report.pe_ratio },
    { icon: '💵', label: 'EPS',            val: report.eps },
    { icon: '📚', label: 'Book Value',     val: report.book_value },
    { icon: '🏦', label: 'Market Cap',     val: report.market_cap },
    { icon: '💸', label: 'Dividend Yield', val: report.dividend_yield },
    {
      icon: '📈', label: '1Y Return', val: report.price_change_1y,
      colorClass: report.price_change_1y?.startsWith('+') ? 'teal'
                : report.price_change_1y?.startsWith('-') ? 'red' : undefined,
    },
    {
      icon: '⚠️', label: 'Risk Level', val: report.risk_level?.toUpperCase(),
      colorClass: report.risk_level === 'low'  ? 'teal'
                : report.risk_level === 'high' ? 'red' : 'gold',
    },
  ];

  return (
    <div className="metrics-8-grid">
      {metrics.map(m => (
        <div key={m.label} className={`metric-tile ${m.highlight ? 'highlight' : ''}`}>
          <div className="metric-tile-icon">{m.icon}</div>
          <div className="metric-tile-label">{m.label}</div>
          <div className={`metric-tile-val${m.colorClass ? ` metric-tile-val-${m.colorClass}` : ''}`}>
            {m.val || 'N/A'}
          </div>
        </div>
      ))}
    </div>
  );
}
