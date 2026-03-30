'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getWatchlist, removeFromWatchlist, type WatchlistItem } from '@/lib/watchlist'

export default function WatchlistPage() {
  const [list, setList] = useState<WatchlistItem[]>([])

  useEffect(() => {
    setList(getWatchlist())
  }, [])

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
          {list.length > 0 && (
            <span className="wl-count">{list.length} stock{list.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {list.length === 0 ? (
          <div className="wl-empty">
            <div style={{ fontSize: '2.8rem', marginBottom: '16px', opacity: 0.45 }}>★</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '10px', color: 'var(--text-on-dark)', letterSpacing: '-0.02em' }}>
              Your watchlist is empty
            </div>
            <div style={{ marginBottom: '24px', lineHeight: 1.75 }}>
              Analyze a stock and click{' '}
              <strong className="wl-empty-gold">★ Watch</strong>{' '}
              to track it here.
            </div>
            <Link
              href="/"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 24px', borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--accent), #1d4ed8)',
                color: '#fff', textDecoration: 'none',
                fontSize: '0.82rem', fontWeight: 600,
                boxShadow: '0 4px 14px var(--accent-glow)',
              }}
            >
              Start Analyzing →
            </Link>
          </div>
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
