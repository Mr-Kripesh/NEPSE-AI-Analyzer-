import type { PortfolioItem } from '@/lib/types';
import { fmt } from '@/lib/utils';

interface Props {
  portfolio: PortfolioItem[];
  portTicker: string;
  portShares: string;
  portPrice: string;
  portLabel: string;
  onPortTickerChange: (v: string) => void;
  onPortSharesChange: (v: string) => void;
  onPortPriceChange: (v: string) => void;
  onPortLabelChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onAnalyze: (ticker: string) => void;
}

export default function PortfolioTab({
  portfolio, portTicker, portShares, portPrice, portLabel,
  onPortTickerChange, onPortSharesChange, onPortPriceChange, onPortLabelChange,
  onAdd, onRemove, onAnalyze,
}: Props) {
  const totalCost = portfolio.reduce((s, p) => s + p.shares * p.buyPrice, 0);

  return (
    <div className="tab-content">
      <div className="port-add-form">
        <input
          className="port-field"
          placeholder="SYMBOL"
          value={portTicker}
          onChange={e => onPortTickerChange(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && onAdd()}
        />
        <input
          className="port-field"
          type="number"
          placeholder="Units"
          value={portShares}
          onChange={e => onPortSharesChange(e.target.value)}
        />
        <input
          className="port-field"
          type="number"
          placeholder="Avg Cost (Rs.)"
          value={portPrice}
          onChange={e => onPortPriceChange(e.target.value)}
        />
        <input
          className="port-field wide"
          placeholder="Label (optional)"
          value={portLabel}
          onChange={e => onPortLabelChange(e.target.value)}
        />
        <button type="button" className="port-add-new-btn" onClick={onAdd}>+ Add</button>
      </div>

      {portfolio.length === 0 ? (
        <div className="empty-tab">No positions yet. Add your first NEPSE holding above.</div>
      ) : (
        <>
          <div className="port-summary-row">
            <div className="port-summary-card">
              <div className="psc-label">Total Invested</div>
              <div className="psc-val">{fmt(totalCost)}</div>
            </div>
            <div className="port-summary-card">
              <div className="psc-label">Positions</div>
              <div className="psc-val">{portfolio.length}</div>
            </div>
            <div className="port-summary-card">
              <div className="psc-label">Stocks</div>
              <div className="psc-val psc-val-sm">
                {[...new Set(portfolio.map(p => p.ticker))].join(', ')}
              </div>
            </div>
          </div>

          <div className="port-table-wrap">
            <table className="port-table-new">
              <thead>
                <tr>
                  <th>Symbol</th><th>Units</th><th>Avg Cost</th>
                  <th>Value</th><th>Weight</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((p, i) => {
                  const cost   = p.shares * p.buyPrice;
                  const weight = totalCost > 0 ? ((cost / totalCost) * 100).toFixed(1) + '%' : '—';
                  return (
                    <tr key={i}>
                      <td>
                        <div className="pt-sym">{p.ticker}</div>
                        {p.label && <div className="pt-label">{p.label}</div>}
                      </td>
                      <td>{p.shares}</td>
                      <td>{fmt(p.buyPrice)}</td>
                      <td className="pt-val">{fmt(cost)}</td>
                      <td>{weight}</td>
                      <td>
                        <div className="pt-actions">
                          <button
                            type="button"
                            className="pt-analyze-btn"
                            onClick={() => onAnalyze(p.ticker)}
                            title="Analyze"
                          >⚡</button>
                          <button
                            type="button"
                            className="pt-remove-btn"
                            onClick={() => onRemove(i)}
                            title="Remove"
                          >🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
