'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getWatchlist, removeFromWatchlist, type WatchlistItem } from '@/lib/watchlist'

export default function WatchlistPage() {
  const [list, setList] = useState<WatchlistItem[]>(() => getWatchlist())

  const remove = (ticker: string) => {
    removeFromWatchlist(ticker)
    setList(prev => prev.filter(i => i.ticker !== ticker))
  }

  return (
    <main className="page-main">
      <div className="container">
        <div className="page-header">
          <Link href="/" className="page-back-link">← Home</Link>
          <h1 className="page-title">Watchlist</h1>
          <span className="wl-count">{list.length} stock{list.length !== 1 ? 's' : ''}</span>
        </div>

        {list.length === 0 ? (
          <p className="wl-empty">
            Your watchlist is empty.{' '}
            Analyze a stock and click <strong className="wl-empty-gold">★ Watch</strong> to add it.
          </p>
        ) : (
          <div className="wl-list">
            {list.map(item => (
              <div key={item.ticker} className="wl-row">
                <div className="wl-info">
                  <span className="wl-ticker">{item.ticker}</span>
                  <span className="wl-name">{item.name}</span>
                  <span className="wl-meta">
                    {item.sector} · Added {new Date(item.addedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="wl-actions">
                  <Link href={`/?q=${encodeURIComponent(item.ticker)}`} className="wl-analyze-btn">
                    Analyze →
                  </Link>
                  <button type="button" className="wl-remove-btn" onClick={() => remove(item.ticker)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
